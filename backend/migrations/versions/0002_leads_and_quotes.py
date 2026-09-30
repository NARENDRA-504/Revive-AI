"""Add workspace-scoped leads and quotes."""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_leads_and_quotes"
down_revision: str | None = "0001_identity_workspaces"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "leads",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("company", sa.String(160)),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(40)),
        sa.Column("source", sa.String(80)),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("estimated_value", sa.Numeric(12, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_contacted_at", sa.DateTime(timezone=True)),
        sa.Column("next_followup_at", sa.DateTime(timezone=True)),
        sa.Column("notes", sa.String(4000)),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leads_workspace_id", "leads", ["workspace_id"])
    op.create_index("ix_leads_status", "leads", ["status"])
    op.create_index("ix_leads_next_followup_at", "leads", ["next_followup_at"])
    op.create_table(
        "quotes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("lead_id", sa.Uuid()),
        sa.Column("quote_number", sa.String(64), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column("rejected_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "quote_number", name="uq_quote_number_per_workspace"),
    )
    op.create_index("ix_quotes_workspace_id", "quotes", ["workspace_id"])
    op.create_index("ix_quotes_lead_id", "quotes", ["lead_id"])
    op.create_index("ix_quotes_status", "quotes", ["status"])


def downgrade() -> None:
    op.drop_index("ix_quotes_status", table_name="quotes")
    op.drop_index("ix_quotes_lead_id", table_name="quotes")
    op.drop_index("ix_quotes_workspace_id", table_name="quotes")
    op.drop_table("quotes")
    op.drop_index("ix_leads_next_followup_at", table_name="leads")
    op.drop_index("ix_leads_status", table_name="leads")
    op.drop_index("ix_leads_workspace_id", table_name="leads")
    op.drop_table("leads")

