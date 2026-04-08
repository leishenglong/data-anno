from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Annotation(Base):
    __tablename__ = "annotations"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("data_items.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    annotation_type = Column(String(50), nullable=False)
    content = Column(JSON, nullable=False)  # 存储标注结果
    is_ai_generated = Column(Boolean, default=False)
    review_status = Column(String(20), default="pending")  # pending, approved, rejected
    review_comment = Column(String(1000))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    item = relationship("DataItem", back_populates="annotations")
    user = relationship("User", back_populates="annotations")
