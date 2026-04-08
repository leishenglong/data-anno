from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict


class DatasetBase(BaseModel):
    name: str


class DatasetCreate(DatasetBase):
    pass


class DatasetUpdate(BaseModel):
    name: Optional[str] = None


class DatasetResponse(DatasetBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    project_id: int
    file_name: Optional[str]
    total_items: int
    annotated_items: int
    status: str
    created_at: datetime


class DataItemBase(BaseModel):
    content: Dict[str, Any]
    meta_data: Dict[str, Any] = {}
    status: str = "pending"
    order_index: int = 0


class DataItemCreate(DataItemBase):
    pass


class DataItemUpdate(BaseModel):
    content: Optional[Dict[str, Any]] = None
    meta_data: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class DataItemResponse(DataItemBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    dataset_id: int


class DataItemListResponse(BaseModel):
    items: List[DataItemResponse]
    total: int
    page: int
    page_size: int
