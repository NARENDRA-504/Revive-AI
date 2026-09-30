from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentWorkspace, DbSession
from app.models import Conversation, Lead, Message, utc_now
from app.schemas import ConversationInput, ConversationResponse, MessageInput, MessageResponse

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationResponse])
def list_conversations(workspace: CurrentWorkspace, db: DbSession) -> list[Conversation]:
    statement = (
        select(Conversation)
        .where(Conversation.workspace_id == workspace.id)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.updated_at.desc())
    )
    return list(db.scalars(statement))


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_conversation(payload: ConversationInput, workspace: CurrentWorkspace, db: DbSession) -> Conversation:
    if payload.lead_id and not db.scalar(select(Lead.id).where(
        Lead.id == payload.lead_id, Lead.workspace_id == workspace.id,
    )):
        raise HTTPException(status_code=404, detail="Lead not found in this workspace")
    conversation = Conversation(
        workspace_id=workspace.id,
        lead_id=payload.lead_id,
        channel=payload.channel,
        subject=payload.subject,
    )
    conversation.messages.append(Message(**payload.first_message.model_dump()))
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def add_message(
    conversation_id: UUID,
    payload: MessageInput,
    workspace: CurrentWorkspace,
    db: DbSession,
) -> Message:
    conversation = db.scalar(select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.workspace_id == workspace.id,
    ))
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    message = Message(conversation_id=conversation.id, **payload.model_dump())
    conversation.updated_at = utc_now()
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

