export interface Keyword {
  id: string;
  term: string;
  category: string;
  volume: number;
  difficulty: number;
  cpc: number;
  intent: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordCreate {
  term: string;
  category: string;
  intent?: string;
}

export interface KeywordUpdate {
  category?: string;
  intent?: string;
}

export interface KeywordMetrics {
  volume: number;
  difficulty: number;
  cpc: number;
  serps: {
    position: number;
    url: string;
    title: string;
  }[];
}

export interface KeywordRanking {
  date: string;
  position: number;
  url: string;
}

export interface CompetitorAnalysis {
  domains: {
    domain: string;
    position: number;
    content: string;
  }[];
  wordCount: number;
  topKeywords: string[];
}

export interface KeywordTrend {
  dates: string[];
  volumes: number[];
  positions: number[];
}

export interface KeywordComparison {
  keyword: string;
  volume: number;
  difficulty: number;
  position: number;
}

export interface ContentIdea {
  id: string;
  title: string;
  keywords: string[];
}

export interface ContentOptimization {
  score: string;
  suggestions: string[];
  optimizedVersion?: string;
}

export interface Pagination<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

interface Keyword {
  id: string;
  value: string;
  category?: string;
  searchVolume?: number;
  difficulty?: number;
  cpc?: number;
  createdAt: string;
  updatedAt: string;
}

interface KeywordCreate {
  value: string;
  category?: string;
}

interface KeywordUpdate {
  value?: string;
  category?: string;
  searchVolume?: number;
  difficulty?: number;
  cpc?: number;
}

interface KeywordMetrics {
  searchVolume: number;
  difficulty: number;
  cpc: number;
  seasonality: number[];
  competition: number;
}

interface KeywordRanking {
  url: string;
  position: number;
  change?: number;
  title: string;
  snippet?: string;
}

interface CompetitorAnalysis {
  competitors: {
    domain: string;
    position: number;
    content: string;
    wordCount: number;
  }[];
  avgWordCount: number;
}

interface KeywordTrend {
  keyword: string;
  dates: string[];
  volumes: number[];
  trend: 'rising' | 'falling' | 'stable';
}

interface KeywordComparison {
  keyword: string;
  metrics: KeywordMetrics;
}

interface ContentIdea {
  id: string;
  title: string;
  keywords: string[];
}

interface ContentOptimization {
  score: string;
  suggestions: string[];
  optimizedVersion?: string;
}

interface Pagination<T = any> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export type {
  Keyword,
  KeywordCreate,
  KeywordUpdate,
  KeywordMetrics,
  KeywordRanking,
  CompetitorAnalysis,
  KeywordTrend,
  KeywordComparison,
  ContentIdea,
  ContentOptimization,
  Pagination
};

// SEO and keyword analysis types
interface Keyword {
  term: string;
  volume: number;
  difficulty: number;
  position?: number;
}

interface ContentOptimization {
  keyword: Keyword;
  suggestions: string[];
  score: number;
}

