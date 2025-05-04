export interface SocialPost {
  id: string;
  content: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'instagram';
  status: 'draft' | 'scheduled' | 'published';
  scheduledFor?: string;
  publishedAt?: string;
  metrics?: {
    likes: number;
    shares: number;
    comments: number;
    impressions: number;
  };
  keywords: string[];
  media?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SocialPostCreate {
  platform: 'twitter' | 'facebook' | 'linkedin' | 'instagram';
  keywords: string[];
  targetAudience?: string;
  toneOfVoice?: string;
  contentType?: 'promotional' | 'educational' | 'engagement' | 'news';
}

export interface SocialPostUpdate {
  content?: string;
  platform?: 'twitter' | 'facebook' | 'linkedin' | 'instagram';
  status?: 'draft' | 'scheduled' | 'published';
  scheduledFor?: string;
  keywords?: string[];
  media?: string[];
}

export interface SocialPostSchedule {
  postId: string;
  scheduledFor: string;
}

export interface SocialMetrics {
  engagement: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface SocialPost {
  id: string;
  platform: 'twitter' | 'facebook' | 'linkedin' | 'instagram';
  content: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  media?: string[];
  engagementMetrics?: EngagementMetrics;
}

interface SocialPostCreate {
  platform: SocialPost['platform'] | SocialPost['platform'][];
  content: string;
  scheduledAt?: string;
  media?: string[];
}

interface SocialPostUpdate {
  content?: string;
  scheduledAt?: string;
  status?: SocialPost['status'];
  media?: string[];
}

interface SocialPlatform {
  id: string;
  name: string;
  connected: boolean;
  icon: string;
}

interface ScheduleParameters {
  time: string;
  date: string;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  impressions: number;
  reach: number;
}

interface SocialAnalytics {
  platform: string;
  metrics: EngagementMetrics;
  timeRange: string;
  topPosts?: SocialPost[];
}

interface PostVariation {
  id: string;
  content: string;
  score: number;
}

interface GenerationParameters {
  max_tokens: number;
  temperature: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export type {
  SocialPost,
  SocialPostCreate,
  SocialPostUpdate,
  SocialPlatform,
  ScheduleParameters,
  EngagementMetrics,
  SocialAnalytics,
  PostVariation,
  GenerationParameters
};

// Social media post types
interface SocialPost {
  id: string;
  platform: 'twitter' | 'linkedin' | 'facebook';
  content: string;
  scheduledAt: Date;
  status: 'draft' | 'scheduled' | 'published';
}

interface SocialPostCreate {
  platform: 'twitter' | 'linkedin' | 'facebook';
  content: string;
  scheduledAt?: Date;
}

