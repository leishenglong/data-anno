import json
import csv
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Project, Dataset, DataItem
from app.schemas import DatasetCreate, DatasetUpdate, DatasetResponse, DataItemResponse, DataItemListResponse
from app.services.export_service import export_service

router = APIRouter(prefix="/api", tags=["datasets"])


@router.get("/projects/{project_id}/datasets", response_model=List[DatasetResponse])
async def list_datasets(
    project_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取项目下的数据集列表"""
    # 检查项目是否存在
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    result = await db.execute(
        select(Dataset).where(Dataset.project_id == project_id).order_by(Dataset.created_at.desc())
    )
    datasets = result.scalars().all()
    return datasets


@router.post("/projects/{project_id}/datasets", response_model=DatasetResponse)
async def create_dataset(
    project_id: int,
    name: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """上传数据集（支持 JSON, JSONL, CSV）"""
    # 检查项目是否存在
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 读取文件内容
    content = await file.read()
    filename = file.filename or "unnamed"
    
    # 解析数据
    items_data = []
    try:
        if filename.endswith('.json'):
            data = json.loads(content.decode('utf-8'))
            if isinstance(data, list):
                items_data = data
            else:
                items_data = [data]
        elif filename.endswith('.jsonl'):
            text = content.decode('utf-8')
            for line in text.strip().split('\n'):
                if line.strip():
                    items_data.append(json.loads(line))
        elif filename.endswith('.csv'):
            text = content.decode('utf-8')
            reader = csv.DictReader(io.StringIO(text))
            items_data = list(reader)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use JSON, JSONL, or CSV")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
    
    if not items_data:
        raise HTTPException(status_code=400, detail="No data found in file")
    
    # 创建数据集
    dataset = Dataset(
        project_id=project_id,
        name=name,
        file_name=filename,
        total_items=len(items_data),
        annotated_items=0,
        status="processing"
    )
    db.add(dataset)
    await db.flush()  # 获取 dataset.id
    
    # 创建数据项
    for idx, item_data in enumerate(items_data):
        data_item = DataItem(
            dataset_id=dataset.id,
            content=item_data if isinstance(item_data, dict) else {"data": item_data},
            meta_data={},
            status="pending",
            order_index=idx
        )
        db.add(data_item)
    
    dataset.status = "completed"
    await db.commit()
    await db.refresh(dataset)
    
    return dataset


@router.get("/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    """获取数据集详情"""
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    """删除数据集"""
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    await db.delete(dataset)
    await db.commit()
    return {"message": "Dataset deleted successfully"}


@router.get("/datasets/{dataset_id}/items", response_model=DataItemListResponse)
async def list_data_items(
    dataset_id: int,
    status: str = Query(None, description="Filter by status: pending, annotated, reviewed"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """获取数据项列表（支持分页和状态筛选）"""
    # 检查数据集是否存在
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # 构建查询
    query = select(DataItem).where(DataItem.dataset_id == dataset_id)
    count_query = select(func.count()).select_from(DataItem).where(DataItem.dataset_id == dataset_id)
    
    if status:
        query = query.where(DataItem.status == status)
        count_query = count_query.where(DataItem.status == status)
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 获取分页数据
    query = query.offset(skip).limit(limit).order_by(DataItem.order_index)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return DataItemListResponse(
        items=[DataItemResponse.model_validate(item) for item in items],
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.get("/datasets/{dataset_id}/export")
async def export_dataset(
    dataset_id: int,
    format: str = Query("json", description="Export format: json, jsonl, csv, alpaca, sharegpt"),
    db: AsyncSession = Depends(get_db)
):
    """导出数据集的标注结果"""
    # 检查数据集是否存在
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        # 导出数据
        content_bytes, ext = await export_service.export_dataset(db, dataset_id, format)
        
        # 设置文件名
        filename = f"{dataset.name}_export.{ext}"
        
        # 确定 MIME 类型
        mime_types = {
            'json': 'application/json',
            'jsonl': 'application/jsonlines+json',
            'csv': 'text/csv; charset=utf-8',
        }
        media_type = mime_types.get(ext, 'application/octet-stream')
        
        # 创建 StreamingResponse
        from io import BytesIO
        stream = BytesIO(content_bytes)
        
        return StreamingResponse(
            stream,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{filename}"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
