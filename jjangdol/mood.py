"""짱돌 표정 고르기 + 대화 스레드와 오버레이가 같이 보는 상태."""

from __future__ import annotations

import time
from dataclasses import dataclass, field

MOODS = ("talk", "laugh", "angry", "surprised", "sulk", "smug")

DEFAULT_RULES: dict[str, list[str]] = {
    "laugh": ["ㅋㅋ", "크크", "ㅎㅎ", "웃기"],
    "angry": ["ㅅㅂ", "씨발", "빡치", "빡쳐", "개같"],
    "surprised": ["미친", "헐", "뭐임", "대박", "ㄷㄷ", "?!"],
    "sulk": ["됐어", "서운", "흥"],
    "smug": ["내 덕", "당연", "역시 나"],
}


def guess_mood(text: str, rules: dict[str, list[str]] | None = None) -> str:
    """대사에 들어 있는 말로 표정을 고름. 규칙은 위에서부터 먼저 걸리는 것 (config/voice.toml [overlay.moods])."""
    for mood, words in (rules or DEFAULT_RULES).items():
        if mood in MOODS and any(w in text for w in words):
            return mood
    return "talk"


@dataclass
class Presence:
    """대화 스레드가 쓰고 오버레이가 읽는 상태."""

    last_user_at: float = field(default_factory=time.monotonic)  # 아빠가 마지막으로 말한 시각
    thinking: bool = False        # 아빠 말 듣고 대답 만드는 중
    quit_message: str | None = None  # 대화 스레드가 끝내야 할 오류를 만나면 여기에

    def heard_user(self) -> None:
        self.last_user_at = time.monotonic()

    def idle_seconds(self) -> float:
        return time.monotonic() - self.last_user_at
