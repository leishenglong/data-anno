import uuid
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DataItem, Dataset, Project, Annotation
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


# ============ Schemas ============

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


class ProviderPreset(BaseModel):
    """提供商预设"""
    id: str
    name: str
    base_url: str
    models: List[ModelInfo]


class BatchProgressResponse(BaseModel):
    """批量标注进度响应"""
    task_id: str
    status: str  # "processing" | "completed" | "failed"
    total: int
    completed: int
    failed: int


# ============ 内存中的批量任务进度追踪 ============
_batch_tasks: Dict[str, Dict[str, Any]] = {}


# ============ Routes ============

@router.post("/annotate", response_model=AIAnnotateResponse)
async def ai_annotate(
    request: AIAnnotateRequest,
    db: AsyncSession = Depends(get_db)
):
    """单条 AI 标注
    
    对指定数据项进行 AI 辅助标注，返回标注结果
    """
    # 查询数据项
    result = await db.execute(
        select(DataItem).where(DataItem.id == request.item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Data item not found")
    
    # 查询数据集和项目以获取配置
    result = await db.execute(
        select(Dataset, Project)
        .join(Project, Dataset.project_id == Project.id)
        .where(Dataset.id == item.dataset_id)
    )
    dataset_project = result.first()
    if not dataset_project:
        raise HTTPException(status_code=404, detail="Dataset or project not found")
    
    dataset, project = dataset_project
    
    # 确定标注类型和配置
    annotation_type = request.annotation_type or project.annotation_type
    config = request.config or project.config or {}
    
    # 调用 AI 服务
    ai_result = await ai_service.annotate_single(
        item.content,
        annotation_type,
        config,
        request.prompt_template
    )
    
    return AIAnnotateResponse(annotation=ai_result)


@router.post("/batch", response_model=AIBatchResponse)
async def ai_batch_annotate(
    request: AIBatchRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """批量 AI 预标注
    
    对数据集中所有待标注数据进行 AI 预标注，后台异步执行
    """
    # 查询数据集
    result = await db.execute(
        select(Dataset).where(Dataset.id == request.dataset_id)
    )
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # 查询项目以获取配置
    result = await db.execute(
        select(Project).where(Project.id == dataset.project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 查询待标注数据项
    result = await db.execute(
        select(DataItem)
        .where(DataItem.dataset_id == request.dataset_id)
        .where(DataItem.status == "pending")
    )
    items = result.scalars().all()
    
    if not items:
        return AIBatchResponse(
            task_id=f"batch_{request.dataset_id}_{uuid.uuid4().hex[:8]}",
            status="completed",
            total=0
        )

    # 确定标注类型和配置
    annotation_type = request.annotation_type or project.annotation_type
    config = request.config or project.config or {}

    # 启动后台任务
    task_id = f"batch_{request.dataset_id}_{uuid.uuid4().hex[:8]}"
    
    # 将 items 转换为 dict 列表
    item_list = [{"id": item.id, "content": item.content} for item in items]
    
    # 初始化进度追踪
    _batch_tasks[task_id] = {
        "status": "processing",
        "total": len(items),
        "completed": 0,
        "failed": 0,
    }
    
    # 创建新会话执行后台任务
    from app.database import async_session
    
    async def batch_annotate_task():
        async with async_session() as session:
            for item_data in item_list:
                try:
                    # 调用 AI 标注
                    ai_result = await ai_service.annotate_single(
                        item_data["content"],
                        annotation_type,
                        config,
                        request.prompt_template
                    )
                    
                    # 创建标注记录
                    annotation = Annotation(
                        item_id=item_data["id"],
                        user_id=None,
                        annotation_type=annotation_type,
                        content=ai_result.get("content", {}),
                        is_ai_generated=True,
                        review_status="pending"
                    )
                    session.add(annotation)
                    
                    # 更新数据项状态
                    result = await session.execute(
                        select(DataItem).where(DataItem.id == item_data["id"])
                    )
                    data_item = result.scalar_one_or_none()
                    if data_item:
                        data_item.status = "annotated"
                    
                    await session.commit()
                    
                    # 更新进度
                    if task_id in _batch_tasks:
                        _batch_tasks[task_id]["completed"] += 1
                except Exception as e:
                    print(f"Error annotating item {item_data['id']}: {e}")
                    await session.rollback()
                    if task_id in _batch_tasks:
                        _batch_tasks[task_id]["failed"] += 1
                
                # 小延迟避免请求过快
                await asyncio.sleep(0.1)
        
        # 标记任务完成
        if task_id in _batch_tasks:
            _batch_tasks[task_id]["status"] = "completed"
    
    import asyncio
    asyncio.create_task(batch_annotate_task())
    
    return AIBatchResponse(
        task_id=task_id,
        status="processing",
        total=len(items)
    )


@router.get("/config", response_model=AIConfigResponse)
async def get_ai_config():
    """获取 AI 配置"""
    config = ai_service.get_config()
    return AIConfigResponse(
        provider=config.get("provider", "openai"),
        openai_api_key=config.get("openai_api_key", ""),
        openai_base_url=config.get("openai_base_url", "https://api.openai.com/v1"),
        openai_model=config.get("openai_model", "gpt-4o-mini"),
        ollama_base_url=config.get("ollama_base_url", "http://localhost:11434"),
        ollama_model=config.get("ollama_model", "llama3.1"),
        prompt_templates=config.get("prompt_templates", {})
    )


@router.put("/config", response_model=AIConfigResponse)
async def update_ai_config(config_update: AIConfigUpdate):
    """更新 AI 配置"""
    update_data = config_update.model_dump(exclude_unset=True)
    config = ai_service.update_config(update_data)
    
    return AIConfigResponse(
        provider=config.get("provider", "openai"),
        openai_api_key=config.get("openai_api_key", ""),
        openai_base_url=config.get("openai_base_url", "https://api.openai.com/v1"),
        openai_model=config.get("openai_model", "gpt-4o-mini"),
        ollama_base_url=config.get("ollama_base_url", "http://localhost:11434"),
        ollama_model=config.get("ollama_model", "llama3.1"),
        prompt_templates=config.get("prompt_templates", {})
    )


@router.get("/models", response_model=List[ModelInfo])
async def get_available_models():
    """获取可用模型列表"""
    models = await ai_service.get_available_models()
    return [ModelInfo(id=m["id"], name=m["name"]) for m in models]


@router.post("/test-connection")
async def test_ai_connection():
    """测试 AI 连接"""
    try:
        config = ai_service._load_config()
        provider = config.get("provider", "openai")
        
        # 简单测试提示
        test_prompt = "Respond with a simple JSON: {\"status\": \"ok\"}"
        
        if provider == "ollama":
            import httpx
            base_url = config.get("ollama_base_url", "http://localhost:11434")
            model = config.get("ollama_model", "llama3.1")
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{base_url}/api/generate",
                    json={
                        "model": model,
                        "prompt": test_prompt,
                        "stream": False
                    },
                    timeout=30.0
                )
                response.raise_for_status()
        else:
            # 测试 OpenAI 连接
            client = ai_service._get_openai_client()
            await client.chat.completions.create(
                model=config.get("openai_model", "gpt-4o-mini"),
                messages=[{"role": "user", "content": test_prompt}],
                max_tokens=50
            )
        
        return {"status": "success", "message": f"{provider} connection successful"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


@router.get("/batch/{task_id}/progress", response_model=BatchProgressResponse)
async def get_batch_progress(task_id: str):
    """查询批量标注任务进度
    
    前端可轮询此接口获取批量预标注进度
    """
    if task_id not in _batch_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = _batch_tasks[task_id]
    return BatchProgressResponse(
        task_id=task_id,
        status=task["status"],
        total=task["total"],
        completed=task["completed"],
        failed=task["failed"],
    )


@router.get("/providers", response_model=List[ProviderPreset])
async def get_provider_presets():
    """获取所有 AI 提供商预设配置"""
    presets = []
    for pid, preset in ai_service.PROVIDER_PRESETS.items():
        presets.append(ProviderPreset(
            id=pid,
            name=preset["name"],
            base_url=preset["base_url"],
            models=[ModelInfo(id=m["id"], name=m["name"]) for m in preset["models"]]
        ))
    return presets
