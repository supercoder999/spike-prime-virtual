"""
AI Assistant Router - Proxies requests to AI APIs (Anthropic Claude or Google Gemini).

Supports two providers:
  1. **Anthropic Claude** (paid) — set ANTHROPIC_API_KEY env var
  2. **Google Gemini** (free tier) — set GEMINI_API_KEY env var
     Get a free key at https://aistudio.google.com/apikey

Set at least one key. The frontend can pick which provider to use.
"""

import os
import json
import httpx
from typing import Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter()

# --- Provider config ---
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-sonnet-4-20250514"

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"
GEMINI_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are an expert AI coding assistant integrated into a LEGO Spike Prime programming IDE (similar to code.pybricks.com). Your role is to help users write Python code for controlling LEGO Spike Prime robots using the Pybricks library.

You have deep knowledge of:
- **Pybricks MicroPython API**: PrimeHub, Motor, DriveBase, ColorSensor, UltrasonicSensor, ForceSensor, GyroSensor
- **Pybricks modules**: pybricks.hubs, pybricks.pupdevices, pybricks.parameters, pybricks.robotics, pybricks.tools
- **LEGO Spike Prime hardware**: Hub with 6 ports (A-F), built-in IMU, speaker, display (5x5 LED matrix), light matrix, buttons
- **Robot programming concepts**: PID control, line following, obstacle avoidance, motor synchronization, sensor fusion
- **MicroPython specifics**: utime, ustruct, limited standard library

When providing code:
1. Always use proper Pybricks imports
2. Include comments explaining each section
3. Use correct Port assignments (Port.A through Port.F)
4. Consider motor direction and gear ratios
5. Handle sensor readings properly
6. Use wait() for timing instead of time.sleep()

