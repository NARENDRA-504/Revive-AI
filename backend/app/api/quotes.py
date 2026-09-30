from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.dependencies import CurrentWorkspace, DbSession
from app.models import Lead, Quote
from app.schemas import QuoteInput, QuoteResponse

router = APIRouter(prefix="/quotes", tags=["quotes"])


def validate_lead(lead_id: UUID | None, workspace_id: UUID, db: DbSession) -> None:
    if lead_id and not db.scalar(select(Lead.id).where(Lead.id == lead_id, Lead.workspace_id == workspace_id)):
        raise HTTPException(status_code=404, detail="Lead not found in this workspace")


@router.get("", response_model=list[QuoteResponse])
def list_quotes(workspace: CurrentWorkspace, db: DbSession) -> list[Quote]:
    return list(db.scalars(select(Quote).where(Quote.workspace_id == workspace.id).order_by(Quote.updated_at.desc())))


@router.post("", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
def create_quote(payload: QuoteInput, workspace: CurrentWorkspace, db: DbSession) -> Quote:
    validate_lead(payload.lead_id, workspace.id, db)
    quote = Quote(workspace_id=workspace.id, **payload.model_dump())
    db.add(quote)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Quote number already exists in this workspace") from None
    db.refresh(quote)
    return quote


@router.put("/{quote_id}", response_model=QuoteResponse)
def update_quote(quote_id: UUID, payload: QuoteInput, workspace: CurrentWorkspace, db: DbSession) -> Quote:
    quote = db.scalar(select(Quote).where(Quote.id == quote_id, Quote.workspace_id == workspace.id))
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    validate_lead(payload.lead_id, workspace.id, db)
    for key, value in payload.model_dump().items():
        setattr(quote, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Quote number already exists in this workspace") from None
    db.refresh(quote)
    return quote


@router.delete("/{quote_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quote(quote_id: UUID, workspace: CurrentWorkspace, db: DbSession) -> Response:
    quote = db.scalar(select(Quote).where(Quote.id == quote_id, Quote.workspace_id == workspace.id))
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    db.delete(quote)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

