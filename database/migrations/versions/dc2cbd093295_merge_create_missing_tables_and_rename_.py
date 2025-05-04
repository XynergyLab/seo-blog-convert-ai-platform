"""merge create_missing_tables and rename_keyword_metadata_column

Revision ID: dc2cbd093295
Revises: create_missing_tables, rename_keyword_metadata_column
Create Date: 2025-05-03 18:38:57.657181

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dc2cbd093295'
down_revision = ('create_missing_tables', 'rename_keyword_metadata_column')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
