"""add_interviews_table

Revision ID: 6907a99a71ef
Revises: 539b9e8890e2
Create Date: 2025-11-25 04:10:07.904864

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6907a99a71ef'
down_revision: Union[str, Sequence[str], None] = '539b9e8890e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'interviews',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('candidate_id', sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey('candidates.id'), nullable=False),
        sa.Column('interview_type', sa.String(), nullable=False),
        sa.Column('scheduled_date', sa.String(), nullable=False),
        sa.Column('scheduled_time', sa.String(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=False),
        sa.Column('interviewers', sa.dialects.postgresql.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('scheduled_by', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('interviews')
