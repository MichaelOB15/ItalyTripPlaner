import React, { useRef, useCallback } from 'react';
import { useFilter } from '../contexts/FilterContext';
import { Place } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SearchBarProps {
  /**
   * Array of filtered places for result count display
   */
  filteredPlaces: Place[];
  
  /**
   * Optional additional CSS classes for the container
   */
  className?: string;
  
  /**
   * Optional placeholder text for the search input
   * @default 'Search places by name or description...'
   */
  placeholder?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SearchBar Component
 * 
 * A search input component with debounced text input (300ms), clear button,
 * and result count display. Integrates with FilterContext for state management.
 * 
 * Features:
 * - Debounced search input (handled by FilterContext)
 * - Clear button with focus restoration
 * - Real-time result count display
 * - Full accessibility support (ARIA labels, screen reader support)
 * - Case-insensitive search on name and description fields
 * 
 * Requirements Coverage:
 * - 11.1: Provides a search input field
 * - 11.2: Filters by matching text against name and description (via FilterContext)
 * - 11.3: Case-insensitive matching (via FilterContext)
 * - 11.4: Updates results as user types (debounced)
 * - 11.5: Allows users to clear search
 * - 13.3: Debounces search input (300ms)
 * 
 * @example
 * ```tsx
 * function PlaceExplorer() {
 *   const { applyFilters } = useFilter();
 *   const { state } = useDataset();
 *   const filteredPlaces = applyFilters(state.places);
 *   
 *   return <SearchBar filteredPlaces={filteredPlaces} />;
 * }
 * ```
 */
export function SearchBar({
  filteredPlaces,
  className = '',
  placeholder = 'Search places by name or description...',
}: SearchBarProps): JSX.Element {
  const { filters, setSearchQuery, debouncedSearchQuery } = useFilter();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle input change - updates the search query in FilterContext
   * FilterContext automatically handles the 300ms debounce
   */
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, [setSearchQuery]);

  /**
   * Handle clear button click - resets search query and focuses input
   */
  const handleClear = useCallback(() => {
    setSearchQuery('');
    inputRef.current?.focus();
  }, [setSearchQuery]);

  /**
   * Determine if we're in "searching" state (user typed but debounce not complete)
   */
  const isSearching = filters.searchQuery !== debouncedSearchQuery;

  /**
   * Generate result count text
   */
  const getResultCountText = (): string => {
    if (isSearching) {
      return 'Searching...';
    }
    
    if (debouncedSearchQuery.trim() === '') {
      return '';
    }
    
    const count = filteredPlaces.length;
    if (count === 0) {
      return 'No places found';
    } else if (count === 1) {
      return '1 place found';
    } else {
      return `${count} places found`;
    }
  };

  const resultCountText = getResultCountText();
  const showClearButton = filters.searchQuery.trim() !== '';

  return (
    <div className={`w-full ${className}`}>
      {/* Search Input Container */}
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <svg
            className="w-5 h-5 text-gray-400"
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Search Input */}
        <input
          ref={inputRef}
          type="text"
          value={filters.searchQuery}
          onChange={handleSearchChange}
          placeholder={placeholder}
          aria-label="Search places"
          aria-describedby="search-result-count"
          className="w-full pl-10 pr-10 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />

        {/* Clear Button */}
        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
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
        )}
      </div>

      {/* Result Count */}
      {resultCountText && (
        <div
          id="search-result-count"
          role="status"
          aria-live="polite"
          className="mt-2 text-sm text-gray-600"
        >
          {resultCountText}
        </div>
      )}
    </div>
  );
}
