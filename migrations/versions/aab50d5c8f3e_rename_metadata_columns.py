"""rename metadata columns

Revision ID: rename_metadata_columns
Revises: 9e7f49b2732a
Create Date: 2025-05-03 16:15:00

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
revision = 'rename_metadata_columns'
down_revision = '9e7f49b2732a'
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
    
    # --- BLOG POST SECTIONS TABLE ---
    # Check if the blog_post_sections table exists
    if 'blog_post_sections' in inspector.get_table_names():
        # Get existing columns
        columns = [col['name'] for col in inspector.get_columns('blog_post_sections')]
        has_metadata = 'metadata' in columns
        
        # Step 1: Add the new column
        with op.batch_alter_table('blog_post_sections') as batch_op:
            batch_op.add_column(sa.Column('section_metadata', JSONType(), nullable=True))
        
        # Step 2: Copy data from old column to new column
        if has_metadata:
            connection.execute(
                text('UPDATE blog_post_sections SET section_metadata = metadata')
            )
        else:
            # If metadata column doesn't exist, set a default empty JSON object
            connection.execute(
                text("UPDATE blog_post_sections SET section_metadata = '{}'")
            )
        
        # Step 3: Make new column not nullable and drop old column
        with op.batch_alter_table('blog_post_sections') as batch_op:
            batch_op.alter_column('section_metadata', nullable=False)
            if has_metadata:
                batch_op.drop_column('metadata')
    
    # --- BLOG POST VERSIONS TABLE ---
    # Check if the blog_post_versions table exists
    if 'blog_post_versions' in inspector.get_table_names():
        # Get existing columns
        columns = [col['name'] for col in inspector.get_columns('blog_post_versions')]
        has_metadata = 'metadata' in columns
        
        # Step 1: Add the new column
        with op.batch_alter_table('blog_post_versions') as batch_op:
            batch_op.add_column(sa.Column('version_metadata', JSONType(), nullable=True))
        
        # Step 2: Copy data from old column to new column
        if has_metadata:
            connection.execute(
                text('UPDATE blog_post_versions SET version_metadata = metadata')
            )
        else:
            # If metadata column doesn't exist, set a default empty JSON object
            connection.execute(
                text("UPDATE blog_post_versions SET version_metadata = '{}'")
            )
        
        # Step 3: Make new column not nullable and drop old column
        with op.batch_alter_table('blog_post_versions') as batch_op:
            batch_op.alter_column('version_metadata', nullable=False)
            if has_metadata:
                batch_op.drop_column('metadata')


def downgrade():
    connection = op.get_bind()
    inspector = reflection.Inspector.from_engine(connection)
    
    # --- BLOG POST SECTIONS TABLE ---
    # Check if the blog_post_sections table exists
    if 'blog_post_sections' in inspector.get_table_names():
        # Get existing columns
        columns = [col['name'] for col in inspector.get_columns('blog_post_sections')]
        
        # Only proceed if the section_metadata column exists
        if 'section_metadata' in columns:
            # Step 1: Add the old column back
            with op.batch_alter_table('blog_post_sections') as batch_op:
                batch_op.add_column(sa.Column('metadata', JSONType(), nullable=True))
            
            # Step 2: Copy data from new column to old column
            connection.execute(
                text('UPDATE blog_post_sections SET metadata = section_metadata')
            )
            
            # Step 3: Make old column not nullable and drop new column
            with op.batch_alter_table('blog_post_sections') as batch_op:
                batch_op.alter_column('metadata', nullable=False)
                batch_op.drop_column('section_metadata')
    
    # --- BLOG POST VERSIONS TABLE ---
    # Check if the blog_post_versions table exists
    if 'blog_post_versions' in inspector.get_table_names():
        # Get existing columns
        columns = [col['name'] for col in inspector.get_columns('blog_post_versions')]
        
        # Only proceed if the version_metadata column exists
        if 'version_metadata' in columns:
            # Step 1: Add the old column back
            with op.batch_alter_table('blog_post_versions') as batch_op:
                batch_op.add_column(sa.Column('metadata', JSONType(), nullable=True))
            
            # Step 2: Copy data from new column to old column
            connection.execute(
                text('UPDATE blog_post_versions SET metadata = version_metadata')
            )
            
            # Step 3: Make old column not nullable and drop new column
            with op.batch_alter_table('blog_post_versions') as batch_op:
                batch_op.alter_column('metadata', nullable=False)
                batch_op.drop_column('version_metadata')

