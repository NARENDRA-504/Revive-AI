from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Lead, Quote
from app.schemas import OpportunityResponse

STALE_AFTER_DAYS = 7
ACTIVE_LEAD_STATUSES = {"NEW", "CONTACTED", "QUALIFIED", "INACTIVE"}
OPEN_QUOTE_STATUSES = {"SENT", "VIEWED", "NEGOTIATING"}


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _priority(amount: Decimal, days_waiting: int) -> str:
    if days_waiting >= 14 or amount >= Decimal(5000):
        return "HIGH"
    if days_waiting >= 10 or amount >= Decimal(1000):
        return "MEDIUM"
    return "LOW"


def detect_opportunities(db: Session, workspace_id: UUID, now: datetime | None = None) -> list[OpportunityResponse]:
    """Find stale active leads and unanswered sent quotes using explicit business rules."""
    current = _utc(now or datetime.now(UTC))
    leads = list(db.scalars(select(Lead).where(
        Lead.workspace_id == workspace_id,
        Lead.status.in_(ACTIVE_LEAD_STATUSES),
    )))
    quotes = list(db.scalars(select(Quote).where(
        Quote.workspace_id == workspace_id,
        Quote.status.in_(OPEN_QUOTE_STATUSES),
    )))
    linked_leads = {lead.id: lead for lead in leads}
    # Include linked leads that have moved to QUOTED for a meaningful customer label.
    if quotes:
        quote_lead_ids = {quote.lead_id for quote in quotes if quote.lead_id is not None}
        if quote_lead_ids:
            for lead in db.scalars(select(Lead).where(
                Lead.workspace_id == workspace_id,
                Lead.id.in_(quote_lead_ids),
            )):
                linked_leads[lead.id] = lead

    opportunities: list[OpportunityResponse] = []
    for lead in leads:
        reference = lead.next_followup_at or lead.last_contacted_at or lead.updated_at or lead.created_at
        days = (current - _utc(reference)).days
        if days < STALE_AFTER_DAYS:
            continue
        amount = Decimal(lead.estimated_value or 0)
        opportunities.append(OpportunityResponse(
            id=f"lead:{lead.id}", source_type="lead", source_id=lead.id,
            title=f"Follow up with {lead.name}", customer=lead.company or lead.name,
            amount=amount, currency="USD", days_waiting=days,
            priority=_priority(amount, days),
            reason=f"This {lead.status.lower()} lead has had no recorded next step for {days} days.",
            recommended_action="Review the notes and schedule a personal follow-up.",
        ))

    for quote in quotes:
        reference = quote.sent_at or quote.updated_at or quote.created_at
        days = (current - _utc(reference)).days
        if days < STALE_AFTER_DAYS:
            continue
        lead = linked_leads.get(quote.lead_id)
        customer = (lead.company or lead.name) if lead else "Customer not linked"
        amount = Decimal(quote.amount or 0)
        opportunities.append(OpportunityResponse(
            id=f"quote:{quote.id}", source_type="quote", source_id=quote.id,
            title=f"Follow up on quote {quote.quote_number}", customer=customer,
            amount=amount, currency=quote.currency, days_waiting=days,
            priority=_priority(amount, days),
            reason=f"This {quote.status.lower()} quote has been waiting for a response for {days} days.",
            recommended_action="Review the quote and prepare a relevant follow-up.",
        ))

    return sorted(opportunities, key=lambda item: (
        {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[item.priority], -item.amount, -item.days_waiting,
    ))

