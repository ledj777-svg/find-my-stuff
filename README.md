# Find My Stuff

**Personal visual memory for the physical world.**

Built for the **Meta Global AI Developer Hackathon 2026**  
Track: Indie Developer  
Theme: *Build for Your World*

---

## The Problem

We constantly lose everyday objects — keys, chargers, wallets, notebooks.  
Existing solutions either require physical tags or force users to manually organize photos.

**Find My Stuff** solves this by letting you simply point your camera at a place, save it, and later ask in natural language:

> “Where did I leave my car keys?”

The app remembers the place and highlights the object for you.

---

## Core Features

- **One-button interaction**
  - Short press → Capture & save the current view to memory
  - Long press (1.5s) → Activate Live Mode

- **Voice-first experience**
  - After capture or entering Live Mode, voice recognition starts automatically
  - Just say: *“Where is my blue charger?”*

- **Visual memory**
  - Saves places you point at
  - Later searches both current view and previous memories

- **Smart highlighting**
  - Draws a clean box around the requested object
  - Replies with natural language feedback

- **User-owned API key**
  - Users paste their own Meta Model API key
  - Key is stored only on their device

---

## How It Works

1. User opens the app → camera starts instantly
2. User taps the button to save a place (or holds for Live Mode)
3. Voice listening starts automatically
4. User asks a question in plain English
5. App searches memory + current view
6. Object is highlighted and a natural reply is given

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | Vite + React + TypeScript + Tailwind |
| Backend      | FastAPI (Python)                    |
| Camera       | Native `getUserMedia`               |
| Voice        | Web Speech API                      |
| AI Models    | Meta SAM 3.1 + Muse Vision (configured) |
| Storage      | Local device memory + optional API key |

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/ledj777-svg/find-my-stuff.git
cd find-my-stuff
```

### 2. Start the Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Meta Models Used

We have configured the project to use:

- **SAM 3.1** — for object segmentation and detection
- **Muse Vision / Multimodal models** — for understanding scenes and answering natural language queries

Users provide their own Meta Model API key through the in-app settings.

---

## Project Structure

```
find-my-stuff/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── ...
├── backend/           # FastAPI server
│   ├── main.py
│   └── requirements.txt
└── README.md
```

---

## Privacy

- Photos are processed on the fly
- User API keys are stored only in the browser (`localStorage`)
- No cloud storage of personal images by default
- Clear “Saved on your device” messaging

---

## Built During

**Meta Global AI Developer Hackathon 2026**  
26 October – 4 November 2026

---

## Team

- **ledj777-svg** — Builder
- **Grok** — Team Lead & Technical Partner

---

## License

This project was built for the Meta Global AI Developer Hackathon 2026.
