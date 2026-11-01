import io
import json
import os
import tempfile
import time
import unittest
import wave
from contextlib import redirect_stdout
from pathlib import Path
from types import SimpleNamespace

import numpy as np

from jjangdol import audio
from jjangdol.mood import Presence, guess_mood
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


class MoodTest(unittest.TestCase):
    def test_default_rules(self):
        self.assertEqual(guess_mood("아 ㅋㅋㅋ 개웃기네"), "laugh")
        self.assertEqual(guess_mood("아 ㅅㅂ 또냐"), "angry")
        self.assertEqual(guess_mood("미친 방금 뭐임"), "surprised")
        self.assertEqual(guess_mood("오늘 뭐 먹었어"), "talk")

    def test_first_matching_rule_wins(self):
        rules = {"laugh": ["ㅋㅋ"], "angry": ["ㅅㅂ"]}
        self.assertEqual(guess_mood("ㅅㅂ ㅋㅋ", rules), "laugh")

    def test_unknown_mood_names_are_ignored(self):
        self.assertEqual(guess_mood("ㅋㅋ", {"dance": ["ㅋㅋ"]}), "talk")


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
        self.infos = []

    def enqueue(self, clip, info=None):
        self.queue.append(clip)
        self.infos.append(info)


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

    def test_sentence_carries_text_and_mood(self):
        speaker = FakeSpeaker()
        presence = Presence()
        with redirect_stdout(io.StringIO()):
            converse(FakeBot(["아 ㅋㅋ 또 죽었냐."]), FakeTTS(), speaker, "안녕", [], 0.0, None, presence)
        self.assertEqual(speaker.infos, [{"text": "아 ㅋㅋ 또 죽었냐.", "mood": "laugh"}])
        self.assertFalse(presence.thinking)

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

    def test_speaker_reports_what_is_playing(self):
        speaker = self.make_speaker()
        info = {"text": "안녕", "mood": "talk"}
        speaker.enqueue(np.full(24000, 3000, dtype=np.int16), info)
        self.assertTrue(wait_until(lambda: speaker.now_playing == info))
        self.assertGreater(speaker.level, 0.3)
        self.assertTrue(wait_until(lambda: speaker.now_playing is None))
        self.assertEqual(speaker.level, 0.0)

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


# ── 돌멩이 창 (PySide6 있을 때만, 화면 없이 그려봄) ────

try:
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
    from PySide6.QtWidgets import QApplication

    from jjangdol.overlay import RockOverlay

    HAS_QT = True
except ImportError:
    HAS_QT = False


@unittest.skipUnless(HAS_QT, "PySide6 없음")
class OverlayTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = QApplication.instance() or QApplication([])

    def make(self, info=None, level=0.0, **presence):
        speaker = SimpleNamespace(now_playing=info, level=level)
        pres = Presence()
        for k, v in presence.items():
            setattr(pres, k, v)
        state = Path(tempfile.mkdtemp()) / "overlay.json"
        return RockOverlay(speaker, pres, {"size": 1.0}, state_file=state)

    def test_every_mood_draws(self):
        cases = [(None, {}), ({"text": "안녕", "mood": "talk"}, {})]
        cases += [({"text": "x", "mood": m}, {}) for m in ("laugh", "angry", "surprised", "sulk", "smug")]
        cases += [(None, {"thinking": True})]
        for info, pres in cases:
            w = self.make(info, 0.7, **pres)
            for _ in range(5):
                w._tick()
            self.assertFalse(w.grab().isNull())

    def test_mood_follows_speaker_and_presence(self):
        w = self.make({"text": "ㅋㅋ", "mood": "laugh"}, 0.5)
        w._tick()
        self.assertEqual(w._mood, "laugh")
        self.assertEqual(w._bubble_text, "ㅋㅋ")
        w = self.make(None, thinking=True)
        w._tick()
        self.assertEqual(w._mood, "thinking")
        w = self.make(None)
        w._presence.last_user_at -= 10_000
        w._tick()
        self.assertIn(w._mood, ("sulk", "sleepy"))

    def test_scale_is_saved(self):
        w = self.make()
        w._set_scale(1.5)
        w._save_state()
        self.assertEqual(json.loads(w._state_file.read_text())["scale"], 1.5)
        w._set_scale(9)
        self.assertEqual(w._scale, 2.0)
