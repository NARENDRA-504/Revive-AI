from fastapi import APIRouter

from app.dependencies import CurrentWorkspace
from app.schemas import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def dashboard(workspace: CurrentWorkspace) -> DashboardResponse:
    return DashboardResponse(workspace_id=workspace.id, workspace_name=workspace.name)
