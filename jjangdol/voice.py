"""짱돌 음성 대화 + 화면 구석 돌멩이.

준비:  python -m jjangdol.download_models   (처음 한 번, 약 160MB)
실행:  python -m jjangdol.voice
옵션:  --devices     마이크·스피커 목록
       --no-overlay  돌멩이 창 없이 음성만
종료:  Ctrl+C, 또는 돌멩이 오른쪽 클릭 → 짱돌 끄기
"""

from __future__ import annotations

import argparse
import random
import sys
import threading
import time
import tomllib

from . import audio
from .chat import CONFIG_DIR, DEBUG, MODEL, ROOT, Jjangdol, describe_api_error
from .mood import Presence, guess_mood
from .stt import SpeechRecognizer
from .tts import EdgeTTS

MODELS_DIR = ROOT / "models"


def load_voice_config() -> dict:
    with open(CONFIG_DIR / "voice.toml", "rb") as f:
        return tomllib.load(f)


def prepare_fillers(tts: EdgeTTS, cfg: dict) -> list:
    """맞장구 음성을 미리 만들어 둠 (대화 중엔 바로 재생)."""
    if not cfg.get("enabled", True):
        return []
    clips = [tts.synthesize(line) for line in cfg.get("lines", [])]
    return [c for c in clips if c is not None]


def converse(
    bot,
    tts,
    speaker,
    text: str,
    fillers: list,
    filler_chance: float,
    mood_rules: dict | None = None,
    presence: Presence | None = None,
) -> float | None:
    """한 턴: 아빠 말 → (맞장구) → 짱돌 대답을 문장마다 음성으로. 첫 음성까지 걸린 초를 돌려줌."""
    print(f"아빠: {text}")
    turn = speaker.generation
    started = time.monotonic()
    if presence is not None:
        presence.thinking = True
    if fillers and random.random() < filler_chance:
        speaker.enqueue(random.choice(fillers), {"text": None, "mood": "talk"})

    first_audio = None
    print("짱돌: ", end="", flush=True)
    replies = bot.respond(text)
    try:
        for sentence in replies:
            if speaker.generation != turn:  # 아빠가 끼어들어서 멈춤 → 나머지 대답 버림
                break
            print(sentence, end=" ", flush=True)
            clip = tts.synthesize(sentence)
            if clip is not None and speaker.generation == turn:
                speaker.enqueue(clip, {"text": sentence, "mood": guess_mood(sentence, mood_rules)})
                if first_audio is None:
                    first_audio = time.monotonic() - started
                    if presence is not None:
                        presence.thinking = False
    finally:
        replies.close()
        if presence is not None:
            presence.thinking = False
        print()
    return first_audio


def conversation_loop(mic, bot, tts, speaker, recognizer, fillers, cfg: dict, presence: Presence) -> None:
    """마이크에서 말이 들어올 때마다 대답. 끝내야 하는 오류면 presence.quit_message를 남기고 끝남."""
    filler_chance = cfg.get("filler", {}).get("chance", 0.6)
    mood_rules = cfg.get("overlay", {}).get("moods")
    while True:
        text = mic.utterances.get()
        presence.heard_user()
        try:
            first_audio = converse(bot, tts, speaker, text, fillers, filler_chance, mood_rules, presence)
        except Exception as e:
            described = describe_api_error(e)
            if described is None:
                presence.quit_message = f"예상 못 한 오류: {type(e).__name__}: {e}"
                raise
            message, fatal = described
            if fatal:
                presence.quit_message = message
                return
            print(f"({message})")
            continue
        if DEBUG and first_audio is not None:
            print(f"  [지연] 인식 {recognizer.last_ms}ms → 첫 문장 음성까지 {first_audio * 1000:.0f}ms")


def main() -> None:
    parser = argparse.ArgumentParser(description="짱돌 음성 대화")
    parser.add_argument("--devices", action="store_true", help="마이크·스피커 목록 보기")
    parser.add_argument("--no-overlay", action="store_true", help="돌멩이 창 없이 음성만")
    args = parser.parse_args()
    if args.devices:
        try:
            print(audio.list_devices())
        except OSError as e:
            sys.exit(f"오디오 장치를 못 읽음: {e}")
        return

    try:
        cfg = load_voice_config()
        recognizer = SpeechRecognizer(
            MODELS_DIR, cfg.get("vad", {}), cfg.get("stt", {}).get("num_threads", 2)
        )
        bot = Jjangdol(extra_system=cfg.get("persona", {}).get("voice_note", ""))
    except (FileNotFoundError, ValueError, RuntimeError, OSError) as e:
        sys.exit(f"준비 실패: {e}")

    overlay_cfg = cfg.get("overlay", {})
    run_overlay = None
    if overlay_cfg.get("enabled", True) and not args.no_overlay:
        try:
            from .overlay import run_overlay
        except ImportError as e:
            print(f"(돌멩이 창을 못 띄움: {e}. pip install PySide6-Essentials 하면 됨. 일단 음성만)")

    tts_cfg = cfg.get("tts", {})
    tts = EdgeTTS(
        voice=tts_cfg.get("voice", "ko-KR-InJoonNeural"),
        rate=tts_cfg.get("rate", "+0%"),
        pitch=tts_cfg.get("pitch", "+0Hz"),
        replacements=tts_cfg.get("replace", {}),
        laugh=tts_cfg.get("laugh", "크크"),
    )
    filler_cfg = cfg.get("filler", {})
    print("맞장구 음성 준비 중...")
    fillers = prepare_fillers(tts, filler_cfg)
    if filler_cfg.get("enabled", True) and not fillers:
        print("(맞장구 음성을 못 만듦. 인터넷 연결 확인. 대화는 그냥 진행)")

    audio_cfg = cfg.get("audio", {})
    try:
        speaker = audio.Speaker(tts.sample_rate, audio_cfg.get("output_device"))
        mic = audio.MicListener(
            recognizer, speaker, audio_cfg.get("input_device"), audio_cfg.get("barge_in", False)
        )
        mic.start()
    except Exception as e:  # 장치 이름 오타, 마이크 권한 없음 등
        sys.exit(f"마이크/스피커를 못 열음: {e}\n장치 목록: python -m jjangdol.voice --devices")

    presence = Presence()
    loop_args = (mic, bot, tts, speaker, recognizer, fillers, cfg, presence)
    print(f"짱돌 음성 모드 ({MODEL}) — 그냥 말하면 됨. 종료는 Ctrl+C")
    try:
        if run_overlay is not None:
            # 창(Qt)은 메인 스레드에서만 돌 수 있어서, 대화는 뒤에서 돌림
            threading.Thread(target=conversation_loop, args=loop_args, daemon=True).start()
            run_overlay(speaker, presence, overlay_cfg)  # 창을 끄거나 Ctrl+C면 여기서 빠져나옴
        else:
            conversation_loop(*loop_args)
    except KeyboardInterrupt:
        pass
    finally:
        mic.stop()

    if presence.quit_message:
        sys.exit(presence.quit_message)
    print("\n짱돌: 가냐? 딸내미 잘 봐라")


if __name__ == "__main__":
    main()
