import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { FilterProvider, useFilter } from './FilterContext';
import { PlaceType } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

interface WrapperProps {
  children: ReactNode;
  debounceDelay?: number;
}

function createWrapper(debounceDelay = 50): React.FC<WrapperProps> {
  return ({ children }: WrapperProps) => (
    <FilterProvider debounceDelay={debounceDelay}>{children}</FilterProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('FilterContext', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe('useFilter hook', () => {
    it('should throw error when used outside FilterProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useFilter());
      }).toThrow('useFilter must be used within a FilterProvider');

      consoleError.mockRestore();
    });

    it('should provide initial filter state', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      expect(result.current.filters).toEqual({
        cities: [],
        types: [],
        tags: [],
        priceRanges: [],
        searchQuery: '',
        hasCoordinates: undefined,
      });
    });

    it('should accept custom initial filters', () => {
      const Wrapper = ({ children }: { children: ReactNode }) => (
        <FilterProvider
          initialFilters={{
            cities: ['Rome'],
            types: ['restaurant'],
            searchQuery: 'pizza',
          }}
        >
          {children}
        </FilterProvider>
      );

      const { result } = renderHook(() => useFilter(), { wrapper: Wrapper });

      expect(result.current.filters.cities).toEqual(['Rome']);
      expect(result.current.filters.types).toEqual(['restaurant']);
      expect(result.current.filters.searchQuery).toBe('pizza');
    });
  });

  describe('filter updates', () => {
    it('should update city filter', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCityFilter(['Rome', 'Florence']);
      });

      expect(result.current.filters.cities).toEqual(['Rome', 'Florence']);
    });

    it('should update type filter', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      const types: PlaceType[] = ['restaurant', 'museum'];

      act(() => {
        result.current.setTypeFilter(types);
      });

      expect(result.current.filters.types).toEqual(types);
    });

    it('should update tag filter', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTagFilter(['art', 'history']);
      });

      expect(result.current.filters.tags).toEqual(['art', 'history']);
    });

    it('should update price filter', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPriceFilter(['€', '€€']);
      });

      expect(result.current.filters.priceRanges).toEqual(['€', '€€']);
    });

    it('should update hasCoordinates filter', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setHasCoordinates(true);
      });

      expect(result.current.filters.hasCoordinates).toBe(true);

      act(() => {
        result.current.setHasCoordinates(undefined);
      });

      expect(result.current.filters.hasCoordinates).toBeUndefined();
    });

    it('should update search query immediately in filters', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSearchQuery('colosseum');
      });

      expect(result.current.filters.searchQuery).toBe('colosseum');
    });

    it('should set all filters at once', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setAllFilters({
          cities: ['Milan'],
          types: ['museum'],
          tags: ['modern'],
          priceRanges: ['€€€'],
          searchQuery: 'contemporary art',
          hasCoordinates: true,
        });
      });

      expect(result.current.filters).toEqual({
        cities: ['Milan'],
        types: ['museum'],
        tags: ['modern'],
        priceRanges: ['€€€'],
        searchQuery: 'contemporary art',
        hasCoordinates: true,
      });
    });
  });

  describe('clear filters', () => {
    it('should clear all filters and reset to initial state', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      // Set multiple filters
      act(() => {
        result.current.setCityFilter(['Rome']);
        result.current.setTypeFilter(['restaurant']);
        result.current.setTagFilter(['italian']);
        result.current.setPriceFilter(['€€']);
        result.current.setSearchQuery('pasta');
        result.current.setHasCoordinates(true);
      });

      // Verify filters are set
      expect(result.current.filters.cities).toHaveLength(1);
      expect(result.current.filters.types).toHaveLength(1);

      // Clear all filters
      act(() => {
        result.current.clearFilters();
      });

      // Verify all filters are cleared
      expect(result.current.filters).toEqual({
        cities: [],
        types: [],
        tags: [],
        priceRanges: [],
        searchQuery: '',
        hasCoordinates: undefined,
      });

      // Verify debounced search query is also cleared
      expect(result.current.debouncedSearchQuery).toBe('');
    });
  });

  describe('search query debouncing', () => {
    it('should debounce search query updates', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(300),
      });

      // Initially empty
      expect(result.current.debouncedSearchQuery).toBe('');

      // Update search query
      act(() => {
        result.current.setSearchQuery('test');
      });

      // Immediate filters update
      expect(result.current.filters.searchQuery).toBe('test');
      // Debounced value not updated yet
      expect(result.current.debouncedSearchQuery).toBe('');

      // Fast forward 150ms (not enough)
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.debouncedSearchQuery).toBe('');

      // Fast forward remaining 150ms (total 300ms)
      await act(async () => {
        vi.advanceTimersByTime(150);
        await vi.runOnlyPendingTimersAsync();
      });

      // Now debounced value should be updated
      expect(result.current.debouncedSearchQuery).toBe('test');

      vi.useRealTimers();
    });

    it('should reset debounce timer on subsequent updates', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(300),
      });

      // First update
      act(() => {
        result.current.setSearchQuery('co');
      });

      // Wait 200ms
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Still not debounced
      expect(result.current.debouncedSearchQuery).toBe('');

      // Second update (resets timer)
      act(() => {
        result.current.setSearchQuery('col');
      });

      // Wait another 200ms (total 400ms from first, but only 200ms from second)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Still not debounced because timer was reset
      expect(result.current.debouncedSearchQuery).toBe('');

      // Wait final 100ms
      await act(async () => {
        vi.advanceTimersByTime(100);
        await vi.runOnlyPendingTimersAsync();
      });

      // Now it should be updated with the latest value
      expect(result.current.debouncedSearchQuery).toBe('col');

      vi.useRealTimers();
    });

    it('should use custom debounce delay', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(100), // 100ms delay
      });

      act(() => {
        result.current.setSearchQuery('fast');
      });

      // Wait 50ms (not enough)
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current.debouncedSearchQuery).toBe('');

      // Wait 50ms more (total 100ms)
      await act(async () => {
        vi.advanceTimersByTime(50);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.debouncedSearchQuery).toBe('fast');

      vi.useRealTimers();
    });
  });

  describe('multiple filter combinations', () => {
    it('should handle multiple simultaneous filter updates', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCityFilter(['Rome', 'Venice']);
        result.current.setTypeFilter(['restaurant', 'cafe']);
        result.current.setTagFilter(['outdoor', 'romantic']);
        result.current.setPriceFilter(['€€', '€€€']);
      });

      expect(result.current.filters.cities).toEqual(['Rome', 'Venice']);
      expect(result.current.filters.types).toEqual(['restaurant', 'cafe']);
      expect(result.current.filters.tags).toEqual(['outdoor', 'romantic']);
      expect(result.current.filters.priceRanges).toEqual(['€€', '€€€']);
    });

    it('should allow empty arrays for filters', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      // Set some filters
      act(() => {
        result.current.setCityFilter(['Rome']);
        result.current.setTypeFilter(['restaurant']);
      });

      // Clear by setting empty arrays
      act(() => {
        result.current.setCityFilter([]);
        result.current.setTypeFilter([]);
      });

      expect(result.current.filters.cities).toEqual([]);
      expect(result.current.filters.types).toEqual([]);
    });
  });

  describe('filter state isolation', () => {
    it('should maintain independent filter states across multiple providers', () => {
      const { result: result1 } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      const { result: result2 } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      // Update filters in first provider
      act(() => {
        result1.current.setCityFilter(['Rome']);
      });

      // Update filters in second provider
      act(() => {
        result2.current.setCityFilter(['Milan']);
      });

      // Each should maintain its own state
      expect(result1.current.filters.cities).toEqual(['Rome']);
      expect(result2.current.filters.cities).toEqual(['Milan']);
    });
  });

  describe('applyFilters function', () => {
    const samplePlaces = [
      {
        id: 'place_001',
        name: 'Colosseum',
        type: 'historic_site' as PlaceType,
        city: 'Rome',
        latitude: 41.8902,
        longitude: 12.4922,
        description: 'Ancient Roman amphitheater',
        price_range: '€€',
        rating: 4.7,
        tags: ['history', 'ancient', 'iconic'],
        duration_minutes: 120,
        hours: '9:00 AM - 7:00 PM',
        seasonal_notes: null,
        booking_required: true,
      },
      {
        id: 'place_002',
        name: 'Trattoria da Luigi',
        type: 'restaurant' as PlaceType,
        city: 'Florence',
        latitude: 43.7696,
        longitude: 11.2558,
        description: 'Traditional Tuscan cuisine',
        price_range: '€€€',
        rating: 4.5,
        tags: ['food', 'italian', 'traditional'],
        duration_minutes: 90,
        hours: '12:00 PM - 10:00 PM',
        seasonal_notes: null,
        booking_required: false,
      },
      {
        id: 'place_003',
        name: 'Uffizi Gallery',
        type: 'museum' as PlaceType,
        city: 'Florence',
        latitude: 43.7686,
        longitude: 11.2556,
        description: 'Renaissance art museum',
        price_range: '€€',
        rating: 4.8,
        tags: ['art', 'renaissance', 'museum'],
        duration_minutes: 180,
        hours: '8:15 AM - 6:30 PM',
        seasonal_notes: null,
        booking_required: true,
      },
      {
        id: 'place_004',
        name: 'Hidden Gem Cafe',
        type: 'cafe' as PlaceType,
        city: 'Rome',
        latitude: null,
        longitude: null,
        description: 'Cozy cafe with great coffee',
        price_range: '€',
        rating: 4.2,
        tags: ['coffee', 'casual'],
        duration_minutes: 45,
        hours: '7:00 AM - 6:00 PM',
        seasonal_notes: null,
        booking_required: false,
      },
    ];

    it('should return all places when no filters are applied', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(4);
      expect(filtered).toEqual(samplePlaces);
    });

    it('should filter by city', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCityFilter(['Rome']);
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.city === 'Rome')).toBe(true);
    });

    it('should filter by multiple cities', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCityFilter(['Rome', 'Florence']);
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(4);
    });

    it('should filter by type', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTypeFilter(['museum']);
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Uffizi Gallery');
    });

    it('should filter by tags (OR logic)', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTagFilter(['history', 'art']);
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(2); // Colosseum (history) and Uffizi (art)
      expect(filtered.map(p => p.name).sort()).toEqual(['Colosseum', 'Uffizi Gallery']);
    });

    it('should filter by price range', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPriceFilter(['€€']);
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.price_range === '€€')).toBe(true);
    });

    it('should filter by hasCoordinates', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setHasCoordinates(true);
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(3);
      expect(filtered.every(p => p.latitude !== null && p.longitude !== null)).toBe(true);
    });

    it('should filter by search query using debounced value', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(300),
      });

      act(() => {
        result.current.setSearchQuery('renaissance');
      });

      // Immediately after setting, debounced value not updated yet
      let filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(4); // No filtering yet

      // Wait for debounce
      await act(async () => {
        vi.advanceTimersByTime(300);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.debouncedSearchQuery).toBe('renaissance');

      // Now filtering should work
      filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Uffizi Gallery');

      vi.useRealTimers();
    });

    it('should search in both name and description', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(100),
      });

      act(() => {
        result.current.setSearchQuery('tuscan');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.debouncedSearchQuery).toBe('tuscan');

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Trattoria da Luigi');

      vi.useRealTimers();
    });

    it('should apply multiple filters with AND logic', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCityFilter(['Florence']);
        result.current.setTypeFilter(['museum']);
        result.current.setPriceFilter(['€€']);
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Uffizi Gallery');
    });

    it('should return empty array when no places match filters', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setCityFilter(['Milan']); // No places in Milan
      });

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(0);
    });

    it('should handle empty places array', () => {
      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      const filtered = result.current.applyFilters([]);
      expect(filtered).toHaveLength(0);
      expect(filtered).toEqual([]);
    });

    it('should be case-insensitive for search queries', async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(100),
      });

      act(() => {
        result.current.setSearchQuery('COLOSSEUM');
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
        await vi.runOnlyPendingTimersAsync();
      });

      expect(result.current.debouncedSearchQuery).toBe('COLOSSEUM');

      const filtered = result.current.applyFilters(samplePlaces);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Colosseum');

      vi.useRealTimers();
    });

    it('should exclude places with null price_range when price filter is applied', () => {
      const placesWithNull = [
        ...samplePlaces,
        {
          id: 'place_005',
          name: 'Free Park',
          type: 'park' as PlaceType,
          city: 'Rome',
          latitude: 41.9,
          longitude: 12.5,
          description: 'Public park',
          price_range: null,
          rating: 4.0,
          tags: ['outdoor'],
          duration_minutes: 60,
          hours: 'Always open',
          seasonal_notes: null,
          booking_required: false,
        },
      ];

      const { result } = renderHook(() => useFilter(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPriceFilter(['€']);
      });

      const filtered = result.current.applyFilters(placesWithNull);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Hidden Gem Cafe');
    });
  });
});
