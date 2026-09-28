
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies import CurrentUser, DbSession
from app.models import User, Workspace, WorkspaceMember
from app.schemas import (
    AuthResponse,
    CurrentUserResponse,
    LoginRequest,
    ProfileUpdate,
    RegisterRequest,
    WorkspaceResponse,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["authentication"])


def auth_response(user: User, db: Session) -> AuthResponse:
    memberships = db.scalars(
        select(WorkspaceMember).where(WorkspaceMember.user_id == user.id)
    ).all()
    workspaces = [
        WorkspaceResponse(id=item.workspace.id, name=item.workspace.name, role=item.role)
        for item in memberships
    ]
    return AuthResponse(
        access_token=create_access_token(user.id), user=user, workspaces=workspaces
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> AuthResponse:
    user = User(
        name=payload.name.strip(),
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
    )
    workspace = Workspace(name=payload.workspace_name.strip())
    db.add_all([user, workspace])
    try:
        db.flush()
        db.add(WorkspaceMember(user_id=user.id, workspace_id=workspace.id, role="owner"))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists") from None
    db.refresh(user)
    return auth_response(user, db)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return auth_response(user, db)


@router.get("/me", response_model=CurrentUserResponse)
def me(user: CurrentUser, db: DbSession) -> CurrentUserResponse:
    memberships = db.scalars(
        select(WorkspaceMember).where(WorkspaceMember.user_id == user.id)
    ).all()
    workspaces = [
        WorkspaceResponse(id=item.workspace.id, name=item.workspace.name, role=item.role)
        for item in memberships
    ]
    return CurrentUserResponse(user=user, workspaces=workspaces)


@router.patch("/me", response_model=CurrentUserResponse)
def update_profile(payload: ProfileUpdate, user: CurrentUser, db: DbSession) -> CurrentUserResponse:
    user.name = payload.name.strip()
    db.commit()
    db.refresh(user)
    return me(user, db)
