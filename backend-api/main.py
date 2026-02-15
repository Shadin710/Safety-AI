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
from detect_image import detect_violation


# loading fastapi
app =FastAPI()



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

    
    severity, event_type, detections = detect_violation(img,filepath,1)
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


    return {"detections": detections}


@app.post("/detect-videos")
async def detect_videos(file: UploadFile=File(...)):
    filename = f"{uuid.uuid4()}.mp4"
    filepath= os.path.join("uploads/videos",filename)
    
    # opening the file
    with open (filepath,"wb") as f:
        f.write(await file.read())
    
    cap  = cv2.VideoCapture(filepath)

    frame_count=0
    violations = 0


    while cap.isOpened():
        ret,frame = cap.read()
        if not ret:
            break
        frame_count+=1

        
        if frame_count%40 !=0:
            continue

        severity,event_type,detections = detect_violation(frame,filepath,frame_count)
        if severity == "HIGH":
            violations += 1
        
        if violations>=60:
            violations=0
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
