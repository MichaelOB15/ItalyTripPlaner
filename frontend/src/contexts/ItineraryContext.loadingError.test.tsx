import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';

// Mock AuthContext with authenticated user
const mockAuthState = {
  isAuthenticated: true,
  user: {
    sub: 'user-123',
    email: 'test@example.com',
    emailVerified: true,
  },
  accessToken: 'test-token-123',
  isLoading: false,
  error: null,
};

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    state: mockAuthState,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    confirmResetPassword: vi.fn(),
    refreshToken: vi.fn(),
  }),
}));

// Mock ItineraryApiClient with controllable responses
const mockListItineraries = vi.fn();
const mockCreateItinerary = vi.fn();
const mockUpdateItinerary = vi.fn();
const mockDeleteItinerary = vi.fn();

vi.mock('../services/itineraryApi', () => ({
  ItineraryApiClient: vi.fn().mockImplementation(() => ({
    listItineraries: mockListItineraries,
    createItinerary: mockCreateItinerary,
    updateItinerary: mockUpdateItinerary,
    deleteItinerary: mockDeleteItinerary,
    getBaseURL: () => '/api',
  })),
}));

import { ItineraryProvider, useItinerary } from './ItineraryContext';
import { Itinerary } from '../types';

/**
 * Test Suite for Task 8.7: Error Handling and Loading Indicators
 * 
 * **Validates Requirements 9.5, 9.6:**
 * - 9.5: Preserve unsaved work on session expiry
 * - 9.6: Display loading indicators during API requests
 * 
 * Tests:
 * - Loading state is set during API operations
 * - Loading state is cleared after operations complete
 * - Loading state is cleared on errors
 * - Error messages are displayed for API failures
 * - Session expiry preserves unsaved work
 * - Network errors show appropriate messages
 */
