from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String(200), nullable=False)
    file_name = Column(String(500))
    total_items = Column(Integer, default=0)
    annotated_items = Column(Integer, default=0)
    status = Column(String(20), default="pending")  # pending, processing, completed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    project = relationship("Project", back_populates="datasets")
    items = relationship("DataItem", back_populates="dataset", cascade="all, delete-orphan")


class DataItem(Base):
    __tablename__ = "data_items"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    content = Column(JSON, nullable=False)  # 存储原始数据
    meta_data = Column(JSON, default=dict)  # 元数据
    status = Column(String(20), default="pending")  # pending, annotated, reviewed
    order_index = Column(Integer, default=0)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="items")
    annotations = relationship("Annotation", back_populates="item", cascade="all, delete-orphan")
