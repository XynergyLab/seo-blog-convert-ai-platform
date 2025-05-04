"""Add missing blog post columns

Revision ID: add_blog_columns
Revises: rename_metadata_columns
Create Date: 2025-05-03 21:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_blog_columns'
down_revision = 'rename_metadata_columns'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing columns to blog_posts table
    with op.batch_alter_table('blog_posts') as batch_op:
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('status', sa.String(20), nullable=False, server_default='draft'))
        batch_op.add_column(sa.Column('current_version', sa.Integer(), nullable=False, server_default='1'))
        batch_op.add_column(sa.Column('has_outline', sa.Boolean(), nullable=False, server_default='false'))
        batch_op.add_column(sa.Column('outline_json', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('target_audience', sa.String(255), nullable=True))
        batch_op.add_column(sa.Column('content_purpose', sa.String(50), nullable=True))
        batch_op.add_column(sa.Column('quality_score', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('last_autosave', sa.DateTime(), nullable=True))


def downgrade():
    # Remove added columns from blog_posts table
    with op.batch_alter_table('blog_posts') as batch_op:
        batch_op.drop_column('last_autosave')
        batch_op.drop_column('quality_score')
        batch_op.drop_column('content_purpose')
        batch_op.drop_column('target_audience')
        batch_op.drop_column('outline_json')
        batch_op.drop_column('has_outline')
        batch_op.drop_column('current_version')
        batch_op.drop_column('status')
        batch_op.drop_column('updated_at')

