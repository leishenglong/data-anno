from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models import Annotation, DataItem, Dataset
from app.schemas import (
    AnnotationResponse, AnnotationCreateWithUser, AnnotationUpdate,
    ReviewRequest, AnnotationListResponse, DataItemResponse
)

router = APIRouter(prefix="/api", tags=["annotations"])


# ============ 新增 Schema ============

class BatchReviewRequest(BaseModel):
    """批量审核请求"""
    annotation_ids: List[int]
    status: str  # "approved" | "rejected"
    comment: Optional[str] = None


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    annotation_ids: List[int]


@router.get("/datasets/{dataset_id}/next", response_model=DataItemResponse)
async def get_next_pending_item(
    dataset_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取下一条待标注数据

    查询该数据集中 status='pending' 的第一条数据（按 order_index 排序）
    """
    # 检查数据集是否存在
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # 查询第一条待标注数据
    result = await db.execute(
        select(DataItem)
        .where(DataItem.dataset_id == dataset_id)
        .where(DataItem.status == "pending")
        .order_by(DataItem.order_index)
        .limit(1)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=404, detail="No pending items found in this dataset")

    return DataItemResponse.model_validate(item)


@router.post("/items/{item_id}/annotations", response_model=AnnotationResponse)
async def create_annotation(
    item_id: int,
    annotation_data: AnnotationCreateWithUser,
    db: AsyncSession = Depends(get_db)
):
    """提交标注

    创建 Annotation 记录，更新 DataItem 的 status 为 'annotated'，
    更新 Dataset 的 annotated_items 计数
    """
    # 检查数据项是否存在
    result = await db.execute(select(DataItem).where(DataItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Data item not found")

    # 检查数据集是否存在
    result = await db.execute(select(Dataset).where(Dataset.id == item.dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # 创建标注记录
    annotation = Annotation(
        item_id=item_id,
        user_id=annotation_data.user_id,
        annotation_type=annotation_data.annotation_type,
        content=annotation_data.content,
        is_ai_generated=False,
        review_status="pending"
    )
    db.add(annotation)

    # 更新数据项状态（如果是第一次标注）
    if item.status == "pending":
        item.status = "annotated"
        # 更新数据集的已标注计数
        dataset.annotated_items += 1

    await db.commit()
    await db.refresh(annotation)

    return AnnotationResponse.model_validate(annotation)


@router.get("/items/{item_id}/annotations", response_model=AnnotationListResponse)
async def get_item_annotations(
    item_id: int,
    db: AsyncSession = Depends(get_db)
):
    """获取数据项的所有标注记录"""
    # 检查数据项是否存在
    result = await db.execute(select(DataItem).where(DataItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Data item not found")

    # 查询所有标注记录
    result = await db.execute(
        select(Annotation)
        .where(Annotation.item_id == item_id)
        .order_by(Annotation.created_at.desc())
    )
    annotations = result.scalars().all()

    # 获取总数
    count_result = await db.execute(
        select(func.count()).select_from(Annotation).where(Annotation.item_id == item_id)
    )
    total = count_result.scalar()

    return AnnotationListResponse(
        items=[AnnotationResponse.model_validate(ann) for ann in annotations],
        total=total
    )


@router.put("/annotations/{annotation_id}", response_model=AnnotationResponse)
async def update_annotation(
    annotation_id: int,
    update_data: AnnotationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新标注内容

    允许修改已提交的标注内容，用于修正错误
    """
    result = await db.execute(
        select(Annotation).where(Annotation.id == annotation_id)
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(annotation, field, value)
    
    await db.commit()
    await db.refresh(annotation)
    
    return AnnotationResponse.model_validate(annotation)


@router.put("/annotations/{annotation_id}/review", response_model=AnnotationResponse)
async def review_annotation(
    annotation_id: int,
    review_data: ReviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """审核标注

    更新标注的 review_status 和 review_comment
    如果 approved，更新 DataItem 的 status 为 'reviewed'
    """
    # 验证状态值
    if review_data.status not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Must be 'approved' or 'rejected'"
        )

    # 查询标注记录
    result = await db.execute(
        select(Annotation).where(Annotation.id == annotation_id)
    )
    annotation = result.scalar_one_or_none()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    # 更新标注审核状态
    annotation.review_status = review_data.status
    annotation.review_comment = review_data.comment

    # 如果审核通过，更新数据项状态为已审核
    if review_data.status == "approved":
        result = await db.execute(
            select(DataItem).where(DataItem.id == annotation.item_id)
        )
        item = result.scalar_one_or_none()
        if item and item.status != "reviewed":
            item.status = "reviewed"

    await db.commit()
    await db.refresh(annotation)

    return AnnotationResponse.model_validate(annotation)


@router.post("/annotations/batch-review")
async def batch_review_annotations(
    request: BatchReviewRequest,
    db: AsyncSession = Depends(get_db)
):
    """批量审核标注

    一次性审核多条标注，大幅减少审核操作次数
    """
    if request.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    result = await db.execute(
        select(Annotation).where(Annotation.id.in_(request.annotation_ids))
    )
    annotations = result.scalars().all()
    
    if not annotations:
        raise HTTPException(status_code=404, detail="No annotations found")
    
    updated_count = 0
    for annotation in annotations:
        annotation.review_status = request.status
        annotation.review_comment = request.comment
        
        # 如果审核通过，更新数据项状态
        if request.status == "approved":
            item_result = await db.execute(
                select(DataItem).where(DataItem.id == annotation.item_id)
            )
            item = item_result.scalar_one_or_none()
            if item and item.status != "reviewed":
                item.status = "reviewed"
        
        updated_count += 1
    
    await db.commit()
    
    return {"message": f"Successfully reviewed {updated_count} annotations", "count": updated_count}


@router.delete("/annotations/batch")
async def batch_delete_annotations(
    request: BatchDeleteRequest,
    db: AsyncSession = Depends(get_db)
):
    """批量删除标注"""
    result = await db.execute(
        select(Annotation).where(Annotation.id.in_(request.annotation_ids))
    )
    annotations = result.scalars().all()
    
    if not annotations:
        raise HTTPException(status_code=404, detail="No annotations found")
    
    deleted_count = 0
    for annotation in annotations:
        await db.delete(annotation)
        deleted_count += 1
    
    await db.commit()
    
    return {"message": f"Successfully deleted {deleted_count} annotations", "count": deleted_count}


@router.get("/datasets/{dataset_id}/annotations", response_model=AnnotationListResponse)
async def list_dataset_annotations(
    dataset_id: int,
    status: str = Query(None, description="Filter by review_status: pending, approved, rejected"),
    is_ai: bool = Query(None, description="Filter by AI generated"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """获取数据集的所有标注记录（支持筛选和分页）

    用于标注审核页面，可按审核状态和AI生成筛选
    """
    # 检查数据集是否存在
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # 获取数据集的所有数据项ID
    items_result = await db.execute(
        select(DataItem.id).where(DataItem.dataset_id == dataset_id)
    )
    item_ids = [row[0] for row in items_result.all()]
    
    if not item_ids:
        return AnnotationListResponse(items=[], total=0)
    
    # 构建查询
    query = select(Annotation).where(Annotation.item_id.in_(item_ids))
    count_query = select(func.count()).select_from(Annotation).where(Annotation.item_id.in_(item_ids))
    
    if status:
        query = query.where(Annotation.review_status == status)
        count_query = count_query.where(Annotation.review_status == status)
    
    if is_ai is not None:
        query = query.where(Annotation.is_ai_generated == is_ai)
        count_query = count_query.where(Annotation.is_ai_generated == is_ai)
    
    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # 获取分页数据
    query = query.offset(skip).limit(limit).order_by(Annotation.created_at.desc())
    result = await db.execute(query)
    annotations = result.scalars().all()
    
    return AnnotationListResponse(
        items=[AnnotationResponse.model_validate(ann) for ann in annotations],
        total=total
    )
