import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';
import { Place } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Modal types that can be opened in the application
 */
export type ModalType =
  | 'place-detail'
  | 'preferences'
  | 'dataset-uploader'
  | null;

/**
 * UI state for the application
 * Manages ephemeral UI state that is not persisted
 */
export interface UIState {
  selectedPlace: Place | null;
  activeDay: 1 | 2 | 3;
  mapCenter: [number, number]; // [latitude, longitude]
  mapZoom: number;
  modals: {
    placeDetail: boolean;
    preferences: boolean;
    datasetUploader: boolean;
  };
}

export type UIAction =
  | { type: 'SET_SELECTED_PLACE'; payload: Place | null }
  | { type: 'SET_ACTIVE_DAY'; payload: 1 | 2 | 3 }
  | { type: 'SET_MAP_CENTER'; payload: [number, number] }
  | { type: 'SET_MAP_ZOOM'; payload: number }
  | { type: 'OPEN_MODAL'; payload: ModalType }
  | { type: 'CLOSE_MODAL'; payload: ModalType }
  | { type: 'CLOSE_ALL_MODALS' }
  | { type: 'RESET_UI' };

export interface UIContextValue {
  state: UIState;
  setSelectedPlace: (place: Place | null) => void;
  setActiveDay: (day: 1 | 2 | 3) => void;
  setMapCenter: (center: [number, number]) => void;
  setMapZoom: (zoom: number) => void;
  openModal: (modal: ModalType) => void;
  closeModal: (modal: ModalType) => void;
  closeAllModals: () => void;
  resetUI: () => void;
  // Convenience methods for specific modals
  openPlaceDetailModal: (place: Place) => void;
  openPreferencesModal: () => void;
  openDatasetUploaderModal: () => void;
  closePlaceDetailModal: () => void;
  closePreferencesModal: () => void;
  closeDatasetUploaderModal: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Default map center: Rome, Italy
 */
const DEFAULT_MAP_CENTER: [number, number] = [41.9028, 12.4964];
const DEFAULT_MAP_ZOOM = 6;

const initialState: UIState = {
  selectedPlace: null,
  activeDay: 1,
  mapCenter: DEFAULT_MAP_CENTER,
  mapZoom: DEFAULT_MAP_ZOOM,
  modals: {
    placeDetail: false,
    preferences: false,
    datasetUploader: false,
  },
};

// ============================================================================
// Reducer
// ============================================================================

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_SELECTED_PLACE':
      return {
        ...state,
        selectedPlace: action.payload,
      };

    case 'SET_ACTIVE_DAY':
      return {
        ...state,
        activeDay: action.payload,
      };

    case 'SET_MAP_CENTER':
      return {
        ...state,
        mapCenter: action.payload,
      };

    case 'SET_MAP_ZOOM':
      return {
        ...state,
        mapZoom: action.payload,
      };

    case 'OPEN_MODAL': {
      const modalKey = getModalKey(action.payload);
      if (!modalKey) return state;

      return {
        ...state,
        modals: {
          ...state.modals,
          [modalKey]: true,
        },
      };
    }

    case 'CLOSE_MODAL': {
      const modalKey = getModalKey(action.payload);
      if (!modalKey) return state;

      return {
        ...state,
        modals: {
          ...state.modals,
          [modalKey]: false,
        },
        // Clear selected place when closing place detail modal
        ...(modalKey === 'placeDetail' ? { selectedPlace: null } : {}),
      };
    }

    case 'CLOSE_ALL_MODALS':
      return {
        ...state,
        modals: {
          placeDetail: false,
          preferences: false,
          datasetUploader: false,
        },
        selectedPlace: null,
      };

    case 'RESET_UI':
      return initialState;

