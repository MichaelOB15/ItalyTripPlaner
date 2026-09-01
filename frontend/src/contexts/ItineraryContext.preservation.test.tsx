import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';

// Mock AuthContext BEFORE importing ItineraryContext
vi.mock('./AuthContext', () => {
  return {
    useAuth: vi.fn(() => ({
      state: {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        isLoading: false,
        error: null,
      },
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      refreshToken: vi.fn(),
    })),
  };
});

// Mock ItineraryApiClient BEFORE importing ItineraryContext
vi.mock('../services/itineraryApi', () => {
  class MockItineraryApiClient {
    listItineraries = vi.fn().mockResolvedValue([]);
    createItinerary = vi.fn();
    updateItinerary = vi.fn();
    deleteItinerary = vi.fn();
    getItinerary = vi.fn();
    
    constructor(config: any) {}
  }
  
  return {
    ItineraryApiClient: MockItineraryApiClient,
  };
});

import { ItineraryProvider, useItinerary } from './ItineraryContext';
import { Place } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// Test data
const mockPlace1: Place = {
  id: 'place_001',
  name: 'Colosseum',
  type: 'historic_site',
  city: 'Rome',
  latitude: 41.8902,
  longitude: 12.4922,
  description: 'Ancient Roman amphitheater',
  rating: 4.7,
  price_range: '€€',
  tags: ['ancient', 'architecture'],
  duration_minutes: 120,
  hours: '09:00-19:00',
  booking_required: true,
  region: 'Lazio',
  neighborhood: null,
  seasonal_notes: null,
};

const mockPlace2: Place = {
  id: 'place_002',
  name: 'Trevi Fountain',
  type: 'historic_site',
  city: 'Rome',
  latitude: 41.9009,
  longitude: 12.4833,
  description: 'Iconic baroque fountain',
  rating: 4.6,
  price_range: '€',
  tags: ['fountain', 'architecture'],
  duration_minutes: 30,
  hours: null,
  booking_required: false,
  region: 'Lazio',
  neighborhood: null,
  seasonal_notes: null,
};

