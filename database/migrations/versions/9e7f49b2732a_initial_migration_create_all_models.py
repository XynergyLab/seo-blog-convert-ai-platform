"""Initial migration - create all models

Revision ID: 9e7f49b2732a
Revises: 
Create Date: 2025-05-03 10:26:18.960629

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import JSON

# revision identifiers, used by Alembic.
revision = '9e7f49b2732a'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('blog_posts',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('topic', sa.String(length=100), nullable=False),
    sa.Column('keywords', sa.String(length=255), nullable=True),
    sa.Column('published', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('published_at', sa.DateTime(), nullable=True),
    sa.Column('generation_metadata', JSON(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('configurations',
    sa.Column('key', sa.String(length=255), nullable=False),
    sa.Column('value_string', sa.Text(), nullable=True),
    sa.Column('value_int', sa.Integer(), nullable=True),
    sa.Column('value_float', sa.Float(), nullable=True),
    sa.Column('value_bool', sa.Boolean(), nullable=True),
    sa.Column('value_json', JSON(), nullable=True),
    sa.Column('value_type', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('social_posts',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('platform', sa.Enum('TWITTER', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', name='platform'), nullable=False),
    sa.Column('topic', sa.String(length=100), nullable=False),
    sa.Column('status', sa.Enum('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', name='poststatus'), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('scheduled_at', sa.DateTime(), nullable=True),
    sa.Column('published_at', sa.DateTime(), nullable=True),
    sa.Column('media_urls', JSON(), nullable=False),
    sa.Column('hashtags', JSON(), nullable=False),
    sa.Column('generation_metadata', JSON(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('scheduled_items',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('scheduled_time', sa.DateTime(), nullable=False),
    sa.Column('frequency', sa.Enum('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', name='schedulefrequency'), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', name='schedulestatus'), nullable=False),
    sa.Column('last_executed_at', sa.DateTime(), nullable=True),
    sa.Column('next_execution', sa.DateTime(), nullable=True),
    sa.Column('execution_count', sa.Integer(), nullable=False),
    sa.Column('max_executions', sa.Integer(), nullable=True),
    sa.Column('last_error', sa.Text(), nullable=True),
    sa.Column('retry_count', sa.Integer(), nullable=False),
    sa.Column('max_retries', sa.Integer(), nullable=False),
    sa.Column('schedule_metadata', JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('blog_post_id', sa.String(length=36), nullable=True),
    sa.Column('social_post_id', sa.String(length=36), nullable=True),
    sa.ForeignKeyConstraint(['blog_post_id'], ['blog_posts.id'], ),
    sa.ForeignKeyConstraint(['social_post_id'], ['social_posts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('blog_post_sections',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('post_id', sa.String(length=36), nullable=False),
    sa.Column('order', sa.Integer(), nullable=False),
    sa.Column('section_type', sa.String(length=50), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=True),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('metadata', JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['post_id'], ['blog_posts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('blog_post_versions',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('post_id', sa.String(length=36), nullable=False),
    sa.Column('version_number', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('metadata', JSON(), nullable=False),
    sa.ForeignKeyConstraint(['post_id'], ['blog_posts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('blog_post_seo_data',
    sa.Column('post_id', sa.String(length=36), nullable=False),
    sa.Column('meta_title', sa.String(length=60), nullable=True),
    sa.Column('meta_description', sa.String(length=160), nullable=True),
    sa.Column('focus_keyword', sa.String(length=100), nullable=True),
    sa.Column('secondary_keywords', sa.String(length=255), nullable=True),
    sa.Column('slug', sa.String(length=100), nullable=True),
    sa.Column('seo_score', sa.Integer(), nullable=True),
    sa.Column('readability_score', sa.Integer(), nullable=True),
    sa.Column('analysis_data', JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['post_id'], ['blog_posts.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('post_id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('blog_post_seo_data')
    op.drop_table('blog_post_versions')
    op.drop_table('blog_post_sections')
    op.drop_table('scheduled_items')
    op.drop_table('social_posts')
    op.drop_table('configurations')
    op.drop_table('blog_posts')
    # ### end Alembic commands ###
