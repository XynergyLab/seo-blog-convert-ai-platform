export interface LMServerConfig {
  id: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  defaultModel?: string;
  maxTokens: number;
}

export interface LMModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  contextLength?: number;
  parameters: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
  tokenizer?: string;
}

export interface LMGenerationRequest {
  prompt: string;
  model?: string;
  options?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
}

export interface LMGenerationResponse {
  text: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export interface GenerationParameters {
  max_tokens: number;
  temperature: number;
  top_p: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
}

export interface GenerationResult {
  text: string;
  outline?: string[];
  tokens: number;
  completionTime: number;
}

export interface ModelLoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface BatchJobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: string[];
  error?: string;
  createdAt: string;
  completedAt?: string;
}
