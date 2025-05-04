"""rename keyword metadata column

Revision ID: rename_keyword_metadata_column
Revises: rename_metadata_columns
Create Date: 2025-05-03 18:30:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.engine import reflection
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.schema import MetaData
import json
from migrations.types import JSONType

# revision identifiers, used by Alembic.
revision = 'rename_keyword_metadata_column'
down_revision = 'rename_metadata_columns'
branch_labels = None
depends_on = None

# We need to use batch operations for SQLite since it doesn't support 
# directly renaming columns
Base = declarative_base()
naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}
metadata = MetaData(naming_convention=naming_convention)


def upgrade():
    connection = op.get_bind()
    inspector = reflection.Inspector.from_engine(connection)
    
    # --- KEYWORDS TABLE ---
    # Check if the keywords table exists
    if 'keywords' in inspector.get_table_names():
        # Get existing columns
        columns = [col['name'] for col in inspector.get_columns('keywords')]
        has_metadata = 'metadata' in columns
        has_keyword_metadata = 'keyword_metadata' in columns
        
        # Only proceed if we need to make changes (metadata exists but keyword_metadata doesn't)
        if has_metadata and not has_keyword_metadata:
            # Step 1: Add the new column
            with op.batch_alter_table('keywords') as batch_op:
                batch_op.add_column(sa.Column('keyword_metadata', JSONType(), nullable=True))
            
            # Step 2: Copy data from old column to new column
            connection.execute(
                text('UPDATE keywords SET keyword_metadata = metadata')
            )
            
            # Step 3: Make new column not nullable and drop old column
            with op.batch_alter_table('keywords') as batch_op:
                batch_op.alter_column('keyword_metadata', nullable=False)
                batch_op.drop_column('metadata')
        elif not has_keyword_metadata:
            # If neither column exists, add keyword_metadata with default empty object
            with op.batch_alter_table('keywords') as batch_op:
                batch_op.add_column(sa.Column('keyword_metadata', JSONType(), nullable=False, server_default='{}'))


def downgrade():
    connection = op.get_bind()
    inspector = reflection.Inspector.from_engine(connection)
    
    # --- KEYWORDS TABLE ---
    # Check if the keywords table exists
    if 'keywords' in inspector.get_table_names():
        # Get existing columns
        columns = [col['name'] for col in inspector.get_columns('keywords')]
        has_metadata = 'metadata' in columns
        has_keyword_metadata = 'keyword_metadata' in columns
        
        # Only proceed if we need to make changes (keyword_metadata exists)
        if has_keyword_metadata and not has_metadata:
            # Step 1: Add the old column back
            with op.batch_alter_table('keywords') as batch_op:
                batch_op.add_column(sa.Column('metadata', JSONType(), nullable=True))
            
            # Step 2: Copy data from new column to old column
            connection.execute(
                text('UPDATE keywords SET metadata = keyword_metadata')
            )
            
            # Step 3: Make old column not nullable and drop new column
            with op.batch_alter_table('keywords') as batch_op:
                batch_op.alter_column('metadata', nullable=False)
                batch_op.drop_column('keyword_metadata')

