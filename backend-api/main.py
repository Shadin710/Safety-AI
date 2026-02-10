from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import  YOLO
import cv2
import os
import uuid
from db import SessionLocal
from models import Event
import requests
from datetime import datetime
 

# loading fastapi
app =FastAPI()

# loading YOLO model
model = YOLO("last.pt")

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def home():
    return {"message: All good"}

@app.post("/detect-image")
async def detect_image(file: UploadFile=File(...)):
    filename = f"{uuid.uuid4()}.jpg"
    filepath= os.path.join("uploads",filename)
    
    # opening the file
    with open (filepath,"wb") as f:
        f.write(await file.read())
    
    img = cv2.imread(filepath)

    # will load this model in executor in future
    results = model(img)

    detections = []
    db= SessionLocal()
    labels = []
    for r in results:
        for box in r.boxes:
            label =model.names[int(box.cls)]
            labels.append(model.names[int(box.cls)])
            confidence = float(box.conf)
            detections.append({
                "label": model.names[int(box.cls)],
                "confidence": float(box.conf),
                "bbox": box.xyxy.tolist()
            })
        if "Person" in labels and "NO-Hardhat" in labels:
            event_type = "PPE_VIOLATION"
            severity = "HIGH"
            event = Event(
                event_type=event_type,
                severity=severity,
                label=label,
                confidence = confidence,
                image_path=filepath
            )

            db.add(event)
        elif "Person" in labels and "NO-Safety Vest" in labels:
            event_type = "PPE_VIOLATION"
            severity = "HIGH"
            event = Event(
                event_type=event_type,
                severity=severity,
                label=label,
                confidence = confidence,
                image_path=filepath
            )

            db.add(event)

        else:
            event_type ="Normal"
            severity = "LOW"
    print(severity) 
    if severity == "HIGH":
        try:
            res = requests.post(
                "http://localhost:5678/webhook-test/safety-ai",
                json={
                    "event_type": event_type,
                    "severity": severity,
                    "camera": "Pit-A", 
                    # "timestamp": str(datetime.utcnow())
                }
            )
            print("n8n response:", res.status_code, res.text) 
        except Exception as e:
            print("Error calling n8n:", e)      

    db.commit()
    db.close()

    return {"detections": detections}

@app.get("/events")
def get_events():
    db= SessionLocal()
    events  =db.query(Event).all()
    db.close()

    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "severity": e.severity,
            "label": e.label,
            "confidence": e.confidence,
            "image_path": e.image_path,
            # "timetime_stampstamp": e.time_stamp
        }
        for e in events
    ]