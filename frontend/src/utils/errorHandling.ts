/**
 * Error Handling Utilities
 * 
 * Provides user-friendly error message transformations for API errors.
 * 
 * **Validates: Requirements 9.6, 12.5**
 * 
 * Features:
 * - Transform technical errors to user-friendly messages
 * - Handle network errors
 * - Handle HTTP status code errors (400, 500, timeout)
 * - Provide fallback messages for unknown errors
 */

import { APIError } from '../services/api';

/**
 * Transform an error into a user-friendly message
 * 
 * @param error - The error to transform (APIError or generic Error)
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  // Handle APIError instances
  if (error instanceof APIError) {
    return getAPIErrorMessage(error);
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    
    // Check for timeout in error message
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'Request timed out. Please try again.';
    }
    
    // Check for network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'Unable to connect. Check your internet connection.';
    }

    // Return the error message if it's already user-friendly
    return error.message || 'An unexpected error occurred.';
  }

  // Fallback for unknown error types
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Transform an APIError into a user-friendly message based on status code
 * 
 * @param error - The APIError instance
 * @returns User-friendly error message
 */
function getAPIErrorMessage(error: APIError): string {
  const lowerMessage = error.message.toLowerCase();

  // Handle network errors (no status code)
  if (!error.statusCode) {
    // Check if it's a timeout error
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'Request timed out. Please try again.';
    }
    
    // Network error (connection failed)
    return 'Unable to connect. Check your internet connection.';
  }

  // Handle specific HTTP status codes (check status code first for specific messages)
  switch (error.statusCode) {
    case 400:
      return 'Invalid request. Please check your input.';
    
    case 401:
      return 'Authentication required. Please log in.';
    
    case 403:
      return 'You do not have permission to perform this action.';
    
    case 404:
      return 'The requested resource was not found.';
    
    case 408:
      return 'Request timed out. Please try again.';
    
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    
    case 500:
      return 'Server error. Please try again later.';
    
    case 502:
      return 'Bad gateway. The server is temporarily unavailable.';
    
    case 503:
      return 'Service unavailable. Please try again later.';
    
    case 504:
      return 'Gateway timeout. Please try again.';
    
    default:
      // Check for timeout in message for other status codes
      if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
        return 'Request timed out. Please try again.';
      }
      
      // For 5xx errors
      if (error.statusCode >= 500 && error.statusCode < 600) {
        return 'Server error. Please try again later.';
      }
      
      // For 4xx errors (but not already handled above)
      if (error.statusCode >= 400 && error.statusCode < 500) {
        // For unusual 4xx codes, return the error message if it's descriptive
        // Otherwise use generic message
        if (error.message && error.message.length > 10) {
          return error.message;
        }
        return 'Invalid request. Please check your input.';
      }
      
      // Fallback
      return error.message || 'An unexpected error occurred.';
  }
}

/**
 * Check if an error is a network error
 * 
 * @param error - The error to check
 * @returns True if the error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof APIError) {
    return !error.statusCode;
  }
  
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('network') || msg.includes('fetch') || msg.includes('connection');
  }
  
  return false;
}

/**
 * Check if an error is a timeout error
 * 
 * @param error - The error to check
 * @returns True if the error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof APIError) {
    // Check status codes first
    if (error.statusCode === 408 || error.statusCode === 504) {
      return true;
    }
    // Then check message content
    const lowerMessage = error.message.toLowerCase();
    return lowerMessage.includes('timeout') || lowerMessage.includes('timed out');
  }
  
  if (error instanceof Error) {
    const lowerMessage = error.message.toLowerCase();
    return lowerMessage.includes('timeout') || lowerMessage.includes('timed out');
  }
  
  return false;
}

/**
 * Check if an error is a server error (5xx)
 * 
 * @param error - The error to check
 * @returns True if the error is a server error
 */
export function isServerError(error: unknown): boolean {
  if (error instanceof APIError && error.statusCode) {
    return error.statusCode >= 500 && error.statusCode < 600;
  }
  
  return false;
}

/**
 * Check if an error is a client error (4xx)
 * 
 * @param error - The error to check
 * @returns True if the error is a client error
 */
export function isClientError(error: unknown): boolean {
  if (error instanceof APIError && error.statusCode) {
    return error.statusCode >= 400 && error.statusCode < 500;
  }
  
  return false;
}
