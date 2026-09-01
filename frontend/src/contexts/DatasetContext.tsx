import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Place, GetPlacesQuery, FilterState } from '../types';
import { apiClient } from '../services/api';

// ============================================================================
// Types
// ============================================================================

/**
 * State shape for the Dataset context.
 * Manages place data, filtering, loading states, and data source tracking.
 */
export interface DatasetState {
  /** All places in the current dataset */
  places: Place[];
  /** Places after applying filters and search */
  filteredPlaces: Place[];
  /** Current dataset source: 'default' (file_italy.json) or 'custom' (user upload) */
  source: 'default' | 'custom';
  /** Whether data is currently being loaded */
  isLoading: boolean;
  /** Error message if loading/validation failed */
  error: string | null;
  /** Active filter criteria */
  filters: FilterState;
  /** Current search query string */
  searchQuery: string;
}

/**
 * Actions for modifying dataset state.
 * Uses discriminated union for type-safe reducer dispatch.
 */
export type DatasetAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PLACES'; payload: Place[] }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SOURCE'; payload: 'default' | 'custom' }
  | { type: 'SET_FILTERS'; payload: Partial<FilterState> }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_FILTERED_PLACES'; payload: Place[] }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'RESET_DATASET' }
  | { type: 'SWITCH_DATASET'; payload: { source: 'default' | 'custom'; places: Place[] } }
  | { type: 'LOAD_CUSTOM_DATASET'; payload: Place[] };

/**
 * Context value interface exposing dataset state and operations.
 * 
 * **Validates Requirements:**
 * - 16.1-16.8: Custom dataset loading and switching
 * - 11.1-11.5: Search functionality
 * - 2.1-2.7: Data API filtering
 * - 1.6: Dataset storage and access
 */
export interface DatasetContextValue {
  /** Current dataset state */
  state: DatasetState;
  /** Load places from API with optional filters */
  loadPlaces: (filters?: GetPlacesQuery) => Promise<void>;
  /** Update active filter criteria (merges with existing filters) */
  setFilters: (filters: Partial<FilterState>) => void;
  /** Update search query string */
  setSearchQuery: (query: string) => void;
  /** Reset all filters and search to initial state */
  clearFilters: () => void;
  /** Reset dataset to initial state (clears cache) */
  resetDataset: () => void;
  /** Switch to default dataset (file_italy.json) */
  switchToDefault: () => Promise<void>;
  /** Switch to previously loaded custom dataset */
  switchToCustom: () => void;
  /** Load and activate a custom dataset from user upload */
  loadCustomDataset: (places: Place[]) => void;
  /** Check if a custom dataset has been previously loaded */
  hasCustomDataset: () => boolean;
}

// ============================================================================
// Initial State
// ============================================================================

const initialFilters: FilterState = {
  cities: [],
  types: [],
  tags: [],
  priceRanges: [],
  searchQuery: '',
  hasCoordinates: undefined,
};

const initialState: DatasetState = {
  places: [],
  filteredPlaces: [],
  source: 'default',
  isLoading: false,
  error: null,
  filters: initialFilters,
  searchQuery: '',
};

// ============================================================================
// Reducer
// ============================================================================

/**
 * Reducer function for dataset state management.
 * Handles all dataset operations including loading, filtering, and source switching.
 * 
 * @param state - Current dataset state
 * @param action - Action to apply
 * @returns New dataset state after applying action
 */
