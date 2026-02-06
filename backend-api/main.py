from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import  YOLO
import cv2
import os
import uuid

# loading fastapi
app =FastAPI()

# loading YOLO model
model = YOLO("yolov8n.pt")

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
    for r in results:
        for box in r.boxes:
            detections.append({
                "label": model.names[int(box.cls)],
                "confidence": float(box.conf),
                "bbox": box.xyxy.tolist()
            })

    return {"detections": detections}