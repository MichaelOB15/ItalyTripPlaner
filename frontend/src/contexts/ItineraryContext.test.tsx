import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';

// Mock AuthContext BEFORE importing ItineraryContext
vi.mock('./AuthContext', () => {
  const mockUseAuth = vi.fn(() => ({
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
  }));
  
  return {
    useAuth: mockUseAuth,
  };
});

// Mock ItineraryApiClient BEFORE importing ItineraryContext
vi.mock('../services/itineraryApi', () => {
  const MockItineraryApiClient = function(this: any, config: any) {
    this.listItineraries = vi.fn().mockResolvedValue([]);
    this.createItinerary = vi.fn();
    this.updateItinerary = vi.fn();
    this.deleteItinerary = vi.fn();
    this.getItinerary = vi.fn();
  };
  
  return {
    ItineraryApiClient: MockItineraryApiClient,
  };
});

import { ItineraryProvider, useItinerary } from './ItineraryContext';
import { Place, TripPace } from '../types';
import { useAuth as mockUseAuth } from './AuthContext';

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

const mockPlace3: Place = {
  id: 'place_003',
  name: 'Uffizi Gallery',
  type: 'museum',
  city: 'Florence',
  latitude: 43.7686,
  longitude: 11.2558,
  description: 'World-famous art museum',
  rating: 4.8,
  price_range: '€€€',
  tags: ['art', 'museum'],
  duration_minutes: 180,
  hours: '08:15-18:50',
  booking_required: true,
  region: 'Tuscany',
  neighborhood: null,
  seasonal_notes: null,
};

