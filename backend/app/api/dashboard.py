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
    by_currency: dict[str, Decimal] = {}
    for item in opportunities:
        by_currency[item.currency] = by_currency.get(item.currency, Decimal(0)) + item.amount
    return DashboardResponse(
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        revenue_at_risk=float(by_currency.get("USD", Decimal(0))),
        revenue_at_risk_by_currency={currency: float(amount) for currency, amount in by_currency.items()},
        stalled_quotes=len(quotes),
        stalled_leads=len(leads),
    )

