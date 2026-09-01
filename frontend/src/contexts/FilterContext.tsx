import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { FilterState, PlaceType, Place } from '../types';

// ============================================================================
// Types
// ============================================================================

export type FilterAction =
  | { type: 'SET_CITY_FILTER'; payload: string[] }
  | { type: 'SET_TYPE_FILTER'; payload: PlaceType[] }
  | { type: 'SET_TAG_FILTER'; payload: string[] }
  | { type: 'SET_PRICE_FILTER'; payload: string[] }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_HAS_COORDINATES'; payload: boolean | undefined }
  | { type: 'SET_BOOKING_REQUIRED'; payload: boolean | null }
  | { type: 'SET_MIN_RATING'; payload: number | null }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_ALL_FILTERS'; payload: FilterState };

export interface FilterContextValue {
  filters: FilterState;
  setCityFilter: (cities: string[]) => void;
  setTypeFilter: (types: PlaceType[]) => void;
  setTagFilter: (tags: string[]) => void;
  setPriceFilter: (priceRanges: string[]) => void;
  setSearchQuery: (query: string) => void;
  setHasCoordinates: (hasCoordinates: boolean | undefined) => void;
  setBookingRequired: (bookingRequired: boolean | null) => void;
  setMinRating: (minRating: number | null) => void;
  clearFilters: () => void;
  setAllFilters: (filters: FilterState) => void;
  debouncedSearchQuery: string;
  applyFilters: (places: Place[]) => Place[];
}

// ============================================================================
// Initial State
// ============================================================================

const initialFilterState: FilterState = {
  cities: [],
  types: [],
  tags: [],
  priceRanges: [],
  searchQuery: '',
  hasCoordinates: undefined,
  bookingRequired: null,
  minRating: null,
};

// ============================================================================
// Reducer
// ============================================================================

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_CITY_FILTER':
      return { ...state, cities: action.payload };

    case 'SET_TYPE_FILTER':
      return { ...state, types: action.payload };

    case 'SET_TAG_FILTER':
      return { ...state, tags: action.payload };

    case 'SET_PRICE_FILTER':
      return { ...state, priceRanges: action.payload };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SET_HAS_COORDINATES':
      return { ...state, hasCoordinates: action.payload };

    case 'SET_BOOKING_REQUIRED':
      return { ...state, bookingRequired: action.payload };

    case 'SET_MIN_RATING':
      return { ...state, minRating: action.payload };

    case 'CLEAR_FILTERS':
      return initialFilterState;

    case 'SET_ALL_FILTERS':
      return action.payload;

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export interface FilterProviderProps {
  children: ReactNode;
  /**
   * Optional initial filter state
   */
  initialFilters?: Partial<FilterState>;
  /**
   * Optional debounce delay for search query in milliseconds
   * @default 300
   */
  debounceDelay?: number;
}

