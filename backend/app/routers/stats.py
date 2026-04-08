"""System statistics API - 系统统计接口"""
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Project, Dataset, DataItem, Annotation

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview")
async def get_system_overview(db: AsyncSession = Depends(get_db)):
    """获取系统概览统计
    
    用于 Dashboard 首页展示
    """
    # 项目统计
    projects_result = await db.execute(select(func.count()).select_from(Project))
    total_projects = projects_result.scalar() or 0
    
    # 数据集统计
    datasets_result = await db.execute(select(func.count()).select_from(Dataset))
    total_datasets = datasets_result.scalar() or 0
    
    # 数据项统计
    items_result = await db.execute(
        select(
            func.count(DataItem.id),
            func.sum(func.case((DataItem.status == "annotated", 1), else_=0)),
            func.sum(func.case((DataItem.status == "pending", 1), else_=0)),
            func.sum(func.case((DataItem.status == "reviewed", 1), else_=0))
        ).select_from(DataItem)
    )
    row = items_result.one()
    total_items = row[0] or 0
    annotated_items = row[1] or 0
    pending_items = row[2] or 0
    reviewed_items = row[3] or 0
    
    # 标注统计
    annotations_result = await db.execute(
        select(
            func.count(Annotation.id),
            func.sum(func.case((Annotation.is_ai_generated == True, 1), else_=0)),
            func.sum(func.case((Annotation.review_status == "approved", 1), else_=0)),
            func.sum(func.case((Annotation.review_status == "pending", 1), else_=0)),
            func.sum(func.case((Annotation.review_status == "rejected", 1), else_=0))
        ).select_from(Annotation)
    )
    ann_row = annotations_result.one()
    total_annotations = ann_row[0] or 0
    ai_annotations = ann_row[1] or 0
    approved_annotations = ann_row[2] or 0
    pending_review_annotations = ann_row[3] or 0
    rejected_annotations = ann_row[4] or 0
    
    # 计算进度
    annotation_progress = ((annotated_items + reviewed_items) / total_items * 100) if total_items > 0 else 0.0
    review_progress = (approved_annotations / total_annotations * 100) if total_annotations > 0 else 0.0
    ai_percentage = (ai_annotations / total_annotations * 100) if total_annotations > 0 else 0.0
    
    # 按项目类型统计
    type_result = await db.execute(
        select(Project.annotation_type, func.count(Project.id))
        .group_by(Project.annotation_type)
    )
    projects_by_type = {row[0]: row[1] for row in type_result.all()}
    
    # 最近的项目
    recent_projects_result = await db.execute(
        select(Project).order_by(Project.created_at.desc()).limit(5)
    )
    recent_projects = recent_projects_result.scalars().all()
    
    return {
        "projects": {
            "total": total_projects,
            "by_type": projects_by_type,
        },
        "datasets": {
            "total": total_datasets,
        },
        "items": {
            "total": total_items,
            "annotated": annotated_items,
            "pending": pending_items,
            "reviewed": reviewed_items,
        },
        "annotations": {
            "total": total_annotations,
            "ai_generated": ai_annotations,
            "approved": approved_annotations,
            "pending_review": pending_review_annotations,
            "rejected": rejected_annotations,
        },
        "progress": {
            "annotation": round(annotation_progress, 2),
            "review": round(review_progress, 2),
            "ai_percentage": round(ai_percentage, 2),
        },
        "recent_projects": [
            {
                "id": p.id,
                "name": p.name,
                "annotation_type": p.annotation_type,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in recent_projects
        ],
    }
