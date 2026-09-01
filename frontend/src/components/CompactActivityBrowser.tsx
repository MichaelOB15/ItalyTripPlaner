/**
 * CompactActivityBrowser Component
 * 
 * A condensed version of ActivityBrowser specifically designed for the
 * manual itinerary builder sidebar. Shows activities in a compact list
 * format with minimal details to maximize screen space for the itinerary.
 * 
 * Features:
 * - Compact card layout (name, type, duration only)
 * - Search functionality
 * - Compact filter dropdown (city, type, price)
 * - Drag-and-drop support
 * - "Already added" indicator
 * - Efficient use of space
 */

import React, { useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { Place, PlaceType } from '../types';
import { DRAG_TYPE, DragItem } from '../types/dnd';
import { useItinerary } from '../contexts/ItineraryContext';
import { useFilter } from '../contexts/FilterContext';
import { useUI } from '../contexts/UIContext';

// ============================================================================
// Types
// ============================================================================

export interface CompactActivityBrowserProps {
  activities: Place[];
}

interface CompactActivityCardProps {
  place: Place;
  isInItinerary: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '1h';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function fixEuroSymbol(text: string): string {
  // Fix malformed euro symbols (â‚¬ becomes €)
  return text.replace(/â‚¬/g, '€');
}

// ============================================================================
// Compact Activity Card
// ============================================================================

const CompactActivityCard = React.memo(function CompactActivityCard({
  place,
  isInItinerary,
}: CompactActivityCardProps): JSX.Element {
  
  const { openPlaceDetailModal } = useUI();
  
  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE.PLACE,
    item: {
      type: DRAG_TYPE.PLACE,
      place,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const duration = formatDuration(place.duration_minutes);

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPlaceDetailModal(place);
  };

  return (
    <div
      ref={dragRef}
      className={`compact-activity bg-white rounded border px-3 py-2 transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${
        isInItinerary
          ? 'border-green-300 bg-green-50'
          : 'border-gray-200 hover:border-blue-400 hover:shadow-sm'
      }`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      title="Drag to add to itinerary"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: Name and type */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 truncate">
            {place.name}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span className="capitalize">{place.type.replace('_', ' ')}</span>
            <span>•</span>
            <span>{duration}</span>
          </div>
        </div>

        {/* Right: Status indicator or info button */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {isInItinerary && (
            <svg 
              className="w-4 h-4 text-green-600" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-label="Already added"
            >
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                clipRule="evenodd" 
              />
            </svg>
          )}
          <button
            onClick={handleInfoClick}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View details"
            aria-label={`View details for ${place.name}`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export function CompactActivityBrowser({ activities }: CompactActivityBrowserProps): JSX.Element {
  const { filters, setSearchQuery, setCityFilter, setTypeFilter, setPriceFilter, setTagFilter, setBookingRequired, setMinRating, clearFilters } = useFilter();
  const { state } = useItinerary();
  const [showFilters, setShowFilters] = useState(false);

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const types = new Set<PlaceType>();
    const priceRanges = new Set<string>();
    const tags = new Set<string>();

    activities.forEach((place) => {
      cities.add(place.city);
      types.add(place.type);
      if (place.price_range) {
        priceRanges.add(place.price_range);
      }
      place.tags?.forEach((tag) => tags.add(tag));
    });

    return {
      cities: Array.from(cities).sort(),
      types: Array.from(types).sort(),
      priceRanges: Array.from(priceRanges).sort((a, b) => a.length - b.length),
      tags: Array.from(tags).sort(),
    };
  }, [activities]);

  // Create set of place IDs that are already in the itinerary
  const activitiesInItinerary = useMemo(() => {
    if (!state.currentItinerary) return new Set<string>();
    
    const ids = new Set<string>();
    state.currentItinerary.days.forEach((day) => {
      day.places.forEach((place) => {
        ids.add(place.id);
      });
    });
    return ids;
  }, [state.currentItinerary]);

  // Filter activities based on all filters
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSearch = 
          activity.name.toLowerCase().includes(query) ||
          activity.description?.toLowerCase().includes(query) ||
          activity.neighborhood?.toLowerCase().includes(query) ||
          activity.city.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // City filter
      if (filters.cities.length > 0 && !filters.cities.includes(activity.city)) {
        return false;
      }

      // Type filter
      if (filters.types.length > 0 && !filters.types.includes(activity.type)) {
        return false;
      }

      // Price filter
      if (filters.priceRanges.length > 0) {
        if (!activity.price_range || !filters.priceRanges.includes(activity.price_range)) {
          return false;
        }
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = activity.tags?.some(tag => filters.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Booking required filter
      if (filters.bookingRequired !== null) {
        if (activity.booking_required !== filters.bookingRequired) {
          return false;
        }
      }

      // Min rating filter
      if (filters.minRating !== null && filters.minRating !== undefined) {
        if (!activity.rating || activity.rating < filters.minRating) {
          return false;
        }
      }

      return true;
    });
  }, [activities, filters]);

  const hasActiveFilters = 
    filters.cities.length > 0 || 
    filters.types.length > 0 || 
    filters.priceRanges.length > 0 ||
    filters.tags.length > 0 ||
    filters.bookingRequired !== null ||
    filters.minRating !== null;

  const activeFilterCount = 
    filters.cities.length + 
    filters.types.length + 
    filters.priceRanges.length +
    filters.tags.length +
    (filters.bookingRequired !== null ? 1 : 0) +
    (filters.minRating !== null ? 1 : 0);

  const toggleCity = (city: string) => {
    const newCities = filters.cities.includes(city)
      ? filters.cities.filter(c => c !== city)
      : [...filters.cities, city];
    setCityFilter(newCities);
  };

  const toggleType = (type: PlaceType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    setTypeFilter(newTypes);
  };

  const togglePrice = (price: string) => {
    const newPrices = filters.priceRanges.includes(price)
      ? filters.priceRanges.filter(p => p !== price)
      : [...filters.priceRanges, price];
    setPriceFilter(newPrices);
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    setTagFilter(newTags);
  };

  return (
    <div className="compact-activity-browser h-full flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg 
              className="w-5 h-5 text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 10h16M4 14h16M4 18h16" 
              />
            </svg>
            <h2 className="text-lg font-bold text-gray-900">
              Activities
            </h2>
          </div>
          
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
              hasActiveFilters
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Toggle filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        
        {/* Compact Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute right-3 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Compact Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto space-y-3">
            {/* Cities */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">City</label>
              <div className="flex flex-wrap gap-1.5">
                {filterOptions.cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      filters.cities.includes(city)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* Types */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {filterOptions.types.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={`px-2 py-1 text-xs rounded transition-colors capitalize ${
                      filters.types.includes(type)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            {filterOptions.priceRanges.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Price</label>
                <div className="flex flex-wrap gap-1.5">
                  {filterOptions.priceRanges.map((price) => (
                    <button
                      key={price}
                      onClick={() => togglePrice(price)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        filters.priceRanges.includes(price)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {fixEuroSymbol(price)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {filterOptions.tags.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {filterOptions.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        filters.tags.includes(tag)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Required */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Booking</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setBookingRequired(filters.bookingRequired === true ? null : true)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filters.bookingRequired === true
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Required
                </button>
                <button
                  onClick={() => setBookingRequired(filters.bookingRequired === false ? null : false)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    filters.bookingRequired === false
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Not Required
                </button>
              </div>
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Min Rating
                {filters.minRating && ` (${filters.minRating}+)`}
              </label>
              <div className="flex gap-1.5">
                {[3, 4, 4.5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(filters.minRating === rating ? null : rating)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      filters.minRating === rating
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {rating}★
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full px-3 py-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          Drag activities to days →
        </p>
      </div>

      {/* Compact Activity List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <svg
              className="w-8 h-8 mx-auto mb-2 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-sm">No activities found</p>
            {filters.searchQuery && (
              <p className="mt-1 text-xs text-gray-400">
                Try different keywords
              </p>
            )}
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <CompactActivityCard
              key={activity.id}
              place={activity}
              isInItinerary={activitiesInItinerary.has(activity.id)}
            />
          ))
        )}
      </div>

      {/* Compact Footer */}
      <div className="flex-shrink-0 mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          {filteredActivities.length} of {activities.length}
        </p>
      </div>
    </div>
  );
}