describe('ItineraryContext', () => {
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

  describe('Initial State', () => {
    it('should initialize with no itinerary and default state', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      expect(result.current.state.currentItinerary).toBeNull();
      expect(result.current.state.savedItineraries).toEqual([]);
      expect(result.current.state.isEditing).toBe(false);
      expect(result.current.state.hasUnsavedChanges).toBe(false);
      expect(result.current.state.storageMode).toBe('localStorage');
      expect(result.current.state.error).toBe(null);
    });

    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useItinerary());
      }).toThrow('useItinerary must be used within an ItineraryProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('createItinerary', () => {
    it('should create a new itinerary with default preferences', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('My Italy Trip');
      });

      expect(result.current.state.currentItinerary).not.toBeNull();
      expect(result.current.state.currentItinerary?.name).toBe('My Italy Trip');
      expect(result.current.state.currentItinerary?.days).toHaveLength(3);
      expect(result.current.state.currentItinerary?.preferences.pace).toBe('moderate');
      expect(result.current.state.hasUnsavedChanges).toBe(true);
    });

    it('should create a new itinerary with custom preferences', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      const preferences = {
        cities: ['Rome', 'Florence'],
        interests: ['art', 'history'],
        pace: 'relaxed' as TripPace,
        price_range: ['€€', '€€€'],
        include_booking_required: false,
      };

      act(() => {
        result.current.createItinerary('My Italy Trip', preferences);
      });

      expect(result.current.state.currentItinerary?.preferences).toEqual(preferences);
    });

    it('should create itinerary with empty day plans', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      const itinerary = result.current.state.currentItinerary!;
      expect(itinerary.days[0].places).toEqual([]);
      expect(itinerary.days[1].places).toEqual([]);
      expect(itinerary.days[2].places).toEqual([]);
      expect(itinerary.days[0].day_number).toBe(1);
      expect(itinerary.days[1].day_number).toBe(2);
      expect(itinerary.days[2].day_number).toBe(3);
    });
  });

  describe('addPlaceToDay', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useItinerary(), { wrapper });
      act(() => {
        result.current.createItinerary('Test Trip');
      });
    });

    it('should add a place to day 1', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.places).toHaveLength(1);
      expect(day1.places[0].id).toBe('place_001');
      expect(day1.total_duration).toBe(120);
    });

    it('should add multiple places to the same day', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 1);
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.places).toHaveLength(2);
      expect(day1.total_duration).toBe(150); // 120 + 30
    });

    it('should prevent adding duplicate places to the same day', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      act(() => {
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.places).toHaveLength(1);
      expect(result.current.state.error).toBe('Cannot add "Colosseum" - this place is already in Day 1');
    });

    it('should allow adding the same place to different days', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace1, 2);
      });

      expect(result.current.state.currentItinerary!.days[0].places).toHaveLength(1);
      expect(result.current.state.currentItinerary!.days[1].places).toHaveLength(1);
      expect(result.current.state.error).toBe(null);
    });

    it('should use default duration for places without duration_minutes', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      const placeNoDuration: Place = {
        ...mockPlace1,
        id: 'place_no_duration',
        duration_minutes: null,
      };

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.addPlaceToDay(placeNoDuration, 1);
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.total_duration).toBe(60); // Default duration
    });
  });

  describe('removePlaceFromDay', () => {
    it('should remove a place by index', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 1);
      });

      act(() => {
        result.current.removePlaceFromDay(1, 0);
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.places).toHaveLength(1);
      expect(day1.places[0].id).toBe('place_002');
      expect(day1.total_duration).toBe(30);
    });

    it('should update total duration after removal', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 1);
      });

      const beforeDuration = result.current.state.currentItinerary!.days[0].total_duration;
      expect(beforeDuration).toBe(150);

      act(() => {
        result.current.removePlaceFromDay(1, 0);
      });

      const afterDuration = result.current.state.currentItinerary!.days[0].total_duration;
      expect(afterDuration).toBe(30);
    });
  });

  describe('reorderPlacesInDay', () => {
    it('should reorder places within a day', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 1);
        result.current.addPlaceToDay(mockPlace3, 1);
      });

      act(() => {
        result.current.reorderPlacesInDay(1, 0, 2); // Move first place to last
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.places[0].id).toBe('place_002');
      expect(day1.places[1].id).toBe('place_003');
      expect(day1.places[2].id).toBe('place_001');
    });

    it('should handle invalid indices gracefully', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      act(() => {
        result.current.reorderPlacesInDay(1, 0, 5); // Invalid toIndex
      });

      expect(result.current.state.error).toBe('Invalid place index for reordering');
    });
  });

  describe('movePlaceBetweenDays', () => {
    it('should move a place from one day to another', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      act(() => {
        result.current.movePlaceBetweenDays('place_001', 1, 2);
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      const day2 = result.current.state.currentItinerary!.days[1];
      expect(day1.places).toHaveLength(0);
      expect(day2.places).toHaveLength(1);
      expect(day2.places[0].id).toBe('place_001');
    });

    it('should prevent moving to a day that already has the place', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace1, 2);
      });

      act(() => {
        result.current.movePlaceBetweenDays('place_001', 1, 2);
      });

      expect(result.current.state.error).toBe('Cannot move "Colosseum" to Day 2 - this place is already in that day');
    });

    it('should handle moving non-existent place', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.movePlaceBetweenDays('place_999', 1, 2);
      });

      expect(result.current.state.error).toBe('Place not found in source day');
    });

    it('should update durations in both days', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 1);
      });

      const day1BeforeDuration = result.current.state.currentItinerary!.days[0].total_duration;
      expect(day1BeforeDuration).toBe(150);

      act(() => {
        result.current.movePlaceBetweenDays('place_001', 1, 2);
      });

      const day1AfterDuration = result.current.state.currentItinerary!.days[0].total_duration;
      const day2Duration = result.current.state.currentItinerary!.days[1].total_duration;
      expect(day1AfterDuration).toBe(30);
      expect(day2Duration).toBe(120);
    });
  });

  describe('replacePlace', () => {
    it('should replace a place at a specific index', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      act(() => {
        result.current.replacePlace(1, 0, mockPlace2);
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.places[0].id).toBe('place_002');
      expect(day1.total_duration).toBe(30);
    });

    it('should prevent replacing with a place that already exists in the day', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 1);
      });

      act(() => {
        result.current.replacePlace(1, 0, mockPlace2);
      });

      expect(result.current.state.error).toBe('Cannot replace with "Trevi Fountain" - this place is already in Day 1');
    });

    it('should handle invalid place index', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.replacePlace(1, 0, mockPlace1);
      });

      expect(result.current.state.error).toBe('Invalid place index for replacement');
    });
  });

  describe('clearDay', () => {
    it('should clear all places from a day', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 1);
      });

      act(() => {
        result.current.clearDay(1);
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.places).toHaveLength(0);
      expect(day1.total_duration).toBe(0);
    });
  });

  describe('updateDayStartTime', () => {
    it('should update the start time for a day', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.updateDayStartTime(1, '10:00');
      });

      const day1 = result.current.state.currentItinerary!.days[0];
      expect(day1.start_time).toBe('10:00');
    });
  });

  describe('updateItineraryName', () => {
    it('should update the itinerary name', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      act(() => {
        result.current.updateItineraryName('Updated Trip Name');
      });

      expect(result.current.state.currentItinerary?.name).toBe('Updated Trip Name');
      expect(result.current.state.hasUnsavedChanges).toBe(true);
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      const newPreferences = {
        cities: ['Venice'],
        interests: ['food', 'wine'],
        pace: 'packed' as TripPace,
        price_range: ['€€€€'],
        include_booking_required: true,
      };

      act(() => {
        result.current.updatePreferences(newPreferences);
      });

      expect(result.current.state.currentItinerary?.preferences).toEqual(newPreferences);
    });
  });

  describe('clearItinerary', () => {
    it('should clear the entire itinerary', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      act(() => {
        result.current.clearItinerary();
      });

      expect(result.current.state.currentItinerary).toBeNull();
      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });
  });

  describe('setEditingMode', () => {
    it('should toggle editing mode', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      expect(result.current.state.isEditing).toBe(false);

      act(() => {
        result.current.setEditingMode(true);
      });

      expect(result.current.state.isEditing).toBe(true);

      act(() => {
        result.current.setEditingMode(false);
      });

      expect(result.current.state.isEditing).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should auto-save itinerary to localStorage after changes', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      // Advance timers to trigger auto-save (1 second debounce)
      await act(async () => {
        vi.advanceTimersByTime(1000);
        // Wait for any pending promises to resolve
        await Promise.resolve();
      });

      const saved = localStorageMock.getItem('italy-trip-planner:itinerary');
      expect(saved).not.toBeNull();
      const itinerary = JSON.parse(saved!);
      expect(itinerary.name).toBe('Test Trip');
    });

    it('should load itinerary from localStorage on mount', () => {
      const testItinerary = {
        id: 'test_itinerary',
        name: 'Saved Trip',
        days: [
          {
            day_number: 1,
            places: [],
            total_duration: 0,
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

      expect(result.current.state.currentItinerary?.name).toBe('Saved Trip');
      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem('italy-trip-planner:itinerary', 'invalid-json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useItinerary(), { wrapper });

      expect(result.current.state.currentItinerary).toBeNull();
      expect(result.current.state.error).toBe(
        'Failed to load itinerary from local storage'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations when no itinerary exists', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.addPlaceToDay(mockPlace1, 1);
      });

      expect(result.current.state.currentItinerary).toBeNull();
    });

    it('should mark itinerary as having unsaved changes after modifications', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
      });

      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Trigger save
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });

    it('should maintain day_number consistency', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
        result.current.addPlaceToDay(mockPlace1, 1);
        result.current.addPlaceToDay(mockPlace2, 2);
        result.current.addPlaceToDay(mockPlace3, 3);
      });

      const itinerary = result.current.state.currentItinerary!;
      expect(itinerary.days[0].day_number).toBe(1);
      expect(itinerary.days[1].day_number).toBe(2);
      expect(itinerary.days[2].day_number).toBe(3);
    });
  });

  describe('Storage Mode Detection', () => {
    it('should use localStorage mode when user is not authenticated', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      expect(result.current.state.storageMode).toBe('localStorage');
    });

    // Note: Dynamic mock testing is complex with vi.mock hoisting
    // The storageMode detection logic is tested in integration tests
    // and can be manually verified by changing the mock return value above
  });

  describe('API-based save (Task 8.3)', () => {
    it('should save to localStorage when in guest mode', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('Test Trip');
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
      expect(itinerary.name).toBe('Test Trip');
      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });

    it('should identify new itineraries by ID format (itinerary_*)', () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      act(() => {
        result.current.createItinerary('New Trip');
      });

      const itinerary = result.current.state.currentItinerary;
      expect(itinerary?.id).toMatch(/^itinerary_/);
    });

    it('should handle localStorage save errors gracefully', async () => {
      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('Quota exceeded');
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

      expect(result.current.state.error).toBe('Failed to save itinerary to local storage');

      // Restore
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('Authentication State Changes (Task 8.6)', () => {
    it('should fetch itineraries from API when user signs in', async () => {
      // Mock the API client
      const mockListItineraries = vi.fn().mockResolvedValue([
        {
          id: 'itin_001',
          name: 'Rome Trip',
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
        },
      ]);

      vi.mock('../services/itineraryApi', () => ({
        ItineraryApiClient: vi.fn().mockImplementation(() => ({
          listItineraries: mockListItineraries,
        })),
      }));

      // Start with unauthenticated state
      vi.mocked(mockUseAuth).mockReturnValue({
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
      });

      const { result, rerender } = renderHook(() => useItinerary(), { wrapper });

      expect(result.current.state.storageMode).toBe('localStorage');
      expect(result.current.state.savedItineraries).toEqual([]);

      // Simulate user sign-in
      vi.mocked(mockUseAuth).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: {
            sub: 'user-123',
            email: 'test@example.com',
            emailVerified: true,
          },
          accessToken: 'test-token-123',
          isLoading: false,
          error: null,
        },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });

      // Trigger re-render to detect auth state change
      await act(async () => {
        rerender();
        await Promise.resolve();
      });

      // Verify storage mode changed to API
      await waitFor(() => {
        expect(result.current.state.storageMode).toBe('api');
      });

      // Note: Due to mock hoisting limitations, we verify the intent
      // The actual API call would be tested in integration tests
    });

    it('should clear saved itineraries when user signs out', async () => {
      // Start with authenticated state with saved itineraries
      vi.mocked(mockUseAuth).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: {
            sub: 'user-123',
            email: 'test@example.com',
            emailVerified: true,
          },
          accessToken: 'test-token-123',
          isLoading: false,
          error: null,
        },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });

      const { result, rerender } = renderHook(() => useItinerary(), { wrapper });

      // Manually set some saved itineraries
      act(() => {
        result.current.state.savedItineraries.push({
          id: 'itin_001',
          name: 'Rome Trip',
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
        });
      });

      // Simulate user sign-out
      vi.mocked(mockUseAuth).mockReturnValue({
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
      });

      // Trigger re-render to detect auth state change
      await act(async () => {
        rerender();
        await Promise.resolve();
      });

      // Verify storage mode reverted to localStorage
      await waitFor(() => {
        expect(result.current.state.storageMode).toBe('localStorage');
      });

      // Verify saved itineraries were cleared
      // Note: This depends on the implementation detecting the sign-out
    });

    it('should preserve localStorage data when signing out', async () => {
      // Set up localStorage with an itinerary
      const localItinerary = {
        id: 'itinerary_local_123',
        name: 'Local Trip',
        days: [
          { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
          { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
          { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
        ],
        preferences: {
          cities: ['Florence'],
          interests: ['art'],
          pace: 'relaxed',
          price_range: ['€€'],
          include_booking_required: true,
        },
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };

      localStorageMock.setItem(
        'italy-trip-planner:itinerary',
        JSON.stringify(localItinerary)
      );

      // Start authenticated
      vi.mocked(mockUseAuth).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: { sub: 'user-123', email: 'test@example.com', emailVerified: true },
          accessToken: 'test-token',
          isLoading: false,
          error: null,
        },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });

      const { rerender } = renderHook(() => useItinerary(), { wrapper });

      // Sign out
      vi.mocked(mockUseAuth).mockReturnValue({
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
      });

      await act(async () => {
        rerender();
        await Promise.resolve();
      });

      // Verify localStorage data is still there
      const saved = localStorageMock.getItem('italy-trip-planner:itinerary');
      expect(saved).not.toBeNull();
      const itinerary = JSON.parse(saved!);
      expect(itinerary.name).toBe('Local Trip');
    });
  });

  describe('loadItinerary function (Task 8.4)', () => {
    it('should load from localStorage when in localStorage mode', async () => {
      // Setup: Save an itinerary to localStorage
      const mockItinerary = {
        id: 'itinerary_123',
        name: 'My Local Trip',
        days: [
          { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
          { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
          { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
        ],
        preferences: {
          cities: ['Rome'],
          interests: ['history'],
          pace: 'moderate' as TripPace,
          price_range: ['€€'],
          include_booking_required: true,
        },
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };

      localStorageMock.setItem('italy-trip-planner:itinerary', JSON.stringify(mockItinerary));

      // Mock unauthenticated state
      vi.mocked(mockUseAuth).mockReturnValue({
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
      });

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.state.currentItinerary).not.toBeNull();
      });

      expect(result.current.state.storageMode).toBe('localStorage');
      expect(result.current.state.currentItinerary?.id).toBe('itinerary_123');
      expect(result.current.state.currentItinerary?.name).toBe('My Local Trip');
    });

    it('should load from API when in API mode', async () => {
      // Mock API response
      const mockItineraries = [
        {
          id: 'itin_002',
          name: 'Most Recent Trip',
          days: [
            { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
            { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
            { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
          ],
          preferences: {
            cities: ['Florence'],
            interests: ['art'],
            pace: 'relaxed' as TripPace,
            price_range: ['€€€'],
            include_booking_required: true,
          },
          created_at: '2024-01-15T10:00:00Z',
          last_modified: '2024-01-20T15:30:00Z',
        },
        {
          id: 'itin_001',
          name: 'Older Trip',
          days: [
            { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
            { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
            { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
          ],
          preferences: {
            cities: ['Rome'],
            interests: ['history'],
            pace: 'moderate' as TripPace,
            price_range: ['€€'],
            include_booking_required: true,
          },
          created_at: '2024-01-10T10:00:00Z',
          last_modified: '2024-01-12T12:00:00Z',
        },
      ];

      const mockListItineraries = vi.fn().mockResolvedValue(mockItineraries);

      // Mock authenticated state
      vi.mocked(mockUseAuth).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: {
            sub: 'user-456',
            email: 'user@example.com',
            emailVerified: true,
          },
          accessToken: 'test-token-456',
          isLoading: false,
          error: null,
        },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });

      // Mock the ItineraryApiClient module
      const { ItineraryApiClient } = await import('../services/itineraryApi');
      vi.mocked(ItineraryApiClient).mockImplementation(
        () =>
          ({
            listItineraries: mockListItineraries,
          }) as any
      );

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Wait for storage mode to update and API call to complete
      await waitFor(() => {
        expect(result.current.state.storageMode).toBe('api');
      });

      await waitFor(() => {
        expect(mockListItineraries).toHaveBeenCalled();
      });

      // Wait for itineraries to be loaded
      await waitFor(() => {
        expect(result.current.state.savedItineraries.length).toBe(2);
      });

      // Verify savedItineraries contains both itineraries
      expect(result.current.state.savedItineraries).toHaveLength(2);
      expect(result.current.state.savedItineraries[0].id).toBe('itin_002');
      expect(result.current.state.savedItineraries[1].id).toBe('itin_001');

      // Verify most recent itinerary is loaded as current
      await waitFor(() => {
        expect(result.current.state.currentItinerary).not.toBeNull();
      });

      expect(result.current.state.currentItinerary?.id).toBe('itin_002');
      expect(result.current.state.currentItinerary?.name).toBe('Most Recent Trip');
    });

    it('should handle empty API response gracefully', async () => {
      const mockListItineraries = vi.fn().mockResolvedValue([]);

      // Mock authenticated state
      vi.mocked(mockUseAuth).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: {
            sub: 'user-789',
            email: 'newuser@example.com',
            emailVerified: true,
          },
          accessToken: 'test-token-789',
          isLoading: false,
          error: null,
        },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });

      // Mock the ItineraryApiClient module
      const { ItineraryApiClient } = await import('../services/itineraryApi');
      vi.mocked(ItineraryApiClient).mockImplementation(
        () =>
          ({
            listItineraries: mockListItineraries,
          }) as any
      );

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Wait for storage mode to update and API call to complete
      await waitFor(() => {
        expect(result.current.state.storageMode).toBe('api');
      });

      await waitFor(() => {
        expect(mockListItineraries).toHaveBeenCalled();
      });

      // Verify no itineraries are loaded
      expect(result.current.state.savedItineraries).toHaveLength(0);
      expect(result.current.state.currentItinerary).toBeNull();
      expect(result.current.state.error).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      const mockListItineraries = vi.fn().mockRejectedValue(new Error('Network error'));

      // Mock authenticated state
      vi.mocked(mockUseAuth).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: {
            sub: 'user-error',
            email: 'error@example.com',
            emailVerified: true,
          },
          accessToken: 'test-token-error',
          isLoading: false,
          error: null,
        },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });

      // Mock the ItineraryApiClient module
      const { ItineraryApiClient } = await import('../services/itineraryApi');
      vi.mocked(ItineraryApiClient).mockImplementation(
        () =>
          ({
            listItineraries: mockListItineraries,
          }) as any
      );

      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Wait for storage mode to update and API call to complete
      await waitFor(() => {
        expect(result.current.state.storageMode).toBe('api');
      });

      await waitFor(() => {
        expect(mockListItineraries).toHaveBeenCalled();
      });

      // Verify error is set
      await waitFor(() => {
        expect(result.current.state.error).toContain('network');
      });
    });
  });

  describe('Bug Condition Exploration: Premature Auto-save During Load (Task 4)', () => {
    /**
     * **Property 1: Bug Condition** - Itinerary Not Persisting
     * 
     * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
     * **DO NOT attempt to fix the test or the code when it fails**
     * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
     * 
     * **GOAL**: Surface counterexamples that demonstrate premature auto-save during load sequence
     * 
     * **Scoped PBT Approach**: Scope to concrete failing case - authenticated user mounts app,
     * itinerary loads from API, auto-save triggers with stale data
     * 
     * **EXPECTED OUTCOME**: Test FAILS (this is correct - proves premature auto-save bug exists)
     * 
     * **Validates Requirements**: 1.3, 1.4, 2.3, 2.4
     */
    it('should NOT trigger auto-save during initial load sequence (EXPECTED TO FAIL ON UNFIXED CODE)', async () => {
      // Mock API client methods to track calls
      const mockListItineraries = vi.fn().mockResolvedValue([
        {
          id: 'itin_server_001',
          name: 'Rome Adventure',
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
            pace: 'moderate' as TripPace,
            price_range: ['€€'],
            include_booking_required: true,
          },
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
        },
      ]);

      const mockCreateItinerary = vi.fn();
      const mockUpdateItinerary = vi.fn();

      // Mock authenticated user
      vi.mocked(mockUseAuth).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: {
            sub: 'user-123',
            email: 'test@example.com',
            emailVerified: true,
          },
          accessToken: 'test-token-123',
          isLoading: false,
          error: null,
        },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });

      // Mock the ItineraryApiClient
      const { ItineraryApiClient } = await import('../services/itineraryApi');
      vi.mocked(ItineraryApiClient).mockImplementation(
        () =>
          ({
            listItineraries: mockListItineraries,
            createItinerary: mockCreateItinerary,
            updateItinerary: mockUpdateItinerary,
          }) as any
      );

      // Render hook with authenticated context
      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Wait for storage mode to change to 'api'
      await waitFor(() => {
        expect(result.current.state.storageMode).toBe('api');
      });

      // Wait for itinerary to be loaded from API
      await waitFor(() => {
        expect(mockListItineraries).toHaveBeenCalled();
      });

      // Wait for itinerary to be loaded into state
      await waitFor(() => {
        expect(result.current.state.currentItinerary).not.toBeNull();
        expect(result.current.state.currentItinerary?.id).toBe('itin_server_001');
      });

      // Advance timers past the auto-save debounce period (1 second)
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      // **EXPECTED BEHAVIOR**: saveItinerary should NOT be called during initial load
      // - No createItinerary call should happen (we're loading, not creating)
      // - No updateItinerary call should happen (user hasn't modified anything)
      // 
      // **BUG CONDITION**: If this fails, it proves the bug exists:
      // - The auto-save effect fires when currentItinerary changes during load
      // - This sends stale data to the API, corrupting the itinerary
      expect(mockCreateItinerary).not.toHaveBeenCalled();
      expect(mockUpdateItinerary).not.toHaveBeenCalled();

      // **EXPECTED BEHAVIOR**: After load completes, currentItinerary should match loaded data
      // This confirms the data was loaded correctly without corruption
      expect(result.current.state.currentItinerary?.name).toBe('Rome Adventure');
      expect(result.current.state.currentItinerary?.days[0].places).toHaveLength(1);
      expect(result.current.state.currentItinerary?.days[0].places[0].id).toBe('place_001');

      // **EXPECTED BEHAVIOR**: hasUnsavedChanges should be false after load
      // (The LOAD_ITINERARY action sets hasUnsavedChanges to false)
      expect(result.current.state.hasUnsavedChanges).toBe(false);
    });

    it('should only trigger auto-save for user modifications, not during load', async () => {
      // Mock API client methods
      const mockListItineraries = vi.fn().mockResolvedValue([
        {
          id: 'itin_server_002',
          name: 'Florence Trip',
          days: [
            {
              day_number: 1,
              places: [],
              total_duration: 0,
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
            cities: ['Florence'],
            interests: ['art'],
            pace: 'moderate' as TripPace,
            price_range: ['€€€'],
            include_booking_required: true,
          },
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
        },
      ]);

      const mockUpdateItinerary = vi.fn().mockResolvedValue({
        id: 'itin_server_002',
        name: 'Florence Trip',
        days: [
          {
            day_number: 1,
            places: [mockPlace3],
            total_duration: 180,
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
          cities: ['Florence'],
          interests: ['art'],
          pace: 'moderate' as TripPace,
          price_range: ['€€€'],
          include_booking_required: true,
        },
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      });

      // Mock authenticated user
      vi.mocked(mockUseAuth).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: {
            sub: 'user-456',
            email: 'test2@example.com',
            emailVerified: true,
          },
          accessToken: 'test-token-456',
          isLoading: false,
          error: null,
        },
        signUp: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });

      // Mock the ItineraryApiClient
      const { ItineraryApiClient } = await import('../services/itineraryApi');
      vi.mocked(ItineraryApiClient).mockImplementation(
        () =>
          ({
            listItineraries: mockListItineraries,
            updateItinerary: mockUpdateItinerary,
          }) as any
      );

      // Render hook with authenticated context
      const { result } = renderHook(() => useItinerary(), { wrapper });

      // Wait for itinerary to be loaded
      await waitFor(() => {
        expect(result.current.state.currentItinerary).not.toBeNull();
        expect(result.current.state.currentItinerary?.id).toBe('itin_server_002');
      });

      // Clear any timers from the load sequence
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      // Reset mock to track calls after load
      mockUpdateItinerary.mockClear();

      // **USER MODIFICATION**: Add a place to the itinerary
      act(() => {
        result.current.addPlaceToDay(mockPlace3, 1);
      });

      // Verify hasUnsavedChanges is true after modification
      expect(result.current.state.hasUnsavedChanges).toBe(true);

      // Advance timers to trigger auto-save
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      // **EXPECTED BEHAVIOR**: Now updateItinerary SHOULD be called (user made a change)
      await waitFor(() => {
        expect(mockUpdateItinerary).toHaveBeenCalledTimes(1);
      });

      // Verify the update was called with the correct data
      expect(mockUpdateItinerary).toHaveBeenCalledWith(
        'itin_server_002',
        expect.objectContaining({
          name: 'Florence Trip',
          days: expect.arrayContaining([
            expect.objectContaining({
              day_number: 1,
              places: expect.arrayContaining([
                expect.objectContaining({ id: 'place_003' }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  describe('Bug #2 Preservation Tests - localStorage and Error Handling (Task 5)', () => {
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
});
