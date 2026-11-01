from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import uvicorn
import time

app = FastAPI(title="Find My Stuff API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# META MODEL CONFIGURATION
# ============================================
# Models required for Find My Stuff:
# 1. SAM (Segment Anything) → detect & segment objects in the photo
# 2. Multimodal / Vision model → understand the scene and answer "where is X"

SAM_MODEL = "sam-3.1"          # Update exact name from Meta dashboard if different
VISION_MODEL = "muse-vision"   # Update exact name from Meta dashboard if different

memory_store = []


@app.get("/")
def root():
    return {
        "status": "Find My Stuff API is running",
        "version": "0.2.0",
        "models": {
            "segmentation": SAM_MODEL,
            "vision": VISION_MODEL
        }
    }


@app.post("/remember")
async def remember(
    file: UploadFile = File(...),
    location: Optional[str] = Form("Current view"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    """
    Save a place.
    If the user provides an API key we will later call real Meta models.
    For now it still works with mock data so the app never breaks.
    """
    await file.read()

    objects = ["blue charger", "black notebook", "keys", "silver pen", "usb cable"]

    # When real Meta integration is ready, we will use x_api_key + SAM_MODEL here

    entry = {
        "id": len(memory_store) + 1,
        "timestamp": time.time(),
        "location": location,
        "objects": objects,
        "filename": file.filename
    }
    memory_store.append(entry)

    return {
        "success": True,
        "message": f"Remembered {len(objects)} objects",
        "objects": objects,
        "location": entry["location"],
        "used_user_key": bool(x_api_key)
    }


@app.post("/find")
async def find(
    query: str = Form(...),
    file: Optional[UploadFile] = File(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    """Find an object using memory + optional current frame."""
    query_lower = query.lower()
    matches = []

    for item in memory_store:
        for obj in item["objects"]:
            if any(word in obj for word in query_lower.split()):
                matches.append({
                    "object": obj,
                    "location": item["location"],
                    "timestamp": item["timestamp"],
                    "confidence": 0.87
                })

    if not matches:
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
        "matches": matches[:3],
        "used_user_key": bool(x_api_key)
    }


@app.get("/memory")
def get_memory():
    return {"count": len(memory_store), "items": memory_store}


@app.delete("/memory")
def clear_memory():
    memory_store.clear()
    return {"success": True, "message": "Memory cleared"}


@app.post("/test-key")
async def test_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Check that a user-provided API key is received correctly."""
    if not x_api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    return {
        "success": True,
        "message": "API key received successfully",
        "key_preview": x_api_key[:6] + "..." + x_api_key[-4:] if len(x_api_key) > 12 else "***"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
