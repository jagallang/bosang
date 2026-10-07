"""
보상관리사 서술형 예제 음성 생성 파이프라인 (Gemini 3.8 TTS, generateContent API)

사용법
  python tts_pipeline.py voices            # 한국어 음성 목록 조회
  python tts_pipeline.py test 2            # 2번 문항만 생성해서 들어보기
  python tts_pipeline.py generate          # 문항별 문제/답안 WAV 88개 생성 (audio/raw)
  python tts_pipeline.py build             # 문항별 합본 44개 + 10문항 묶음 5개 만들기 (API 호출 없음)
  python tts_pipeline.py build --mp3       # 위와 같고 MP3도 함께 만들기 (ffmpeg 필요)

준비
  pip install -U google-genai              # voices 조회는 2.25.0 이상 필요
  export GEMINI_API_KEY=...                # 키를 코드에 적지 말 것

요청 형식은 ai.google.dev 의 Text-to-speech generation 문서(2026-10-01 갱신본)를 따랐다.
이 스크립트의 API 호출 부분은 실제 호출로 검증하지 못했고, build 단계만 로컬에서 시험했다.
"""
import io
import json
import os
import shutil
import subprocess
import sys
import time
import wave

MODEL = "gemini-3.8-flash-lite-tts"     # 고음질이 필요하면 "gemini-3.8-flash-tts"
VOICE = "Kore"                          # voices 명령으로 확인한 음성 이름 또는 ID
STYLE = "calm, clear lecture narration" # 비우면("") 스타일 지시 없이 생성
_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_DIR)
SCRIPT_JSON = os.path.join(_DIR, "26_서술형예제_책자판_음성대본.json")
OUT = os.path.join(_ROOT, "audio")
PAUSE_QA = 4.0      # 문제와 답안 사이 쉼(초)
PAUSE_ITEM = 2.0    # 문항과 문항 사이 쉼(초)
BUNDLE_SIZE = 10
RATE, CHANNELS, WIDTH = 24000, 1, 2     # 3.8 TTS 기본 출력: 24kHz, 모노, 16비트


_client = None
def client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client()        # GEMINI_API_KEY 환경변수 사용
    return _client


def synthesize(text: str) -> bytes:
    """대본을 음성으로 바꿔 WAV 바이트를 돌려준다. text 는 그대로 읽히므로 지시문을 넣지 않는다."""
    part = {"text": text}
    if STYLE:
        part["speech_metadata"] = {"style": STYLE}
    resp = client().models.generate_content(
        model=MODEL,
        contents=[{"role": "user", "parts": [part]}],
        config={
            "response_modalities": ["AUDIO"],
            "speech_config": {"voice_config": {"voice": VOICE}},
        },
    )
    return resp.candidates[0].content.parts[0].inline_data.data


def pcm_of(wav_bytes: bytes) -> bytes:
    """WAV 에서 PCM 프레임만 꺼낸다."""
    try:
        with wave.open(io.BytesIO(wav_bytes)) as wf:
            assert (wf.getframerate(), wf.getnchannels(), wf.getsampwidth()) == (RATE, CHANNELS, WIDTH), \
                f"예상과 다른 형식: {wf.getparams()}"
            return wf.readframes(wf.getnframes())
    except wave.Error:
        return wav_bytes[44:] if wav_bytes[:4] == b"RIFF" else wav_bytes


def write_wav(path: str, pcm: bytes) -> float:
    with wave.open(path, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(WIDTH)
        wf.setframerate(RATE)
        wf.writeframes(pcm)
    return len(pcm) / (RATE * WIDTH * CHANNELS)


def silence(sec: float) -> bytes:
    return b"\x00" * (int(RATE * sec) * WIDTH * CHANNELS)


def load_items():
    return json.load(open(SCRIPT_JSON, encoding="utf-8"))


def make_raw(name: str, text: str) -> None:
    path = os.path.join(OUT, "raw", name + ".wav")
    if os.path.exists(path):
        print("건너뜀:", name)
        return
    for attempt in range(1, 4):
        try:
            sec = write_wav(path, pcm_of(synthesize(text)))
            # 한국어 낭독은 대략 초당 4~7자. 크게 벗어나면 잘렸거나 이상 생성일 수 있다.
            cps = len(text) / max(sec, 0.1)
            flag = "" if 3.0 <= cps <= 9.0 else "  ← 길이 확인 필요"
            print(f"완료: {name}  {sec:5.1f}초  글자 {len(text)}  초당 {cps:.1f}자{flag}")
            time.sleep(1)
            return
        except Exception as ex:
            print(f"오류({attempt}/3): {name} - {ex}")
            time.sleep(10 * attempt)
    print("실패:", name)


def cmd_generate(only=None):
    os.makedirs(os.path.join(OUT, "raw"), exist_ok=True)
    for it in load_items():
        if only and int(it["id"]) != only:
            continue
        make_raw(f"q{it['id']}_문제", it["question_speech"])
        make_raw(f"q{it['id']}_답안", it["answer_speech"])


def read_raw(name: str) -> bytes:
    with open(os.path.join(OUT, "raw", name + ".wav"), "rb") as f:
        return pcm_of(f.read())


def to_mp3(wav_path: str) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path, "-b:a", "64k",
                    wav_path[:-4] + ".mp3"], check=True)


def cmd_build(mp3=False):
    if mp3 and not shutil.which("ffmpeg"):
        sys.exit("ffmpeg 가 설치되어 있지 않습니다.")
    for d in ("items", "bundles"):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)
    items, merged = load_items(), {}
    for it in items:
        i = it["id"]
        try:
            pcm = read_raw(f"q{i}_문제") + silence(PAUSE_QA) + read_raw(f"q{i}_답안")
        except FileNotFoundError:
            sys.exit(f"q{i} 원본이 없습니다. 먼저 generate 를 실행하세요.")
        merged[i] = pcm
        path = os.path.join(OUT, "items", f"q{i}.wav")
        write_wav(path, pcm)
        if mp3:
            to_mp3(path)
    for k in range(0, len(items), BUNDLE_SIZE):
        grp = items[k:k + BUNDLE_SIZE]
        pcm = silence(PAUSE_ITEM).join(merged[x["id"]] for x in grp)
        name = f"묶음{k // BUNDLE_SIZE + 1}_{grp[0]['id']}-{grp[-1]['id']}"
        path = os.path.join(OUT, "bundles", name + ".wav")
        sec = write_wav(path, pcm)
        if mp3:
            to_mp3(path)
        print(f"{name}: {len(grp)}문항, {sec / 60:.1f}분")
    print(f"문항별 합본 {len(items)}개 → {OUT}/items, 묶음 → {OUT}/bundles")


def cmd_voices():
    resp = client().voices.list(language_code=["ko-KR"], page_size=100)
    for v in resp.voices or []:
        print(f"{v.id} | {v.display_name} | {v.gender} | pitch={v.pitch} | {v.description}")


if __name__ == "__main__":
    args = sys.argv[1:]
    cmd = args[0] if args else "help"
    if cmd == "generate":
        cmd_generate()
    elif cmd == "test":
        cmd_generate(only=int(args[1]))
    elif cmd == "build":
        cmd_build(mp3="--mp3" in args)
    elif cmd == "voices":
        cmd_voices()
    else:
        print(__doc__)
