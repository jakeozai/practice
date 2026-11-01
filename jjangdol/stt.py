"""음성 → 텍스트 (전부 로컬, CPU).

말 끝 감지는 Silero VAD, 인식은 SenseVoice (sherpa-onnx).
모델은 `python -m jjangdol.download_models`로 먼저 받아둬야 함.
"""

from __future__ import annotations

import re
import time
from pathlib import Path

import numpy as np

SAMPLE_RATE = 16000
_HAS_WORD = re.compile(r"[0-9A-Za-z가-힣]")


def resample(samples: np.ndarray, src_rate: int, dst_rate: int) -> np.ndarray:
    """간단한 선형 보간 리샘플링 (음성인식용으로는 충분)."""
    if src_rate == dst_rate or len(samples) == 0:
        return samples.astype(np.float32, copy=False)
    n_out = int(round(len(samples) * dst_rate / src_rate))
    x_old = np.linspace(0.0, 1.0, num=len(samples), endpoint=False)
    x_new = np.linspace(0.0, 1.0, num=n_out, endpoint=False)
    return np.interp(x_new, x_old, samples).astype(np.float32)


class SpeechRecognizer:
    """16kHz float32 소리를 계속 넣으면, 말이 끝날 때마다 문장 텍스트를 돌려준다."""

    def __init__(self, models_dir: Path, vad: dict | None = None, num_threads: int = 2):
        import sherpa_onnx

        vad = vad or {}
        vad_model = models_dir / "silero_vad.onnx"
        asr_model = models_dir / "sense-voice" / "model.int8.onnx"
        tokens = models_dir / "sense-voice" / "tokens.txt"
        missing = [p for p in (vad_model, asr_model, tokens) if not p.exists()]
        if missing:
            raise FileNotFoundError(
                f"음성인식 모델이 없음: {missing[0]}\n먼저 python -m jjangdol.download_models 실행"
            )

        cfg = sherpa_onnx.VadModelConfig()
        cfg.silero_vad.model = str(vad_model)
        cfg.silero_vad.threshold = vad.get("threshold", 0.5)
        cfg.silero_vad.min_silence_duration = vad.get("min_silence", 0.5)
        cfg.silero_vad.min_speech_duration = vad.get("min_speech", 0.25)
        cfg.silero_vad.max_speech_duration = vad.get("max_speech", 15)
        cfg.sample_rate = SAMPLE_RATE
        cfg.num_threads = 1
        self._window = cfg.silero_vad.window_size
        self._vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=30)

        self._asr = sherpa_onnx.OfflineRecognizer.from_sense_voice(
            model=str(asr_model),
            tokens=str(tokens),
            num_threads=num_threads,
            language="ko",
            use_itn=True,
        )
        self._pending = np.zeros(0, dtype=np.float32)
        self.last_ms = 0  # 마지막 인식에 걸린 시간 (지연 측정용)

    @property
    def speech_active(self) -> bool:
        """지금 누가 말하는 중인지."""
        return self._vad.is_speech_detected()

    def feed(self, samples: np.ndarray) -> list[str]:
        self._pending = np.concatenate([self._pending, samples.astype(np.float32, copy=False)])
        texts = []
        while len(self._pending) >= self._window:
            self._vad.accept_waveform(self._pending[: self._window])
            self._pending = self._pending[self._window :]
            while not self._vad.empty():
                segment = self._vad.front.samples
                self._vad.pop()
                text = self.transcribe(np.asarray(segment, dtype=np.float32))
                if text:
                    texts.append(text)
        return texts

    def transcribe(self, samples: np.ndarray) -> str:
        start = time.monotonic()
        stream = self._asr.create_stream()
        stream.accept_waveform(SAMPLE_RATE, samples)
        self._asr.decode_stream(stream)
        self.last_ms = int((time.monotonic() - start) * 1000)
        text = stream.result.text.strip()
        return text if _HAS_WORD.search(text) else ""  # 기침·잡음만 잡힌 건 버림

    def reset(self) -> None:
        self._vad.reset()
        self._pending = np.zeros(0, dtype=np.float32)
