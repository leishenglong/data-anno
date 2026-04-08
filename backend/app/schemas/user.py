from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    username: str
    role: str = "annotator"


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
