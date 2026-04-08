from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Project, Dataset, DataItem
from app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectStats

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """获取项目列表（支持分页）"""
    result = await db.execute(
        select(Project).offset(skip).limit(limit).order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    return projects


@router.post("", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """创建项目"""
    db_project = Project(**project.model_dump())
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取项目详情"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_update: ProjectUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """删除项目"""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/stats", response_model=ProjectStats)
async def get_project_stats(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取项目统计信息"""
    # 检查项目是否存在
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # 统计数据集数量
    datasets_result = await db.execute(
        select(func.count()).select_from(Dataset).where(Dataset.project_id == project_id)
    )
    total_datasets = datasets_result.scalar()
    
    # 统计数据项数量
    items_result = await db.execute(
        select(
            func.count(DataItem.id),
            func.sum(func.case((DataItem.status == "annotated", 1), else_=0)),
            func.sum(func.case((DataItem.status == "pending", 1), else_=0)),
            func.sum(func.case((DataItem.status == "reviewed", 1), else_=0))
        )
        .select_from(DataItem)
        .join(Dataset, DataItem.dataset_id == Dataset.id)
        .where(Dataset.project_id == project_id)
    )
    row = items_result.one()
    total_items = row[0] or 0
    annotated_items = row[1] or 0
    pending_items = row[2] or 0
    reviewed_items = row[3] or 0

    progress = ((annotated_items + reviewed_items) / total_items * 100) if total_items > 0 else 0.0

    return ProjectStats(
        total_datasets=total_datasets,
        total_items=total_items,
        annotated_items=annotated_items,
        pending_items=pending_items,
        reviewed_items=reviewed_items,
        annotation_progress=round(progress, 2)
    )
