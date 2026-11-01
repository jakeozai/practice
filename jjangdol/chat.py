"""짱돌 두뇌 + 0단계 텍스트 대화.

실행:  python -m jjangdol.chat
명령:  /q 종료 · /reload 설정 파일 다시 읽기 · /reset 대화 기록 지우기
"""

from __future__ import annotations

import os
import sys
import tomllib
from collections.abc import Iterator
from datetime import datetime
from pathlib import Path

import anthropic

from .filter import OutputFilter
from .sentences import split_sentences

ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT / "config"

# 가성비 기본값. 센스가 부족하면 JJANGDOL_MODEL=claude-sonnet-5-5 로 바꿔서 비교.
MODEL = os.environ.get("JJANGDOL_MODEL", "claude-haiku-5-5")
DEBUG = os.environ.get("JJANGDOL_DEBUG") == "1"
REFUSAL_LINE = "아 그건 패스 ㅋㅋ"


def load_system_prompt() -> str:
    persona = (CONFIG_DIR / "persona.md").read_text(encoding="utf-8")
    with open(CONFIG_DIR / "profile.toml", "rb") as f:
        profile = tomllib.load(f)
    profile_text = "\n".join(f"- {k}: {v}" for k, v in profile.items())
    return persona.replace("{profile}", profile_text)


class Jjangdol:
    def __init__(self, extra_system: str = "") -> None:
        self.client = anthropic.Anthropic()
        self.history: list[dict] = []
        self.extra_system = extra_system.strip()
        self.reload()

    def reload(self) -> None:
        system = load_system_prompt()
        if self.extra_system:
            system = f"{system.rstrip()}\n\n{self.extra_system}\n"
        self.system = system
        self.filter = OutputFilter(CONFIG_DIR / "filter.toml")

    def respond(self, user_text: str) -> Iterator[str]:
        """아빠 말에 대한 대답을, 필터를 통과한 문장 단위로 하나씩 내보낸다."""
        # 시각은 시스템 프롬프트가 아니라 메시지에 붙임 → 시스템 프롬프트가 안 바뀌어서 캐시가 유지됨
        stamp = datetime.now().strftime("%H:%M")
        self.history.append({"role": "user", "content": f"[{stamp}] {user_text}"})
        try:
            with self.client.messages.stream(
                model=MODEL,
                max_tokens=4096,
                system=self.system,
                messages=self.history,
                output_config={"effort": "low"},      # 수다엔 깊게 생각할 필요 없음 → 빠르고 쌈
                cache_control={"type": "ephemeral"},  # 대화가 길어지면 앞부분 자동 캐시
            ) as stream:
                for sentence in split_sentences(stream.text_stream):
                    said = self._filtered(sentence)
                    if said:
                        yield said
                final = stream.get_final_message()
        except BaseException:
            # 실패했거나 중간에 끊긴 턴(아빠가 끼어든 경우 등)은 기록에서 뺌
            self.history.pop()
            raise

        if final.stop_reason == "refusal":
            self.history.pop()
            if DEBUG:
                print(f"\n  [모델 거절: {final.stop_details}]", file=sys.stderr)
            yield REFUSAL_LINE
            return

        # 필터로 가린 문장이 있어도 기록엔 모델 원문을 그대로 넣음 (thinking 블록 포함 그대로 돌려줘야 함)
        self.history.append({"role": "assistant", "content": final.content})

    def reply(self, user_text: str) -> None:
        """텍스트 모드: 대답을 화면에 출력."""
        print("짱돌: ", end="", flush=True)
        try:
            for sentence in self.respond(user_text):
                print(sentence, end=" ", flush=True)
        finally:
            print()

    def _filtered(self, sentence: str) -> str:
        sentence = sentence.strip()
        if not sentence:
            return ""
        result = self.filter.check(sentence)
        if result.allowed:
            return sentence
        if DEBUG:
            print(f"\n  [필터: {result.category} / {result.reason}]", file=sys.stderr)
        return self.filter.replacement


def describe_api_error(e: BaseException) -> tuple[str, bool] | None:
    """API 오류를 읽을 수 있는 메시지로. (메시지, 더 진행 불가 여부). 모르는 오류면 None."""
    if isinstance(e, anthropic.AuthenticationError):
        return "API 키가 틀림. ANTHROPIC_API_KEY 환경변수 확인", True
    if isinstance(e, TypeError) and "authentication" in str(e):
        return "API 키가 없음. ANTHROPIC_API_KEY 환경변수를 설정하고 다시 실행", True
    if isinstance(e, anthropic.RateLimitError):
        return "요청이 너무 많음. 잠깐 있다가 다시", False
    if isinstance(e, anthropic.APIConnectionError):
        return "인터넷 연결 확인", False
    if isinstance(e, anthropic.APIStatusError):
        return f"API 오류 {e.status_code}: {e.message}", False
    return None


def main() -> None:
    try:
        bot = Jjangdol()
    except (ValueError, RuntimeError, OSError) as e:
        sys.exit(f"설정 오류: {e}")

    print(f"짱돌 테스트 ({MODEL}) — /q 종료 · /reload 설정 다시 읽기 · /reset 기록 지우기")
    while True:
        try:
            text = input("아빠: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not text:
            continue
        if text in ("/q", "/quit"):
            break
        if text == "/reload":
            try:
                bot.reload()
                print("(설정 다시 읽음)")
            except (ValueError, RuntimeError, OSError) as e:
                print(f"(설정 오류, 이전 설정 유지: {e})")
            continue
        if text == "/reset":
            bot.history.clear()
            print("(대화 기록 지움)")
            continue

        try:
            bot.reply(text)
        except KeyboardInterrupt:
            print("(끊음)")
        except Exception as e:
            described = describe_api_error(e)
            if described is None:
                raise
            message, fatal = described
            if fatal:
                sys.exit(message)
            print(f"({message})")


if __name__ == "__main__":
    main()
