from fastapi import APIRouter

from app.dependencies import CurrentWorkspace, DbSession
from app.schemas import OpportunityResponse
from app.services.opportunities import detect_opportunities

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


@router.get("", response_model=list[OpportunityResponse])
def list_opportunities(workspace: CurrentWorkspace, db: DbSession) -> list[OpportunityResponse]:
    return detect_opportunities(db, workspace.id)

