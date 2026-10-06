# 서술형 예제 음성 생성 개발 문서

Gemini 3.8 TTS API로 「26 보상관리사 2차 서술형 예제」 음성 대본을 오디오 파일로 만드는 절차와 명세입니다.

- 기준 문서: ai.google.dev 의 Text-to-speech generation (2026-10-01 갱신본)
- 구현 파일: `tts_pipeline.py`
- 입력 파일: `26_서술형예제_책자판_음성대본.json` (44문항)

## 1. 요약

| 항목 | 값 |
|---|---|
| 모델 | `gemini-3.8-flash-lite-tts` (기본), `gemini-3.8-flash-tts` (고음질) |
| 호출 방식 | `models.generate_content` 단건 요청 |
| 생성 단위 | 문항별 문제 1개 + 답안 1개 = 88개 요청 |
| 출력 형식 | WAV (24 kHz, 모노, 16비트 PCM, RIFF 헤더 포함) |
| 후처리 | 로컬에서 이어 붙여 문항별 합본 44개, 10문항 묶음 5개 생성 |
| 예상 분량 | 약 45~50분 (글자 수 기준 추정) |

10문항을 한 번에 요청하지 않고 문항별로 생성한 뒤 로컬에서 합칩니다. 이유는 세 가지입니다.

1. 요청당 출력 한도 때문에 10문항 묶음은 끝이 잘릴 수 있습니다 (7절 참고).
2. 문제와 답안 사이의 쉼 길이를 초 단위로 정확히 넣을 수 있습니다.
3. 한 문항을 고쳤을 때 그 파일 하나만 다시 생성하면 됩니다.

## 2. 처리 흐름

```
음성대본.json
   │  generate  (API 호출 88회)
   ▼
audio/raw/q01_문제.wav, q01_답안.wav … q44_답안.wav
   │  build     (API 호출 없음)
   ▼
audio/items/q01.wav … q44.wav        문제 + 쉼 4초 + 답안
audio/bundles/묶음1_01-10.wav …      10문항씩, 문항 사이 쉼 2초
```

## 3. 사전 준비

1. Google AI Studio에서 API 키를 발급합니다.
2. 키를 환경변수에 넣습니다. 코드나 저장소에 키를 적지 않습니다.
   ```bash
   export GEMINI_API_KEY="발급받은 키"
   ```
3. SDK를 설치합니다. 음성 목록 조회(`voices.list`)는 `google-genai` 2.25.0 이상이 필요합니다.
   ```bash
   pip install -U google-genai
   ```
4. MP3 변환을 쓰려면 `ffmpeg`를 설치합니다 (맥: `brew install ffmpeg`).
5. 구글 클라우드 결제 화면에서 예산 알림을 설정합니다. 이 작업의 예상 비용은 9절에 있습니다.

## 4. 입력 데이터

`26_서술형예제_책자판_음성대본.json`은 문항 객체의 배열입니다.

| 필드 | 예시 | 설명 |
|---|---|---|
| `id` | `"01"` | 책자·음성 공통 번호 (01~44) |
| `title` | `"공익사업 준비 단계의 절차와 손실보상"` | 문항 제목 |
| `question_speech` | `"1번. 제목. 문제. …"` | 문제 음성 대본 |
| `answer_speech` | `"답안. 순서는 …"` | 답안 음성 대본 |
| `question_file` / `answer_file` | `q01_문제.mp3` | 권장 파일명 |
| `orig_no` | `"4"` | 문제집 원문 번호 (참고용) |
| `stars` | `3` | 문제집 중요도 표시 |

대본은 귀로 듣는 글로 편집되어 있습니다. 기호는 말로 풀었고, 항목은 "첫째, 둘째"로 읽습니다.

## 5. API 명세

### 5.1 요청

Gemini 3.8 TTS는 `text`를 **글자 그대로 읽습니다.** "천천히 읽어줘" 같은 지시를 `text`에 넣으면 그 말까지 읽습니다. 말투 지시는 `speech_metadata.style`에 따로 넣습니다.

```python
from google import genai

client = genai.Client()   # GEMINI_API_KEY 환경변수 사용

response = client.models.generate_content(
    model="gemini-3.8-flash-lite-tts",
    contents=[{
        "role": "user",
        "parts": [{
            "text": "1번. 공익사업 준비 단계의 절차와 손실보상. 문제. …",
            "speech_metadata": {"style": "calm, clear lecture narration"},
        }],
    }],
    config={
        "response_modalities": ["AUDIO"],
        "speech_config": {"voice_config": {"voice": "Kore"}},
    },
)

data = response.candidates[0].content.parts[0].inline_data.data
with open("q01_문제.wav", "wb") as f:
    f.write(data)
```

REST로 호출할 때의 엔드포인트와 본문은 다음과 같습니다.

```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite-tts:generateContent
헤더: x-goog-api-key: $GEMINI_API_KEY, Content-Type: application/json
```

```json
{
  "contents": [{
    "role": "user",
    "parts": [{
      "text": "읽을 대본",
      "speech_metadata": {"style": "calm, clear lecture narration"}
    }]
  }],
  "generationConfig": {
    "responseModalities": ["AUDIO"],
    "speechConfig": {"voiceConfig": {"voice": "Kore"}}
  }
}
```

