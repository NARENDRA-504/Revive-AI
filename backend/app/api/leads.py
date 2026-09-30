from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import select

from app.dependencies import CurrentWorkspace, DbSession
from app.models import Lead
from app.schemas import LeadInput, LeadResponse

router = APIRouter(prefix="/leads", tags=["leads"])


@router.get("", response_model=list[LeadResponse])
def list_leads(workspace: CurrentWorkspace, db: DbSession) -> list[Lead]:
    return list(db.scalars(select(Lead).where(Lead.workspace_id == workspace.id).order_by(Lead.updated_at.desc())))


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadInput, workspace: CurrentWorkspace, db: DbSession) -> Lead:
    lead = Lead(workspace_id=workspace.id, **payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: UUID, payload: LeadInput, workspace: CurrentWorkspace, db: DbSession) -> Lead:
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.workspace_id == workspace.id))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for key, value in payload.model_dump().items():
        setattr(lead, key, value)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: UUID, workspace: CurrentWorkspace, db: DbSession) -> Response:
    lead = db.scalar(select(Lead).where(Lead.id == lead_id, Lead.workspace_id == workspace.id))
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

