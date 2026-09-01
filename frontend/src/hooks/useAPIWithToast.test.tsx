/**
 * Unit Tests for useAPIWithToast Hook
 * 
 * **Validates: Requirements 9.6, 12.5**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAPIWithToast } from './useAPIWithToast';
import { APIError } from '../services/api';
import * as ToastContainer from '../components/ToastContainer';

// Mock the toast context
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();

vi.mock('../components/ToastContainer', () => ({
  useToast: vi.fn(() => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    showToast: vi.fn(),
  })),
}));

describe('useAPIWithToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Successful API Calls', () => {
    it('should return result on successful API call', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const mockData = { id: '1', name: 'Test' };
      const mockAPICall = vi.fn().mockResolvedValue(mockData);

      const apiResult = await result.current.callAPI(mockAPICall);

      expect(apiResult).toEqual(mockData);
      expect(mockAPICall).toHaveBeenCalledTimes(1);
      expect(mockShowError).not.toHaveBeenCalled();
    });

    it('should show success toast when successMessage is provided', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const mockAPICall = vi.fn().mockResolvedValue({ success: true });

      await result.current.callAPI(mockAPICall, {
        successMessage: 'Operation completed successfully!',
      });

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Operation completed successfully!');
      });
    });

    it('should call onSuccess callback when provided', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const onSuccess = vi.fn();
      const mockAPICall = vi.fn().mockResolvedValue({ success: true });

      await result.current.callAPI(mockAPICall, { onSuccess });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should not show success toast when successMessage is not provided', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const mockAPICall = vi.fn().mockResolvedValue({ success: true });

      await result.current.callAPI(mockAPICall);

      expect(mockShowSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Network Errors', () => {
    it('should show network error toast', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const networkError = new APIError('Network error: Unable to reach the server');
      const mockAPICall = vi.fn().mockRejectedValue(networkError);

      const apiResult = await result.current.callAPI(mockAPICall);

      expect(apiResult).toBeUndefined();
      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Unable to connect. Check your internet connection.'
        );
      });
    });

    it('should handle generic network errors', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const networkError = new Error('Network request failed');
      const mockAPICall = vi.fn().mockRejectedValue(networkError);

      await result.current.callAPI(mockAPICall);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Unable to connect. Check your internet connection.'
        );
      });
    });
  });

  describe('Timeout Errors', () => {
    it('should show timeout error toast for 408 status', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const timeoutError = new APIError('Request timeout', 408);
      const mockAPICall = vi.fn().mockRejectedValue(timeoutError);

      await result.current.callAPI(mockAPICall);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Request timed out. Please try again.'
        );
      });
    });

    it('should show timeout error toast for 504 status', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const timeoutError = new APIError('Gateway timeout', 504);
      const mockAPICall = vi.fn().mockRejectedValue(timeoutError);

      await result.current.callAPI(mockAPICall);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Gateway timeout. Please try again.'
        );
      });
    });
  });

  describe('400 Errors', () => {
    it('should show invalid request error toast for 400 status', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const badRequestError = new APIError('Bad request', 400);
      const mockAPICall = vi.fn().mockRejectedValue(badRequestError);

      await result.current.callAPI(mockAPICall);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Invalid request. Please check your input.'
        );
      });
    });
  });

  describe('500 Errors', () => {
    it('should show server error toast for 500 status', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const serverError = new APIError('Internal server error', 500);
      const mockAPICall = vi.fn().mockRejectedValue(serverError);

      await result.current.callAPI(mockAPICall);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Server error. Please try again later.'
        );
      });
    });

    it('should show server error toast for 502 status', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const serverError = new APIError('Bad gateway', 502);
      const mockAPICall = vi.fn().mockRejectedValue(serverError);

      await result.current.callAPI(mockAPICall);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Bad gateway. The server is temporarily unavailable.'
        );
      });
    });

    it('should show server error toast for 503 status', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const serverError = new APIError('Service unavailable', 503);
      const mockAPICall = vi.fn().mockRejectedValue(serverError);

      await result.current.callAPI(mockAPICall);

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Service unavailable. Please try again later.'
        );
      });
    });
  });

  describe('Custom Error Messages', () => {
    it('should use custom error message when provided', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const serverError = new APIError('Internal server error', 500);
      const mockAPICall = vi.fn().mockRejectedValue(serverError);

      await result.current.callAPI(mockAPICall, {
        customErrorMessage: 'Custom error occurred',
      });

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith('Custom error occurred');
      });
    });
  });

  describe('Error Callbacks', () => {
    it('should call onError callback when provided', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const onError = vi.fn();
      const error = new APIError('Server error', 500);
      const mockAPICall = vi.fn().mockRejectedValue(error);

      await result.current.callAPI(mockAPICall, { onError });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('should not show toast when showErrorToast is false', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const error = new APIError('Server error', 500);
      const mockAPICall = vi.fn().mockRejectedValue(error);

      await result.current.callAPI(mockAPICall, {
        showErrorToast: false,
      });

      expect(mockShowError).not.toHaveBeenCalled();
    });
  });

  describe('Return Values', () => {
    it('should return undefined when API call fails', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const error = new APIError('Server error', 500);
      const mockAPICall = vi.fn().mockRejectedValue(error);

      const apiResult = await result.current.callAPI(mockAPICall);

      expect(apiResult).toBeUndefined();
    });

    it('should return result when API call succeeds', async () => {
      const { result } = renderHook(() => useAPIWithToast());
      
      const mockData = { id: '1', name: 'Test' };
      const mockAPICall = vi.fn().mockResolvedValue(mockData);

      const apiResult = await result.current.callAPI(mockAPICall);

      expect(apiResult).toEqual(mockData);
    });
  });
});