export function FilterProvider({
  children,
  initialFilters,
  debounceDelay = 300,
}: FilterProviderProps): JSX.Element {
  const [filters, dispatch] = useReducer(filterReducer, {
    ...initialFilterState,
    ...initialFilters,
  });

  // Debounced search query state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = React.useState(
    filters.searchQuery
  );
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Debounce the search query updates
   * This prevents excessive filtering operations while user is typing
   */
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(filters.searchQuery);
    }, debounceDelay);

    // Cleanup on unmount or when searchQuery changes
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters.searchQuery, debounceDelay]);

  /**
   * Update city filter
   */
  const setCityFilter = useCallback((cities: string[]) => {
    dispatch({ type: 'SET_CITY_FILTER', payload: cities });
  }, []);

  /**
   * Update type filter
   */
  const setTypeFilter = useCallback((types: PlaceType[]) => {
    dispatch({ type: 'SET_TYPE_FILTER', payload: types });
  }, []);

  /**
   * Update tag filter
   */
  const setTagFilter = useCallback((tags: string[]) => {
    dispatch({ type: 'SET_TAG_FILTER', payload: tags });
  }, []);

  /**
   * Update price range filter
   */
  const setPriceFilter = useCallback((priceRanges: string[]) => {
    dispatch({ type: 'SET_PRICE_FILTER', payload: priceRanges });
  }, []);

  /**
   * Update search query
   * This will trigger the debounce mechanism
   */
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  /**
   * Update hasCoordinates filter
   */
  const setHasCoordinates = useCallback((hasCoordinates: boolean | undefined) => {
    dispatch({ type: 'SET_HAS_COORDINATES', payload: hasCoordinates });
  }, []);

  /**
   * Update bookingRequired filter
   */
  const setBookingRequired = useCallback((bookingRequired: boolean | null) => {
    dispatch({ type: 'SET_BOOKING_REQUIRED', payload: bookingRequired });
  }, []);

  /**
   * Update minRating filter
   */
  const setMinRating = useCallback((minRating: number | null) => {
    dispatch({ type: 'SET_MIN_RATING', payload: minRating });
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
    setDebouncedSearchQuery('');
  }, []);

  /**
   * Set all filters at once
   * Useful for bulk updates or restoring saved filter state
   */
  const setAllFilters = useCallback((newFilters: FilterState) => {
    dispatch({ type: 'SET_ALL_FILTERS', payload: newFilters });
  }, []);

  /**
   * Apply the current filters to an array of places
   * This function filters places based on cities, types, tags, price ranges,
   * coordinates availability, booking requirements, minimum rating, and search query (uses debounced value)
   * 
   * @param places - Array of places to filter
   * @returns Filtered array of places
   */
  const applyFilters = useCallback((places: Place[]): Place[] => {
    let filtered = [...places];

    // Apply city filter
    if (filters.cities.length > 0) {
      filtered = filtered.filter((place) => filters.cities.includes(place.city));
    }

    // Apply type filter
    if (filters.types.length > 0) {
      filtered = filtered.filter((place) => filters.types.includes(place.type));
    }

    // Apply tag filter (place must have at least one matching tag)
    if (filters.tags.length > 0) {
      filtered = filtered.filter((place) =>
        place.tags?.some((tag) => filters.tags.includes(tag))
      );
    }

    // Apply price range filter
    if (filters.priceRanges.length > 0) {
      filtered = filtered.filter((place) =>
        place.price_range ? filters.priceRanges.includes(place.price_range) : false
      );
    }

    // Apply coordinates filter
    if (filters.hasCoordinates !== undefined) {
      filtered = filtered.filter((place) =>
        filters.hasCoordinates
          ? place.latitude !== null && place.longitude !== null
          : true
      );
    }

    // Apply booking required filter
    if (filters.bookingRequired !== null) {
      filtered = filtered.filter((place) => 
        filters.bookingRequired === true 
          ? place.booking_required === true
          : place.booking_required !== true
      );
    }

    // Apply minimum rating filter
    if (filters.minRating !== null) {
      filtered = filtered.filter((place) =>
        place.rating !== null && place.rating !== undefined && place.rating >= filters.minRating!
      );
    }

    // Apply search query (uses debounced value for better performance)
    if (debouncedSearchQuery.trim() !== '') {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((place) => {
        const nameMatch = place.name.toLowerCase().includes(query);
        const descriptionMatch = place.description
          ?.toLowerCase()
          .includes(query);
        return nameMatch || descriptionMatch;
      });
    }

    return filtered;
  }, [filters, debouncedSearchQuery]);

  const contextValue: FilterContextValue = {
    filters,
    setCityFilter,
    setTypeFilter,
    setTagFilter,
    setPriceFilter,
    setSearchQuery,
    setHasCoordinates,
    setBookingRequired,
    setMinRating,
    clearFilters,
    setAllFilters,
    debouncedSearchQuery,
    applyFilters,
  };

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook to access the Filter context
 * 
 * @example
 * ```tsx
 * function FilterPanel() {
 *   const { filters, setCityFilter, setSearchQuery } = useFilter();
 *   
 *   return (
 *     <div>
 *       <input
 *         value={filters.searchQuery}
 *         onChange={(e) => setSearchQuery(e.target.value)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 * 
 * @throws Error if used outside of FilterProvider
 */
export function useFilter(): FilterContextValue {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}
