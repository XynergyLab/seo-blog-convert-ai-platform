export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: BlogContent;
  status: 'draft' | 'published' | 'scheduled';
  publishDate?: string;
  keywords: string[];
  author: string;
  featuredImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogContent {
  outline: string[];
  sections: {
    heading: string;
    content: string;
  }[];
  conclusion: string;
}

export interface BlogPostCreate {
  title: string;
  keywords: string[];
  targetAudience?: string;
  toneOfVoice?: string;
}

export interface BlogPostUpdate {
  title?: string;
  slug?: string;
  summary?: string;
  content?: BlogContent;
  status?: 'draft' | 'published' | 'scheduled';
  publishDate?: string;
  keywords?: string[];
  featuredImage?: string;
}

export interface BlogOutlineParams {
  title: string;
  keywords: string[];
  sections?: number;
}

export interface BlogSectionParams {
  title: string;
  heading: string;
  keywords: string[];
  previousSection?: string;
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: BlogPostContent;
  publishedAt: string;
  updatedAt: string;
  tags: string[];
  author?: string;
}

interface BlogPostContent {
  title?: string;
  content: string;
  outline?: string[];
}

interface BlogPostCreate {
  title: string;
  excerpt?: string;
  content?: BlogPostContent;
  tags?: string[];
}

interface BlogPostUpdate {
  title?: string;
  excerpt?: string;
  content?: BlogPostContent;
  tags?: string[];
}

interface BlogPostVersion {
  id: string;
  postId: string;
  content: BlogPostContent;
  createdAt: string;
  createdBy?: string;
}

interface Pagination<T = any> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface GenerationParameters {
  temperature: number;
  top_p: number;
  max_tokens: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
}

export type {
  BlogPost,
  BlogPostContent,
  BlogPostCreate,
  BlogPostUpdate,
  BlogPostVersion,
  Pagination,
  GenerationParameters
};

// Blog content related types
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: BlogContent;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt?: Date;
}

interface BlogContent {
  html: string;
  raw: string;
  images?: string[];
}

