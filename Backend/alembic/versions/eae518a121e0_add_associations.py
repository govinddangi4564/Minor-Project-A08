"""add associations

Revision ID: eae518a121e0
Revises: 032a770685e5
Create Date: 2025-11-18 19:17:54.159506

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'eae518a121e0'
down_revision: Union[str, Sequence[str], None] = '032a770685e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add phone column
    op.add_column('candidates', sa.Column('phone', sa.String(length=50), nullable=True))

    # Add parsed_text to resumes
    op.add_column('resumes', sa.Column('parsed_text', sa.Text(), nullable=False))

    # Convert experience from INTEGER -> JSONB safely
    op.execute("""
        ALTER TABLE candidates
        ALTER COLUMN experience TYPE JSONB USING to_jsonb(experience)
    """)

    # Convert education from TEXT -> JSONB safely
    op.execute("""
        ALTER TABLE candidates
        ALTER COLUMN education TYPE JSONB USING to_jsonb(education)
    """)



def downgrade() -> None:
    """Downgrade schema."""

    # Convert education from JSONB -> TEXT safely
    op.execute("""
        ALTER TABLE candidates
        ALTER COLUMN education TYPE TEXT USING education::TEXT
    """)

    # Convert experience from JSONB -> INTEGER safely
    # If the JSONB column contains non-integer, this will fail; you may need a more robust conversion
    op.execute("""
        ALTER TABLE candidates
        ALTER COLUMN experience TYPE INTEGER USING (experience::TEXT)::INTEGER
    """)

    # Drop parsed_text
    op.drop_column('resumes', 'parsed_text')

    # Drop phone column
    op.drop_column('candidates', 'phone')