    default:
      return state;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert modal type to state key
 */
function getModalKey(modalType: ModalType): keyof UIState['modals'] | null {
  switch (modalType) {
    case 'place-detail':
      return 'placeDetail';
    case 'preferences':
      return 'preferences';
    case 'dataset-uploader':
      return 'datasetUploader';
    default:
      return null;
  }
}

// ============================================================================
// Context
// ============================================================================

const UIContext = createContext<UIContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export interface UIProviderProps {
  children: ReactNode;
  /**
   * Optional initial state for the UI context
   */
  initialUIState?: Partial<UIState>;
}

export function UIProvider({ children, initialUIState }: UIProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(uiReducer, {
    ...initialState,
    ...initialUIState,
  });

  /**
   * Set the currently selected place
   */
  const setSelectedPlace = useCallback((place: Place | null) => {
    dispatch({ type: 'SET_SELECTED_PLACE', payload: place });
  }, []);

  /**
   * Set the active day (for itinerary editing)
   */
  const setActiveDay = useCallback((day: 1 | 2 | 3) => {
    dispatch({ type: 'SET_ACTIVE_DAY', payload: day });
  }, []);

  /**
   * Set the map center coordinates
   */
  const setMapCenter = useCallback((center: [number, number]) => {
    dispatch({ type: 'SET_MAP_CENTER', payload: center });
  }, []);

  /**
   * Set the map zoom level
   */
  const setMapZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_MAP_ZOOM', payload: zoom });
  }, []);

  /**
   * Open a modal by type
   */
  const openModal = useCallback((modal: ModalType) => {
    if (modal) {
      dispatch({ type: 'OPEN_MODAL', payload: modal });
    }
  }, []);

  /**
   * Close a modal by type
   */
  const closeModal = useCallback((modal: ModalType) => {
    if (modal) {
      dispatch({ type: 'CLOSE_MODAL', payload: modal });
    }
  }, []);

  /**
   * Close all open modals
   */
  const closeAllModals = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL_MODALS' });
  }, []);

  /**
   * Reset UI to initial state
   */
  const resetUI = useCallback(() => {
    dispatch({ type: 'RESET_UI' });
  }, []);

  // ============================================================================
  // Convenience Methods for Specific Modals
  // ============================================================================

  /**
   * Open the place detail modal with a specific place
   */
  const openPlaceDetailModal = useCallback((place: Place) => {
    dispatch({ type: 'SET_SELECTED_PLACE', payload: place });
    dispatch({ type: 'OPEN_MODAL', payload: 'place-detail' });
  }, []);

  /**
   * Close the place detail modal
   */
  const closePlaceDetailModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL', payload: 'place-detail' });
  }, []);

  /**
   * Open the preferences modal
   */
  const openPreferencesModal = useCallback(() => {
    dispatch({ type: 'OPEN_MODAL', payload: 'preferences' });
  }, []);

  /**
   * Close the preferences modal
   */
  const closePreferencesModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL', payload: 'preferences' });
  }, []);

  /**
   * Open the dataset uploader modal
   */
  const openDatasetUploaderModal = useCallback(() => {
    dispatch({ type: 'OPEN_MODAL', payload: 'dataset-uploader' });
  }, []);

  /**
   * Close the dataset uploader modal
   */
  const closeDatasetUploaderModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL', payload: 'dataset-uploader' });
  }, []);

  const contextValue: UIContextValue = {
    state,
    setSelectedPlace,
    setActiveDay,
    setMapCenter,
    setMapZoom,
    openModal,
    closeModal,
    closeAllModals,
    resetUI,
    openPlaceDetailModal,
    openPreferencesModal,
    openDatasetUploaderModal,
    closePlaceDetailModal,
    closePreferencesModal,
    closeDatasetUploaderModal,
  };

  return <UIContext.Provider value={contextValue}>{children}</UIContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook to access the UI context
 * 
 * @example
 * ```tsx
 * function PlaceCard({ place }: { place: Place }) {
 *   const { openPlaceDetailModal } = useUI();
 *   
 *   return (
 *     <div onClick={() => openPlaceDetailModal(place)}>
 *       <h3>{place.name}</h3>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @throws Error if used outside of UIProvider
 */
export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
