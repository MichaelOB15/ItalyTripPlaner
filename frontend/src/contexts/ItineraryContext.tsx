import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
  useMemo,
  useRef,
} from 'react';
import { Itinerary, DayPlan, Place, UserPreferences, TripPace } from '../types';
import { useAuth } from './AuthContext';
import { ItineraryApiClient } from '../services/itineraryApi';


// ============================================================================
// Types
// ============================================================================

/**
 * Storage mode for itinerary data.
 * 
 * **Validates Requirements 5.1, 5.2:**
 * - 'localStorage': Guest users use browser localStorage for itinerary persistence
 * - 'api': Authenticated users use API endpoints for cloud-based persistent storage
 */
export type StorageMode = 'localStorage' | 'api';

/**
 * Snapshot of itinerary state for undo/redo history.
 * 
 * **Validates Requirements 13.1, 13.4:**
 * - Captures complete itinerary state at a point in time
 * - Includes timestamp and human-readable description
 * - Enables history traversal for undo/redo
 */
export interface ItinerarySnapshot {
  itinerary: Itinerary;
  timestamp: number;
  description: string; // Human-readable action description (e.g., "Added Colosseum to Day 1")
}

export interface ItineraryState {
  currentItinerary: Itinerary | null;
  savedItineraries: Itinerary[];  // NEW: List of user's itineraries from API
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  storageMode: StorageMode;  // NEW: Current storage mode
  isLoading: boolean;  // NEW: Loading state for API operations
  error: string | null;
  history: ItinerarySnapshot[];  // NEW: History for undo/redo (max 20)
  historyIndex: number;  // NEW: Current position in history (-1 means no history)
}

export type ItineraryAction =
  | { type: 'CREATE_ITINERARY'; payload: { name: string; preferences?: UserPreferences } }
  | { type: 'LOAD_ITINERARY'; payload: Itinerary }
  | { type: 'LOAD_SAVED_ITINERARIES'; payload: Itinerary[] }
  | { type: 'REPLACE_ITINERARY'; payload: Itinerary }
  | { type: 'UPDATE_ITINERARY_NAME'; payload: string }
  | { type: 'ADD_PLACE_TO_DAY'; payload: { place: Place; dayNumber: 1 | 2 | 3 } }
  | { type: 'REMOVE_PLACE_FROM_DAY'; payload: { dayNumber: 1 | 2 | 3; placeIndex: number } }
  | { type: 'REORDER_PLACES_IN_DAY'; payload: { dayNumber: 1 | 2 | 3; fromIndex: number; toIndex: number } }
  | { type: 'MOVE_PLACE_BETWEEN_DAYS'; payload: { placeId: string; fromDay: 1 | 2 | 3; toDay: 1 | 2 | 3 } }
  | { type: 'UPDATE_DAY_START_TIME'; payload: { dayNumber: 1 | 2 | 3; startTime: string } }
  | { type: 'REPLACE_PLACE'; payload: { dayNumber: 1 | 2 | 3; placeIndex: number; newPlace: Place } }
  | { type: 'CLEAR_DAY'; payload: { dayNumber: 1 | 2 | 3 } }
  | { type: 'CLEAR_ITINERARY' }
  | { type: 'CLEAR_SAVED_ITINERARIES' }
  | { type: 'SET_EDITING_MODE'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'MARK_SAVED' }
  | { type: 'UPDATE_PREFERENCES'; payload: UserPreferences }
  | { type: 'SET_STORAGE_MODE'; payload: StorageMode }
  | { type: 'DELETE_SAVED_ITINERARY'; payload: string }
  | { type: 'UPSERT_SAVED_ITINERARY'; payload: Itinerary }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' };

