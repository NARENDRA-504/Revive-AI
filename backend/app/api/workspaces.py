from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.dependencies import CurrentUser, CurrentWorkspace, DbSession
from app.models import Workspace, WorkspaceMember
from app.schemas import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=201)
def create_workspace(payload: WorkspaceCreate, user: CurrentUser, db: DbSession) -> WorkspaceResponse:
    workspace = Workspace(name=payload.name.strip())
    db.add(workspace)
    db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role="owner"))
    db.commit()
    db.refresh(workspace)
    return WorkspaceResponse(id=workspace.id, name=workspace.name, role="owner")


@router.patch("/current", response_model=WorkspaceResponse)
def rename_workspace(
    payload: WorkspaceUpdate,
    user: CurrentUser,
    workspace: CurrentWorkspace,
    db: DbSession,
) -> WorkspaceResponse:
    membership = db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if membership.role not in {"owner", "admin"}:
        raise HTTPException(status_code=403, detail="Workspace admin permission required")
    workspace.name = payload.name.strip()
    db.commit()
    db.refresh(workspace)
    return WorkspaceResponse(id=workspace.id, name=workspace.name, role=membership.role)
