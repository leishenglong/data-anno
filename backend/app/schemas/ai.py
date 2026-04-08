"""AI 相关 Schema"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class AIAnnotateRequest(BaseModel):
    """单条 AI 标注请求"""
    item_id: int
    annotation_type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    prompt_template: Optional[str] = None


class AIAnnotateResponse(BaseModel):
    """单条 AI 标注响应"""
    annotation: Dict[str, Any]


class AIBatchRequest(BaseModel):
    """批量 AI 标注请求"""
    dataset_id: int
    annotation_type: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    prompt_template: Optional[str] = None


class AIBatchResponse(BaseModel):
    """批量 AI 标注响应"""
    task_id: str
    status: str
    total: int


class AIConfigResponse(BaseModel):
    """AI 配置响应"""
    provider: str
    openai_api_key: str
    openai_base_url: str
    openai_model: str
    ollama_base_url: str
    ollama_model: str
    prompt_templates: Dict[str, str]


class AIConfigUpdate(BaseModel):
    """AI 配置更新请求"""
    provider: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    prompt_templates: Optional[Dict[str, str]] = None


class ModelInfo(BaseModel):
    """模型信息"""
    id: str
    name: str
