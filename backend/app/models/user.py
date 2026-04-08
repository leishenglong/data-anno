from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    role = Column(String(20), default="annotator")  # admin, annotator, reviewer
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    annotations = relationship("Annotation", back_populates="user")
