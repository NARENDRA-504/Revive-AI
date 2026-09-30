from decimal import Decimal

from fastapi import APIRouter

from app.dependencies import CurrentWorkspace, DbSession
from app.schemas import DashboardResponse
from app.services.opportunities import detect_opportunities

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def dashboard(workspace: CurrentWorkspace, db: DbSession) -> DashboardResponse:
    opportunities = detect_opportunities(db, workspace.id)
    quotes = [item for item in opportunities if item.source_type == "quote"]
    leads = [item for item in opportunities if item.source_type == "lead"]
    return DashboardResponse(
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        revenue_at_risk=float(sum((item.amount for item in opportunities), start=Decimal(0))),
        stalled_quotes=len(quotes),
        stalled_leads=len(leads),
    )

