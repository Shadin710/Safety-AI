from sqlalchemy import Column, Integer, String, Float, DateTime, func
from datetime import datetime

from db import Base

class Event(Base):
    __tablename__="events"

    id = Column(Integer, primary_key=True, index=True)
    event_type= Column(String, index=True)
    severity = Column(String)
    label = Column(String)
    confidence = Column(Float)
    image_path = Column(String)
    time_stamp  = Column(DateTime, server_default=func.now())