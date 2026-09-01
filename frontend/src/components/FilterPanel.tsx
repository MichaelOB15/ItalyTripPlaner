import { useMemo, useCallback } from 'react';
import { useFilter } from '../contexts/FilterContext';
import { Place, PlaceType } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface FilterPanelProps {
  /**
   * Array of all places for extracting unique filter options
   */
  places: Place[];

  /**
   * Optional additional CSS classes for the container
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * FilterPanel Component
 * 
 * A comprehensive filter panel with multi-select filters for cities, types, 
 * tags, and price ranges. Displays selected filters as removable chips and
 * provides a "Clear All Filters" button.
 * 
 * Features:
 * - City multi-select with checkboxes
 * - Type multi-select with checkboxes
 * - Tag multi-select with chips
 * - Price range multi-select with checkboxes
 * - Display selected filters as removable chips
 * - "Clear All Filters" button
 * - Integrates with FilterContext for state management
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * 
 * Requirements Coverage:
 * - 3.2: Provides filter controls for city, type, price range, and tags
 * - 3.3: Applies filters when user makes selections
 * 
 * @example
 * ```tsx
 * function PlaceExplorer() {
 *   const { state } = useDataset();
 *   
 *   return (
 *     <div>
 *       <FilterPanel places={state.places} />
 *       <PlaceList places={filteredPlaces} />
 *     </div>
 *   );
 * }
 * ```
 */
export function FilterPanel({
  places,
  className = '',
}: FilterPanelProps): JSX.Element {
  const {
    filters,
    setCityFilter,
    setTypeFilter,
    setTagFilter,
    setPriceFilter,
    setBookingRequired,
    setMinRating,
    clearFilters,
  } = useFilter();

  // ==========================================================================
  // Extract unique filter options from places
  // ==========================================================================

  const filterOptions = useMemo(() => {
    const cities = new Set<string>();
    const types = new Set<PlaceType>();
    const tags = new Set<string>();
    const priceRanges = new Set<string>();

    places.forEach((place) => {
      cities.add(place.city);
      types.add(place.type);
      place.tags?.forEach((tag) => tags.add(tag));
      if (place.price_range) {
        priceRanges.add(place.price_range);
      }
    });

    return {
      cities: Array.from(cities).sort(),
      types: Array.from(types).sort(),
      tags: Array.from(tags).sort(),
      priceRanges: Array.from(priceRanges).sort((a, b) => a.length - b.length), // Sort by price level
    };
  }, [places]);

  // ==========================================================================
  // Handler functions - memoized with useCallback to prevent unnecessary re-renders
  // ==========================================================================

  const handleCityToggle = useCallback((city: string) => {
    setCityFilter(filters.cities.includes(city)
      ? filters.cities.filter((c) => c !== city)
      : [...filters.cities, city]);
  }, [filters.cities, setCityFilter]);

  const handleTypeToggle = useCallback((type: PlaceType) => {
    setTypeFilter(filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type]);
  }, [filters.types, setTypeFilter]);

  const handleTagToggle = useCallback((tag: string) => {
    setTagFilter(filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag]);
  }, [filters.tags, setTagFilter]);

  const handlePriceToggle = useCallback((priceRange: string) => {
    setPriceFilter(filters.priceRanges.includes(priceRange)
      ? filters.priceRanges.filter((p) => p !== priceRange)
      : [...filters.priceRanges, priceRange]);
  }, [filters.priceRanges, setPriceFilter]);

  const handleRemoveCity = useCallback((city: string) => {
    setCityFilter(filters.cities.filter((c) => c !== city));
  }, [filters.cities, setCityFilter]);

  const handleRemoveType = useCallback((type: PlaceType) => {
    setTypeFilter(filters.types.filter((t) => t !== type));
  }, [filters.types, setTypeFilter]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTagFilter(filters.tags.filter((t) => t !== tag));
  }, [filters.tags, setTagFilter]);

  const handleRemovePrice = useCallback((priceRange: string) => {
    setPriceFilter(filters.priceRanges.filter((p) => p !== priceRange));
  }, [filters.priceRanges, setPriceFilter]);

  // ==========================================================================
  // Check if any filters are active
  // ==========================================================================

  const hasActiveFilters =
    filters.cities.length > 0 ||
    filters.types.length > 0 ||
    filters.tags.length > 0 ||
    filters.priceRanges.length > 0 ||
    filters.bookingRequired !== null ||
    filters.minRating !== null;

  // ==========================================================================
  // Render helpers
  // ==========================================================================

  const renderCheckboxGroup = (
    title: string,
    options: readonly string[],
    selectedOptions: readonly string[],
    onToggle: (option: string) => void,
    ariaLabel: string
  ) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div
        role="group"
        aria-label={ariaLabel}
        className="space-y-2 max-h-48 overflow-y-auto"
      >
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedOptions.includes(option)}
              onChange={() => onToggle(option)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label={`Filter by ${option}`}
            />
            <span className="text-sm text-gray-700">{formatLabel(option)}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const formatLabel = (value: string): string => {
    // Convert snake_case and kebab-case to Title Case
    return value
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderChip = (
    label: string,
    onRemove: () => void,
    colorClass: string = 'bg-blue-100 text-blue-800'
  ) => (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${colorClass}`}
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
      >
        <svg
          className="w-3.5 h-3.5"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1"
            aria-label="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Selected Filters Chips */}
      {hasActiveFilters && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Active Filters
          </h3>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Active filters">
            {filters.cities.map((city) => (
              <div key={city} role="listitem">
                {renderChip(city, () => handleRemoveCity(city), 'bg-purple-100 text-purple-800')}
              </div>
            ))}
            {filters.types.map((type) => (
              <div key={type} role="listitem">
                {renderChip(formatLabel(type), () => handleRemoveType(type), 'bg-green-100 text-green-800')}
              </div>
            ))}
            {filters.tags.map((tag) => (
              <div key={tag} role="listitem">
                {renderChip(tag, () => handleRemoveTag(tag), 'bg-yellow-100 text-yellow-800')}
              </div>
            ))}
            {filters.priceRanges.map((priceRange) => (
              <div key={priceRange} role="listitem">
                {renderChip(priceRange, () => handleRemovePrice(priceRange), 'bg-pink-100 text-pink-800')}
              </div>
            ))}
            {filters.bookingRequired !== null && (
              <div role="listitem">
                {renderChip(
                  filters.bookingRequired ? 'Booking Required' : 'No Booking Required',
                  () => setBookingRequired(null),
                  'bg-orange-100 text-orange-800'
                )}
              </div>
            )}
            {filters.minRating !== null && (
              <div role="listitem">
                {renderChip(
                  `${filters.minRating}+ Stars`,
                  () => setMinRating(null),
                  'bg-yellow-100 text-yellow-800'
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="space-y-6">
        {/* City Filter */}
        {filterOptions.cities.length > 0 &&
          renderCheckboxGroup(
            'City',
            filterOptions.cities,
            filters.cities,
            handleCityToggle,
            'Filter by city'
          )}

        {/* Type Filter */}
        {filterOptions.types.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Type</h3>
            <div
              role="group"
              aria-label="Filter by place type"
              className="space-y-2 max-h-48 overflow-y-auto"
            >
              {filterOptions.types.map((type) => (
                <label
                  key={type}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    aria-label={`Filter by ${type}`}
                  />
                  <span className="text-sm text-gray-700">{formatLabel(type)}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Price Range Filter */}
        {filterOptions.priceRanges.length > 0 &&
          renderCheckboxGroup(
            'Price Range',
            filterOptions.priceRanges,
            filters.priceRanges,
            handlePriceToggle,
            'Filter by price range'
          )}

        {/* Booking Required Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Booking Required</h3>
          <div role="group" aria-label="Filter by booking requirement" className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="radio"
                name="booking-filter"
                checked={filters.bookingRequired === null}
                onChange={() => setBookingRequired(null)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Show all places"
              />
              <span className="text-sm text-gray-700">All</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="radio"
                name="booking-filter"
                checked={filters.bookingRequired === true}
                onChange={() => setBookingRequired(true)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Show only places requiring booking"
              />
              <span className="text-sm text-gray-700">Booking Required</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="radio"
                name="booking-filter"
                checked={filters.bookingRequired === false}
                onChange={() => setBookingRequired(false)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Show only places not requiring booking"
              />
              <span className="text-sm text-gray-700">No Booking Required</span>
            </label>
          </div>
        </div>

        {/* Minimum Rating Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Minimum Rating</h3>
          <div role="group" aria-label="Filter by minimum star rating" className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
              <input
                type="radio"
                name="rating-filter"
                checked={filters.minRating === null}
                onChange={() => setMinRating(null)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Show all ratings"
              />
              <span className="text-sm text-gray-700">All Ratings</span>
            </label>
            {[4, 3, 2, 1].map((rating) => (
              <label key={rating} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors">
                <input
                  type="radio"
                  name="rating-filter"
                  checked={filters.minRating === rating}
                  onChange={() => setMinRating(rating)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  aria-label={`Show places with ${rating}+ stars`}
                />
                <span className="text-sm text-gray-700 flex items-center">
                  {rating}+ <span className="text-yellow-500 ml-1">★</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Tag Filter (as chips/badges) */}
        {filterOptions.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Tags</h3>
            <div
              role="group"
              aria-label="Filter by tags"
              className="flex flex-wrap gap-2 max-h-64 overflow-y-auto"
            >
              {filterOptions.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  aria-pressed={filters.tags.includes(tag)}
                  aria-label={`Toggle ${tag} tag filter`}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    filters.tags.includes(tag)
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!hasActiveFilters && (
        <p className="mt-4 text-sm text-gray-500 text-center py-2">
          No filters applied. Select options above to filter places.
        </p>
      )}
    </div>
  );
}
