# 짱돌

게임 같이 하는 AI 친구 (입만 달린 돌멩이). 기획은 [PLAN.md](PLAN.md).

## 0단계: 텍스트로 대화 테스트

필요한 것: Python 3.11 이상, Anthropic API 키

```bash
pip install -r requirements.txt

# macOS/Linux
export ANTHROPIC_API_KEY=키
# Windows PowerShell
$env:ANTHROPIC_API_KEY="키"

python -m jjangdol.chat
```

채팅 명령: `/q` 종료 · `/reload` 설정 파일 다시 읽기 · `/reset` 대화 기록 지우기

## 설정 파일 (고치고 `/reload` 하면 바로 반영)

| 파일 | 내용 |
|---|---|
| `config/persona.md` | 말투·성격·욕 수위 |
| `config/profile.toml` | 아빠 정보 (호칭, 가족 등) |
| `config/filter.toml` | 출력 필터 (카테고리별 켜고 끄기, 차단 패턴, 대체 문구) |

## 옵션 (환경변수)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `JJANGDOL_MODEL` | `claude-haiku-5-5` | 센스 비교용으로 `claude-sonnet-5-5` |
| `JJANGDOL_DEBUG` | 꺼짐 | `1`이면 필터에 걸린 이유를 화면에 표시 |

## 테스트

```bash
python -m unittest
```
