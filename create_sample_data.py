#!/usr/bin/env python3
import os
import sys
import uuid
import json
import random
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional

# Add the app directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the Flask app and models
from app import create_app
from app.models.blog import BlogPost, BlogPostSection, BlogPostVersion, BlogPostSEOData, ContentStatus
from app.models.keyword import Keyword, KeywordStatus
from app.models.analytics import WebsiteMetrics, PageAnalytics
from app.extensions import db

# Create the Flask app with the development configuration
app = create_app('development')
app_context = app.app_context()
app_context.push()

# Sample data counts
NUM_BLOG_POSTS = 10
NUM_KEYWORDS = 20
NUM_DAYS_METRICS = 30

# Sample content for blog posts
BLOG_TOPICS = [
    "Large Language Models", 
    "LLM Applications", 
    "AI Agents", 
    "Prompt Engineering", 
    "Vector Databases", 
    "Retrieval Augmented Generation",
    "Fine-tuning LLMs", 
    "Open Source AI Models", 
    "AI Ethics", 
    "Local LLM Deployment"
]

CONTENT_PURPOSES = ["informational", "educational", "product", "comparison", "how-to"]
TARGET_AUDIENCES = ["developers", "data scientists", "business users", "students", "researchers"]

def generate_lorem_ipsum(paragraphs=3):
    """Generate lorem ipsum placeholder text"""
    lorem_ipsum = [
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl nec ultricies lacinia, nisl nisl aliquet nisl, nec ultricies nisl nisl nec nisl.",
        "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.",
        "Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor.",
        "Pellentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget erat."
    ]
    selected = random.sample(lorem_ipsum, min(paragraphs, len(lorem_ipsum)))
    return "\n\n".join(selected)

def create_keywords():
    """Create sample keywords with different statuses and metrics"""
    print("Creating sample keywords...")
    keywords = []
    
    # Sample keyword terms
    keyword_terms = [
        "best llm for coding", "open source llm models", "ai agent automation", 
        "llm api integration", "local llm setup", "lm studio tutorial",
        "vector database comparison", "prompt engineering techniques", "fine-tuning llama",
        "mistral vs llama", "gemini vs gpt4", "rag tutorial",
        "ollama setup guide", "text embedding models", "sentiment analysis with llms",
        "claude vs gpt4", "local llm performance", "ai agent frameworks",
        "langchain tutorial", "llm context window size"
    ]
    
    statuses = [status.value for status in KeywordStatus]
    
    for i, term in enumerate(keyword_terms):
        status = random.choice(statuses)
        search_volume = random.randint(500, 10000) if status != KeywordStatus.RESEARCH.value else None
        difficulty = random.randint(10, 90) if status != KeywordStatus.RESEARCH.value else None
        score = random.randint(1, 10) if status != KeywordStatus.RESEARCH.value else None
        
        # Analytics metrics for established keywords
        impressions = random.randint(100, 5000) if status in [KeywordStatus.ACTIVE.value, KeywordStatus.OPTIMIZED.value] else 0
        clicks = random.randint(5, int(impressions * 0.15)) if impressions > 0 else 0
        ctr = round((clicks / impressions * 100), 2) if impressions > 0 else 0.0
        position = round(random.uniform(1.0, 50.0), 1) if status in [KeywordStatus.ACTIVE.value, KeywordStatus.OPTIMIZED.value] else None
        position_change = round(random.uniform(-5.0, 5.0), 1) if position else 0.0
        
        metadata = {
            "competition": random.choice(["low", "medium", "high"]),
            "intent": random.choice(["informational", "commercial", "navigational", "transactional"]),
            "seasonality": random.choice(["stable", "seasonal", "trending"]),
            "related_terms": random.sample(keyword_terms, 3)
        }
        
        keyword = Keyword(
            keyword=term,
            status=status,
            search_volume=search_volume,
            keyword_difficulty=difficulty,
            score=score,
            metadata=metadata
        )
        
        # Set analytics metrics
        keyword.impressions = impressions
        keyword.clicks = clicks
        keyword.ctr = ctr
        keyword.position = position
        keyword.position_change = position_change
        
        db.session.add(keyword)
        keywords.append(keyword)
    
    db.session.commit()
    print(f"Created {len(keywords)} keywords")
    return keywords

