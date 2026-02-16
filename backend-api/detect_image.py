from ultralytics import YOLO
from db import SessionLocal
from models import Event
from logic import decide_event

model = YOLO("last.pt")

def detect_violation(img, filepath, frame):

    results = model(img)

    detections = []
    labels = []

    for r in results:
        for box in r.boxes:
            label = model.names[int(box.cls)]
            labels.append(label)

            confidence = float(box.conf)

            if label not in ["Person", "Hardhat", "machinery"]:
                detections.append({
                    "label": label,
                    "confidence": confidence,
                    "frame": frame,
                    "bbox": box.xyxy.tolist()
                })

    # decide severity based on labels
    event_type, severity = decide_event(labels)

    # store in DB only if HIGH
    if severity == "HIGH":
        db = SessionLocal()

        event = Event(
            event_type=event_type,
            severity=severity,
            label=",".join(labels),
            confidence=1.0,
            image_path=filepath
        )

        db.add(event)
        db.commit()
        db.close()

    return severity, event_type, detections