When the user shares their current code, analyze it and suggest improvements.
Keep responses concise and actionable. Format code with ```python blocks.
If asked about Blockly/drag-and-drop blocks, explain the equivalent Python code."""


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., description="Conversation history")
    current_code: Optional[str] = Field(None, description="Current code in the editor")
    editor_mode: Optional[str] = Field(None, description="'python' or 'blocks'")
    stream: bool = Field(False, description="Whether to stream the response")
    provider: Optional[str] = Field(None, description="'gemini' or 'anthropic'. Auto-detected if omitted.")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="AI response")
    usage: Optional[dict] = None
    provider: str = Field("", description="Provider that handled the request")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pick_provider(requested: Optional[str] = None) -> str:
    """Return the provider to use. Priority: requested > gemini (free) > anthropic."""
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_key = _get_gemini_api_key()

    if requested == "anthropic" and anthropic_key:
        return "anthropic"
    if requested == "gemini" and gemini_key:
        return "gemini"

    # Auto-pick: prefer gemini (free)
    if gemini_key:
        return "gemini"
    if anthropic_key:
        return "anthropic"

    raise HTTPException(
        status_code=500,
        detail="No AI API key configured. Set GEMINI_API_KEY (or GOOGLE_API_KEY) or ANTHROPIC_API_KEY.",
    )


def _get_gemini_api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")


def _build_messages(request: ChatRequest) -> list[dict]:
    """Build the messages array (role/content dicts)."""
    messages = []
    code_context = ""
    if request.current_code:
        lang = "python" if request.editor_mode != "blocks" else "blockly"
        code_context = (
            f"\n\n[Current code in the editor ({lang} mode)]:\n"
            f"```python\n{request.current_code}\n```\n"
        )

    for i, msg in enumerate(request.messages):
        content = msg.content
        if i == len(request.messages) - 1 and msg.role == "user" and code_context:
            content += code_context
        messages.append({"role": msg.role, "content": content})

    return messages


# ---------------------------------------------------------------------------
# Anthropic helpers
# ---------------------------------------------------------------------------

async def _anthropic_chat(messages: list[dict], api_key: str) -> ChatResponse:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 4096,
                "system": SYSTEM_PROMPT,
                "messages": messages,
            },
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        data = resp.json()
        reply = "".join(b["text"] for b in data.get("content", []) if b.get("type") == "text")
        return ChatResponse(reply=reply, usage=data.get("usage"), provider="anthropic")


async def _anthropic_stream(messages: list[dict], api_key: str):
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 4096,
                "system": SYSTEM_PROMPT,
                "messages": messages,
                "stream": True,
            },
        ) as resp:
            if resp.status_code != 200:
                error = await resp.aread()
                yield f"data: {json.dumps({'type': 'error', 'error': error.decode()})}\n\n"
                return

            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        yield f"data: {json.dumps({'type': 'done'})}\n\n"
                        break
                    try:
                        event = json.loads(data_str)
                        et = event.get("type", "")
                        if et == "content_block_delta":
                            delta = event.get("delta", {})
                            if delta.get("type") == "text_delta":
                                yield f"data: {json.dumps({'type': 'text', 'text': delta['text']})}\n\n"
                        elif et == "message_stop":
                            yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    except json.JSONDecodeError:
                        pass


# ---------------------------------------------------------------------------
# Gemini helpers
# ---------------------------------------------------------------------------

def _gemini_build_contents(messages: list[dict]) -> list[dict]:
    """Convert role/content messages to Gemini contents format."""
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    return contents


async def _gemini_chat(messages: list[dict], api_key: str) -> ChatResponse:
    url = f"{GEMINI_API_URL}/{GEMINI_MODEL}:generateContent"
    contents = _gemini_build_contents(messages)

    body = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {"maxOutputTokens": 4096},
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            url,
            headers={"x-goog-api-key": api_key},
            json=body,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
        data = resp.json()

        # Extract text from response
        reply = ""
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                reply += part.get("text", "")

        usage = data.get("usageMetadata")
        return ChatResponse(reply=reply, usage=usage, provider="gemini")


async def _gemini_stream(messages: list[dict], api_key: str):
    url = f"{GEMINI_API_URL}/{GEMINI_MODEL}:streamGenerateContent?alt=sse"
    contents = _gemini_build_contents(messages)

    body = {
        "contents": contents,
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "generationConfig": {"maxOutputTokens": 4096},
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            url,
            headers={"x-goog-api-key": api_key},
            json=body,
        ) as resp:
            if resp.status_code != 200:
                error = await resp.aread()
                yield f"data: {json.dumps({'type': 'error', 'error': error.decode()})}\n\n"
                return

            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    try:
                        chunk = json.loads(data_str)
                        for candidate in chunk.get("candidates", []):
                            for part in candidate.get("content", {}).get("parts", []):
                                text = part.get("text", "")
                                if text:
                                    yield f"data: {json.dumps({'type': 'text', 'text': text})}\n\n"
                    except json.JSONDecodeError:
                        pass

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a message and get a response."""
    provider = _pick_provider(request.provider)
    messages = _build_messages(request)

    try:
        if provider == "gemini":
            return await _gemini_chat(messages, _get_gemini_api_key())
        else:
            return await _anthropic_chat(messages, os.getenv("ANTHROPIC_API_KEY", ""))
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="AI request timed out")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Connection error: {str(e)}")


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream a response using Server-Sent Events."""
    provider = _pick_provider(request.provider)
    messages = _build_messages(request)

    async def generate():
        try:
            if provider == "gemini":
                async for chunk in _gemini_stream(messages, _get_gemini_api_key()):
                    yield chunk
            else:
                async for chunk in _anthropic_stream(messages, os.getenv("ANTHROPIC_API_KEY", "")):
                    yield chunk
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/status")
async def ai_status():
    """Check which AI providers are configured."""
    anthropic_key = bool(os.getenv("ANTHROPIC_API_KEY", ""))
    gemini_key = bool(_get_gemini_api_key())

    # Active provider follows the same logic as _pick_provider
    active = "gemini" if gemini_key else ("anthropic" if anthropic_key else None)
    model = GEMINI_MODEL if active == "gemini" else ANTHROPIC_MODEL if active == "anthropic" else ""

    return {
        "configured": anthropic_key or gemini_key,
        "providers": {
            "anthropic": {"available": anthropic_key, "model": ANTHROPIC_MODEL},
            "gemini": {"available": gemini_key, "model": GEMINI_MODEL, "free": True},
        },
        "active_provider": active,
        "model": model,
    }