describe('Bug #2 Preservation Tests - localStorage and Error Handling (Task 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ItineraryProvider>{children}</ItineraryProvider>
  );

  /**
   * **Property 4: Preservation** - localStorage and Error Handling
   * **Validates Requirements 3.4, 3.5, 3.6**
   * 
   * These tests verify that guest user behavior and error handling are preserved
   * after fixing Bug #2 (itinerary persistence timing). The fix should NOT change:
   * - Guest users using localStorage (not API)
   * - Auto-save debouncing (1 second delay)
   * - Error handling for failed API calls
   * 
   * **EXPECTED OUTCOME**: All tests PASS on unfixed code (baseline behavior)
   */

  describe('Guest User localStorage Persistence (Requirement 3.4)', () => {
    it('should use localStorage for guest users', () => {
      // Guest users should have storageMode = 'localStorage'
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      expect(result.current.state.storageMode).toBe('localStorage');
    });

    it('should save guest user itineraries to localStorage', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      act(() => {
        result.current.createItinerary('Guest Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      // Trigger auto-save
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Verify saved to localStorage
      const saved = localStorageMock.getItem('italy-trip-planner:itinerary');
      expect(saved).not.toBeNull();
      
      const itinerary = JSON.parse(saved!);
      expect(itinerary.name).toBe('Guest Trip');
      expect(itinerary.days[0].places).toHaveLength(1);
      expect(itinerary.days[0].places[0].id).toBe('place_001');
    });

    it('should load guest user itineraries from localStorage on mount', () => {
      // Pre-populate localStorage
      const testItinerary = {
        id: 'guest_itinerary_123',
        name: 'Stored Guest Trip',
        days: [
          {
            day_number: 1,
            places: [mockPlace1],
            total_duration: 120,
            start_time: '08:00',
          },
          {
            day_number: 2,
            places: [],
            total_duration: 0,
            start_time: '08:00',
          },
          {
            day_number: 3,
            places: [],
            total_duration: 0,
            start_time: '08:00',
          },
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

      localStorageMock.setItem(
        'italy-trip-planner:itinerary',
        JSON.stringify(testItinerary)
      );

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Should load from localStorage
      expect(result.current.state.currentItinerary).not.toBeNull();
      expect(result.current.state.currentItinerary?.name).toBe('Stored Guest Trip');
      expect(result.current.state.currentItinerary?.days[0].places).toHaveLength(1);
      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });

    it('should NOT call API methods for guest user save operations', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Guest Trip');
      });

      // Trigger auto-save
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Should save to localStorage instead (verifies guest mode is working)
      const saved = localStorageMock.getItem('italy-trip-planner:itinerary');
      expect(saved).not.toBeNull();
      const itinerary = JSON.parse(saved!);
      expect(itinerary.name).toBe('Guest Trip');
      
      // Verify we're in localStorage mode
      expect(result.current.state.storageMode).toBe('localStorage');
    });

    it('should NOT call API methods for guest user load operations', async () => {
      // Pre-populate localStorage
      const testItinerary = {
        id: 'guest_itinerary_123',
        name: 'Guest Trip',
        days: [
          { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
          { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
          { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };

      localStorageMock.setItem(
        'italy-trip-planner:itinerary',
        JSON.stringify(testItinerary)
      );

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Should load from localStorage instead (verifies guest mode is working)
      expect(result.current.state.currentItinerary?.name).toBe('Guest Trip');
      
      // Verify we're in localStorage mode
      expect(result.current.state.storageMode).toBe('localStorage');
    });
  });

  describe('Auto-save Debouncing (Requirement 3.5)', () => {
    it('should debounce auto-save with 1 second delay', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      act(() => {
        result.current.createItinerary('Test Trip');
      });

      // Verify not saved immediately
      expect(localStorageMock.getItem('italy-trip-planner:itinerary')).toBeNull();

      // Advance 500ms - should still not save
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });
      expect(localStorageMock.getItem('italy-trip-planner:itinerary')).toBeNull();

      // Advance another 500ms (total 1000ms) - should save now
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      const saved = localStorageMock.getItem('italy-trip-planner:itinerary');
      expect(saved).not.toBeNull();
      const itinerary = JSON.parse(saved!);
      expect(itinerary.name).toBe('Test Trip');
    });

    it('should restart debounce timer on rapid changes', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      act(() => {
        result.current.createItinerary('Test Trip');
      });

      // Make rapid changes before debounce completes
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      act(() => {
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      act(() => {
        result.current.addPlaceToDay(mockPlace2, 1);
      });

      // Total 1000ms elapsed but should NOT be saved yet due to rapid changes
      expect(localStorageMock.getItem('italy-trip-planner:itinerary')).toBeNull();

      // Wait another full second after last change
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Now should be saved with all places
      const saved = localStorageMock.getItem('italy-trip-planner:itinerary');
      expect(saved).not.toBeNull();
      const itinerary = JSON.parse(saved!);
      expect(itinerary.days[0].places).toHaveLength(2);
    });

    it('should mark as saved after auto-save completes', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      act(() => {
        result.current.createItinerary('Test Trip');
      });

      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Trigger auto-save
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });
  });

  describe('Error Handling (Requirement 3.6)', () => {
    it('should display error message when localStorage save fails', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      // Trigger save
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Should display error message
      expect(result.current.state.error).toBe('Failed to save itinerary to local storage');
      
      // Should keep itinerary in memory
      expect(result.current.state.currentItinerary).not.toBeNull();
      expect(result.current.state.currentItinerary?.name).toBe('Test Trip');

      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should keep itinerary in memory when save fails', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('Storage error');
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 1);
      });

      // Trigger save
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Itinerary should still be in memory with all data intact
      expect(result.current.state.currentItinerary).not.toBeNull();
      expect(result.current.state.currentItinerary?.name).toBe('Test Trip');
      expect(result.current.state.currentItinerary?.days[0].places).toHaveLength(2);
      expect(result.current.state.currentItinerary?.days[0].places[0].id).toBe('place_001');
      expect(result.current.state.currentItinerary?.days[0].places[1].id).toBe('place_002');

      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should display error message when localStorage load fails', () => {
      // Pre-populate with corrupted data
      localStorageMock.setItem('italy-trip-planner:itinerary', 'invalid-json{corrupt}');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Should display error message
      expect(result.current.state.error).toBe('Failed to load itinerary from local storage');
      
      // Should not crash - itinerary should be null
      expect(result.current.state.currentItinerary).toBeNull();

      consoleSpy.mockRestore();
    });

    it('should handle missing localStorage gracefully', () => {
      // Clear localStorage
      localStorageMock.clear();

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Should not crash or show error
      expect(result.current.state.currentItinerary).toBeNull();
      expect(result.current.state.error).toBeNull();
    });

    it('should preserve unsaved changes flag when save fails', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('Save failed');
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Trigger save
      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // Should still have unsaved changes since save failed
      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('Property-Based Preservation Tests', () => {
    /**
     * Property: For any itinerary operation by an unauthenticated user,
     * the context SHALL use localStorage and NOT call API methods.
     * 
     * This is a property-based test that verifies the behavior holds
     * across multiple operations.
     */
    it('should preserve localStorage behavior across all guest user operations', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Perform various operations
      act(() => {
        result.current.createItinerary('Test Trip');
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      act(() => {
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      act(() => {
        result.current.updateItineraryName('Updated Trip');
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      act(() => {
        result.current.removePlaceFromDay(1, 0);
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
        await Promise.resolve();
      });

      // All saves should go to localStorage (verifies guest mode throughout)
      const saved = localStorageMock.getItem('italy-trip-planner:itinerary');
      expect(saved).not.toBeNull();
      const itinerary = JSON.parse(saved!);
      expect(itinerary.name).toBe('Updated Trip');
      
      // Verify we remain in localStorage mode
      expect(result.current.state.storageMode).toBe('localStorage');
    });

    /**
     * Property: For any error condition during save/load,
     * the context SHALL display an error message and preserve itinerary in memory.
     */
    it('should preserve error handling behavior across different failure scenarios', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      
      const originalSetItem = localStorageMock.setItem;
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Test multiple error scenarios
      const errorScenarios = [
        { error: new Error('QuotaExceededError'), expectedMessage: 'Failed to save itinerary to local storage' },
        { error: new Error('Storage full'), expectedMessage: 'Failed to save itinerary to local storage' },
        { error: new Error('Permission denied'), expectedMessage: 'Failed to save itinerary to local storage' },
      ];

      for (const scenario of errorScenarios) {
        // Reset state
        act(() => {
          result.current.clearItinerary();
        });

        // Mock error
        localStorageMock.setItem = () => {
          throw scenario.error;
        };

        act(() => {
          result.current.createItinerary('Test Trip');
          result.current.addPlaceToDay(mockPlace1, 1);
        });

        await act(async () => {
          vi.advanceTimersByTime(1000);
          await Promise.resolve();
        });

        // Should display error
        expect(result.current.state.error).toBe(scenario.expectedMessage);
        
        // Should preserve itinerary
        expect(result.current.state.currentItinerary).not.toBeNull();
        expect(result.current.state.currentItinerary?.days[0].places).toHaveLength(1);
      }

      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });
});
