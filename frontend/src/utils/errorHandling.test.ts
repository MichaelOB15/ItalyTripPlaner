/**
 * Unit Tests for Error Handling Utilities
 * 
 * **Validates: Requirements 9.6, 12.5**
 */

import { describe, it, expect } from 'vitest';
import {
  getUserFriendlyErrorMessage,
  isNetworkError,
  isTimeoutError,
  isServerError,
  isClientError,
} from './errorHandling';
import { APIError } from '../services/api';

describe('getUserFriendlyErrorMessage', () => {
  describe('Network Errors', () => {
    it('should handle network errors without status code', () => {
      const error = new APIError('Network error: Unable to reach the server');
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Unable to connect. Check your internet connection.');
    });

    it('should handle generic Error with network keyword', () => {
      const error = new Error('Network request failed');
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Unable to connect. Check your internet connection.');
    });

    it('should handle fetch errors', () => {
      const error = new Error('Failed to fetch');
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Unable to connect. Check your internet connection.');
    });
  });

  describe('Timeout Errors', () => {
    it('should handle timeout errors with status 408', () => {
      const error = new APIError('Request timeout', 408);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Request timed out. Please try again.');
    });

    it('should handle timeout errors with status 504', () => {
      const error = new APIError('Gateway timeout', 504);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Gateway timeout. Please try again.');
    });

    it('should handle generic Error with timeout keyword', () => {
      const error = new Error('Request timeout exceeded');
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Request timed out. Please try again.');
    });

    it('should handle APIError without status but timeout message', () => {
      const error = new APIError('Request timed out');
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Request timed out. Please try again.');
    });
  });

  describe('400 Errors', () => {
    it('should handle 400 bad request errors', () => {
      const error = new APIError('Bad request', 400);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Invalid request. Please check your input.');
    });
  });

  describe('500 Errors', () => {
    it('should handle 500 internal server errors', () => {
      const error = new APIError('Internal server error', 500);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Server error. Please try again later.');
    });

    it('should handle 502 bad gateway errors', () => {
      const error = new APIError('Bad gateway', 502);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Bad gateway. The server is temporarily unavailable.');
    });

    it('should handle 503 service unavailable errors', () => {
      const error = new APIError('Service unavailable', 503);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Service unavailable. Please try again later.');
    });

    it('should handle generic 5xx errors', () => {
      const error = new APIError('Server error', 599);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Server error. Please try again later.');
    });
  });

  describe('Other HTTP Status Codes', () => {
    it('should handle 401 unauthorized', () => {
      const error = new APIError('Unauthorized', 401);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Authentication required. Please log in.');
    });

    it('should handle 403 forbidden', () => {
      const error = new APIError('Forbidden', 403);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('You do not have permission to perform this action.');
    });

    it('should handle 404 not found', () => {
      const error = new APIError('Not found', 404);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('The requested resource was not found.');
    });

    it('should handle 429 rate limit', () => {
      const error = new APIError('Too many requests', 429);
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('Too many requests. Please wait a moment and try again.');
    });
  });

  describe('Unknown Errors', () => {
    it('should handle unknown error types', () => {
      const message = getUserFriendlyErrorMessage({ weird: 'object' });
      expect(message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should handle Error with no message', () => {
      const error = new Error('');
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toBe('An unexpected error occurred.');
    });

    it('should handle APIError with custom message for unusual status codes', () => {
      const error = new APIError('I am a teapot - custom error', 418);
      const message = getUserFriendlyErrorMessage(error);
      // For unusual 4xx codes with descriptive messages (>10 chars), return the message
      expect(message).toBe('I am a teapot - custom error');
    });
  });
});

describe('isNetworkError', () => {
  it('should return true for APIError without status code', () => {
    const error = new APIError('Network error');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return false for APIError with status code', () => {
    const error = new APIError('Server error', 500);
    expect(isNetworkError(error)).toBe(false);
  });

  it('should return true for Error with network keyword', () => {
    const error = new Error('Network request failed');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return true for Error with fetch keyword', () => {
    const error = new Error('Fetch failed');
    expect(isNetworkError(error)).toBe(true);
  });

  it('should return false for Error without network keywords', () => {
    const error = new Error('Some other error');
    expect(isNetworkError(error)).toBe(false);
  });
});

describe('isTimeoutError', () => {
  it('should return true for APIError with status 408', () => {
    const error = new APIError('Request timeout', 408);
    expect(isTimeoutError(error)).toBe(true);
  });

  it('should return true for APIError with status 504', () => {
    const error = new APIError('Gateway timeout', 504);
    expect(isTimeoutError(error)).toBe(true);
  });

  it('should return true for APIError with timeout in message', () => {
    const error = new APIError('Request timed out', 500);
    expect(isTimeoutError(error)).toBe(true);
  });

  it('should return true for Error with timeout keyword', () => {
    const error = new Error('Operation timeout');
    expect(isTimeoutError(error)).toBe(true);
  });

  it('should return false for Error without timeout keyword', () => {
    const error = new Error('Some error');
    expect(isTimeoutError(error)).toBe(false);
  });
});

describe('isServerError', () => {
  it('should return true for 500 status', () => {
    const error = new APIError('Server error', 500);
    expect(isServerError(error)).toBe(true);
  });

  it('should return true for 503 status', () => {
    const error = new APIError('Service unavailable', 503);
    expect(isServerError(error)).toBe(true);
  });

  it('should return true for 599 status', () => {
    const error = new APIError('Server error', 599);
    expect(isServerError(error)).toBe(true);
  });

  it('should return false for 400 status', () => {
    const error = new APIError('Bad request', 400);
    expect(isServerError(error)).toBe(false);
  });

  it('should return false for APIError without status', () => {
    const error = new APIError('Network error');
    expect(isServerError(error)).toBe(false);
  });

  it('should return false for generic Error', () => {
    const error = new Error('Some error');
    expect(isServerError(error)).toBe(false);
  });
});

describe('isClientError', () => {
  it('should return true for 400 status', () => {
    const error = new APIError('Bad request', 400);
    expect(isClientError(error)).toBe(true);
  });

  it('should return true for 404 status', () => {
    const error = new APIError('Not found', 404);
    expect(isClientError(error)).toBe(true);
  });

  it('should return true for 499 status', () => {
    const error = new APIError('Client error', 499);
    expect(isClientError(error)).toBe(true);
  });

  it('should return false for 500 status', () => {
    const error = new APIError('Server error', 500);
    expect(isClientError(error)).toBe(false);
  });

  it('should return false for APIError without status', () => {
    const error = new APIError('Network error');
    expect(isClientError(error)).toBe(false);
  });

  it('should return false for generic Error', () => {
    const error = new Error('Some error');
    expect(isClientError(error)).toBe(false);
  });
});
