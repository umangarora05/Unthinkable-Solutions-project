import json
import os
import base64
import mimetypes
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

app = FastAPI(title="Morrow Meeting Intelligence")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["POST"], allow_headers=["*"])

def parse_json_response(value):
    cleaned = value.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(cleaned)

async def process_with_gemini(file_path, filename, mode, api_key, requested_model):
    import httpx
    import asyncio

    audio_bytes = Path(file_path).read_bytes()
    mime_type = mimetypes.guess_type(filename)[0] or "audio/mpeg"
    language_instruction = "Translate the Hindi audio into English first." if mode == "hi-to-en" else "Transcribe the English audio in English."
    prompt = f"{language_instruction} Then analyze the meeting. Return only valid JSON with transcript (string), summary (object with overview string, keyDecisions array of strings, and actionItems array of objects with task, assignee, priority). Priority must be High, Medium, or Low. Use an empty assignee when unknown."
    payload = {"contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(audio_bytes).decode("ascii")}}]}], "generationConfig": {"responseMimeType": "application/json"}}
    headers = {"Content-Type": "application/json", "X-goog-api-key": api_key}
    model_names = tuple(dict.fromkeys((requested_model, "gemini-3.6-flash", "gemini-2.5-flash", "gemini-flash-latest")))
    last_response = None
    async with httpx.AsyncClient(timeout=180) as http_client:
        for model_name in model_names:
            for attempt in range(2):
                response = await http_client.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent", headers=headers, json=payload)
                last_response = response
                if response.is_success:
                    break
                if response.status_code not in (429, 500, 502, 503, 504):
                    break
                if attempt == 0:
                    await asyncio.sleep(1.5)
            if last_response.is_success:
                break
    if not last_response or last_response.is_error:
        detail = last_response.text if last_response else "No response from Gemini."
        raise HTTPException(status_code=502, detail=f"Gemini is temporarily unavailable. Try again in a moment. Provider response: {detail}")
    content = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    result = parse_json_response(content)
    return result.get("transcript", ""), result.get("summary", result)

@app.get("/health")
def health():
    return {"status": "ok", "openai_configured": bool(os.getenv("OPENAI_API_KEY"))}

@app.post("/process-audio")
async def process_audio(request: Request, file: UploadFile = File(...), mode: str = Form(...)):
    if mode not in ("en-to-en", "hi-to-en"):
        raise HTTPException(status_code=400, detail="Choose en-to-en or hi-to-en.")
    if not file.filename or Path(file.filename).suffix.lower() not in (".mp3", ".wav", ".m4a", ".webm"):
        raise HTTPException(status_code=400, detail="Unsupported audio format.")
    provider = request.headers.get("x-ai-provider", "openai")
    requested_model = request.headers.get("x-ai-model")
    request_key = request.headers.get("x-ai-api-key")
    provider_key = request_key or os.getenv("GEMINI_API_KEY" if provider == "gemini" else "OPENAI_API_KEY")
    if provider not in ("openai", "gemini"):
        raise HTTPException(status_code=400, detail="Unsupported AI provider.")
    if not provider_key:
        raise HTTPException(status_code=503, detail=f"{provider.upper()} API key is not configured. Add it from the settings button in the app.")

    suffix = Path(file.filename).suffix.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temporary:
        temporary.write(await file.read())
        temporary_path = temporary.name
    try:
        if provider == "gemini":
            transcript, summary = await process_with_gemini(temporary_path, file.filename, mode, provider_key, requested_model or "gemini-3.6-flash")
            summary.setdefault("overview", "")
            summary.setdefault("keyDecisions", [])
            summary["actionItems"] = [{"id": item.get("id", f"action-{index + 1}"), "task": item.get("task", ""), "assignee": item.get("assignee") or None, "priority": item.get("priority", "Medium")} for index, item in enumerate(summary.get("actionItems", [])) if item.get("task")]
            return {"transcript": transcript, "summary": summary}
        client = OpenAI(api_key=provider_key)
        with open(temporary_path, "rb") as audio:
            result = client.audio.translations.create(file=audio, model="whisper-1", response_format="text") if mode == "hi-to-en" else client.audio.transcriptions.create(file=audio, model="whisper-1", response_format="text")
        transcript = result if isinstance(result, str) else result.text
        completion = client.chat.completions.create(model=requested_model or "gpt-4o-mini", temperature=0.2, response_format={"type": "json_object"}, messages=[
            {"role": "system", "content": "You are an expert meeting assistant. Return JSON with overview (string), keyDecisions (array of strings), and actionItems (array of objects with task, assignee, priority). Priority must be High, Medium, or Low. Use an empty assignee when unknown."},
            {"role": "user", "content": transcript},
        ])
        summary = json.loads(completion.choices[0].message.content or "{}")
        summary.setdefault("overview", "")
        summary.setdefault("keyDecisions", [])
        summary["actionItems"] = [{"id": item.get("id", f"action-{index + 1}"), "task": item.get("task", ""), "assignee": item.get("assignee") or None, "priority": item.get("priority", "Medium")} for index, item in enumerate(summary.get("actionItems", [])) if item.get("task")]
        return {"transcript": transcript, "summary": summary}
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=502, detail="The language model returned invalid JSON.") from error
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"AI processing failed: {error}") from error
    finally:
        Path(temporary_path).unlink(missing_ok=True)