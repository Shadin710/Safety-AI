from ultralytics import  YOLO
import cv2
import os
import uuid
from db import SessionLocal
from models import Event
import requests
from datetime import datetime
# loading YOLO model
model = YOLO("last.pt")
def detect_violation(img,filepath,frame):
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
            if label != "Person" and label!="Hardhat" and label!="machinery":
                detections.append({
                    "label": model.names[int(box.cls)],
                    "confidence": float(box.conf),
                    "frame": frame,
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
    
    db.commit()
    db.close()
    return severity,event_type,detections