REST 응답의 `candidates[0].content.parts[0].inlineData.data`는 base64 문자열이므로 디코딩해서 저장합니다.

### 5.2 응답 형식

| 요청 종류 | 기본 출력 |
|---|---|
| 단건 (`generate_content`) | 완성된 WAV. RIFF 헤더 포함, 24 kHz, 모노, 16비트 PCM |
| 스트리밍 (`generate_content_stream`) | 헤더 없는 원시 PCM 조각 (24 kHz, 모노, 16비트) |

단건 응답은 받은 바이트를 그대로 `.wav`로 저장하면 됩니다. 이전 모델(3.1 프리뷰)은 원시 PCM을 돌려줘서 WAV 헤더를 직접 붙여야 했지만, 3.8에서는 필요 없습니다.

형식을 바꾸려면 `config`에 `response_format`을 넣습니다. 지원 값은 `AUDIO_WAV`, `AUDIO_L16`, `AUDIO_MULAW`, `AUDIO_ALAW`이고 `sample_rate`도 지정할 수 있습니다. MP3 출력은 목록에 없으므로 로컬에서 변환합니다.

## 6. 음성과 말투 설정

### 6.1 음성 선택

- 기본 제공 음성은 30개입니다 (Kore, Puck, Charon, Aoede 등).
- 확장 음성 라이브러리는 API로 조회합니다. 아래 명령은 한국어 음성을 출력합니다.
  ```bash
  python tts_pipeline.py voices
  ```
- 원하는 음성의 이름 또는 ID를 `tts_pipeline.py` 상단의 `VOICE`에 넣습니다.
- **88개 전부 같은 음성, 같은 스타일로 생성합니다.** 중간에 바꾸면 이어 붙였을 때 목소리가 달라집니다.

### 6.2 스타일

- `STYLE`은 짧은 한 문장으로 둡니다. 공식 문서는 긴 지시문이 음성 흔들림의 주된 원인이라고 안내합니다.
- 먼저 스타일 없이(`STYLE = ""`) 한 문항을 만들어 들어보고, 필요할 때만 짧게 추가합니다.
- 나이·성별·억양 같은 화자 특성은 스타일로 바꾸지 말고 음성 자체를 바꿉니다.

### 6.3 쉼 넣기

대본 안에 꺾쇠 태그를 넣으면 그 자리에서 쉽니다. 한국어 대본에서도 태그는 영어로 씁니다.

```
1번. 기본조사서 작성 기준. 문제. … 그 기준을 설명하시오. <long pause> 답안. 첫째, …
```

이 프로젝트는 쉼을 태그로 넣지 않고 후처리에서 무음 구간으로 넣습니다. 길이를 초 단위로 정할 수 있기 때문입니다.

## 7. 제한 사항

| 항목 | 내용 |
|---|---|
| 입출력 | 텍스트만 입력, 오디오만 출력 |
| 요청당 길이 | 모델 페이지 기준 입력 8,192토큰, 출력 16,384토큰. 음성은 초당 25토큰이라 한 요청에 약 11분까지. 실행 전에 모델 페이지에서 다시 확인할 것 |
| 다중 화자 | 한 요청에 2명까지, 기본 제공 음성만 가능 |
| WAV 이어 붙이기 | 파일마다 44바이트 헤더가 있으므로 헤더를 떼고 PCM만 이어야 함 |
| 맞춤 음성 | 프로젝트당 200개, 마지막 사용 후 1년 보관 |

이 프로젝트에서 가장 긴 답안은 약 800자로 3분 안쪽이라, 문항별 생성에서는 길이 한도에 걸리지 않습니다.

## 8. 실행 방법

```bash
# 1) 한 문항만 만들어 음성과 말투 확인
python tts_pipeline.py test 2

# 2) 전체 생성 (88개). 이미 만든 파일은 건너뜀
python tts_pipeline.py generate

# 3) 합치기: 문항별 합본 44개 + 묶음 5개. --mp3 를 붙이면 MP3도 생성
python tts_pipeline.py build --mp3
```

### 8.1 설정값 (`tts_pipeline.py` 상단)

| 이름 | 기본값 | 설명 |
|---|---|---|
| `MODEL` | `gemini-3.8-flash-lite-tts` | 모델 ID |
| `VOICE` | `Kore` | 음성 이름 또는 ID |
| `STYLE` | `calm, clear lecture narration` | 말투. 빈 문자열이면 지시 없음 |
| `PAUSE_QA` | `4.0` | 문제와 답안 사이 쉼(초) |
| `PAUSE_ITEM` | `2.0` | 문항 사이 쉼(초) |
| `BUNDLE_SIZE` | `10` | 묶음당 문항 수 |

### 8.2 동작 규칙

