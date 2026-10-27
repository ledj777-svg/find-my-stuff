# Find My Stuff

Personal visual search for physical objects.

Built for **Meta Global AI Developer Hackathon 2026**.

## Core Experience
- One-click open → camera opens instantly
- **Smart Mode** (default) – only processes when you ask
- **Live Mode** (optional) – continuous scanning with warning
- Remember any place with one tap
- Ask “Where is my blue charger?” and get the answer

## Current Status
We are building the full app with a **mock AI layer** first.
Once Meta API credits arrive, we simply replace the mock with real SAM 3.1 + multimodal calls.

## Tech Stack
- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Camera**: Native getUserMedia
- **Security**: API keys only on backend, frames over HTTPS, no long-term raw image storage by default

## Team
ledj777-svg + Grok (Team Lead)