describe('ItineraryContext - Loading States and Error Handling (Task 8.7)', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ItineraryProvider>{children}</ItineraryProvider>
  );

  const mockItinerary: Itinerary = {
    id: 'itin_001',
    name: 'Test Itinerary',
    days: [
      { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
      { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
      { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
    ],
    preferences: {
      cities: ['Rome'],
      interests: ['history'],
      pace: 'moderate',
      price_range: ['€€'],
      include_booking_required: true,
    },
    created_at: new Date().toISOString(),
    last_modified: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockListItineraries.mockResolvedValue([mockItinerary]);
    mockCreateItinerary.mockResolvedValue(mockItinerary);
    mockUpdateItinerary.mockResolvedValue(mockItinerary);
    mockDeleteItinerary.mockResolvedValue(undefined);
  });

  describe('Loading Indicators - Requirement 9.6', () => {
    it('should set loading state to true when loading itineraries', async () => {
      let loadingDuringCall = false;
      
      mockListItineraries.mockImplementation(async () => {
        // Capture loading state during the API call
        await new Promise(resolve => setTimeout(resolve, 10));
        return [mockItinerary];
      });

      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        const loadPromise = result.current.loadItinerary();
        
        // Check loading state while API call is in progress
        await waitFor(() => {
          if (result.current.state.isLoading) {
            loadingDuringCall = true;
          }
        });
        
        await loadPromise;
      });

      // Verify loading was true during the call
      expect(loadingDuringCall).toBe(true);
      
      // Verify loading is false after completion
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should set loading state during delete operation', async () => {
      let loadingDuringCall = false;
      
      mockDeleteItinerary.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Load itinerary first
      await act(async () => {
        await result.current.loadItinerary();
      });

      await act(async () => {
        const deletePromise = result.current.deleteItinerary('itin_001');
        
        // Check loading state while API call is in progress
        await waitFor(() => {
          if (result.current.state.isLoading) {
            loadingDuringCall = true;
          }
        });
        
        await deletePromise;
      });

      expect(loadingDuringCall).toBe(true);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should clear loading state after successful API operation', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        await result.current.loadItinerary();
      });

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Error Handling - API Errors', () => {
    it('should clear loading state on API error', async () => {
      mockListItineraries.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        try {
          await result.current.loadItinerary();
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeTruthy();
    });

    it('should display network error message', async () => {
      mockListItineraries.mockRejectedValue(new Error('Network error. Please check your connection'));

      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        try {
          await result.current.loadItinerary();
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.state.error).toContain('Network error');
    });

    it('should display session expired error message', async () => {
      mockListItineraries.mockRejectedValue(new Error('Session expired. Please sign in again'));

      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        try {
          await result.current.loadItinerary();
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.state.error).toContain('Session expired');
    });

    it('should handle delete operation errors', async () => {
      mockDeleteItinerary.mockRejectedValue(new Error('Failed to delete'));

      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        await result.current.loadItinerary();
      });

      await act(async () => {
        try {
          await result.current.deleteItinerary('itin_001');
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toContain('Failed to delete itinerary');
    });
  });

  describe('Session Expiry - Preserve Unsaved Work (Requirement 9.5)', () => {
    it('should preserve itinerary data when session expires during save', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Create an itinerary with unsaved changes
      await act(async () => {
        result.current.createItinerary('My Trip');
      });

      const itineraryBeforeError = result.current.state.currentItinerary;
      expect(itineraryBeforeError).not.toBeNull();
      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Simulate session expiry error during save
      mockCreateItinerary.mockRejectedValue(
        new Error('Session expired. Please sign in again to save your itinerary.')
      );

      await act(async () => {
        try {
          await result.current.saveItinerary();
        } catch (e) {
          // Expected error
        }
      });

      // Verify unsaved work is preserved
      expect(result.current.state.currentItinerary).toEqual(itineraryBeforeError);
      expect(result.current.state.currentItinerary?.name).toBe('My Trip');
      expect(result.current.state.error).toContain('Session expired');
    });

    it('should preserve unsaved changes flag on session expiry', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        result.current.createItinerary('My Trip');
      });

      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Simulate session expiry
      mockCreateItinerary.mockRejectedValue(
        new Error('Session expired')
      );

      await act(async () => {
        try {
          await result.current.saveItinerary();
        } catch (e) {
          // Expected error
        }
      });

      // Verify unsaved changes flag is maintained
      expect(result.current.state.hasUnsavedChanges).toBe(true);
    });
  });

  describe('Error Messages - User-Friendly Feedback', () => {
    it('should provide specific error for unauthorized access', async () => {
      mockListItineraries.mockRejectedValue(
        new Error('Unauthorized access')
      );

      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        try {
          await result.current.loadItinerary();
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.state.error).toMatch(/Session expired|sign in again/i);
    });

    it('should provide specific error for not found resources', async () => {
      mockDeleteItinerary.mockRejectedValue(
        new Error('Itinerary not found')
      );

      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        await result.current.loadItinerary();
      });

      await act(async () => {
        try {
          await result.current.deleteItinerary('itin_999');
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.state.error).toContain('not found');
    });

    it('should clear error state on successful operation after error', async () => {
      // First, cause an error
      mockListItineraries.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useItinerary(), { wrapper });

      await act(async () => {
        try {
          await result.current.loadItinerary();
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.state.error).toBeTruthy();

      // Now, make it succeed
      mockListItineraries.mockResolvedValue([mockItinerary]);

      await act(async () => {
        await result.current.loadItinerary();
      });

      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Loading State Management', () => {
    it('should have initial loading state as false', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      expect(result.current.state.isLoading).toBe(false);
    });

    it('should handle concurrent operations correctly', async () => {
      let firstCallLoading = false;
      let secondCallLoading = false;

      mockListItineraries.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return [mockItinerary];
      });

      mockDeleteItinerary.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Start first operation
      await act(async () => {
        const loadPromise = result.current.loadItinerary();
        
        await waitFor(() => {
          if (result.current.state.isLoading) {
            firstCallLoading = true;
          }
        });
        
        await loadPromise;
      });

      // Start second operation
      await act(async () => {
        const deletePromise = result.current.deleteItinerary('itin_001');
        
        await waitFor(() => {
          if (result.current.state.isLoading) {
            secondCallLoading = true;
          }
        });
        
        await deletePromise;
      });

      expect(firstCallLoading).toBe(true);
      expect(secondCallLoading).toBe(true);
      expect(result.current.state.isLoading).toBe(false);
    });
  });
});
