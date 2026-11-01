"""마이크 입력과 스피커 출력 (sounddevice / PortAudio).

Windows는 `pip install sounddevice`에 PortAudio가 같이 들어 있음.
"""

from __future__ import annotations

import queue
import threading
import time

import numpy as np

from .stt import SAMPLE_RATE, SpeechRecognizer, resample


def _sd():
    import sounddevice as sd

    return sd


def list_devices() -> str:
    return str(_sd().query_devices())


def _device(value) -> int | str | None:
    """설정값 → sounddevice 장치. ""면 기본 장치, 숫자면 번호, 아니면 이름 일부."""
    if value in ("", None):
        return None
    if isinstance(value, int) or str(value).isdigit():
        return int(value)
    return str(value)


class Speaker:
    """음성 조각을 순서대로 재생. interrupt()로 즉시 멈추고 대기열 비움."""

    BLOCK = 2400       # 한 번에 쓰는 샘플 수 (24kHz 기준 0.1초) → 멈춤 반응 속도
    ECHO_TAIL = 0.3    # 재생 끝나고 이만큼은 아직 말하는 중으로 침 (스피커 잔향 무시용)

    def __init__(self, sample_rate: int, device=None):
        self.sample_rate = sample_rate
        self._queue: queue.Queue[tuple[int, np.ndarray]] = queue.Queue()
        self._lock = threading.Lock()
        self._generation = 0
        self._pending = 0
        self._last_end = 0.0
        sd = _sd()
        self._stream = sd.OutputStream(
            samplerate=sample_rate, channels=1, dtype="int16", device=_device(device)
        )
        self._stream.start()
        threading.Thread(target=self._run, daemon=True).start()

    @property
    def generation(self) -> int:
        """interrupt()할 때마다 1씩 늘어남. 대화 루프가 '끊겼는지' 확인할 때 씀."""
        return self._generation

    def enqueue(self, audio: np.ndarray) -> None:
        with self._lock:
            self._pending += 1
            self._queue.put((self._generation, audio))

    def interrupt(self) -> None:
        with self._lock:
            self._generation += 1
            while True:
                try:
                    self._queue.get_nowait()
                except queue.Empty:
                    break
                self._pending -= 1

    def is_speaking(self) -> bool:
        with self._lock:
            if self._pending > 0:
                return True
        return time.monotonic() - self._last_end < self.ECHO_TAIL

    def _run(self) -> None:
        while True:
            generation, audio = self._queue.get()
            try:
                for i in range(0, len(audio), self.BLOCK):
                    if generation != self._generation:
                        break
                    self._stream.write(audio[i : i + self.BLOCK])
            finally:
                with self._lock:
                    self._pending -= 1
                    self._last_end = time.monotonic()


class MicListener:
    """마이크를 계속 듣다가, 말이 끝날 때마다 인식된 텍스트를 utterances 큐에 넣는다.

    barge_in=False (기본): 짱돌이 말하는 동안은 마이크 소리를 버림 → 스피커 소리를 자기가 듣는 사고 방지
    barge_in=True: 짱돌 말하는 중에 아빠가 말하면 짱돌이 멈춤 (헤드셋 쓸 때만 켤 것)
    """

    BLOCK_SEC = 0.1

    def __init__(self, recognizer: SpeechRecognizer, speaker: Speaker, device=None, barge_in: bool = False):
        self.utterances: queue.Queue[str] = queue.Queue()
        self._recognizer = recognizer
        self._speaker = speaker
        self._barge_in = barge_in
        self._raw: queue.Queue[np.ndarray] = queue.Queue()

        sd = _sd()
        dev = _device(device)
        try:
            self._rate = SAMPLE_RATE
            self._stream = self._open(sd, dev, SAMPLE_RATE)
        except sd.PortAudioError:
            # 16kHz를 직접 못 여는 마이크면 기본 샘플레이트로 열고 변환
            self._rate = int(sd.query_devices(dev, "input")["default_samplerate"])
            self._stream = self._open(sd, dev, self._rate)
        self._worker = threading.Thread(target=self._run, daemon=True)

    def _open(self, sd, device, rate: int):
        return sd.InputStream(
            samplerate=rate,
            channels=1,
            dtype="float32",
            blocksize=int(rate * self.BLOCK_SEC),
            device=device,
            callback=self._on_audio,
        )

    def start(self) -> None:
        self._stream.start()
        self._worker.start()

    def stop(self) -> None:
        self._stream.stop()
        self._stream.close()

    def _on_audio(self, indata, frames, time_info, status) -> None:
        self._raw.put(indata[:, 0].copy())

    def _run(self) -> None:
        while True:
            self.process(self._raw.get())

    def process(self, chunk: np.ndarray) -> None:
        if self._rate != SAMPLE_RATE:
            chunk = resample(chunk, self._rate, SAMPLE_RATE)

        speaking = self._speaker.is_speaking()
        if speaking and not self._barge_in:
            self._recognizer.reset()  # 짱돌이 말하는 동안 들어온 소리는 버림
            return

        for text in self._recognizer.feed(chunk):
            self.utterances.put(text)

        if speaking and self._recognizer.speech_active:
            self._speaker.interrupt()  # 아빠가 끼어듦
