https://morrow.umangarora.in/

# Morrow Meeting Summarizer

Morrow turns meeting recordings into a focused brief: an executive overview, key decisions, owners, priorities, and a transcript.

## Assignment Submission

Public GitHub repository:

https://github.com/umangarora05/Unthinkable-Solutions-project

- Primary branch: `main`
- Repository visibility: public/open-source
- Submission format: GitHub repository
- The repository is intended to be downloaded and run from the project root.

## Features

- English audio or video to English transcript.
- Hindi audio or video to English transcript through Whisper translations or Gemini audio/video.
- OpenAI GPT-4o-mini or Google Gemini 2.5 Flash JSON meeting analysis.
- MP3, WAV, M4A, WEBM, MP4, MOV, AVI, MKV, MPEG, and MPG drag-and-drop upload.
- Uploads are limited to 100 MB. Video audio is extracted with FFmpeg before OpenAI processing; Gemini inline processing is limited to smaller recordings.
- Persistent light/dark theme, transcript copy, checked action items, and PDF/Word export.
- React static frontend and FastAPI ML service.

## Architecture

The browser sends the audio request directly to FastAPI. FastAPI calls the selected OpenAI or Gemini model, then returns the structured result. Provider keys can be entered from the settings panel and are sent only with processing requests.

## Project Structure

```text
meeting-summarizer/
├── app/page.jsx              # Main React application
├── src/main.jsx              # Vite entry point
├── app/globals.css           # Application styles
├── fastapi/main.py           # FastAPI service and AI routing
├── fastapi/requirements.txt  # Python dependencies
├── package.json              # Frontend scripts and dependencies
├── vite.config.mjs           # Vite configuration
└── .env.example              # Safe configuration template
```

Only application source files, configuration templates, and required dependency manifests are included. Generated files and local configuration are excluded through `.gitignore`.

## Dependencies

The frontend uses React, Vite, `lucide-react`, `jspdf`, and `docx`. The backend uses FastAPI, Uvicorn, OpenAI, HTTPX, `python-dotenv`, and the required multipart/form-data support. No dependency folders or generated build artifacts are committed.

## Setup

```bash
git clone <repo>
cd meeting-summarizer
npm install
copy .env.example .env.local
```

The root `.env.local` only configures the frontend URL:

```env
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
VITE_FASTAPI_URL=http://127.0.0.1:8001
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

Open `http://localhost:5173`.

## Deploy on Render

Deploy this repository as one Render Web Service for FastAPI and one Render Static Site for React.

### 1. Deploy FastAPI

Create a new **Web Service** connected to this repository with:

- **Root Directory:** `fastapi`
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

After the service deploys, copy its public URL, for example `https://morrow-api.onrender.com`.

Optional FastAPI environment variables:

```env
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CORS_ORIGINS=https://your-frontend.onrender.com
```

The app also accepts provider keys entered through its settings panel, so server-side keys are optional.

### 2. Deploy the React static site

Create a **Static Site** connected to the same repository with:

- **Root Directory:** leave blank
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`

Add this environment variable to the static site:

```env
VITE_FASTAPI_URL=https://morrow-api.onrender.com
```

Replace the value with the actual public URL of your FastAPI service. Do not add `/process-audio`; the frontend appends that path.

### 3. Verify the deployment

1. Open `https://your-frontend.onrender.com`.
2. Confirm the frontend loads.
3. Open the FastAPI health URL: `https://your-api.onrender.com/health`.
4. Enter an OpenAI or Gemini key from the settings button.
5. Upload a supported audio or video recording and summarize it.

Render free services can sleep after inactivity, so the first request after a pause may take longer. Use a paid instance for reliable production processing and long audio workloads.

## Validation

```bash
npm run build
python -m py_compile fastapi/main.py
```

The application should be checked locally before submission:

1. Start FastAPI on port `8001`.
2. Start the Vite frontend on port `5173`.
3. Open `http://localhost:5173`.
4. Enter an AI provider key from the settings panel.
5. Upload a supported audio or video file and verify the summary, action items, transcript, and exports.

## Submission Checklist

- [x] Code is pushed to the public GitHub repository.
- [x] Branch is named `main`.
- [x] No `node_modules`, `.venv`, `dist`, `.next`, `out`, or editor folders are committed.
- [x] No `.env` files or real API keys are committed.
- [x] Required dependency manifests are included for reproducible setup.
- [x] Frontend build passes with `npm run build`.
- [x] FastAPI source passes `python -m py_compile fastapi/main.py`.
- [x] Setup and Render deployment instructions are documented above.
