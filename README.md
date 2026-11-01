# 짱돌

게임 같이 하는 AI 친구 (입만 달린 돌멩이). 기획은 [PLAN.md](PLAN.md).

## 설치 (처음 한 번)

필요한 것: Windows, Python 3.11 이상, Anthropic API 키, 마이크·스피커(헤드셋)

```powershell
pip install -r requirements.txt
python -m jjangdol.download_models      # 음성인식 모델 (약 160MB)

$env:ANTHROPIC_API_KEY="키"             # PowerShell. 매번 치기 싫으면 시스템 환경변수에 등록
```

## 음성으로 대화

```powershell
python -m jjangdol.voice
```

- 그냥 말하면 됨. 말 끝나고 0.5초 조용하면 짱돌이 대답함
- 종료: `Ctrl+C`
- 마이크·스피커가 여러 개면: `python -m jjangdol.voice --devices`로 목록 보고 `config/voice.toml`의 `input_device` / `output_device`에 이름 일부나 번호 적기
- 헤드셋을 쓰면 `barge_in = true`로 켜기 → 짱돌 말하는 중에 끼어들면 짱돌이 멈춤 (스피커로 들을 땐 끄기. 짱돌이 자기 목소리를 듣고 멈춤)

## 텍스트로 대화

```powershell
python -m jjangdol.chat
```

채팅 명령: `/q` 종료 · `/reload` 설정 파일 다시 읽기 · `/reset` 대화 기록 지우기

## 설정 파일

| 파일 | 내용 |
|---|---|
| `config/persona.md` | 말투·성격·욕 수위 |
| `config/profile.toml` | 아빠 정보 (호칭, 가족 등) |
| `config/filter.toml` | 출력 필터 (카테고리별 켜고 끄기, 차단 패턴, 대체 문구) |
| `config/voice.toml` | 마이크·스피커, 말 끝 감지 민감도, 목소리·말 빠르기, 줄임말 읽기, 맞장구 |

## 옵션 (환경변수)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `JJANGDOL_MODEL` | `claude-haiku-5-5` | 센스 비교용으로 `claude-sonnet-5-5` |
| `JJANGDOL_DEBUG` | 꺼짐 | `1`이면 필터에 걸린 이유, 음성 모드 지연 시간(인식 → 첫 음성)을 표시 |

## 대답이 느리면 (`config/voice.toml`)

- `[vad] min_silence`를 0.5 → 0.3으로 줄이면 말 끝 판단이 빨라짐 (대신 말 중간에 끊길 수 있음)
- `[filler] chance`를 올리면 맞장구가 더 자주 나와서 기다리는 느낌이 줄어듦
- `JJANGDOL_DEBUG=1`로 어디서 느린지 확인

## 테스트

```powershell
python -m unittest
```