- **재실행 안전**: `audio/raw`에 파일이 있으면 그 문항은 다시 호출하지 않습니다. 중간에 멈춰도 `generate`를 다시 실행하면 이어서 만듭니다.
- **부분 재생성**: 대본을 고친 문항은 `audio/raw`의 해당 WAV 두 개를 지우고 `generate`, `build`를 다시 실행합니다.
- **재시도**: 호출이 실패하면 간격을 늘려 가며 3번까지 다시 시도합니다.
- **길이 점검**: 생성 직후 "초당 글자 수"를 출력합니다. 3~9자 범위를 벗어나면 "길이 확인 필요"가 표시됩니다. 음성이 잘렸거나 이상하게 생성된 경우를 찾기 위한 것입니다.
- **쉼과 묶음 변경**: `PAUSE_QA`, `PAUSE_ITEM`, `BUNDLE_SIZE`를 바꾼 뒤에는 `build`만 다시 실행하면 됩니다. API 비용이 들지 않습니다.

### 8.3 출력 구조

```
audio/
  raw/      q01_문제.wav, q01_답안.wav …   원본 88개 (보관용, 앱 문항별 재생용)
  items/    q01.wav …                     문제 + 쉼 + 답안 44개
  bundles/  묶음1_01-10.wav …             10문항 묶음 5개 (드라이브 배포용)
```

## 9. 비용

| 모델 | 음성 출력 단가 (100만 토큰) | 1시간 분량 |
|---|---|---|
| Flash-Lite TTS | $6 | 약 $0.54 |
| Flash TTS | $9 | 약 $0.81 |

- 음성은 초당 25토큰으로 계산됩니다.
- 44문항 전체(약 50분)를 한 번 생성하면 1달러 미만입니다.
- 위 단가는 2026년 10월 초에 조사한 값이고, 2027년 1월 1일부터 두 배로 오른다는 안내가 있었습니다. 실행 전에 가격 페이지에서 확인하십시오.

## 10. 검수

1. `test`로 만든 한 문항을 듣고 음성과 속도를 정합니다.
2. 전체 생성 후 콘솔 출력에서 "길이 확인 필요"가 붙은 문항을 먼저 듣습니다.
3. 법률 용어와 숫자를 확인합니다. 조문 번호(제40조 제2항), 날짜(1989년 1월 24일), 분수(3분의 1), 금액(200만 원)이 대상입니다.
4. 잘못 읽는 곳은 대본 표기를 바꿉니다. 예를 들어 숫자를 한글로 풀어 쓰고, 해당 문항만 다시 생성합니다.
5. 묶음 파일은 마지막 문항이 끝까지 들어 있는지 확인합니다.

## 11. 오류 대응

| 증상 | 확인할 것 |
|---|---|
| 인증 오류 (401, 403) | `GEMINI_API_KEY` 환경변수, 키의 프로젝트와 결제 설정 |
| 모델을 찾을 수 없음 (404) | 모델 ID 철자, SDK 버전 |
| 요청 한도 초과 (429) | 잠시 뒤 재실행. 스크립트는 건너뛰기를 지원하므로 그대로 다시 실행 |
| `speech_metadata` 또는 `voice` 필드 오류 | `google-genai`를 최신 버전으로 올림 |
| 지시문까지 읽음 | `text`에 지시문이 들어갔는지 확인하고 `STYLE`로 옮김 |
| 묶음에서 목소리가 달라짐 | 일부 문항이 다른 `VOICE`나 `STYLE`로 생성됨. 해당 원본을 지우고 재생성 |

## 12. 앱 연동 (다음 단계)

- `audio/raw` 또는 `audio/items`의 파일을 Firebase Storage에 올리고, 문항 문서에 경로를 저장합니다.
- 권장 경로: `tts/essay2026/{id}/question.mp3`, `tts/essay2026/{id}/answer.mp3`
- 문항 문서에는 대본 원문의 해시를 함께 저장해 두면, 대본이 바뀐 문항만 골라 재생성할 수 있습니다.
- 앱에서 문제 재생 뒤 멈추고 답안을 재생하는 방식이면 `raw`의 문제·답안 분리 파일을 씁니다.

## 13. 확인하지 못한 사항

- `tts_pipeline.py`의 API 호출 부분은 실제 호출로 시험하지 못했습니다. 요청 형식은 공식 문서의 예제와 같게 작성했습니다. `build` 단계는 가짜 WAV로 시험해 정상 동작을 확인했습니다.
- `voices` 명령의 언어 코드 `ko-KR`은 문서의 BCP-47 형식 안내를 따른 것이고, 한국어 음성이 실제로 이 코드로 조회되는지는 확인하지 못했습니다. 결과가 비면 `ko`로 바꿔 보십시오.
- 공식 문서 사이트는 이 `generateContent` 방식을 "Generate Content API (Legacy)"로 분류하고, 별도의 Interactions API도 안내합니다. 현재는 두 방식 모두 3.8 TTS를 지원합니다. 장기 운영 코드라면 Interactions API로 옮길 시점을 검토하십시오.
- 요청당 토큰 한도와 가격은 앞서 조사한 값이며 이 문서를 쓰면서 다시 대조하지는 않았습니다.
- 한국어 법률 용어의 발음 정확도는 자료로 확인할 수 없어, 10절의 청취 검수가 필요합니다.
