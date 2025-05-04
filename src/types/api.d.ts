export interface ApiResponse<T = any> {
  data?: T;
  status?: number;
  success: boolean;
  message?: string;
  error?: ApiError;
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
}

export interface ApiError {
  code: string | number;
  message: string;
  status?: number;
  details?: unknown[] | string[];
  path?: string;
  timestamp?: string;
  validation?: {
    [field: string]: string[];
  };
}

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export interface RequestOptions<T = any> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: T;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  errorMessage?: string;
  onDownloadProgress?: (progressEvent: ProgressEvent) => void;
}

export declare function apiRequest<T = any>(
  options: RequestOptions<T>,
  config?: Partial<ApiConfig>
): Promise<ApiResponse<T>>;
