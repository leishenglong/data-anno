from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(1000))
    annotation_type = Column(String(50), nullable=False)  # text_classification, ner, relation_extraction, dialog, score_review
    config = Column(JSON, default=dict)  # 存储标签集等配置
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    datasets = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