def create_blog_posts(keywords: List[Keyword]):
    """Create sample blog posts with sections, versions, and SEO data"""
    print("Creating sample blog posts...")
    blog_posts = []
    
    statuses = [status.value for status in ContentStatus]
    
    for i in range(NUM_BLOG_POSTS):
        # Determine post status - mixture of published and drafts
        is_published = random.random() > 0.3
        status = ContentStatus.PUBLISHED.value if is_published else random.choice(statuses)
        
        # Basic post details
        topic = random.choice(BLOG_TOPICS)
        title = f"Guide to {topic}: Everything You Need to Know"
        content = generate_lorem_ipsum(paragraphs=5)
        
        # Create the blog post
        blog_post = BlogPost(
            title=title,
            content=content,
            topic=topic,
            keywords=", ".join(random.sample([k.keyword for k in keywords], 3)),
            published=is_published,
            status=status,
            content_purpose=random.choice(CONTENT_PURPOSES),
            target_audience=random.choice(TARGET_AUDIENCES),
            quality_score=random.randint(60, 95),
            has_outline=True
        )
        
        if is_published:
            blog_post.published_at = datetime.now() - timedelta(days=random.randint(1, 60))
        
        # Create SEO data
        focus_keyword = random.choice(keywords)
        slug = f"{'-'.join(title.lower().split()[:5])}"
        secondary_keywords = ", ".join([k.keyword for k in random.sample(keywords, 3) if k != focus_keyword])
        
        seo_data = BlogPostSEOData(
            post_id=blog_post.id,
            meta_title=f"{title} | LM Studio",
            meta_description=f"Learn everything about {topic} in this comprehensive guide. {content[:80]}...",
            focus_keyword=focus_keyword.keyword,
            secondary_keywords=secondary_keywords,
            slug=slug,
            seo_score=random.randint(50, 95),
            readability_score=random.randint(60, 90),
            analysis_data={
                "keyword_density": random.uniform(1.0, 5.0),
                "readability_issues": random.randint(0, 5),
                "seo_issues": random.randint(0, 5),
                "improvement_suggestions": [
                    "Add more internal links",
                    "Include keyword in more headings",
                    "Add more images with alt text"
                ]
            }
        )
        
        # Create post sections
        sections = []
        for j in range(5):
            section_type = "header" if j == 0 else random.choice(["subheader", "content", "list", "quote", "code"])
            section_title = f"Section {j+1}: {topic} {'Introduction' if j == 0 else 'Details'}" if section_type in ["header", "subheader"] else None
            section_content = generate_lorem_ipsum(paragraphs=1 if section_type in ["header", "subheader", "quote"] else 2)
            
            section = BlogPostSection(
                post_id=blog_post.id,
                order=j,
                section_type=section_type,
                title=section_title,
                content=section_content,
                section_metadata={
                    "format": random.choice(["standard", "highlighted", "boxed"]) if section_type == "content" else None,
                    "code_language": random.choice(["python", "javascript", "bash"]) if section_type == "code" else None,
                    "list_type": random.choice(["ordered", "unordered"]) if section_type == "list" else None
                }
            )
            sections.append(section)
        
        # Create post versions
        versions = []
        num_versions = random.randint(1, 3)
        for j in range(num_versions):
            version_title = f"{title} - v{j+1}"
            version_content = generate_lorem_ipsum(paragraphs=random.randint(3, 6))
            version_status = ContentStatus.PUBLISHED.value if j == num_versions - 1 and is_published else random.choice([s for s in statuses if s != ContentStatus.PUBLISHED.value])
            
            version = BlogPostVersion(
                post_id=blog_post.id,
                version_number=j+1,
                title=version_title,
                content=version_content,
                status=version_status,
                version_metadata={
                    "revision_notes": f"Revision {j+1} changes",
                    "word_count": len(version_content.split()),
                    "flesch_reading_ease": random.uniform(50.0, 90.0)
                }
            )
            versions.append(version)
        
        # Set post outline (sample JSON structure)
        blog_post.outline_json = json.dumps({
            "title": title,
            "sections": [
                {"title": "Introduction", "key_points": ["Point 1", "Point 2"]},
                {"title": "What is " + topic, "key_points": ["Definition", "History"]},
                {"title": "Benefits of " + topic, "key_points": ["Benefit 1", "Benefit 2", "Benefit 3"]},
                {"title": "How to Use " + topic, "key_points": ["Step 1", "Step 2", "Step 3"]},
                {"title": "Conclusion", "key_points": ["Summary", "Next Steps"]}
            ]
        })
        
        # Save the blog post and all related objects
        db.session.add(blog_post)
        db.session.add(seo_data)
        for section in sections:
            db.session.add(section)
        for version in versions:
            db.session.add(version)
        
        # Associate with keywords
        # Link to 2-5 keywords
        post_keywords = random.sample(keywords, random.randint(2, 5))
        for kw in post_keywords:
            blog_post.keywords_list.append(kw)
        
        blog_posts.append(blog_post)
    
    db.session.commit()
    print(f"Created {len(blog_posts)} blog posts with related data")
    return blog_posts

