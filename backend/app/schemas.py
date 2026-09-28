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
