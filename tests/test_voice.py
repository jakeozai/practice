import io
import os
import time
import unittest
import wave
from contextlib import redirect_stdout
from pathlib import Path

import numpy as np

from jjangdol import audio
from jjangdol.tts import to_speech_text
from jjangdol.voice import converse

ROOT = Path(__file__).resolve().parent.parent


class SpeechTextTest(unittest.TestCase):
    def test_abbreviations_and_laugh(self):
        self.assertEqual(
            to_speech_text("아 ㅅㅂ ㅋㅋㅋ 또 죽었냐", {"ㅅㅂ": "씨발"}), "아 씨발 크크 또 죽었냐"
        )

    def test_strips_emoji_and_leftover_jamo(self):
        self.assertEqual(to_speech_text("아빠 ㅠㅠ 힘내 😂 (진짜)"), "아빠 힘내 진짜")

    def test_laugh_can_be_silent(self):
        self.assertEqual(to_speech_text("ㅋㅋㅋ 오케이", laugh=""), "오케이")

    def test_nothing_to_say(self):
        self.assertEqual(to_speech_text("ㅋㅋ", laugh=""), "")
        self.assertEqual(to_speech_text("...!"), "")


# ── converse (대화 한 턴) ─────────────────────────────

class FakeBot:
    def __init__(self, sentences):
        self.sentences = sentences
        self.closed = False

    def respond(self, text):
        try:
            yield from self.sentences
        finally:
            self.closed = True


class FakeTTS:
    def __init__(self, on_synth=None):
        self.calls = []
        self.on_synth = on_synth

    def synthesize(self, text):
        self.calls.append(text)
        if self.on_synth:
            self.on_synth()
        return np.full(10, len(self.calls), dtype=np.int16)


class FakeSpeaker:
    def __init__(self):
        self.generation = 0
        self.queue = []

    def enqueue(self, clip):
        self.queue.append(clip)


class ConverseTest(unittest.TestCase):
    def run_turn(self, bot, tts, speaker, fillers=(), chance=0.0):
        with redirect_stdout(io.StringIO()):
            return converse(bot, tts, speaker, "안녕", list(fillers), chance)

    def test_each_sentence_is_spoken_in_order(self):
        bot, tts, speaker = FakeBot(["하나.", "둘."]), FakeTTS(), FakeSpeaker()
        first = self.run_turn(bot, tts, speaker)
        self.assertEqual(tts.calls, ["하나.", "둘."])
        self.assertEqual([c[0] for c in speaker.queue], [1, 2])
        self.assertIsNotNone(first)
        self.assertTrue(bot.closed)

    def test_filler_goes_first(self):
        filler = np.zeros(5, dtype=np.int16)
        speaker = FakeSpeaker()
        self.run_turn(FakeBot(["하나."]), FakeTTS(), speaker, fillers=[filler], chance=1.0)
        self.assertIs(speaker.queue[0], filler)
        self.assertEqual(len(speaker.queue), 2)

    def test_barge_in_stops_the_rest(self):
        speaker = FakeSpeaker()

        def interrupted():
            speaker.generation += 1  # 첫 문장 합성하는 사이에 아빠가 끼어듦

        bot, tts = FakeBot(["하나.", "둘.", "셋."]), FakeTTS(on_synth=interrupted)
        self.run_turn(bot, tts, speaker)
        self.assertEqual(tts.calls, ["하나."])
        self.assertEqual(speaker.queue, [])
        self.assertTrue(bot.closed)


# ── 마이크·스피커 (가짜 sounddevice로) ───────────────

class FakeOutputStream:
    def __init__(self, **kwargs):
        self.blocks = []

    def start(self):
        pass

    def write(self, data):
        self.blocks.append(len(data))
        time.sleep(0.002)


class FakeInputStream:
    def __init__(self, **kwargs):
        self.kwargs = kwargs

    def start(self):
        pass

    def stop(self):
        pass

    def close(self):
        pass


class FakeSD:
    OutputStream = FakeOutputStream
    InputStream = FakeInputStream

    class PortAudioError(Exception):
        pass


