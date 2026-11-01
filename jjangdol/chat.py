"""짱돌 0단계 — 텍스트로 일반 대화 테스트.

실행:  python -m jjangdol.chat
명령:  /q 종료 · /reload 설정 파일 다시 읽기 · /reset 대화 기록 지우기
"""

from __future__ import annotations

import os
import sys
import tomllib
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


def load_system_prompt() -> str:
    persona = (CONFIG_DIR / "persona.md").read_text(encoding="utf-8")
    with open(CONFIG_DIR / "profile.toml", "rb") as f:
        profile = tomllib.load(f)
    profile_text = "\n".join(f"- {k}: {v}" for k, v in profile.items())
    return persona.replace("{profile}", profile_text)


class Jjangdol:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic()
        self.history: list[dict] = []
        self.reload()

    def reload(self) -> None:
        self.system = load_system_prompt()
        self.filter = OutputFilter(CONFIG_DIR / "filter.toml")

    def reply(self, user_text: str) -> None:
        # 시각은 시스템 프롬프트가 아니라 메시지에 붙임 → 시스템 프롬프트가 안 바뀌어서 캐시가 유지됨
        stamp = datetime.now().strftime("%H:%M")
        self.history.append({"role": "user", "content": f"[{stamp}] {user_text}"})

        print("짱돌: ", end="", flush=True)
        try:
            with self.client.messages.stream(
                model=MODEL,
                max_tokens=4096,
                system=self.system,
                messages=self.history,
                output_config={"effort": "low"},   # 수다엔 깊게 생각할 필요 없음 → 빠르고 쌈
                cache_control={"type": "ephemeral"},  # 대화가 길어지면 앞부분 자동 캐시
            ) as stream:
                for sentence in split_sentences(stream.text_stream):
                    self._say(sentence)
                final = stream.get_final_message()
        except BaseException:
            self.history.pop()  # 실패한 턴은 기록에서 뺌
            print()
            raise
        print()

        if final.stop_reason == "refusal":
            self.history.pop()
            if DEBUG:
                print(f"  [모델 거절: {final.stop_details}]", file=sys.stderr)
            print("짱돌: 아 그건 패스 ㅋㅋ")
            return

        # 필터로 가린 문장이 있어도 기록엔 모델 원문을 그대로 넣음 (thinking 블록 포함 그대로 돌려줘야 함)
        self.history.append({"role": "assistant", "content": final.content})

    def _say(self, sentence: str) -> None:
        result = self.filter.check(sentence)
        if result.allowed:
            print(sentence.strip(), end=" ", flush=True)
            return
        if DEBUG:
            print(f"\n  [필터: {result.category} / {result.reason}]", file=sys.stderr)
        if self.filter.replacement:
            print(self.filter.replacement, end=" ", flush=True)


def main() -> None:
    try:
        bot = Jjangdol()
    except (ValueError, RuntimeError, OSError) as e:
        sys.exit(f"설정 오류: {e}")
    except anthropic.AnthropicError as e:
        sys.exit(f"API 클라이언트를 못 만듦 (ANTHROPIC_API_KEY 확인): {e}")

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
        except anthropic.AuthenticationError:
            sys.exit("API 키가 틀림. ANTHROPIC_API_KEY 환경변수 확인")
        except TypeError as e:
            if "authentication" not in str(e):
                raise
            sys.exit("API 키가 없음. ANTHROPIC_API_KEY 환경변수를 설정하고 다시 실행")
        except anthropic.RateLimitError:
            print("(요청이 너무 많음. 잠깐 있다가 다시)")
        except anthropic.APIConnectionError:
            print("(인터넷 연결 확인)")
        except anthropic.APIStatusError as e:
            print(f"(API 오류 {e.status_code}: {e.message})")
        except KeyboardInterrupt:
            print("(끊음)")


if __name__ == "__main__":
    main()
