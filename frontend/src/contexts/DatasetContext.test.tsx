import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { DatasetProvider, useDataset } from './DatasetContext';
import { apiClient } from '../services/api';
import { Place } from '../types';

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    getPlaces: vi.fn(),
  },
}));

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

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Test data
const mockPlaces: Place[] = [
  {
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
  },
  {
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
  },
  {
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
  },
];

describe('DatasetContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <DatasetProvider>{children}</DatasetProvider>
  );

  describe('Initial State', () => {
    it('should initialize with empty places and default state', () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      expect(result.current.state.places).toEqual([]);
      expect(result.current.state.filteredPlaces).toEqual([]);
      expect(result.current.state.source).toBe('default');
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.searchQuery).toBe('');
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useDataset());
      }).toThrow('useDataset must be used within a DatasetProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('loadPlaces', () => {
    it('should load places from API successfully', async () => {
      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });

      expect(result.current.state.places).toEqual(mockPlaces);
      expect(result.current.state.filteredPlaces).toEqual(mockPlaces);
      expect(result.current.state.error).toBe(null);
    });

    it('should set loading state while fetching', async () => {
      vi.mocked(apiClient.getPlaces).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockPlaces), 100);
          })
      );

      const { result } = renderHook(() => useDataset(), { wrapper });

      // Initially loading
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(true);
      });

      // After loading completes
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Network error';
      vi.mocked(apiClient.getPlaces).mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.error).toBe(errorMessage);
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should cache loaded places in localStorage', async () => {
      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(mockPlaces);
      });

      // Check cache
      const cachedData = localStorageMock.getItem(
        'italy-trip-planner:dataset-cache'
      );
      expect(cachedData).toBeTruthy();
      expect(JSON.parse(cachedData!)).toEqual(mockPlaces);
    });

    it('should load from cache if available and not expired', async () => {
      // Set up cache
      localStorageMock.setItem(
        'italy-trip-planner:dataset-cache',
        JSON.stringify(mockPlaces)
      );
      localStorageMock.setItem(
        'italy-trip-planner:dataset-cache-timestamp',
        Date.now().toString()
      );

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(mockPlaces);
      });

      // API should not be called when loading from cache
      expect(apiClient.getPlaces).not.toHaveBeenCalled();
    });

    it('should not use expired cache', async () => {
      // Set up expired cache (2 hours old)
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      localStorageMock.setItem(
        'italy-trip-planner:dataset-cache',
        JSON.stringify(mockPlaces)
      );
      localStorageMock.setItem(
        'italy-trip-planner:dataset-cache-timestamp',
        twoHoursAgo.toString()
      );

      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(mockPlaces);
      });

      // API should be called since cache is expired
      expect(apiClient.getPlaces).toHaveBeenCalled();
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);
    });

    it('should filter places by city', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setFilters({ cities: ['Rome'] });
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(2);
        expect(result.current.state.filteredPlaces.every((p) => p.city === 'Rome')).toBe(
          true
        );
      });
    });

    it('should filter places by type', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setFilters({ types: ['museum'] });
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(1);
        expect(result.current.state.filteredPlaces[0].name).toBe('Uffizi Gallery');
      });
    });

    it('should filter places by tags', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setFilters({ tags: ['architecture'] });
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(2);
      });
    });

    it('should filter places by price range', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setFilters({ priceRanges: ['€€'] });
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(1);
        expect(result.current.state.filteredPlaces[0].name).toBe('Colosseum');
      });
    });

    it('should apply multiple filters with AND logic', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setFilters({
          cities: ['Rome'],
          types: ['historic_site'],
        });
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(2);
        expect(
          result.current.state.filteredPlaces.every(
            (p) => p.city === 'Rome' && p.type === 'historic_site'
          )
        ).toBe(true);
      });
    });
  });

  describe('Search', () => {
    beforeEach(async () => {
      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);
    });

    it('should filter places by search query (name)', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setSearchQuery('Colosseum');
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(1);
        expect(result.current.state.filteredPlaces[0].name).toBe('Colosseum');
      });
    });

    it('should filter places by search query (description)', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setSearchQuery('baroque');
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(1);
        expect(result.current.state.filteredPlaces[0].name).toBe('Trevi Fountain');
      });
    });

    it('should be case-insensitive', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setSearchQuery('COLOSSEUM');
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(1);
        expect(result.current.state.filteredPlaces[0].name).toBe('Colosseum');
      });
    });

    it('should combine search with filters', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.setFilters({ cities: ['Rome'] });
        result.current.setSearchQuery('fountain');
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(1);
        expect(result.current.state.filteredPlaces[0].name).toBe('Trevi Fountain');
      });
    });
  });

  describe('clearFilters', () => {
    beforeEach(async () => {
      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);
    });

    it('should reset filters and search to initial state', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      // Apply filters and search
      act(() => {
        result.current.setFilters({ cities: ['Rome'] });
        result.current.setSearchQuery('Colosseum');
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(1);
      });

      // Clear filters
      act(() => {
        result.current.clearFilters();
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toEqual(mockPlaces);
        expect(result.current.state.searchQuery).toBe('');
        expect(result.current.state.filters.cities).toEqual([]);
      });
    });
  });

  describe('resetDataset', () => {
    beforeEach(async () => {
      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);
    });

    it('should reset dataset to initial state and clear cache', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      // Verify cache exists
      expect(
        localStorageMock.getItem('italy-trip-planner:dataset-cache')
      ).toBeTruthy();

      // Reset dataset
      act(() => {
        result.current.resetDataset();
      });

      expect(result.current.state.places).toEqual([]);
      expect(result.current.state.filteredPlaces).toEqual([]);
      expect(
        localStorageMock.getItem('italy-trip-planner:dataset-cache')
      ).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty dataset', async () => {
      vi.mocked(apiClient.getPlaces).mockResolvedValue([]);

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places).toEqual([]);
        expect(result.current.state.filteredPlaces).toEqual([]);
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle places with null/undefined optional fields', async () => {
      const placesWithNulls: Place[] = [
        {
          id: 'place_001',
          name: 'Test Place',
          type: 'restaurant',
          city: 'Rome',
          latitude: 41.9,
          longitude: 12.5,
          description: null,
          rating: null,
          price_range: null,
          tags: undefined,
          duration_minutes: null,
          hours: null,
          booking_required: null,
          region: null,
          neighborhood: null,
          seasonal_notes: null,
        },
      ];

      vi.mocked(apiClient.getPlaces).mockResolvedValue(placesWithNulls);

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(placesWithNulls);
      });

      // Should not crash when filtering
      act(() => {
        result.current.setFilters({ tags: ['test'] });
        result.current.setSearchQuery('test');
      });

      await waitFor(() => {
        expect(result.current.state.filteredPlaces).toHaveLength(1);
      });
    });

    it('should handle corrupted cache gracefully', async () => {
      // Set corrupted cache data
      localStorageMock.setItem(
        'italy-trip-planner:dataset-cache',
        'invalid-json'
      );
      localStorageMock.setItem(
        'italy-trip-planner:dataset-cache-timestamp',
        Date.now().toString()
      );

      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);

      const { result } = renderHook(() => useDataset(), { wrapper });

      // Should fall back to API
      await waitFor(() => {
        expect(result.current.state.places).toEqual(mockPlaces);
      });

      expect(apiClient.getPlaces).toHaveBeenCalled();
    });
  });

  describe('Dataset Switching', () => {
    const customPlaces: Place[] = [
      {
        id: 'custom_001',
        name: 'Custom Place 1',
        type: 'restaurant',
        city: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        description: 'A custom place',
        rating: 4.5,
        price_range: '€€',
        tags: ['french', 'cuisine'],
        duration_minutes: 90,
        hours: '12:00-22:00',
        booking_required: true,
        region: 'Île-de-France',
        neighborhood: null,
        seasonal_notes: null,
      },
    ];

    beforeEach(async () => {
      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);
    });

    it('should load custom dataset and persist to localStorage', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.loadCustomDataset(customPlaces);
      });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(customPlaces);
        expect(result.current.state.source).toBe('custom');
      });

      // Verify custom dataset is persisted
      const stored = localStorageMock.getItem('italy-trip-planner:custom-dataset');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(customPlaces);

      // Verify active dataset is set to custom
      expect(localStorageMock.getItem('italy-trip-planner:active-dataset')).toBe(
        'custom'
      );
    });

    it('should switch to default dataset from custom', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      // Load custom dataset first
      act(() => {
        result.current.loadCustomDataset(customPlaces);
      });

      await waitFor(() => {
        expect(result.current.state.source).toBe('custom');
      });

      // Switch back to default
      act(() => {
        result.current.switchToDefault();
      });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(mockPlaces);
        expect(result.current.state.source).toBe('default');
      });

      // Verify active dataset is set to default
      expect(localStorageMock.getItem('italy-trip-planner:active-dataset')).toBe(
        'default'
      );
    });

    it('should switch to custom dataset from default', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      // First load custom dataset
      act(() => {
        result.current.loadCustomDataset(customPlaces);
      });

      await waitFor(() => {
        expect(result.current.state.source).toBe('custom');
      });

      // Switch to default
      act(() => {
        result.current.switchToDefault();
      });

      await waitFor(() => {
        expect(result.current.state.source).toBe('default');
      });

      // Switch back to custom
      act(() => {
        result.current.switchToCustom();
      });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(customPlaces);
        expect(result.current.state.source).toBe('custom');
      });

      // Verify active dataset is set to custom
      expect(localStorageMock.getItem('italy-trip-planner:active-dataset')).toBe(
        'custom'
      );
    });

    it('should handle switching to custom when no custom dataset exists', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      // Try to switch to custom without loading one first
      act(() => {
        result.current.switchToCustom();
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeTruthy();
        expect(result.current.state.error).toContain('No custom dataset found');
      });

      // Should remain on default
      expect(result.current.state.source).toBe('default');
    });

    it('should return true when custom dataset exists', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      // Initially no custom dataset
      expect(result.current.hasCustomDataset()).toBe(false);

      // Load custom dataset
      act(() => {
        result.current.loadCustomDataset(customPlaces);
      });

      await waitFor(() => {
        expect(result.current.state.source).toBe('custom');
      });

      // Now has custom dataset
      expect(result.current.hasCustomDataset()).toBe(true);
    });

    it('should restore custom dataset on mount', async () => {
      // Set up custom dataset in localStorage before mounting
      localStorageMock.setItem(
        'italy-trip-planner:custom-dataset',
        JSON.stringify(customPlaces)
      );
      localStorageMock.setItem('italy-trip-planner:active-dataset', 'custom');

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(customPlaces);
        expect(result.current.state.source).toBe('custom');
      });

      // API should not be called when restoring from localStorage
      expect(apiClient.getPlaces).not.toHaveBeenCalled();
    });

    it('should restore default dataset on mount when active-dataset is default', async () => {
      // Set up cache with default dataset
      localStorageMock.setItem(
        'italy-trip-planner:dataset-cache',
        JSON.stringify(mockPlaces)
      );
      localStorageMock.setItem(
        'italy-trip-planner:dataset-cache-timestamp',
        Date.now().toString()
      );
      localStorageMock.setItem('italy-trip-planner:active-dataset', 'default');

      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places).toEqual(mockPlaces);
        expect(result.current.state.source).toBe('default');
      });
    });

    it('should fallback to default if custom dataset restore fails', async () => {
      // Set active dataset to custom but with corrupted data
      localStorageMock.setItem(
        'italy-trip-planner:custom-dataset',
        'invalid-json'
      );
      localStorageMock.setItem('italy-trip-planner:active-dataset', 'custom');

      vi.mocked(apiClient.getPlaces).mockResolvedValue(mockPlaces);

      const { result } = renderHook(() => useDataset(), { wrapper });

      // Should fall back to loading default from API
      await waitFor(() => {
        expect(result.current.state.places).toEqual(mockPlaces);
      });

      expect(apiClient.getPlaces).toHaveBeenCalled();
    });

    it('should preserve filters when switching datasets', async () => {
      const { result } = renderHook(() => useDataset(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.places.length).toBeGreaterThan(0);
      });

      // Set some filters
      act(() => {
        result.current.setFilters({ cities: ['Rome'] });
      });

      await waitFor(() => {
        expect(result.current.state.filters.cities).toEqual(['Rome']);
      });

      // Load custom dataset
      act(() => {
        result.current.loadCustomDataset(customPlaces);
      });

      await waitFor(() => {
        expect(result.current.state.source).toBe('custom');
      });

      // Filters should still be set (even if they don't match custom dataset)
      expect(result.current.state.filters.cities).toEqual(['Rome']);
    });
  });
});
