import type { ApiError } from '@/types/api'

/**
 * Type guard to check if an error is an API error response
 */
function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && 
    error !== null &&
    'message' in error 
}

/**
 * Standardized API error handler
 * Extracts error message from various error response formats
 */
export function handleApiError(error: unknown): string {
  if (isApiError(error)) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return 'An unknown error occurred'
}

/**
 * Wrapper for API responses with standardized success/error handling
 */
export async function apiRequest<T>(promise: Promise<{ data: T }>): Promise<T> {
  try {
    const response = await promise
    return response.data
  } catch (error: unknown) {
    throw new Error(handleApiError(error))
  }
}

