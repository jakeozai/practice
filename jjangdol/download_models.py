"""음성인식에 필요한 모델을 models/ 폴더로 내려받는다 (처음 한 번만).

실행:  python -m jjangdol.download_models

- silero_vad.onnx   : 말 시작/끝 감지 (약 1MB)
- sense-voice/      : 한국어 포함 다국어 음성인식, int8 (다운로드 약 160MB → 필요한 파일만 풀어서 약 230MB)
"""

from __future__ import annotations

import argparse
import shutil
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models"
VAD_URL = f"{BASE}/silero_vad.onnx"
SENSE_VOICE_NAME = "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17"
SENSE_VOICE_URL = f"{BASE}/{SENSE_VOICE_NAME}.tar.bz2"
# 압축 안에서 꺼낼 파일 → 저장할 이름
SENSE_VOICE_FILES = {
    "model.int8.onnx": "model.int8.onnx",
    "tokens.txt": "tokens.txt",
    "test_wavs/ko.wav": "test_ko.wav",
}


def _download(url: str, dest: Path) -> None:
    print(f"받는 중: {url}")
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url) as resp, open(tmp, "wb") as out:
        total = int(resp.headers.get("Content-Length", 0))
        done = 0
        while chunk := resp.read(1 << 20):
            out.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r  {done * 100 // total:3d}%  ({done >> 20}/{total >> 20} MB)", end="", flush=True)
    print()
    tmp.replace(dest)


def download_vad(models_dir: Path) -> None:
    dest = models_dir / "silero_vad.onnx"
    if dest.exists():
        print(f"이미 있음: {dest}")
        return
    _download(VAD_URL, dest)


def download_sense_voice(models_dir: Path) -> None:
    target = models_dir / "sense-voice"
    if all((target / name).exists() for name in SENSE_VOICE_FILES.values()):
        print(f"이미 있음: {target}")
        return
    target.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmpdir:
        archive = Path(tmpdir) / "sense-voice.tar.bz2"
        _download(SENSE_VOICE_URL, archive)
        print("압축 푸는 중...")
        with tarfile.open(archive, "r:bz2") as tar:
            for inner, saved in SENSE_VOICE_FILES.items():
                member = tar.getmember(f"{SENSE_VOICE_NAME}/{inner}")
                src = tar.extractfile(member)
                if src is None:
                    raise RuntimeError(f"압축 안에 {inner}가 파일이 아님")
                with src, open(target / saved, "wb") as out:
                    shutil.copyfileobj(src, out)


def main() -> None:
    parser = argparse.ArgumentParser(description="짱돌 음성인식 모델 다운로드")
    parser.add_argument("--dir", type=Path, default=ROOT / "models", help="저장 폴더 (기본: models/)")
    args = parser.parse_args()
    args.dir.mkdir(parents=True, exist_ok=True)
    try:
        download_vad(args.dir)
        download_sense_voice(args.dir)
    except OSError as e:
        sys.exit(f"다운로드 실패: {e}")
    print(f"끝. 모델 위치: {args.dir}")


if __name__ == "__main__":
    main()
