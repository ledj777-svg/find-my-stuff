# Find My Stuff

**Personal visual memory for the physical world.**

> Point. Save. Ask. Find.

Built for the **Meta Global AI Developer Hackathon 2026**  
**Track:** Indie Developer  
**Theme:** Build for Your World

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [User Flow](#user-flow)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Meta AI Models](#meta-ai-models)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Privacy & Security](#privacy--security)
- [Future Roadmap](#future-roadmap)
- [Hackathon Details](#hackathon-details)
- [Team](#team)

---

## Overview

**Find My Stuff** is a voice-first visual memory application that helps users locate everyday physical objects using only their camera and natural language.

Instead of relying on Bluetooth trackers or manually organized photo albums, users simply point their camera at a place, save it, and later ask questions like:

- “Where did I leave my car keys?”
- “Where is my blue charger?”
- “Have you seen my black notebook?”

The system searches previously saved places and the current camera view, then highlights the relevant object and responds naturally.

---

## The Problem

Losing everyday objects is a universal frustration.

Current solutions have clear limitations:

| Solution              | Limitation                              |
|-----------------------|-----------------------------------------|
| Bluetooth trackers    | Requires buying and attaching hardware  |
| Photo galleries       | Manual organization, hard to search     |
| Notes / reminders     | Easy to forget, not visual              |
| Generic AI chatbots   | No understanding of user’s physical space |

People need a simple, natural way to remember where things are — without extra hardware or complex workflows.

---

## The Solution

**Find My Stuff** turns the phone camera into a personal visual memory system.

Users can:

1. Capture any place with a single tap
2. Later ask questions using their voice
3. Instantly see the object highlighted in the saved view or live camera

The experience is designed to feel effortless and conversational.

---

## Key Features

### 1. One-Button Interaction
- **Short press** → Captures the current camera frame and saves it to memory
- **Long press (1.5 seconds)** → Activates Live Mode

### 2. Voice-First Experience
- Voice recognition starts automatically after capture or when entering Live Mode
- Users can speak naturally without pressing extra buttons

### 3. Visual Memory
- Saves places the user points at
- Stores object information associated with each place
- Searches both current view and previous memories when a question is asked

### 4. Smart Object Highlighting
- Draws a clean bounding box around the requested object
- Provides a natural language reply (e.g. “I can see the car keys near the laptop”)

### 5. User-Owned API Key
- Users can paste their own Meta Model API key
- The key is stored only on the user’s device (`localStorage`)
- No server-side storage of personal keys

### 6. Clean & Minimal Interface
- Full-screen camera experience
- Floating action button
- Minimal UI distractions

---

## How It Works

1. User opens the app → Camera starts instantly
2. User taps the button to save the current place
3. Voice listening starts automatically
4. User asks a question in plain English
5. The system searches:
   - Current camera frame
   - Previously saved places
6. Matching object is highlighted
7. A natural language response is shown

---

## User Flow

```
[Open App]
     ↓
[Camera Ready]
     ↓
[Short Press] ─────────────→ Save place to memory
     ↓                              ↓
[Voice starts] ←────────────────────┘
     ↓
[User asks: “Where is my charger?”]
     ↓
[Search memory + current view]
     ↓
[Highlight object + Reply]
```

**Live Mode Flow:**
```
[Long Press 1.5s]
     ↓
[Live Mode Activated]
     ↓
[Voice starts automatically]
     ↓
[User can continuously ask questions]
```

---

## Tech Stack

| Layer              | Technology                              |
|--------------------|-----------------------------------------|
| Frontend           | Vite, React, TypeScript, Tailwind CSS   |
| Backend            | FastAPI (Python)                        |
| Camera Access      | Browser `getUserMedia` API              |
| Voice Recognition  | Web Speech API                          |
| AI Models          | Meta SAM 3.1 + Multimodal Vision models |
| State Management   | React Hooks                             |
| Storage            | Browser `localStorage` (API key)        |
| Styling            | Tailwind CSS                            |

---

## Architecture

```
┌─────────────────────┐
│     Frontend        │
│  (React + Vite)     │
│                     │
│  • Camera           │
│  • Voice            │
│  • UI / Memory      │
└─────────┬───────────┘
          │ HTTP
          ▼
┌─────────────────────┐
│      Backend        │
│     (FastAPI)       │
│                     │
│  • /remember        │
│  • /find            │
│  • /memory          │
│  • User API Key     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Meta Model API    │
│                     │
│  • SAM 3.1          │
│  • Vision Models    │
└─────────────────────┘
```

---

## Meta AI Models

The project is configured to work with Meta’s latest models available through the Meta Model API:

| Model              | Purpose                                      |
|--------------------|----------------------------------------------|
| **SAM 3.1**        | Object segmentation and detection in images  |
| **Muse Vision / Multimodal** | Scene understanding and natural language answers |

Users provide their own Meta Model API key through the in-app settings screen. The key never leaves the user’s device.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Modern browser with camera + microphone access

### 1. Clone the repository
```bash
git clone https://github.com/ledj777-svg/find-my-stuff.git
cd find-my-stuff
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

Backend will run at: `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend will run at: `http://localhost:5173`

### 4. Using the App
1. Allow camera permission
2. (Optional) Enter your Meta Model API key when prompted
3. Tap the button to save a place
4. Speak your question when listening starts

---

## Project Structure

```
find-my-stuff/
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main application logic
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── backend/
│   ├── main.py              # FastAPI application
│   └── requirements.txt
│
└── README.md
```

---

## API Endpoints

| Method | Endpoint       | Description                          |
|--------|----------------|--------------------------------------|
| GET    | `/`            | Health check + model configuration   |
| POST   | `/remember`    | Save a place (image + location)      |
| POST   | `/find`        | Search for an object by query        |
| GET    | `/memory`      | List all saved places                |
| DELETE | `/memory`      | Clear all memory                     |
| POST   | `/test-key`    | Validate a user-provided API key     |

All endpoints support an optional `X-API-Key` header for user-provided Meta API keys.

---

## Privacy & Security

- Camera frames are processed on demand
- User API keys are stored only in the browser (`localStorage`)
- No personal images are uploaded to any third-party service by default
- Clear messaging: “Saved on your device”
- Users can clear memory at any time

---

## Future Roadmap

- [ ] Full integration with live Meta SAM 3.1 + Vision models
- [ ] Persistent local storage of saved places (IndexedDB)
- [ ] Ability to review past saved places
- [ ] Better multi-object detection and ranking
- [ ] Support for Meta Glass / wearable form factor
- [ ] Offline mode with on-device models

---

## Hackathon Details

**Event:** Meta Global AI Developer Hackathon 2026  
**Organizers:** Meta + Cerebral Valley  
**Dates:** 26 October – 4 November 2026  
**Track:** Indie Developer  
**Theme:** Build for Your World  
**Submission Deadline:** 4 November 2026, 9:00 PM ET

---



## Acknowledgements

Thanks to Meta and Cerebral Valley for organizing the hackathon and providing access to the latest AI models and resources.

---

## License

This project was created as part of the Meta Global AI Developer Hackathon 2026.
