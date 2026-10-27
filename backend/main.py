from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import Optional
import time

app = FastAPI(title="Find My Stuff API", version="0.1.0")

# Allow frontend to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# MOCK AI LAYER (replace later)
# -----------------------------

mock_memory = []

@app.get("/")
def root():
    return {"status": "Find My Stuff API is running", "mode": "mock"}

@app.post("/remember")
async def remember(file: UploadFile = File(...), location: Optional[str] = Form(None)):
    """Mock: pretend we ran SAM 3.1 + description"""
    content = await file.read()
    # In real version we will call Meta SAM 3.1 here
    fake_objects = ["blue charger", "black notebook", "keys", "silver pen", "usb cable"]
    entry = {
        "id": len(mock_memory) + 1,
        "timestamp": time.time(),
        "location": location or "Unknown place",
        "objects": fake_objects,
        "filename": file.filename
    }
    mock_memory.append(entry)
    return {
        "success": True,
        "message": f"Remembered {len(fake_objects)} objects",
        "objects": fake_objects,
        "location": entry["location"]
    }

@app.post("/find")
async def find(query: str = Form(...), file: Optional[UploadFile] = File(None)):
    """Mock: pretend we searched memory + current frame"""
    query_lower = query.lower()

    # Simple mock search
    matches = []
    for item in mock_memory:
        for obj in item["objects"]:
            if any(word in obj for word in query_lower.split()):
                matches.append({
                    "object": obj,
                    "location": item["location"],
                    "timestamp": item["timestamp"],
                    "confidence": 0.87
                })

    if not matches:
        # Fake a current-frame detection sometimes
        matches.append({
            "object": query,
            "location": "Current camera view",
            "timestamp": time.time(),
            "confidence": 0.72,
            "live": True
        })

    return {
        "success": True,
        "query": query,
        "matches": matches[:3]
    }

@app.get("/memory")
def get_memory():
    return {"count": len(mock_memory), "items": mock_memory}

@app.delete("/memory")
def clear_memory():
    mock_memory.clear()
    return {"success": True, "message": "Memory cleared"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
