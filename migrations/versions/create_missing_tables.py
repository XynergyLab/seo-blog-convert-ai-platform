"""Create missing tables for keywords and analytics

Revision ID: create_missing_tables
Revises: add_blog_columns
Create Date: 2025-05-03 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import String, Integer, Float, DateTime, Date, ForeignKey, JSON, Boolean, Text


# revision identifiers, used by Alembic.
revision = 'create_missing_tables'
down_revision = 'add_blog_columns'
branch_labels = None
depends_on = None


def upgrade():
    # --- KEYWORDS TABLE ---
    op.create_table('keywords',
        sa.Column('id', String(36), primary_key=True),
        sa.Column('keyword', String(100), nullable=False, unique=True, index=True),
        sa.Column('status', String(20), nullable=False),
        sa.Column('search_volume', Integer(), nullable=True),
        sa.Column('keyword_difficulty', Integer(), nullable=True),
        sa.Column('score', Integer(), nullable=True),
        sa.Column('created_at', DateTime(), nullable=False),
        sa.Column('updated_at', DateTime(), nullable=True),
        sa.Column('impressions', Integer(), nullable=True),
        sa.Column('clicks', Integer(), nullable=True),
        sa.Column('ctr', Float(), nullable=True),
        sa.Column('position', Float(), nullable=True),
        sa.Column('position_change', Float(), nullable=True),
        sa.Column('metadata', JSON(), nullable=False),
    )
    
    # --- KEYWORD_BLOG_ASSOCIATION TABLE ---
    op.create_table('keyword_blog_association',
        sa.Column('keyword_id', String(36), ForeignKey('keywords.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('blog_post_id', String(36), ForeignKey('blog_posts.id', ondelete='CASCADE'), primary_key=True)
    )
    
    # --- WEBSITE_METRICS TABLE ---
    op.create_table('website_metrics',
        sa.Column('id', String(36), primary_key=True),
        sa.Column('date', Date(), nullable=False, index=True),
        sa.Column('impressions', Integer(), nullable=False),
        sa.Column('clicks', Integer(), nullable=False),
        sa.Column('visitors', Integer(), nullable=False),
        sa.Column('unique_visitors', Integer(), nullable=False),
        sa.Column('bounce_rate', Float(), nullable=False),
        sa.Column('avg_session_duration', Integer(), nullable=False),
        sa.Column('unique_keywords', Integer(), nullable=False),
        sa.Column('top_keywords', JSON(), nullable=False),
        sa.Column('top_pages', JSON(), nullable=False),
        sa.Column('created_at', DateTime(), nullable=False),
        sa.Column('updated_at', DateTime(), nullable=True)
    )
    
    # --- PAGE_ANALYTICS TABLE ---
    op.create_table('page_analytics',
        sa.Column('id', String(36), primary_key=True),
        sa.Column('page_id', String(36), nullable=True, index=True),
        sa.Column('path', String(255), nullable=False, index=True),
        sa.Column('title', String(255), nullable=False),
        sa.Column('date', Date(), nullable=False, index=True),
        sa.Column('page_views', Integer(), nullable=False),
        sa.Column('unique_page_views', Integer(), nullable=False),
        sa.Column('avg_time_on_page', Integer(), nullable=False),
        sa.Column('entrances', Integer(), nullable=False),
        sa.Column('exits', Integer(), nullable=False),
        sa.Column('bounce_rate', Float(), nullable=False),
        sa.Column('exit_rate', Float(), nullable=False),
        sa.Column('impressions', Integer(), nullable=False),
        sa.Column('clicks', Integer(), nullable=False),
        sa.Column('position', Float(), nullable=True),
        sa.Column('keywords', JSON(), nullable=False),
        sa.Column('created_at', DateTime(), nullable=False),
        sa.Column('updated_at', DateTime(), nullable=True)
    )


def downgrade():
    # Drop tables in reverse order of creation
    op.drop_table('page_analytics')
    op.drop_table('website_metrics')
    op.drop_table('keyword_blog_association')
    op.drop_table('keywords')

