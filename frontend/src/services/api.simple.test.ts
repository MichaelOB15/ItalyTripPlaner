/**
 * Simplified API Client Tests
 * Testing core functionality without complex mocking
 */

import { describe, it, expect } from 'vitest';
import { APIError, LoadingStateManager } from './api';

describe('APIError', () => {
  it('should create error with message', () => {
    const error = new APIError('Test error');
    expect(error.message).toBe('Test error');
    expect(error).toBeInstanceOf(Error);
  });

  it('should store status code and response', () => {
    const error = new APIError('Test error', 404, { detail: 'Not found' });
    expect(error.statusCode).toBe(404);
    expect(error.response).toEqual({ detail: 'Not found' });
  });
});

describe('LoadingStateManager', () => {
  it('should initialize with no loading states', () => {
    const manager = new LoadingStateManager();
    expect(manager.isLoading('test')).toBe(false);
  });

  it('should set and get loading state', () => {
    const manager = new LoadingStateManager();
    manager.setLoading('test', true);
    expect(manager.isLoading('test')).toBe(true);
    
    manager.setLoading('test', false);
    expect(manager.isLoading('test')).toBe(false);
  });
});
