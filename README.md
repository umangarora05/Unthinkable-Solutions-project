# Morrow Meeting Summarizer

Morrow turns meeting recordings into a focused brief: an executive overview, key decisions, owners, priorities, and a transcript.

## Features

- English audio to English transcript.
- Hindi audio to English transcript through Whisper translations or Gemini audio.
- OpenAI GPT-4o-mini or Google Gemini 2.5 Flash JSON meeting analysis.
- MP3, WAV, M4A, and WEBM drag-and-drop upload.
- Persistent light/dark theme, transcript copy, checked action items, and PDF/Word export.
- React frontend, Node.js multipart proxy, and FastAPI ML service.

## Architecture

The browser posts to the Next.js React route at `/api/process-audio`. Node forwards the multipart request to FastAPI. FastAPI calls the selected OpenAI or Gemini model, then returns the structured result. Provider keys can be entered from the settings panel and are sent only with processing requests.

## Setup

```bash
git clone <repo>
cd meeting-summarizer
npm install
copy .env.example .env.local
```

Configure `.env.local` (or enter either key from the settings button in the app):

```env
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
FASTAPI_URL=http://127.0.0.1:8001
```

Run FastAPI:

```bash
cd fastapi
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8001
```

Before starting FastAPI, replace the placeholder values with real provider keys, or enter a key from the settings panel. The `/health` endpoint reports whether the server-side OpenAI key was loaded. Never commit `.env`.

In a second terminal:

```bash
cd meeting-summarizer
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run build
python -m py_compile fastapi/main.py
```

## Submission compliance

- Primary branch: `main`.
- `.gitignore` excludes dependencies, `.next`, environment files, build output, and editor metadata.
- No real secrets are committed; only `.env.example` files are included.
- Demo video: `<add demo video link>`
