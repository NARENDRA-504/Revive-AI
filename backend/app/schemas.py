from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    workspace_name: str = Field(min_length=1, max_length=160)
    @field_validator("name", "workspace_name", mode="before")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        return value.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()


class WorkspaceUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return value.strip()


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    role: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    workspaces: list[WorkspaceResponse]


class CurrentUserResponse(BaseModel):
    user: UserResponse
    workspaces: list[WorkspaceResponse]


class DashboardResponse(BaseModel):
    workspace_id: UUID
    workspace_name: str
    revenue_at_risk: float = 0
    stalled_quotes: int = 0
    stalled_leads: int = 0
    unanswered_customers: int = 0
    pending_approvals: int = 0
    recovered_this_month: float = 0


LeadStatus = Literal["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "NEGOTIATING", "WON", "LOST", "INACTIVE"]
QuoteStatus = Literal["DRAFT", "SENT", "VIEWED", "NEGOTIATING", "ACCEPTED", "REJECTED", "EXPIRED"]


class LeadInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    company: str | None = Field(default=None, max_length=160)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    source: str | None = Field(default=None, max_length=80)
    status: LeadStatus = "NEW"
    estimated_value: Decimal = Field(default=Decimal(0), ge=0, max_digits=12, decimal_places=2)
    last_contacted_at: datetime | None = None
    next_followup_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=4000)

    @field_validator("name", "company", "phone", "source", "notes", mode="before")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if isinstance(value, str) else value


class LeadResponse(LeadInput):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class QuoteInput(BaseModel):
    lead_id: UUID | None = None
    quote_number: str = Field(min_length=1, max_length=64)
    amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    status: QuoteStatus = "DRAFT"
    sent_at: datetime | None = None
    expires_at: datetime | None = None
    accepted_at: datetime | None = None
    rejected_at: datetime | None = None

    @field_validator("quote_number", mode="before")
    @classmethod
    def clean_quote_number(cls, value: str) -> str:
        return value.strip()

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, value: str) -> str:
        return value.upper()


class QuoteResponse(QuoteInput):
    id: UUID
    workspace_id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

