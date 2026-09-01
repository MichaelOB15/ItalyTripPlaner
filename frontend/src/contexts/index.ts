/**
 * Context providers and hooks for state management.
 * 
 * This module exports all context providers and their corresponding hooks
 * for managing global application state.
 */

export {
  AuthProvider,
  useAuth,
  type AuthState,
  type AuthAction,
  type AuthContextValue,
  type AuthProviderProps,
  type CognitoUser,
} from './AuthContext';

export { FilterProvider, useFilter } from './FilterContext';

export {
  ItineraryProvider,
  useItinerary,
  type ItineraryState,
  type ItineraryAction,
  type ItineraryContextValue,
  type ItineraryProviderProps,
} from './ItineraryContext';

export {
  UIProvider,
  useUI,
  type UIState,
  type UIAction,
  type UIContextValue,
  type UIProviderProps,
} from './UIContext';
