from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class AnnotationBase(BaseModel):
    annotation_type: str
    content: Dict[str, Any]
    is_ai_generated: bool = False


class AnnotationCreate(AnnotationBase):
    pass


class AnnotationCreateWithUser(BaseModel):
    """提交标注请求体"""
    annotation_type: str
    content: Dict[str, Any]
    user_id: Optional[int] = None


class AnnotationUpdate(BaseModel):
    content: Optional[Dict[str, Any]] = None
    review_status: Optional[str] = None
    review_comment: Optional[str] = None


class AnnotationResponse(AnnotationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    user_id: Optional[int]
    review_status: str
    review_comment: Optional[str]
    created_at: datetime
    updated_at: datetime


class ReviewRequest(BaseModel):
    """审核标注请求体"""
    status: str  # "approved" | "rejected"
    comment: Optional[str] = None


class AnnotationListResponse(BaseModel):
    """标注列表响应"""
    items: List[AnnotationResponse]
    total: int


class IncidentReportContent(BaseModel):
    incident_type: str = Field(..., description="事故类型")
    incident_level: str = Field(..., description="等级：一般/较大/重大/特别重大")
    cause: str = Field(..., description="原因分类")
    description: Optional[str] = Field("", description="自由文本描述")
    attachments: List[Dict[str, str]] = Field(default_factory=list, description="附件URL列表")