function datasetReducer(state: DatasetState, action: DatasetAction): DatasetState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_PLACES':
      return {
        ...state,
        places: action.payload,
        filteredPlaces: action.payload,
        isLoading: false,
        error: null,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'SET_SOURCE':
      return { ...state, source: action.payload };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };

    case 'SET_FILTERED_PLACES':
      return { ...state, filteredPlaces: action.payload };

    case 'CLEAR_FILTERS':
      return {
        ...state,
        filters: initialFilters,
        searchQuery: '',
        filteredPlaces: state.places,
      };

    case 'RESET_DATASET':
      return initialState;

    case 'SWITCH_DATASET':
      return {
        ...state,
        source: action.payload.source,
        places: action.payload.places,
        filteredPlaces: action.payload.places,
        isLoading: false,
        error: null,
      };

    case 'LOAD_CUSTOM_DATASET':
      return {
        ...state,
        places: action.payload,
        filteredPlaces: action.payload,
        source: 'custom',
        isLoading: false,
        error: null,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Props for DatasetProvider component.
 */
export interface DatasetProviderProps {
  children: ReactNode;
}

/**
 * Dataset context provider component.
 * Manages place data loading, caching, filtering, and custom dataset uploads.
 * 
 * Features:
 * - Automatic caching of default dataset (1 hour TTL)
 * - Client-side filtering and search
 * - Custom dataset persistence in localStorage
 * - Active dataset restoration on mount
 * 
 * **Validates Requirements:**
 * - 1.1-1.7: Dataset parsing and validation
 * - 16.1-16.8: Custom dataset loading
 * - 2.1-2.7: Data API endpoints
 * - 11.1-11.5: Search functionality
 * 
 * @param props - Component props
 */
export function DatasetProvider({ children }: DatasetProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(datasetReducer, initialState);

  // Cache keys for localStorage
  const CACHE_KEY = 'italy-trip-planner:dataset-cache';
  const CACHE_TIMESTAMP_KEY = 'italy-trip-planner:dataset-cache-timestamp';
  const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
  const CUSTOM_DATASET_KEY = 'italy-trip-planner:custom-dataset';
  const ACTIVE_DATASET_KEY = 'italy-trip-planner:active-dataset';

  /**
   * Load places from cache if available and not expired.
   * Cache duration is 1 hour to balance freshness with performance.
   * 
   * @returns Cached places array if valid cache exists, null otherwise
   */
  const loadFromCache = useCallback((): Place[] | null => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (!cachedData || !cachedTimestamp) {
        return null;
      }

      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();

      // Check if cache is expired
      if (now - timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        return null;
      }

      const places = JSON.parse(cachedData) as Place[];
      return places;
    } catch (error) {
      console.error('[DatasetContext] Error loading from cache:', error);
      return null;
    }
  }, [CACHE_KEY, CACHE_TIMESTAMP_KEY, CACHE_DURATION]);

  /**
   * Save places to browser localStorage cache with timestamp.
   * Enables faster loading on subsequent visits without API calls.
   * 
   * @param places - Array of places to cache
   */
  const saveToCache = useCallback(
    (places: Place[]) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(places));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (error) {
        console.error('[DatasetContext] Error saving to cache:', error);
      }
    },
    [CACHE_KEY, CACHE_TIMESTAMP_KEY]
  );

  /**
   * Load places from API with optional filters.
   * Attempts to use cache first if no filters are specified.
   * Updates cache after successful API load of full dataset.
   * 
   * **Validates Requirement 2.1-2.5:** Data API endpoint filtering
   * 
   * @param filters - Optional query parameters for filtering places
   */
  const loadPlaces = useCallback(
    async (filters?: GetPlacesQuery) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      try {
        // Try to load from cache first if no filters
        if (!filters) {
          const cachedPlaces = loadFromCache();
          if (cachedPlaces) {
            dispatch({ type: 'SET_PLACES', payload: cachedPlaces });
            return;
          }
        }

        // Load from API
        const places = await apiClient.getPlaces(filters);
        dispatch({ type: 'SET_PLACES', payload: places });

        // Cache only if no filters (full dataset)
        if (!filters) {
          saveToCache(places);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load places';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    },
    [loadFromCache, saveToCache]
  );

  /**
   * Apply client-side filters and search to the places array.
   * Filters are applied with AND logic (all criteria must match).
   * Search uses case-insensitive substring matching on name and description.
   * 
   * **Validates Requirement 11.2-11.4:** Search filtering and case-insensitive matching
   */
  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...state.places];

    // Apply filters
    const { cities, types, tags, priceRanges, hasCoordinates } = state.filters;

    if (cities.length > 0) {
      filtered = filtered.filter((place) => cities.includes(place.city));
    }

    if (types.length > 0) {
      filtered = filtered.filter((place) => types.includes(place.type));
    }

    if (tags.length > 0) {
      filtered = filtered.filter((place) =>
        place.tags?.some((tag) => tags.includes(tag))
      );
    }

    if (priceRanges.length > 0) {
      filtered = filtered.filter((place) =>
        place.price_range ? priceRanges.includes(place.price_range) : false
      );
    }

    if (hasCoordinates !== undefined) {
      filtered = filtered.filter((place) =>
        hasCoordinates
          ? place.latitude !== null && place.longitude !== null
          : true
      );
    }

    // Apply search query
    if (state.searchQuery.trim() !== '') {
      const query = state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((place) => {
        const nameMatch = place.name.toLowerCase().includes(query);
        const descriptionMatch = place.description
          ?.toLowerCase()
          .includes(query);
        return nameMatch || descriptionMatch;
      });
    }

    dispatch({ type: 'SET_FILTERED_PLACES', payload: filtered });
  }, [state.places, state.filters, state.searchQuery]);

  /**
   * Update filter criteria (partial update, merges with existing filters).
   * Triggers automatic refiltering of places via useEffect.
   * 
   * @param filters - Partial filter state to merge with current filters
   */
  const setFilters = useCallback((filters: Partial<FilterState>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  /**
   * Update search query string.
   * Triggers automatic refiltering of places via useEffect.
   * 
   * **Validates Requirement 11.4:** Updates search results as user types
   * 
   * @param query - New search query string
   */
  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  /**
   * Clear all filters and search query, showing full dataset.
   * 
   * **Validates Requirement 11.6:** Allows users to clear search and return to unfiltered results
   */
  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
  }, []);

  /**
   * Reset dataset to initial state and clear localStorage cache.
   * Used when switching datasets or troubleshooting loading issues.
   */
  const resetDataset = useCallback(() => {
    dispatch({ type: 'RESET_DATASET' });
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }, [CACHE_KEY, CACHE_TIMESTAMP_KEY]);

  /**
   * Switch to default dataset (file_italy.json).
   * Attempts to load from cache first, falls back to API if needed.
   * Persists dataset selection in localStorage for restoration on next visit.
   * 
   * **Validates Requirement 16.5:** Allows users to switch back to default dataset
   */
  const switchToDefault = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Try to load from cache first
      const cachedPlaces = loadFromCache();
      if (cachedPlaces) {
        dispatch({
          type: 'SWITCH_DATASET',
          payload: { source: 'default', places: cachedPlaces },
        });
      } else {
        // Load from API
        const places = await apiClient.getPlaces();
        dispatch({
          type: 'SWITCH_DATASET',
          payload: { source: 'default', places },
        });
        saveToCache(places);
      }
      // Persist active dataset selection
      localStorage.setItem(ACTIVE_DATASET_KEY, 'default');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load default dataset';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [loadFromCache, saveToCache, ACTIVE_DATASET_KEY]);

  /**
   * Switch to previously loaded custom dataset.
   * Loads dataset from localStorage. Shows error if no custom dataset exists.
   * 
   * **Validates Requirement 16.4:** Uses Custom_Dataset for all operations after successful load
   */
  const switchToCustom = useCallback(() => {
    try {
      const customDatasetStr = localStorage.getItem(CUSTOM_DATASET_KEY);
      if (!customDatasetStr) {
        dispatch({
          type: 'SET_ERROR',
          payload: 'No custom dataset found. Please upload a dataset first.',
        });
        return;
      }

      const customPlaces = JSON.parse(customDatasetStr) as Place[];
      dispatch({
        type: 'SWITCH_DATASET',
        payload: { source: 'custom', places: customPlaces },
      });
      // Persist active dataset selection
      localStorage.setItem(ACTIVE_DATASET_KEY, 'custom');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to load custom dataset from storage';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [CUSTOM_DATASET_KEY, ACTIVE_DATASET_KEY]);

  /**
   * Load custom dataset from uploaded places array.
   * Saves to localStorage and activates immediately.
   * 
   * **Validates Requirement 16.4:** When Custom_Dataset is successfully loaded,
   * uses it for all itinerary operations instead of default dataset
   * 
   * @param places - Array of validated places from custom dataset
   */
  const loadCustomDataset = useCallback(
    (places: Place[]) => {
      try {
        // Save custom dataset to localStorage
        localStorage.setItem(CUSTOM_DATASET_KEY, JSON.stringify(places));
        // Load the custom dataset
        dispatch({ type: 'LOAD_CUSTOM_DATASET', payload: places });
        // Persist active dataset selection
        localStorage.setItem(ACTIVE_DATASET_KEY, 'custom');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load custom dataset';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    },
    [CUSTOM_DATASET_KEY, ACTIVE_DATASET_KEY]
  );

  /**
   * Check if a custom dataset has been previously loaded and saved to localStorage.
   * Used to determine if "Switch to Custom" option should be available.
   * 
   * @returns true if custom dataset exists in localStorage, false otherwise
   */
  const hasCustomDataset = useCallback((): boolean => {
    return localStorage.getItem(CUSTOM_DATASET_KEY) !== null;
  }, [CUSTOM_DATASET_KEY]);

  // Apply filters whenever filters or search query changes
  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  // Load places on mount and restore active dataset
  useEffect(() => {
    const activeDataset = localStorage.getItem(ACTIVE_DATASET_KEY);
    
    if (activeDataset === 'custom') {
      // Try to restore custom dataset
      const customDatasetStr = localStorage.getItem(CUSTOM_DATASET_KEY);
      if (customDatasetStr) {
        try {
          const customPlaces = JSON.parse(customDatasetStr) as Place[];
          dispatch({ type: 'LOAD_CUSTOM_DATASET', payload: customPlaces });
        } catch (error) {
          console.error('[DatasetContext] Error restoring custom dataset:', error);
          // Fallback to default
          loadPlaces();
        }
      } else {
        // No custom dataset found, load default
        loadPlaces();
      }
    } else {
      // Load default dataset
      loadPlaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue: DatasetContextValue = {
    state,
    loadPlaces,
    setFilters,
    setSearchQuery,
    clearFilters,
    resetDataset,
    switchToDefault,
    switchToCustom,
    loadCustomDataset,
    hasCustomDataset,
  };

  return (
    <DatasetContext.Provider value={contextValue}>
      {children}
    </DatasetContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook to access the Dataset context
 * @throws Error if used outside of DatasetProvider
 */
export function useDataset(): DatasetContextValue {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
}
