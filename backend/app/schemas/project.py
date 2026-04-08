from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    annotation_type: str
    config: Dict[str, Any] = {}


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: datetime


class ProjectStats(BaseModel):
    total_datasets: int
    total_items: int
    annotated_items: int
    pending_items: int
    reviewed_items: int
    annotation_progress: float  # percentage
