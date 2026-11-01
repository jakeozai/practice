"""텍스트 → 음성.

기본 엔진은 edge-tts: 무료이고 한국어가 자연스럽지만, 인터넷이 필요하고
Microsoft Edge "소리 내어 읽기" 기능을 비공식으로 쓰는 거라 언젠가 막힐 수 있음.
"""

from __future__ import annotations

import asyncio
import os
import re
import sys

import numpy as np

_LAUGH = re.compile(r"ㅋ{2,}")
_JAMO = re.compile(r"[ㄱ-ㅎㅏ-ㅣ]+")              # 남은 초성·모음 (ㅠㅠ 등)
_NOT_SPOKEN = re.compile(r"[^0-9A-Za-z가-힣\s.,!?~%'-]")  # 이모지·괄호·기호
_HAS_WORD = re.compile(r"[0-9A-Za-z가-힣]")
_SPACES = re.compile(r"\s+")


def to_speech_text(text: str, replacements: dict[str, str] | None = None, laugh: str = "크크") -> str:
    """화면용 문장을 소리 내 읽기 좋게 바꿈. 읽을 게 없으면 ""."""
    for key in sorted(replacements or {}, key=len, reverse=True):
        text = text.replace(key, replacements[key])
    text = _LAUGH.sub(f" {laugh} " if laugh else " ", text)
    text = _JAMO.sub(" ", text)
    text = _NOT_SPOKEN.sub(" ", text)
    text = _SPACES.sub(" ", text).strip()
    return text if _HAS_WORD.search(text) else ""


class EdgeTTS:
    sample_rate = 24000
    _CACHE_SIZE = 200

    def __init__(
        self,
        voice: str = "ko-KR-InJoonNeural",
        rate: str = "+0%",
        pitch: str = "+0Hz",
        replacements: dict[str, str] | None = None,
        laugh: str = "크크",
    ):
        import edge_tts
        import miniaudio

        self._edge_tts = edge_tts
        self._miniaudio = miniaudio
        self.voice = voice
        self.rate = rate
        self.pitch = pitch
        self.replacements = replacements or {}
        self.laugh = laugh
        self._cache: dict[str, np.ndarray] = {}

    def synthesize(self, text: str) -> np.ndarray | None:
        """int16 모노 24kHz 음성. 읽을 게 없거나 실패하면 None."""
        spoken = to_speech_text(text, self.replacements, self.laugh)
        if not spoken:
            return None
        if spoken in self._cache:
            return self._cache[spoken]
        try:
            mp3 = asyncio.run(self._fetch_mp3(spoken))
            if not mp3:
                return None
            decoded = self._miniaudio.decode(
                mp3,
                output_format=self._miniaudio.SampleFormat.SIGNED16,
                nchannels=1,
                sample_rate=self.sample_rate,
            )
        except Exception as e:  # 네트워크·서비스 오류: 말만 못 하고 대화는 계속
            print(f"\n  [TTS 실패: {type(e).__name__}: {e}]", file=sys.stderr)
            return None
        audio = np.frombuffer(decoded.samples, dtype=np.int16).copy()
        if len(self._cache) >= self._CACHE_SIZE:
            self._cache.pop(next(iter(self._cache)))
        self._cache[spoken] = audio
        return audio

    async def _fetch_mp3(self, text: str) -> bytes:
        communicate = self._edge_tts.Communicate(
            text,
            self.voice,
            rate=self.rate,
            pitch=self.pitch,
            proxy=os.environ.get("HTTPS_PROXY") or None,  # 프록시 쓰는 환경 대비 (보통은 없음)
        )
        data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                data += chunk["data"]
        return bytes(data)
