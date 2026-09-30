from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from sqlalchemy import func, select

from app.dependencies import CurrentWorkspace, DbSession
from app.models import Lead, Quote
from app.schemas import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
def dashboard(workspace: CurrentWorkspace, db: DbSession) -> DashboardResponse:
    cutoff = datetime.now(UTC) - timedelta(days=7)
    stalled_quote_query = select(Quote).where(
        Quote.workspace_id == workspace.id,
        Quote.status.in_(["SENT", "VIEWED", "NEGOTIATING"]),
        Quote.sent_at.is_not(None),
        Quote.sent_at <= cutoff,
    )
    stalled_lead_query = select(Lead).where(
        Lead.workspace_id == workspace.id,
        Lead.status.in_(["NEW", "CONTACTED", "QUALIFIED", "INACTIVE"]),
        func.coalesce(Lead.last_contacted_at, Lead.created_at) <= cutoff,
    )
    quotes = list(db.scalars(stalled_quote_query))
    leads = list(db.scalars(stalled_lead_query))
    return DashboardResponse(
        workspace_id=workspace.id,
        workspace_name=workspace.name,
        revenue_at_risk=float(sum((quote.amount for quote in quotes), start=0) + sum((lead.estimated_value for lead in leads), start=0)),
        stalled_quotes=len(quotes),
        stalled_leads=len(leads),
    )

