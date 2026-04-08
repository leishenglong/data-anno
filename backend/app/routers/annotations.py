from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Annotation, DataItem, Dataset
from app.schemas import (
    AnnotationResponse, AnnotationCreateWithUser,
    ReviewRequest, AnnotationListResponse, DataItemResponse
)

router = APIRouter(prefix="/api", tags=["annotations"])


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
