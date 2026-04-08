from app.routers.projects import router as projects_router
from app.routers.datasets import router as datasets_router
from app.routers.annotations import router as annotations_router
from app.routers.ai import router as ai_router
from app.routers.stats import router as stats_router

__all__ = ["projects_router", "datasets_router", "annotations_router", "ai_router", "stats_router"]