class FakeRecognizer:
    def __init__(self, texts=()):
        self.texts = list(texts)
        self.fed = 0
        self.resets = 0
        self.speech_active = False

    def feed(self, chunk):
        self.fed += 1
        out, self.texts = self.texts, []
        return out

    def reset(self):
        self.resets += 1


class FakeSpeakerState:
    def __init__(self, speaking=False):
        self.speaking = speaking
        self.interrupts = 0

    def is_speaking(self):
        return self.speaking

    def interrupt(self):
        self.interrupts += 1


def wait_until(cond, timeout=2.0):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if cond():
            return True
        time.sleep(0.005)
    return False


class AudioTest(unittest.TestCase):
    def setUp(self):
        self._orig = audio._sd
        audio._sd = lambda: FakeSD

    def tearDown(self):
        audio._sd = self._orig

    def make_speaker(self):
        speaker = audio.Speaker(24000)
        speaker.ECHO_TAIL = 0.0
        return speaker

    def test_speaker_plays_everything_then_goes_quiet(self):
        speaker = self.make_speaker()
        speaker.enqueue(np.zeros(5000, dtype=np.int16))
        self.assertTrue(speaker.is_speaking())
        self.assertTrue(wait_until(lambda: not speaker.is_speaking()))
        self.assertEqual(sum(speaker._stream.blocks), 5000)

    def test_speaker_interrupt(self):
        speaker = self.make_speaker()
        for _ in range(3):
            speaker.enqueue(np.zeros(240000, dtype=np.int16))  # 10초짜리 3개
        time.sleep(0.02)
        speaker.interrupt()
        self.assertEqual(speaker.generation, 1)
        self.assertTrue(wait_until(lambda: not speaker.is_speaking()))
        self.assertLess(sum(speaker._stream.blocks), 240000)

    def test_mic_ignores_audio_while_speaking(self):
        rec, spk = FakeRecognizer(["들리면 안 됨"]), FakeSpeakerState(speaking=True)
        mic = audio.MicListener(rec, spk)
        mic.process(np.zeros(1600, dtype=np.float32))
        self.assertEqual(rec.fed, 0)
        self.assertEqual(rec.resets, 1)
        self.assertTrue(mic.utterances.empty())

    def test_mic_passes_text_when_quiet(self):
        mic = audio.MicListener(FakeRecognizer(["안녕 짱돌"]), FakeSpeakerState())
        mic.process(np.zeros(1600, dtype=np.float32))
        self.assertEqual(mic.utterances.get_nowait(), "안녕 짱돌")

    def test_barge_in_interrupts_speaker(self):
        rec, spk = FakeRecognizer(), FakeSpeakerState(speaking=True)
        rec.speech_active = True
        mic = audio.MicListener(rec, spk, barge_in=True)
        mic.process(np.zeros(1600, dtype=np.float32))
        self.assertEqual(spk.interrupts, 1)


# ── 진짜 음성인식 (모델이 있을 때만) ──────────────────

MODELS_DIR = Path(os.environ.get("JJANGDOL_MODELS_DIR", ROOT / "models"))


@unittest.skipUnless((MODELS_DIR / "sense-voice" / "test_ko.wav").exists(), "음성인식 모델 없음")
class RealSTTTest(unittest.TestCase):
    def test_recognizes_korean_sample(self):
        from jjangdol.stt import SAMPLE_RATE, SpeechRecognizer, resample

        rec = SpeechRecognizer(MODELS_DIR)
        with wave.open(str(MODELS_DIR / "sense-voice" / "test_ko.wav")) as w:
            rate = w.getframerate()
            data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        speech = resample(data.astype(np.float32) / 32768, rate, SAMPLE_RATE)
        silence = np.zeros(SAMPLE_RATE, dtype=np.float32)
        stream = np.concatenate([silence, speech, silence])
        texts = []
        for i in range(0, len(stream), 1600):  # 마이크처럼 0.1초씩
            texts += rec.feed(stream[i : i + 1600])
        self.assertEqual(len(texts), 1)
        self.assertIn("편할", texts[0])


if __name__ == "__main__":
    unittest.main()
