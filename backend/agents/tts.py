"""
TTS Agent — 한국어 주문 음성 생성 (D6).

- 모델: gemini-2.5-flash-preview-tts (24kHz PCM 출력)
- 포맷 변환: PCM → WAV (44-byte header prepend)
- 캐시: Supabase tts_cache 테이블 (sha256 기반)

ADR-004: 3 에이전트 + TTS utility (4번째 에이전트가 아님, 도우미)
"""
from __future__ import annotations

import asyncio
import base64
import hashlib
import os
import struct
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_REPO_ROOT / ".env")
load_dotenv(_REPO_ROOT / "backend" / ".env")

GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts"
DEFAULT_VOICE = "Kore"     # 한국어 프리셋 보이스
PCM_SAMPLE_RATE = 24000    # Gemini TTS 고정
PCM_SAMPLE_WIDTH = 2       # 16-bit
PCM_CHANNELS = 1           # mono


class TTSResult(BaseModel):
    text: str
    audio_b64: str = Field(..., description="WAV base64 (브라우저 재생 가능)")
    audio_mime: str = "audio/wav"
    cached: bool = False
    voice: str = DEFAULT_VOICE
    language: str = "ko"


def _pcm_to_wav(pcm: bytes, sample_rate: int = PCM_SAMPLE_RATE,
                channels: int = PCM_CHANNELS, sample_width: int = PCM_SAMPLE_WIDTH) -> bytes:
    """Gemini TTS raw PCM L16 → WAV (RIFF header 추가)."""
    byte_rate = sample_rate * channels * sample_width
    block_align = channels * sample_width
    data_size = len(pcm)
    header = b"RIFF" + struct.pack("<I", 36 + data_size) + b"WAVE"
    fmt_chunk = (
        b"fmt " + struct.pack("<I", 16)
        + struct.pack("<H", 1)                    # PCM
        + struct.pack("<H", channels)
        + struct.pack("<I", sample_rate)
        + struct.pack("<I", byte_rate)
        + struct.pack("<H", block_align)
        + struct.pack("<H", sample_width * 8)     # bits per sample
    )
    data_chunk = b"data" + struct.pack("<I", data_size) + pcm
    return header + fmt_chunk + data_chunk


def _cache_key(text: str, voice: str, language: str) -> str:
    return hashlib.sha256(f"{language}:{voice}:{text}".encode("utf-8")).hexdigest()


def _get_supabase():
    try:
        from supabase import create_client
    except ImportError:
        return None
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not (url and key):
        return None
    return create_client(url, key)


async def _check_cache(key: str, supabase) -> Optional[str]:
    def _q():
        return supabase.table("tts_cache").select("audio_b64").eq("text_hash", key).limit(1).execute()
    try:
        r = await asyncio.to_thread(_q)
        if r.data:
            return r.data[0]["audio_b64"]
    except Exception:
        return None
    return None


async def _store_cache(key: str, text: str, audio_b64: str, voice: str, language: str, size: int, supabase) -> None:
    def _q():
        return supabase.table("tts_cache").upsert({
            "text_hash": key,
            "text": text,
            "voice_name": voice,
            "language": language,
            "audio_b64": audio_b64,
            "audio_mime": "audio/wav",
            "size_bytes": size,
        }, on_conflict="text_hash").execute()
    try:
        await asyncio.to_thread(_q)
    except Exception:
        pass  # cache write 실패는 비치명적


async def _generate_tts_gemini(text: str, voice: str) -> bytes:
    """Gemini TTS 호출 → WAV bytes."""
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    def _call():
        return client.models.generate_content(
            model=GEMINI_TTS_MODEL,
            contents=text,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                    )
                ),
            ),
        )
    resp = await asyncio.to_thread(_call)
    part = resp.candidates[0].content.parts[0]
    if not part.inline_data:
        raise RuntimeError("Gemini TTS returned no audio inline_data")
    pcm = part.inline_data.data
    return _pcm_to_wav(pcm)


async def synthesize(text: str, voice: str = DEFAULT_VOICE, language: str = "ko") -> TTSResult:
    """
    텍스트 → TTS (캐시 → Gemini → 캐시 저장).

    Args:
        text: 발화할 한국어 문장. 예: "김치찌개 하나 주세요"
        voice: Gemini prebuilt voice. 기본 "Kore" (한국어 톤).
        language: BCP-47 태그 (캐시 키용).
    """
    key = _cache_key(text, voice, language)
    sb = _get_supabase()

    if sb is not None:
        cached_b64 = await _check_cache(key, sb)
        if cached_b64:
            return TTSResult(text=text, audio_b64=cached_b64, cached=True,
                              voice=voice, language=language)

    wav_bytes = await _generate_tts_gemini(text, voice)
    audio_b64 = base64.b64encode(wav_bytes).decode("ascii")

    if sb is not None:
        await _store_cache(key, text, audio_b64, voice, language, len(wav_bytes), sb)

    return TTSResult(text=text, audio_b64=audio_b64, cached=False, voice=voice, language=language)


def order_phrase(name_ko: str) -> str:
    """주문용 한국어 문장 생성. 간결·정중·자연."""
    return f"{name_ko} 하나 주세요."


if __name__ == "__main__":
    import sys
    async def demo():
        text = order_phrase(sys.argv[1]) if len(sys.argv) > 1 else order_phrase("김치찌개")
        print(f"🎤 TTS: {text!r}")
        r1 = await synthesize(text)
        print(f"   first:  cached={r1.cached}, bytes={len(base64.b64decode(r1.audio_b64)):,}")
        r2 = await synthesize(text)
        print(f"   second: cached={r2.cached}, bytes={len(base64.b64decode(r2.audio_b64)):,}")
        if r1.audio_b64 == r2.audio_b64:
            print("   ✅ 캐시 hit, 동일 오디오")

        out = _REPO_ROOT / "tests" / "out" / "tts_canary.wav"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(base64.b64decode(r1.audio_b64))
        print(f"   🔊 wav saved: {out}")
    asyncio.run(demo())
