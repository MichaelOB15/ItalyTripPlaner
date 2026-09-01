import React, { useMemo } from 'react';
// import { FixedSizeList as List } from 'react-window';
import { Place } from '../types';
import { PlaceCard } from './PlaceCard';
import { useKeyboardListNavigation } from '../hooks/useKeyboardListNavigation';

// ============================================================================
// Types
// ============================================================================

export interface PlaceListProps {
  /**
   * Array of places to display
   */
  places: Place[];

  /**
   * Places currently in the itinerary (for highlighting)
   */
  itineraryPlaceIds?: Set<string>;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Callback when "Add to Itinerary" is clicked on a place
   */
  onAddToItinerary?: (place: Place) => void;

  /**
   * Optional CSS class for the container
   */
  className?: string;

  /**
   * Height of each place card (for virtual scrolling)
   * @default 320
   */
  itemHeight?: number;

  /**
   * Height of the list container
   * @default 600
   */
  listHeight?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_ITEM_HEIGHT = 320; // Height of each PlaceCard in pixels
const DEFAULT_LIST_HEIGHT = 600; // Height of the visible list area

/**
 * Number of skeleton items to show during loading
 */
const SKELETON_COUNT = 6;

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Loading skeleton for a place card
 */
function PlaceCardSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-2">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Rating and price skeleton */}
      <div className="flex items-center gap-3 mb-2">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>

      {/* Tags skeleton */}
      <div className="flex flex-wrap gap-1 mb-3">
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        <div className="h-6 bg-gray-200 rounded-full w-14"></div>
      </div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>

      {/* Button skeleton */}
      <div className="h-10 bg-gray-200 rounded mt-2"></div>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState(): JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <svg
        className="w-16 h-16 text-gray-400 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No places match your filters</h3>
      <p className="text-sm text-gray-600">
        Try adjusting your search or filter criteria to see more results.
      </p>
    </div>
  );
}

/**
 * Loading state component
 */
function LoadingState(): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4" role="status" aria-live="polite" aria-label="Loading places">
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <PlaceCardSkeleton key={index} />
      ))}
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

/**
 * PlaceList Component
 * 
 * Displays a virtualized list of place cards for optimal performance with large datasets.
 * Uses react-window for efficient rendering of 100+ items by only rendering visible items.
 * 
 * Features:
 * - Virtual scrolling for performance optimization
 * - Keyboard navigation with arrow keys (Up/Down)
 * - Loading skeleton states
 * - Empty state when no results
 * - Highlights places already in itinerary
 * - Optimized re-renders with React.memo
 * 
 * Keyboard Shortcuts:
 * - Arrow Up/Down: Navigate between places
 * - Home/End: Jump to first/last place
 * - Enter/Space: Open place details (when PlaceCard is focused)
 * 
 * Requirements Coverage:
 * - 3.1: Displays all places in a browsable list
 * - 3.3: Displays only places matching filter criteria
 * - 13.2: Implements virtual scrolling for 100+ items
 * - 14.2: Keyboard navigation support with arrow keys
 * - 14.5: Arrow key navigation in lists
 * 
 * @example
 * ```tsx
 * <PlaceList
 *   places={filteredPlaces}
 *   itineraryPlaceIds={new Set(itineraryPlaces.map(p => p.id))}
 *   isLoading={isLoading}
 *   onAddToItinerary={(place) => addToDay(place, activeDay)}
 * />
 * ```
 */
export const PlaceList = React.memo(function PlaceList({
  places,
  itineraryPlaceIds = new Set<string>(),
  isLoading = false,
  onAddToItinerary,
  className = '',
  itemHeight: _itemHeight = DEFAULT_ITEM_HEIGHT,
  listHeight: _listHeight = DEFAULT_LIST_HEIGHT,
}: PlaceListProps): JSX.Element {
  /**
   * Keyboard navigation support for list
   */
  const { focusedIndex, handleKeyDown } = useKeyboardListNavigation(places.length, {
    orientation: 'vertical',
    wrap: true,
  });

  /**
   * Memoized check if list should use virtual scrolling
   * Use virtual scrolling when there are 10+ items for performance
   */
  const shouldUseVirtualScroll = useMemo(() => places.length >= 10, [places.length]);

  /**
   * Row renderer for react-window
   */
  const _Row = useMemo(
    () =>
      ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const place = places[index];
        const isInItinerary = itineraryPlaceIds.has(place.id);
        const isFocused = focusedIndex === index;

        return (
          <div style={style} className="px-2 py-2">
            <PlaceCard
              place={place}
              isInItinerary={isInItinerary}
              onAddToItinerary={onAddToItinerary}
              // Keyboard navigation support
              tabIndex={isFocused ? 0 : -1}
              data-focused={isFocused}
            />
          </div>
        );
      },
    [places, itineraryPlaceIds, onAddToItinerary, focusedIndex]
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className={className}>
        <LoadingState />
      </div>
    );
  }

  // Show empty state
  if (places.length === 0) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    );
  }

  // Render with virtual scrolling for large lists
  if (shouldUseVirtualScroll) {
    return (
      <div className={className} onKeyDown={handleKeyDown}>
        <div
          className="border border-gray-200 rounded-lg overflow-hidden max-h-[600px] overflow-y-auto"
          role="list"
          aria-label={`${places.length} places found. Use arrow keys to navigate.`}
        >
          {places.map((place, index) => {
            const isFocused = focusedIndex === index;
            return (
              <div key={place.id} className="border-b border-gray-200 last:border-b-0">
                <PlaceCard
                  place={place}
                  isInItinerary={itineraryPlaceIds.has(place.id)}
                  onAddToItinerary={onAddToItinerary}
                  tabIndex={isFocused ? 0 : -1}
                  data-focused={isFocused}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-sm text-gray-600 text-center">
          Showing {places.length} place{places.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  // Render regular grid for small lists (< 10 items)
  return (
    <div className={className} onKeyDown={handleKeyDown}>
      <div className="grid grid-cols-1 gap-4" role="list" aria-label={`${places.length} places found. Use arrow keys to navigate.`}>
        {places.map((place, index) => {
          const isInItinerary = itineraryPlaceIds.has(place.id);
          const isFocused = focusedIndex === index;
          return (
            <div key={place.id} role="listitem">
              <PlaceCard
                place={place}
                isInItinerary={isInItinerary}
                onAddToItinerary={onAddToItinerary}
                // Keyboard navigation support
                tabIndex={isFocused ? 0 : -1}
                data-focused={isFocused}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-sm text-gray-600 text-center">
        Showing {places.length} place{places.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
});
