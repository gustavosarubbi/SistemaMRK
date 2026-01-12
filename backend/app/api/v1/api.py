from fastapi import APIRouter
from app.api.v1.endpoints import auth, projects, dashboard, movements, validation, reports, ofx

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(movements.router, prefix="/movements", tags=["movements"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(validation.router, prefix="/validation", tags=["validation"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(ofx.router, prefix="/ofx", tags=["ofx"])