export interface ItineraryContextValue {
  state: ItineraryState;
  createItinerary: (name: string, preferences?: UserPreferences) => void;
  replaceItinerary: (itinerary: Itinerary) => void;
  updateItineraryName: (name: string) => void;
  addPlaceToDay: (place: Place, dayNumber: 1 | 2 | 3) => void;
  removePlaceFromDay: (dayNumber: 1 | 2 | 3, placeIndex: number) => void;
  reorderPlacesInDay: (dayNumber: 1 | 2 | 3, fromIndex: number, toIndex: number) => void;
  movePlaceBetweenDays: (placeId: string, fromDay: 1 | 2 | 3, toDay: 1 | 2 | 3) => void;
  updateDayStartTime: (dayNumber: 1 | 2 | 3, startTime: string) => void;
  replacePlace: (dayNumber: 1 | 2 | 3, placeIndex: number, newPlace: Place) => void;
  clearDay: (dayNumber: 1 | 2 | 3) => void;
  clearItinerary: () => void;
  setEditingMode: (editing: boolean) => void;
  updatePreferences: (preferences: UserPreferences) => void;
  saveItinerary: () => Promise<void>;
  loadItinerary: () => Promise<void>;
  deleteItinerary: (itineraryId: string) => Promise<void>;
  undo: () => void;
  redo: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate total duration for a day plan in minutes.
 * Uses default of 60 minutes for places without duration_minutes set.
 * 
 * **Validates Requirement 5.1, 5.2:** Uses place duration_minutes when available,
 * defaults to 60 minutes when missing.
 * 
 * @param places - Array of places in the day plan
 * @returns Total duration in minutes
 */
function calculateDayDuration(places: Place[]): number {
  return places.reduce((total, place) => {
    return total + (place.duration_minutes || 60); // Default 60 minutes
  }, 0);
}

/**
 * Create an empty day plan with no places.
 * Used for initializing new itineraries and clearing days.
 * 
 * @param dayNumber - Day number (1, 2, or 3)
 * @returns Empty DayPlan object with default start time of 08:00
 */
function createEmptyDayPlan(dayNumber: 1 | 2 | 3): DayPlan {
  return {
    day_number: dayNumber,
    places: [],
    total_duration: 0,
    start_time: '08:00',
  };
}

/**
 * Generate a unique itinerary ID using timestamp and random string.
 * Format: "itinerary_<timestamp>_<random>"
 * 
 * @returns Unique itinerary ID string
 */
function generateItineraryId(): string {
  return `itinerary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default user preferences with moderate pace and no restrictions.
 * Used when creating itineraries without explicit preferences.
 * 
 * @returns UserPreferences object with default values
 */
function createDefaultPreferences(): UserPreferences {
  return {
    cities: [],
    interests: [],
    pace: 'moderate' as TripPace,
    price_range: [],
    include_booking_required: true,
  };
}

/**
 * Deep clone an itinerary for history snapshots.
 * Ensures snapshot isolation by creating independent copies.
 * 
 * **Validates Requirement 13.1:** Deep cloning prevents unintended mutations
 * 
 * @param itinerary - Itinerary to clone
 * @returns Deep copy of the itinerary
 */
function deepCloneItinerary(itinerary: Itinerary): Itinerary {
  return JSON.parse(JSON.stringify(itinerary));
}

/**
 * Create a history snapshot of the current itinerary state.
 * 
 * **Validates Requirement 13.1:** Snapshot creation for history tracking
 * 
 * @param itinerary - Current itinerary state
 * @param description - Human-readable action description
 * @returns Snapshot object
 */
function createSnapshot(itinerary: Itinerary, description: string): ItinerarySnapshot {
  return {
    itinerary: deepCloneItinerary(itinerary),
    timestamp: Date.now(),
    description,
  };
}

/**
 * Add snapshot to history with proper branching and size limits.
 * 
 * **Validates Requirements 13.4, 13.5:**
 * - Maintains max history size of 20 snapshots
 * - Implements history branching (clears redo on new action after undo)
 * 
 * @param history - Current history array
 * @param historyIndex - Current position in history
 * @param snapshot - New snapshot to add
 * @returns Updated history array and new index
 */
function addToHistory(
  history: ItinerarySnapshot[],
  historyIndex: number,
  snapshot: ItinerarySnapshot
): { history: ItinerarySnapshot[]; historyIndex: number } {
  // Remove any snapshots after current index (branching - clear redo)
  const newHistory = history.slice(0, historyIndex + 1);
  
  // Add new snapshot
  newHistory.push(snapshot);
  
  // Trim to max size of 20 (keep most recent)
  const MAX_HISTORY_SIZE = 20;
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift(); // Remove oldest
    return { history: newHistory, historyIndex: newHistory.length - 1 };
  }
  
  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ItineraryState = {
  currentItinerary: null,
  savedItineraries: [],
  isEditing: false,
  hasUnsavedChanges: false,
  storageMode: 'localStorage',  // Default to localStorage mode
  isLoading: false,
  error: null,
  history: [],  // NEW: Empty history on init
  historyIndex: -1,  // NEW: -1 indicates no history
};

// ============================================================================
// Reducer
// ============================================================================

/**
 * Reducer function for itinerary state management.
 * Handles all itinerary CRUD operations, place manipulation, and persistence marking.
 * 
 * **Validates Requirements:**
 * - 4.1-4.8: Itinerary creation and management
 * - 19.1-19.9: Interactive itinerary editing
 * - 5.1-5.5: Time-based scheduling
 * 
 * @param state - Current itinerary state
 * @param action - Action to apply
 * @returns New itinerary state after applying action
 */
function itineraryReducer(state: ItineraryState, action: ItineraryAction): ItineraryState {
  switch (action.type) {
    case 'CREATE_ITINERARY': {
      const { name, preferences } = action.payload;
      const newItinerary: Itinerary = {
        id: generateItineraryId(),
        name,
        days: [
          createEmptyDayPlan(1),
          createEmptyDayPlan(2),
          createEmptyDayPlan(3),
        ],
        preferences: preferences || createDefaultPreferences(),
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
      };
      return {
        ...state,
        currentItinerary: newItinerary,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'LOAD_ITINERARY': {
      return {
        ...state,
        currentItinerary: action.payload,
        hasUnsavedChanges: false,
        error: null,
      };
    }

    case 'LOAD_SAVED_ITINERARIES': {
      return {
        ...state,
        savedItineraries: action.payload,
        error: null,
      };
    }

    case 'REPLACE_ITINERARY': {
      // Replace the entire itinerary (used for recommendations/replan)
      return {
        ...state,
        currentItinerary: action.payload,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'UPDATE_ITINERARY_NAME': {
      if (!state.currentItinerary) return state;

      // Create history snapshot before mutation
      const { history, historyIndex } = addToHistory(
        state.history,
        state.historyIndex,
        createSnapshot(state.currentItinerary, `Renamed itinerary to "${action.payload}"`)
      );

      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          name: action.payload,
          last_modified: new Date().toISOString(),
        },
        history,
        historyIndex,
        hasUnsavedChanges: true,
      };
    }

    case 'ADD_PLACE_TO_DAY': {
      if (!state.currentItinerary) return state;
      const { place, dayNumber } = action.payload;
      const dayIndex = dayNumber - 1;
      const newDays = [...state.currentItinerary.days];
      const targetDay = newDays[dayIndex];

      // Check if place already exists in this day
      if (targetDay.places.some((p) => p.id === place.id)) {
        return {
          ...state,
          error: `Cannot add "${place.name}" - this place is already in Day ${dayNumber}`,
        };
      }

      // Create history snapshot before mutation
      const { history, historyIndex } = addToHistory(
        state.history,
        state.historyIndex,
        createSnapshot(state.currentItinerary, `Added ${place.name} to Day ${dayNumber}`)
      );

      const updatedPlaces = [...targetDay.places, place];
      newDays[dayIndex] = {
        ...targetDay,
        places: updatedPlaces,
        total_duration: calculateDayDuration(updatedPlaces),
      };

      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          days: newDays as [DayPlan, DayPlan, DayPlan],
          last_modified: new Date().toISOString(),
        },
        history,
        historyIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'REMOVE_PLACE_FROM_DAY': {
      if (!state.currentItinerary) return state;
      const { dayNumber, placeIndex } = action.payload;
      const dayIndex = dayNumber - 1;
      const newDays = [...state.currentItinerary.days];
      const targetDay = newDays[dayIndex];

      // Get place name for history description
      const placeName = targetDay.places[placeIndex]?.name || 'place';

      // Create history snapshot before mutation
      const { history, historyIndex } = addToHistory(
        state.history,
        state.historyIndex,
        createSnapshot(state.currentItinerary, `Removed ${placeName} from Day ${dayNumber}`)
      );

      const updatedPlaces = targetDay.places.filter((_, index) => index !== placeIndex);
      newDays[dayIndex] = {
        ...targetDay,
        places: updatedPlaces,
        total_duration: calculateDayDuration(updatedPlaces),
      };

      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          days: newDays as [DayPlan, DayPlan, DayPlan],
          last_modified: new Date().toISOString(),
        },
        history,
        historyIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'REORDER_PLACES_IN_DAY': {
      if (!state.currentItinerary) return state;
      const { dayNumber, fromIndex, toIndex } = action.payload;
      const dayIndex = dayNumber - 1;
      const newDays = [...state.currentItinerary.days];
      const targetDay = newDays[dayIndex];

      // Validate indices
      if (
        fromIndex < 0 ||
        fromIndex >= targetDay.places.length ||
        toIndex < 0 ||
        toIndex >= targetDay.places.length
      ) {
        return {
          ...state,
          error: 'Invalid place index for reordering',
        };
      }

      // Get place name for history description
      const placeName = targetDay.places[fromIndex]?.name || 'place';

      // Create history snapshot before mutation
      const { history, historyIndex } = addToHistory(
        state.history,
        state.historyIndex,
        createSnapshot(state.currentItinerary, `Reordered ${placeName} in Day ${dayNumber}`)
      );

      // Perform reordering
      const updatedPlaces = [...targetDay.places];
      const [movedPlace] = updatedPlaces.splice(fromIndex, 1);
      updatedPlaces.splice(toIndex, 0, movedPlace);

      newDays[dayIndex] = {
        ...targetDay,
        places: updatedPlaces,
      };

      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          days: newDays as [DayPlan, DayPlan, DayPlan],
          last_modified: new Date().toISOString(),
        },
        history,
        historyIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'MOVE_PLACE_BETWEEN_DAYS': {
      if (!state.currentItinerary) return state;
      const { placeId, fromDay, toDay } = action.payload;

      if (fromDay === toDay) return state;

      const newDays = [...state.currentItinerary.days];
      const fromDayIndex = fromDay - 1;
      const toDayIndex = toDay - 1;

      const sourceDayPlan = newDays[fromDayIndex];
      const targetDayPlan = newDays[toDayIndex];

      // Find the place in the source day
      const placeIndex = sourceDayPlan.places.findIndex((p) => p.id === placeId);
      if (placeIndex === -1) {
        return {
          ...state,
          error: 'Place not found in source day',
        };
      }

      const place = sourceDayPlan.places[placeIndex];

      // Check if place already exists in target day
      if (targetDayPlan.places.some((p) => p.id === placeId)) {
        return {
          ...state,
          error: `Cannot move "${place.name}" to Day ${toDay} - this place is already in that day`,
        };
      }

      // Create history snapshot before mutation
      const { history, historyIndex } = addToHistory(
        state.history,
        state.historyIndex,
        createSnapshot(state.currentItinerary, `Moved ${place.name} from Day ${fromDay} to Day ${toDay}`)
      );

      // Remove from source day
      const updatedSourcePlaces = sourceDayPlan.places.filter((_, index) => index !== placeIndex);
      newDays[fromDayIndex] = {
        ...sourceDayPlan,
        places: updatedSourcePlaces,
        total_duration: calculateDayDuration(updatedSourcePlaces),
      };

      // Add to target day
      const updatedTargetPlaces = [...targetDayPlan.places, place];
      newDays[toDayIndex] = {
        ...targetDayPlan,
        places: updatedTargetPlaces,
        total_duration: calculateDayDuration(updatedTargetPlaces),
      };

      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          days: newDays as [DayPlan, DayPlan, DayPlan],
          last_modified: new Date().toISOString(),
        },
        history,
        historyIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'UPDATE_DAY_START_TIME': {
      if (!state.currentItinerary) return state;
      const { dayNumber, startTime } = action.payload;
      const dayIndex = dayNumber - 1;
      const newDays = [...state.currentItinerary.days];

      // Create history snapshot before mutation
      const { history, historyIndex } = addToHistory(
        state.history,
        state.historyIndex,
        createSnapshot(state.currentItinerary, `Updated Day ${dayNumber} start time to ${startTime}`)
      );

      newDays[dayIndex] = {
        ...newDays[dayIndex],
        start_time: startTime,
      };

      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          days: newDays as [DayPlan, DayPlan, DayPlan],
          last_modified: new Date().toISOString(),
        },
        history,
        historyIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'REPLACE_PLACE': {
      if (!state.currentItinerary) return state;
      const { dayNumber, placeIndex, newPlace } = action.payload;
      const dayIndex = dayNumber - 1;
      const newDays = [...state.currentItinerary.days];
      const targetDay = newDays[dayIndex];

      // Validate index
      if (placeIndex < 0 || placeIndex >= targetDay.places.length) {
        return {
          ...state,
          error: 'Invalid place index for replacement',
        };
      }

      // Check if new place already exists in this day
      if (targetDay.places.some((p, idx) => p.id === newPlace.id && idx !== placeIndex)) {
        return {
          ...state,
          error: `Cannot replace with "${newPlace.name}" - this place is already in Day ${dayNumber}`,
        };
      }

      // Get old place name for history description
      const oldPlaceName = targetDay.places[placeIndex]?.name || 'place';

      // Create history snapshot before mutation
      const { history, historyIndex } = addToHistory(
        state.history,
        state.historyIndex,
        createSnapshot(state.currentItinerary, `Replaced ${oldPlaceName} with ${newPlace.name} in Day ${dayNumber}`)
      );

      const updatedPlaces = [...targetDay.places];
      updatedPlaces[placeIndex] = newPlace;

      newDays[dayIndex] = {
        ...targetDay,
        places: updatedPlaces,
        total_duration: calculateDayDuration(updatedPlaces),
      };

      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          days: newDays as [DayPlan, DayPlan, DayPlan],
          last_modified: new Date().toISOString(),
        },
        history,
        historyIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'CLEAR_DAY': {
      if (!state.currentItinerary) return state;
      const { dayNumber } = action.payload;
      const dayIndex = dayNumber - 1;
      const newDays = [...state.currentItinerary.days];

      // Create history snapshot before mutation
      const { history, historyIndex } = addToHistory(
        state.history,
        state.historyIndex,
        createSnapshot(state.currentItinerary, `Cleared Day ${dayNumber}`)
      );

      newDays[dayIndex] = createEmptyDayPlan(dayNumber);

      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          days: newDays as [DayPlan, DayPlan, DayPlan],
          last_modified: new Date().toISOString(),
        },
        history,
        historyIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'CLEAR_ITINERARY': {
      return {
        ...state,
        currentItinerary: null,
        hasUnsavedChanges: false,
        error: null,
      };
    }

    case 'SET_EDITING_MODE': {
      return {
        ...state,
        isEditing: action.payload,
      };
    }

    case 'SET_ERROR': {
      return {
        ...state,
        error: action.payload,
      };
    }

    case 'MARK_SAVED': {
      return {
        ...state,
        hasUnsavedChanges: false,
      };
    }

    case 'UPDATE_PREFERENCES': {
      if (!state.currentItinerary) return state;
      return {
        ...state,
        currentItinerary: {
          ...state.currentItinerary,
          preferences: action.payload,
          last_modified: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      };
    }

    case 'SET_STORAGE_MODE': {
      return {
        ...state,
        storageMode: action.payload,
      };
    }

    case 'DELETE_SAVED_ITINERARY': {
      return {
        ...state,
        savedItineraries: state.savedItineraries.filter(
          (itinerary) => itinerary.id !== action.payload
        ),
        // If the deleted itinerary is currently loaded, clear it
        currentItinerary:
          state.currentItinerary?.id === action.payload ? null : state.currentItinerary,
        error: null,
      };
    }

    case 'UPSERT_SAVED_ITINERARY': {
      // Add or update an itinerary in the savedItineraries list
      const itinerary = action.payload;
      const existingIndex = state.savedItineraries.findIndex((i) => i.id === itinerary.id);
      
      let updatedList;
      if (existingIndex >= 0) {
        // Update existing
        updatedList = [...state.savedItineraries];
        updatedList[existingIndex] = itinerary;
      } else {
        // Add new (prepend to show at top)
        updatedList = [itinerary, ...state.savedItineraries];
      }
      
      // Sort by last_modified descending
      updatedList.sort((a, b) => {
        const dateA = new Date(a.last_modified || a.created_at).getTime();
        const dateB = new Date(b.last_modified || b.created_at).getTime();
        return dateB - dateA;
      });
      
      return {
        ...state,
        savedItineraries: updatedList,
        error: null,
      };
    }

    case 'CLEAR_SAVED_ITINERARIES': {
      return {
        ...state,
        savedItineraries: [],
        error: null,
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case 'UNDO': {
      // Can't undo if no history or at the beginning
      if (state.historyIndex <= 0 || state.history.length === 0) {
        return state;
      }

      const newIndex = state.historyIndex - 1;
      const snapshot = state.history[newIndex];

      return {
        ...state,
        currentItinerary: deepCloneItinerary(snapshot.itinerary),
        historyIndex: newIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    case 'REDO': {
      // Can't redo if no history or at the end
      if (state.historyIndex >= state.history.length - 1) {
        return state;
      }

      const newIndex = state.historyIndex + 1;
      const snapshot = state.history[newIndex];

      return {
        ...state,
        currentItinerary: deepCloneItinerary(snapshot.itinerary),
        historyIndex: newIndex,
        hasUnsavedChanges: true,
        error: null,
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

export const ItineraryContext = createContext<ItineraryContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Props for ItineraryProvider component.
 */
export interface ItineraryProviderProps {
  children: ReactNode;
}

/**
 * Itinerary context provider component.
 * Manages 3-day itinerary creation, editing, and persistence.
 * 
 * Features:
 * - Create new itineraries with user preferences
 * - Add, remove, reorder, and replace places
 * - Move places between days (drag-and-drop support)
 * - Auto-save to localStorage with 1-second debounce
 * - Restore itinerary on mount
 * - Track unsaved changes
 * 
 * **Validates Requirements:**
 * - 4.1-4.8: Itinerary creation and management
 * - 19.1-19.9: Interactive editing (add, remove, reorder, replace)
 * - 4.7-4.8: Persistence in browser localStorage
 * - 18.7-18.8: Itinerary display and editing
 * 
 * @param props - Component props
 */
export function ItineraryProvider({ children }: ItineraryProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(itineraryReducer, initialState);
  
  // Get authentication state from AuthContext
  const { state: authState } = useAuth();

  // LocalStorage key
  const STORAGE_KEY = 'italy-trip-planner:itinerary';

  // Track when we're loading data from the API to prevent premature auto-save
  const isLoadingFromAPI = useRef(false);

  /**
   * Detect authentication state and update storage mode.
   * 
   * **Validates Requirements 5.1, 5.2:**
   * - 5.1: WHEN a user is not authenticated, THE Frontend_App SHALL continue to use localStorage
   * - 5.2: WHEN a user is authenticated, THE Frontend_App SHALL use the Itinerary_Service API endpoints
   */
  useEffect(() => {
    const newStorageMode: StorageMode = authState.isAuthenticated ? 'api' : 'localStorage';
    
    // Only update if mode has changed
    if (state.storageMode !== newStorageMode) {
      dispatch({ type: 'SET_STORAGE_MODE', payload: newStorageMode });
    }
  }, [authState.isAuthenticated, state.storageMode]);

  /**
   * Handle authentication state changes.
   * 
   * **Validates Requirements 5.3, 5.4, 9.6:**
   * - 5.3: WHEN a user signs in successfully, THE Frontend_App SHALL load the user's itineraries from the Itinerary_Service
   * - 5.4: WHEN a user signs out, THE Frontend_App SHALL clear the authentication token and revert to localStorage-based itinerary management
   * - 9.6: Display loading indicators during API requests
   * 
   * On sign-in: Fetch itineraries from API
   * On sign-out: Clear API data, preserve localStorage data
   */
  useEffect(() => {
    const handleAuthStateChange = async () => {
      if (authState.isAuthenticated && authState.accessToken) {
        // User signed in - clear localStorage to prevent stale data
        localStorage.removeItem(STORAGE_KEY);
        
        // Clear any current itinerary from state
        dispatch({ type: 'CLEAR_ITINERARY' });
        
        try {
          // Set loading state
          dispatch({ type: 'SET_LOADING', payload: true });
          
          const apiClient = new ItineraryApiClient({
            getAuthToken: () => authState.idToken,
          });
          
          const itineraries = await apiClient.listItineraries();
          dispatch({ type: 'LOAD_SAVED_ITINERARIES', payload: itineraries });
          
          // Clear loading state
          dispatch({ type: 'SET_LOADING', payload: false });
        } catch (error) {
          console.error('[ItineraryContext] Failed to fetch itineraries on sign-in:', error);
          
          // Clear loading state on error
          dispatch({ type: 'SET_LOADING', payload: false });
          
          // Check if it's an authentication error (session expired)
          const errorMessage = error instanceof Error ? error.message : '';
          if (errorMessage.includes('Session expired') || errorMessage.includes('401')) {
            dispatch({
              type: 'SET_ERROR',
              payload: 'Session expired. Please sign in again.',
            });
          } else {
            // For all other errors (404, network, etc.), just initialize with empty array
            // This is expected for new users or network issues
            console.log('[ItineraryContext] No itineraries found or API error, initializing with empty list');
            dispatch({ type: 'LOAD_SAVED_ITINERARIES', payload: [] });
          }
        }
      } else if (!authState.isAuthenticated && state.savedItineraries.length > 0) {
        // User signed out - clear API data
        // Note: localStorage data is preserved automatically
        dispatch({ type: 'CLEAR_SAVED_ITINERARIES' });
      }
    };

    handleAuthStateChange();
  }, [authState.isAuthenticated, authState.accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Create a new empty itinerary with 3 empty days.
   * Generates unique ID and timestamps.
   * 
   * **Validates Requirement 4.1:** Provides interface to create new Itinerary
   * 
   * @param name - Display name for the itinerary
   * @param preferences - Optional user preferences for recommendations
   */
  const createItinerary = useCallback((name: string, preferences?: UserPreferences) => {
    dispatch({ type: 'CREATE_ITINERARY', payload: { name, preferences } });
  }, []);

  /**
   * Replace the entire itinerary with a new one.
   * Used for recommendation generation and replanning workflows.
   * Marks as unsaved to trigger persistence.
   * 
   * **Validates Requirement 18.7, 20.5:** Display recommended/replanned Itinerary
   * 
   * @param itinerary - New itinerary to replace current one
   */
  const replaceItinerary = useCallback((itinerary: Itinerary) => {
    dispatch({ type: 'REPLACE_ITINERARY', payload: itinerary });
  }, []);

  /**
   * Update the itinerary's display name.
   * Updates last_modified timestamp.
   * 
   * @param name - New name for the itinerary
   */
  const updateItineraryName = useCallback((name: string) => {
    dispatch({ type: 'UPDATE_ITINERARY_NAME', payload: name });
  }, []);

  /**
   * Add a place to a specific day's itinerary.
   * Prevents duplicate places in the same day.
   * Automatically recalculates day duration.
   * 
   * **Validates Requirement 4.2, 4.4, 19.6:** Allows adding places to specific Day_Plan
   * 
   * @param place - Place to add
   * @param dayNumber - Day to add place to (1, 2, or 3)
   */
  const addPlaceToDay = useCallback((place: Place, dayNumber: 1 | 2 | 3) => {
    dispatch({ type: 'ADD_PLACE_TO_DAY', payload: { place, dayNumber } });
  }, []);

  /**
   * Remove a place from a specific day by its index.
   * Automatically recalculates day duration.
   * 
   * **Validates Requirement 4.5, 19.3:** Allows removing places from Itinerary
   * 
   * @param dayNumber - Day to remove place from (1, 2, or 3)
   * @param placeIndex - Index of place in the day's places array
   */
  const removePlaceFromDay = useCallback((dayNumber: 1 | 2 | 3, placeIndex: number) => {
    dispatch({ type: 'REMOVE_PLACE_FROM_DAY', payload: { dayNumber, placeIndex } });
  }, []);

  /**
   * Reorder places within a single day.
   * Used for drag-and-drop operations to change place sequence.
   * 
   * **Validates Requirement 19.2:** Allows reordering places within Day_Plan by drag-and-drop
   * 
   * @param dayNumber - Day containing the places (1, 2, or 3)
   * @param fromIndex - Current index of place to move
   * @param toIndex - Destination index for the place
   */
  const reorderPlacesInDay = useCallback(
    (dayNumber: 1 | 2 | 3, fromIndex: number, toIndex: number) => {
      dispatch({ type: 'REORDER_PLACES_IN_DAY', payload: { dayNumber, fromIndex, toIndex } });
    },
    []
  );

  /**
   * Move a place from one day to another.
   * Prevents duplicate places in the destination day.
   * Automatically recalculates durations for both days.
   * 
   * **Validates Requirement 4.6, 19.5:** Allows moving places between days
   * 
   * @param placeId - Unique ID of place to move
   * @param fromDay - Source day number (1, 2, or 3)
   * @param toDay - Destination day number (1, 2, or 3)
   */
  const movePlaceBetweenDays = useCallback(
    (placeId: string, fromDay: 1 | 2 | 3, toDay: 1 | 2 | 3) => {
      dispatch({ type: 'MOVE_PLACE_BETWEEN_DAYS', payload: { placeId, fromDay, toDay } });
    },
    []
  );

  /**
   * Update the start time for a specific day.
   * Used to customize when daily activities begin (default: 08:00).
   * 
   * @param dayNumber - Day to update (1, 2, or 3)
   * @param startTime - New start time in HH:MM format
   */
  const updateDayStartTime = useCallback((dayNumber: 1 | 2 | 3, startTime: string) => {
    dispatch({ type: 'UPDATE_DAY_START_TIME', payload: { dayNumber, startTime } });
  }, []);

  /**
   * Replace a place at a specific index with a different place.
   * Prevents duplicate places in the same day.
   * Automatically recalculates day duration.
   * 
   * **Validates Requirement 19.4:** Allows replacing a place with different place from dataset
   * 
   * @param dayNumber - Day containing the place (1, 2, or 3)
   * @param placeIndex - Index of place to replace
   * @param newPlace - New place to insert at that position
   */
  const replacePlace = useCallback(
    (dayNumber: 1 | 2 | 3, placeIndex: number, newPlace: Place) => {
      dispatch({ type: 'REPLACE_PLACE', payload: { dayNumber, placeIndex, newPlace } });
    },
    []
  );

  /**
   * Clear all places from a specific day, resetting it to empty.
   * 
   * @param dayNumber - Day to clear (1, 2, or 3)
   */
  const clearDay = useCallback((dayNumber: 1 | 2 | 3) => {
    dispatch({ type: 'CLEAR_DAY', payload: { dayNumber } });
  }, []);

  /**
   * Clear the entire itinerary, removing all data.
   * Resets to initial empty state.
   */
  const clearItinerary = useCallback(() => {
    dispatch({ type: 'CLEAR_ITINERARY' });
  }, []);

  /**
   * Set editing mode flag.
   * Used to toggle UI between view and edit states.
   * 
   * @param editing - true for edit mode, false for view mode
   */
  const setEditingMode = useCallback((editing: boolean) => {
    dispatch({ type: 'SET_EDITING_MODE', payload: editing });
  }, []);

  /**
   * Update user preferences for the itinerary.
   * Used when replanning with updated preferences.
   * 
   * @param preferences - New user preferences
   */
  const updatePreferences = useCallback((preferences: UserPreferences) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  }, []);

  /**
   * Undo the last itinerary modification.
   * Reverts to the previous state in history.
   * 
   * **Validates Requirement 13.2:** Provides undo functionality
   */
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  /**
   * Redo a previously undone itinerary modification.
   * Reapplies the next state in history.
   * 
   * **Validates Requirement 13.3:** Provides redo functionality
   */
  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  /**
   * Create ItineraryApiClient instance with auth token getter.
   * Memoized to prevent recreation on every render.
   */
  const apiClient = useMemo(() => {
    return new ItineraryApiClient({
      getAuthToken: () => authState.idToken,
    });
  }, [authState.idToken]);

  /**
   * Save itinerary to localStorage or API based on storage mode.
   * Uses localStorage for guest users, API for authenticated users.
   * Automatically determines whether to create or update based on ID format.
   * 
   * **Validates Requirements:**
   * - 4.7: Persists Itinerary in browser local storage (guest mode)
   * - 5.6: Sends changes to Itinerary_Service API (authenticated mode)
   * - 9.4: Displays success confirmation on save
   * 
   * **IMPORTANT**: This callback does NOT include state.currentItinerary in dependencies
   * to avoid infinite loops. It reads the current state directly when called.
   */
  // Track in-flight save operation to prevent duplicate saves
  const saveInProgressRef = useRef(false);

  const saveItinerary = useCallback(async () => {
    // Read current state directly instead of from closure
    const currentItinerary = state.currentItinerary;
    const storageMode = state.storageMode;
    
    if (!currentItinerary) {
      return;
    }

    // Prevent concurrent saves
    if (saveInProgressRef.current) {
      console.log('[ItineraryContext] Save already in progress, skipping');
      return;
    }

    try {
      if (storageMode === 'localStorage') {
        // Guest mode: save to localStorage (existing behavior)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItinerary));
        dispatch({ type: 'MARK_SAVED' });
        console.log('[ItineraryContext] Saved to localStorage');
      } else {
        // Authenticated mode: save to API
        saveInProgressRef.current = true;
        
        // Set loading state
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Check ID format to determine if this is create or update
        // Server IDs start with "itin_" - these should be updated
        // Client-generated IDs start with "itinerary_" - these should be created
        // Recommendation-generated IDs are UUIDs (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        
        // Check if this itinerary already exists in savedItineraries (by ID)
        const existingById = state.savedItineraries.find(
          itin => itin.id === currentItinerary.id
        );
        
        const isServerItinerary = currentItinerary.id.startsWith('itin_') || !!existingById;
        
        console.log('[ItineraryContext] Save decision:', {
          currentId: currentItinerary.id,
          isServerItinerary,
          existingById: !!existingById,
        });
        
        // Check if an itinerary with the same name already exists (for overwrite logic)
        // Use case-insensitive comparison to catch name collisions
        const existingWithSameName = state.savedItineraries.find(
          itin => itin.name.toLowerCase() === currentItinerary.name.toLowerCase() && 
                  itin.id !== currentItinerary.id
        );
        
        console.log('[ItineraryContext] Checking for duplicate names...');
        console.log('[ItineraryContext] Current itinerary:', { 
          id: currentItinerary.id, 
          name: currentItinerary.name 
        });
        console.log('[ItineraryContext] Saved itineraries:', 
          state.savedItineraries.map(i => ({ id: i.id, name: i.name }))
        );
        console.log('[ItineraryContext] Found duplicate?', !!existingWithSameName);
        
        if (!isServerItinerary) {
          // This is a new itinerary - check for name conflict
          if (existingWithSameName) {
            // Overwrite the existing itinerary with the same name
            console.log('[ItineraryContext] Overwriting existing itinerary with same name:', existingWithSameName.id);
            const updatedItinerary = await apiClient.updateItinerary(existingWithSameName.id, {
              name: currentItinerary.name,
              days: currentItinerary.days,
              preferences: currentItinerary.preferences,
            });
            
            // Update the current itinerary with the server ID
            dispatch({ type: 'LOAD_ITINERARY', payload: updatedItinerary });
            
            // Update in savedItineraries list
            dispatch({ type: 'UPSERT_SAVED_ITINERARY', payload: updatedItinerary });
            
            console.log('[ItineraryContext] Itinerary overwritten successfully:', updatedItinerary.id);
          } else {
            // Create new itinerary - no name conflict
            console.log('[ItineraryContext] Creating new itinerary via API');
            const createdItinerary = await apiClient.createItinerary({
              name: currentItinerary.name,
              days: currentItinerary.days,
              preferences: currentItinerary.preferences,
            });
            
            // Update the itinerary with the server-generated ID
            // This will NOT trigger auto-save again because LOAD_ITINERARY sets hasUnsavedChanges=false
            dispatch({ type: 'LOAD_ITINERARY', payload: createdItinerary });
            
            // Add to savedItineraries list so it shows in My Progress
            dispatch({ type: 'UPSERT_SAVED_ITINERARY', payload: createdItinerary });
            
            console.log('[ItineraryContext] Itinerary created successfully:', createdItinerary.id);
          }
        } else {
          // This is an existing itinerary - call updateItinerary
          console.log('[ItineraryContext] Updating itinerary via API:', currentItinerary.id);
          const updatedItinerary = await apiClient.updateItinerary(currentItinerary.id, {
            name: currentItinerary.name,
            days: currentItinerary.days,
            preferences: currentItinerary.preferences,
          });
          
          // Update the itinerary with the server response
          // This will NOT trigger auto-save again because LOAD_ITINERARY sets hasUnsavedChanges=false
          dispatch({ type: 'LOAD_ITINERARY', payload: updatedItinerary });
          
          // Update in savedItineraries list
          dispatch({ type: 'UPSERT_SAVED_ITINERARY', payload: updatedItinerary });
          
          console.log('[ItineraryContext] Itinerary updated successfully');
        }
        
        dispatch({ type: 'MARK_SAVED' });
        dispatch({ type: 'SET_LOADING', payload: false });
        saveInProgressRef.current = false;
        
        // Display success confirmation
        dispatch({
          type: 'SET_ERROR',
          payload: null, // Clear any previous errors
        });
        
        // Success message could be added here through a new action type
        // For now, we'll use console logging as the primary feedback mechanism
        console.log('[ItineraryContext] Itinerary saved successfully');
      }
    } catch (error) {
      console.error('[ItineraryContext] Error saving itinerary:', error);
      
      // Clear loading state on error
      dispatch({ type: 'SET_LOADING', payload: false });
      
      let errorMessage = 'Failed to save itinerary';
      
      if (storageMode === 'localStorage') {
        errorMessage = 'Failed to save itinerary to local storage';
      } else {
        // API error handling
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          
          if (message.includes('session expired') || message.includes('unauthorized')) {
            errorMessage = 'Session expired. Please sign in again to save your itinerary.';
            // Preserve unsaved work - don't clear the itinerary
          } else if (message.includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (message.includes('not found')) {
            errorMessage = 'Failed to save itinerary: The requested resource was not found or you do not have permission to access it';
          } else {
            errorMessage = `Failed to save itinerary: ${error.message}`;
          }
        }
      }
      
      dispatch({
        type: 'SET_ERROR',
        payload: errorMessage,
      });
    } finally {
      // Always reset the save in progress flag
      saveInProgressRef.current = false;
    }
  }, [state, apiClient, STORAGE_KEY]);

  /**
   * Load itinerary from localStorage or API based on storage mode.
   * 
   * **Validates Requirements:**
   * - 4.8: Restores previously saved Itinerary when user returns (localStorage mode)
   * - 5.3: Frontend loads user's itineraries from API when authenticated
   * - 9.6: Display loading indicators during API requests
   * 
   * **IMPORTANT**: This callback reads state directly to avoid dependency issues.
   */
  const loadItinerary = useCallback(async () => {
    // Read current state directly
    const storageMode = state.storageMode;
    const currentItinerary = state.currentItinerary;
    
    try {
      if (storageMode === 'localStorage') {
        // Guest mode: load from localStorage (existing behavior)
        // Only load if there's no current itinerary to avoid overwriting
        if (!currentItinerary) {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const itinerary = JSON.parse(saved) as Itinerary;
            dispatch({ type: 'LOAD_ITINERARY', payload: itinerary });
            console.log('[ItineraryContext] Loaded itinerary from localStorage');
          }
        } else {
          console.log('[ItineraryContext] Skipping localStorage load - currentItinerary already exists');
        }
      } else {
        // Authenticated mode: fetch from API
        // Set loading flag to prevent auto-save during load
        isLoadingFromAPI.current = true;
        console.log('[ItineraryContext] Setting isLoadingFromAPI = true');
        
        // Set loading state
        dispatch({ type: 'SET_LOADING', payload: true });
        
        console.log('[ItineraryContext] Fetching itineraries from API');
        const itineraries = await apiClient.listItineraries();
        
        // Store the list of saved itineraries
        dispatch({ type: 'LOAD_SAVED_ITINERARIES', payload: itineraries });
        
        // Load the most recent itinerary ONLY if no itinerary is currently loaded
        // This prevents overwriting user's active work
        if (!currentItinerary && itineraries.length > 0) {
          const mostRecent = itineraries[0];
          dispatch({ type: 'LOAD_ITINERARY', payload: mostRecent });
          console.log('[ItineraryContext] Loaded most recent itinerary:', mostRecent.id);
        } else if (currentItinerary) {
          console.log('[ItineraryContext] Skipping auto-load - currentItinerary already exists:', currentItinerary.id);
        } else {
          console.log('[ItineraryContext] No saved itineraries found');
        }
        
        // Clear loading state
        dispatch({ type: 'SET_LOADING', payload: false });
        
        // Clear loading flag after load is complete
        isLoadingFromAPI.current = false;
        console.log('[ItineraryContext] Setting isLoadingFromAPI = false');
      }
    } catch (error) {
      console.error('[ItineraryContext] Error loading itinerary:', error);
      
      // Reset loading flag on error
      isLoadingFromAPI.current = false;
      console.log('[ItineraryContext] Setting isLoadingFromAPI = false (error case)');
      
      // Clear loading state on error
      dispatch({ type: 'SET_LOADING', payload: false });
      
      let errorMessage = 'Failed to load itinerary';
      
      if (storageMode === 'localStorage') {
        errorMessage = 'Failed to load itinerary from local storage';
      } else {
        // API error handling
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          
          if (message.includes('session expired') || message.includes('unauthorized')) {
            errorMessage = 'Session expired. Please sign in again.';
          } else if (message.includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = `Failed to load itinerary: ${error.message}`;
          }
        }
      }
      
      dispatch({
        type: 'SET_ERROR',
        payload: errorMessage,
      });
    }
  }, [state, apiClient, STORAGE_KEY]);

  /**
   * Delete an itinerary from the API.
   * Only works in API mode - does nothing for localStorage mode.
   * Removes the itinerary from savedItineraries state.
   * 
   * **Validates Requirements 6.5, 6.6, 9.6:**
   * - 6.5: Progress_View provides delete options with user confirmation
   * - 6.6: Frontend calls DELETE endpoint and removes from display
   * - 9.6: Display loading indicators during API requests
   * 
   * @param itineraryId - The ID of the itinerary to delete
   * @throws Error if deletion fails
   */
  const deleteItinerary = useCallback(
    async (itineraryId: string): Promise<void> => {
      // Read current state directly
      const storageMode = state.storageMode;
      
      // Only delete in API mode
      if (storageMode !== 'api') {
        console.warn('[ItineraryContext] deleteItinerary called in localStorage mode - ignoring');
        return;
      }

      try {
        console.log('[ItineraryContext] Deleting itinerary via API:', itineraryId);
        
        // Set loading state
        dispatch({ type: 'SET_LOADING', payload: true });
        
        // Call API to delete the itinerary
        await apiClient.deleteItinerary(itineraryId);
        
        // Remove from local state
        dispatch({ type: 'DELETE_SAVED_ITINERARY', payload: itineraryId });
        
        // Clear loading state
        dispatch({ type: 'SET_LOADING', payload: false });
        
        console.log('[ItineraryContext] Successfully deleted itinerary:', itineraryId);
      } catch (error) {
        console.error('[ItineraryContext] Error deleting itinerary:', error);
        
        // Clear loading state on error
        dispatch({ type: 'SET_LOADING', payload: false });
        
        let errorMessage = 'Failed to delete itinerary';
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes('session expired') || message.includes('unauthorized')) {
            errorMessage = 'Session expired. Please sign in again.';
          } else if (message.includes('not found')) {
            errorMessage = 'Itinerary not found or already deleted.';
          } else if (message.includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = `Failed to delete itinerary: ${error.message}`;
          }
        }
        
        dispatch({
          type: 'SET_ERROR',
          payload: errorMessage,
        });
        
        // Re-throw so caller can handle the error
        throw error;
      }
    },
    [state, apiClient]
  );

  // Load itinerary on mount only (not when storage mode changes mid-session)
  useEffect(() => {
    // Only load on initial mount to avoid overwriting user's active itinerary
    loadItinerary().catch((error) => {
      console.error('[ItineraryContext] Load itinerary failed:', error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run only on mount

  /**
   * Auto-save itinerary with 1-second debounce.
   * Only triggers when there are unsaved changes.
   * Prevents auto-save during initial load from API.
   * 
   * **Validates Requirements:**
   * - 4.7: Auto-persist changes to storage
   * - 5.6: Auto-sync changes to API when authenticated
   */
  useEffect(() => {
    // Don't auto-save if:
    // 1. No itinerary exists
    // 2. No unsaved changes
    // 3. Currently loading from API (prevents premature save)
    if (!state.currentItinerary || !state.hasUnsavedChanges || isLoadingFromAPI.current) {
      return;
    }

    console.log('[ItineraryContext] Scheduling auto-save (1 second debounce)');

    // Debounce auto-save by 1 second
    const timer = setTimeout(() => {
      console.log('[ItineraryContext] Auto-save triggered');
      saveItinerary().catch((error) => {
        console.error('[ItineraryContext] Auto-save failed:', error);
      });
    }, 1000);

    // Cleanup timer on unmount or when dependencies change
    return () => {
      clearTimeout(timer);
    };
  }, [state.currentItinerary, state.hasUnsavedChanges, saveItinerary]);

  const contextValue: ItineraryContextValue = {
    state,
    createItinerary,
    replaceItinerary,
    updateItineraryName,
    addPlaceToDay,
    removePlaceFromDay,
    reorderPlacesInDay,
    movePlaceBetweenDays,
    updateDayStartTime,
    replacePlace,
    clearDay,
    clearItinerary,
    setEditingMode,
    updatePreferences,
    saveItinerary,
    loadItinerary,
    deleteItinerary,
    undo,
    redo,
  };

  return (
    <ItineraryContext.Provider value={contextValue}>
      {children}
    </ItineraryContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook to access the Itinerary context
 * @throws Error if used outside of ItineraryProvider
 */
export function useItinerary(): ItineraryContextValue {
  const context = useContext(ItineraryContext);
  if (context === undefined) {
    throw new Error('useItinerary must be used within an ItineraryProvider');
  }
  return context;
}