def create_website_metrics(days=NUM_DAYS_METRICS):
    """Create sample website metrics for the past N days"""
    print(f"Creating website metrics for the past {days} days...")
    metrics = []
    
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days-1)
    current_date = start_date
    
    # Base metrics that will grow slightly over time
    base_impressions = 5000
    base_clicks = 350
    base_visitors = 1200
    base_unique_visitors = 950
    growth_factor = 1.02  # 2% daily growth
    
    # Generate daily metrics with some randomness
    day = 0
    while current_date <= end_date:
        day_factor = growth_factor ** day  # Apply growth
        randomness = random.uniform(0.85, 1.15)  # ±15% random variation
        
        impressions = int(base_impressions * day_factor * randomness)
        clicks = int(base_clicks * day_factor * randomness)
        visitors = int(base_visitors * day_factor * randomness)
        unique_visitors = int(base_unique_visitors * day_factor * randomness)
        bounce_rate = random.uniform(55.0, 75.0)
        session_duration = random.randint(120, 240)
        unique_keywords = random.randint(150, 250)
        
        # Create sample top keywords
        top_keywords = {
            str(i): {
                "keyword": random.choice([k.keyword for k in Keyword.get_all()]),
                "impressions": random.randint(50, 500),
                "clicks": random.randint(5, 100),
                "position": round(random.uniform(1.0, 10.0), 1)
            } for i in range(1, 6)  # Top 5 keywords
        }
        
        # Create sample top pages
        top_pages = {
            str(i): {
                "path": f"/blog/{random.choice(['guide-to-large-language-models', 'llm-applications-overview', 'ai-agents-tutorial'])}",
                "title": f"Top Page {i}",
                "pageviews": random.randint(100, 500),
                "unique_pageviews": random.randint(50, 300)
            } for i in range(1, 6)  # Top 5 pages
        }
        
        # Create the metrics object
        daily_metrics = WebsiteMetrics(
            date=current_date,
            impressions=impressions,
            clicks=clicks,
            visitors=visitors,
            unique_visitors=unique_visitors,
            bounce_rate=bounce_rate,
            avg_session_duration=session_duration,
            unique_keywords=unique_keywords,
            top_keywords=top_keywords,
            top_pages=top_pages
        )
        
        metrics.append(daily_metrics)
        db.session.add(daily_metrics)
        
        # Move to the next day
        current_date += timedelta(days=1)
        day += 1
    
    db.session.commit()
    print(f"Created {len(metrics)} days of website metrics")
    return metrics
