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
- 종료: `Ctrl+C`, 또는 돌멩이 오른쪽 클릭 → 짱돌 끄기
- 마이크·스피커가 여러 개면: `python -m jjangdol.voice --devices`로 목록 보고 `config/voice.toml`의 `input_device` / `output_device`에 이름 일부나 번호 적기
- 헤드셋을 쓰면 `barge_in = true`로 켜기 → 짱돌 말하는 중에 끼어들면 짱돌이 멈춤 (스피커로 들을 땐 끄기. 짱돌이 자기 목소리를 듣고 멈춤)

## 화면 구석 돌멩이

음성 모드를 켜면 화면 오른쪽 아래에 짱돌이 뜸. 말할 때 소리 크기에 맞춰 입이 움직이고, 말풍선에 대사가 나옴.

- **이동:** 왼쪽 버튼으로 끌기 · **크기:** 돌멩이 위에서 마우스 휠 → 위치·크기는 다음에도 기억함
- **오른쪽 클릭:** 크기·위치 초기화 / 짱돌 끄기
- **표정:** 대사에 따라 웃음·빡침·놀람·히죽·삐짐. 대답 생각할 땐 갸웃하면서 "...", 오래 말 안 걸면 삐지고, 새벽엔 졺. 어떤 말에 어떤 표정인지는 `config/voice.toml`의 `[overlay.moods]`
- **게임할 때:** 위치를 정해둔 다음 `click_through = true`로 바꾸면 마우스가 돌멩이를 통과함
- 게임이 **전체화면(독점)** 이면 돌멩이가 안 보임 → 게임 설정에서 **테두리 없는 창 모드**로
- 돌멩이 없이 음성만: `python -m jjangdol.voice --no-overlay`

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
| `config/voice.toml` | 마이크·스피커, 말 끝 감지 민감도, 목소리·말 빠르기, 줄임말 읽기, 맞장구, 돌멩이 창 |

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
