/**
 * Property-Based Tests for Storage Mode Consistency
 * 
 * **Property 14: Storage Mode Consistency**
 * **Validates: Requirements 5.1, 5.2**
 * 
 * For any frontend application state, if the user is authenticated (has valid JWT token),
 * then all itinerary operations SHALL use API calls; if the user is not authenticated,
 * then all itinerary operations SHALL use localStorage.
 * 
 * Requirements:
 * - 5.1: WHEN a user is not authenticated, THE Frontend_App SHALL continue to use localStorage
 * - 5.2: WHEN a user is authenticated, THE Frontend_App SHALL use the Itinerary_Service API endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import * as fc from 'fast-check';

// Create a mock that will be configured per test
const mockUseAuth = vi.fn();

// Create mock API client functions
const mockListItineraries = vi.fn();
const mockCreateItinerary = vi.fn();
const mockUpdateItinerary = vi.fn();
const mockDeleteItinerary = vi.fn();
const mockGetItinerary = vi.fn();

// Mock AuthContext BEFORE importing ItineraryContext
vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock ItineraryApiClient BEFORE importing ItineraryContext
vi.mock('../services/itineraryApi', () => ({
  ItineraryApiClient: vi.fn().mockImplementation(function(this: any) {
    this.listItineraries = mockListItineraries;
    this.createItinerary = mockCreateItinerary;
    this.updateItinerary = mockUpdateItinerary;
    this.deleteItinerary = mockDeleteItinerary;
    this.getItinerary = mockGetItinerary;
  }),
}));

import { ItineraryProvider, useItinerary } from './ItineraryContext';
import { Itinerary, Place, TripPace, UserPreferences } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    getStore: () => ({ ...store }),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
});

// Test data generator helpers
const mockPlace1: Place = {
  id: 'place_001',
  name: 'Colosseum',
  type: 'historic_site',
  city: 'Rome',
  latitude: 41.8902,
  longitude: 12.4922,
  description: 'Ancient Roman amphitheater',
  rating: 4.7,
  price_range: '€€',
  tags: ['ancient', 'architecture'],
  duration_minutes: 120,
  hours: '09:00-19:00',
  booking_required: true,
  region: 'Lazio',
  neighborhood: null,
  seasonal_notes: null,
};

describe('Property 14: Storage Mode Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Reset mock implementations
    mockListItineraries.mockResolvedValue([]);
    mockCreateItinerary.mockResolvedValue({
      id: 'itin_created',
      name: 'Test Itinerary',
      days: [
        { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
        { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
        { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
      ],
      preferences: {
        cities: [],
        interests: [],
        pace: 'moderate' as TripPace,
        price_range: [],
        include_booking_required: true,
      },
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
    });
    mockUpdateItinerary.mockResolvedValue({
      id: 'itin_updated',
      name: 'Updated Itinerary',
      days: [
        { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
        { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
        { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
      ],
      preferences: {
        cities: [],
        interests: [],
        pace: 'moderate' as TripPace,
        price_range: [],
        include_booking_required: true,
      },
      created_at: new Date().toISOString(),
      last_modified: new Date().toISOString(),
    });
    mockDeleteItinerary.mockResolvedValue(undefined);
    
    // Setup default unauthenticated state
    mockUseAuth.mockReturnValue({
      state: {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        isLoading: false,
        error: null,
      },
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
      refreshToken: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ItineraryProvider>{children}</ItineraryProvider>
  );

  /**
   * Property: When user is NOT authenticated, storage mode SHALL be 'localStorage'
   * and operations SHALL use localStorage (not API)
   * 
   * **Validates Requirement 5.1:**
   * WHEN a user is not authenticated, THE Frontend_App SHALL continue to use localStorage
   * for itinerary persistence
   */
  it('Property: Unauthenticated users always use localStorage mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isAuthenticated: fc.constant(false),
          itineraryName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (authState) => {
          // Setup: Configure auth state as unauthenticated
          mockUseAuth.mockReturnValue({
            state: {
              isAuthenticated: authState.isAuthenticated,
              user: null,
              accessToken: null,
              isLoading: false,
              error: null,
            },
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            confirmResetPassword: vi.fn(),
            refreshToken: vi.fn(),
          });

          localStorageMock.clear();
          mockCreateItinerary.mockClear();
          mockUpdateItinerary.mockClear();
          mockListItineraries.mockClear();

          const { result, unmount } = renderHook(() => useItinerary(), { wrapper });

          try {
            // Wait for initial render and effects
            await waitFor(() => {
              expect(result.current.state).toBeDefined();
            }, { timeout: 1000 });

            // Property assertion 1: Storage mode should be 'localStorage'
            expect(result.current.state.storageMode).toBe('localStorage');

            // Property assertion 2: Creating an itinerary should NOT call API
            await act(async () => {
              result.current.createItinerary(authState.itineraryName);
            });

            expect(mockCreateItinerary).not.toHaveBeenCalled();
            expect(mockUpdateItinerary).not.toHaveBeenCalled();

            // Property assertion 3: Saving should use localStorage, not API
            await act(async () => {
              await result.current.saveItinerary();
            });

            // Wait for save to complete
            await waitFor(() => {
              expect(result.current.state.hasUnsavedChanges).toBe(false);
            }, { timeout: 500 });

            expect(mockCreateItinerary).not.toHaveBeenCalled();
            expect(mockUpdateItinerary).not.toHaveBeenCalled();
            
            // Verify data was saved to localStorage
            const savedData = localStorageMock.getItem('italy-trip-planner:itinerary');
            expect(savedData).not.toBeNull();
            if (savedData) {
              const parsed = JSON.parse(savedData);
              expect(parsed.name).toBe(authState.itineraryName);
            }
          } finally {
            unmount();
          }
        }
      ),
      {
        numRuns: 10, // Run 10 different test cases
        endOnFailure: true,
      }
    );
  });

  /**
   * Property: When user IS authenticated, storage mode SHALL be 'api'
   * and operations SHALL use API calls (not localStorage)
   * 
   * **Validates Requirement 5.2:**
   * WHEN a user is authenticated, THE Frontend_App SHALL use the Itinerary_Service
   * API endpoints for all itinerary operations instead of localStorage
   */
  it('Property: Authenticated users always use API mode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isAuthenticated: fc.constant(true),
          userId: fc.uuid(),
          email: fc.emailAddress(),
          accessToken: fc.string({ minLength: 20, maxLength: 100 }),
          itineraryName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (authState) => {
          // Setup: Configure auth state as authenticated
          mockUseAuth.mockReturnValue({
            state: {
              isAuthenticated: authState.isAuthenticated,
              user: {
                sub: authState.userId,
                email: authState.email,
                emailVerified: true,
              },
              accessToken: authState.accessToken,
              isLoading: false,
              error: null,
            },
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            confirmResetPassword: vi.fn(),
            refreshToken: vi.fn(),
          });

          localStorageMock.clear();
          mockCreateItinerary.mockClear();
          mockUpdateItinerary.mockClear();
          mockListItineraries.mockClear();

          const { result, unmount } = renderHook(() => useItinerary(), { wrapper });

          try {
            // Wait for initial render and effects (should trigger listItineraries)
            await waitFor(() => {
              expect(result.current.state.storageMode).toBe('api');
            }, { timeout: 2000 });

            // Property assertion 1: Storage mode should be 'api'
            expect(result.current.state.storageMode).toBe('api');

            // Property assertion 2: Initial load should have called listItineraries
            await waitFor(() => {
              expect(mockListItineraries).toHaveBeenCalled();
            }, { timeout: 1000 });

            // Property assertion 3: Creating and saving should use API, not localStorage
            await act(async () => {
              result.current.createItinerary(authState.itineraryName);
            });

            await act(async () => {
              await result.current.saveItinerary();
            });

            // Wait for API call to complete
            await waitFor(() => {
              expect(mockCreateItinerary).toHaveBeenCalled();
            }, { timeout: 1000 });
            
            // Should NOT save to localStorage
            const savedData = localStorageMock.getItem('italy-trip-planner:itinerary');
            expect(savedData).toBeNull();
          } finally {
            unmount();
          }
        }
      ),
      {
        numRuns: 10, // Run 10 different test cases
        endOnFailure: true,
      }
    );
  });

  /**
   * Property: Storage mode is correctly set based on authentication state
   * 
   * **Validates Requirements 5.1, 5.2:**
   * - Unauthenticated users have storageMode === 'localStorage'
   * - Authenticated users have storageMode === 'api'
   */
  it('Property: Storage mode always matches authentication state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isAuthenticated: fc.boolean(),
          userId: fc.uuid(),
          email: fc.emailAddress(),
          accessToken: fc.string({ minLength: 20, maxLength: 100 }),
        }),
        async (testCase) => {
          // Setup auth state based on test case
          mockUseAuth.mockReturnValue({
            state: {
              isAuthenticated: testCase.isAuthenticated,
              user: testCase.isAuthenticated ? {
                sub: testCase.userId,
                email: testCase.email,
                emailVerified: true,
              } : null,
              accessToken: testCase.isAuthenticated ? testCase.accessToken : null,
              isLoading: false,
              error: null,
            },
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            confirmResetPassword: vi.fn(),
            refreshToken: vi.fn(),
          });

          localStorageMock.clear();
          mockListItineraries.mockClear();

          const { result, unmount } = renderHook(() => useItinerary(), { wrapper });

          try {
            // Wait for initial state to settle
            await waitFor(() => {
              expect(result.current.state).toBeDefined();
            }, { timeout: 1000 });

            // Property assertion: Storage mode must match auth state
            const expectedMode = testCase.isAuthenticated ? 'api' : 'localStorage';
            await waitFor(() => {
              expect(result.current.state.storageMode).toBe(expectedMode);
            }, { timeout: 1000 });
          } finally {
            unmount();
          }
        }
      ),
      {
        numRuns: 20,
        endOnFailure: true,
      }
    );
  });

  /**
   * Property: API operations only occur when authenticated
   * 
   * Tests that API client methods are only called when storageMode is 'api',
   * which corresponds to authenticated state.
   */
  it('Property: API methods called only when authenticated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isAuthenticated: fc.boolean(),
          userId: fc.uuid(),
          email: fc.emailAddress(),
          accessToken: fc.string({ minLength: 20, maxLength: 100 }),
          itineraryName: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async (testCase) => {
          // Setup auth state
          mockUseAuth.mockReturnValue({
            state: {
              isAuthenticated: testCase.isAuthenticated,
              user: testCase.isAuthenticated ? {
                sub: testCase.userId,
                email: testCase.email,
                emailVerified: true,
              } : null,
              accessToken: testCase.isAuthenticated ? testCase.accessToken : null,
              isLoading: false,
              error: null,
            },
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            confirmResetPassword: vi.fn(),
            refreshToken: vi.fn(),
          });

          localStorageMock.clear();
          mockCreateItinerary.mockClear();
          mockUpdateItinerary.mockClear();
          mockListItineraries.mockClear();

          const { result, unmount } = renderHook(() => useItinerary(), { wrapper });

          try {
            await waitFor(() => {
              expect(result.current.state).toBeDefined();
            }, { timeout: 1000 });

            // Create and save an itinerary
            await act(async () => {
              result.current.createItinerary(testCase.itineraryName);
            });

            await act(async () => {
              await result.current.saveItinerary();
            });

            // Wait for saves to complete
            await waitFor(() => {
              expect(result.current.state.isLoading).toBe(false);
            }, { timeout: 1000 });

            // Property assertion: API should only be called when authenticated
            if (testCase.isAuthenticated) {
              expect(mockCreateItinerary).toHaveBeenCalled();
            } else {
              expect(mockCreateItinerary).not.toHaveBeenCalled();
            }
          } finally {
            unmount();
          }
        }
      ),
      {
        numRuns: 10,
        endOnFailure: true,
      }
    );
  });

  /**
   * Property: Delete operations only call API when authenticated
   * 
   * Tests that deleting an itinerary uses the correct mechanism
   * based on authentication state.
   */
  it('Property: Delete API called only when authenticated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          isAuthenticated: fc.constant(true), // Only test authenticated for delete
          userId: fc.uuid(),
          email: fc.emailAddress(),
          accessToken: fc.string({ minLength: 20, maxLength: 100 }),
          itineraryId: fc.string({ minLength: 10, maxLength: 30 }),
        }),
        async (testCase) => {
          // Setup auth state
          mockUseAuth.mockReturnValue({
            state: {
              isAuthenticated: testCase.isAuthenticated,
              user: {
                sub: testCase.userId,
                email: testCase.email,
                emailVerified: true,
              },
              accessToken: testCase.accessToken,
              isLoading: false,
              error: null,
            },
            signUp: vi.fn(),
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            confirmResetPassword: vi.fn(),
            refreshToken: vi.fn(),
          });

          mockDeleteItinerary.mockClear();

          const { result, unmount } = renderHook(() => useItinerary(), { wrapper });

          try {
            await waitFor(() => {
              expect(result.current.state.storageMode).toBe('api');
            }, { timeout: 1000 });

            // Delete an itinerary
            await act(async () => {
              await result.current.deleteItinerary(testCase.itineraryId);
            });

            // Property assertion: Should call API delete
            await waitFor(() => {
              expect(mockDeleteItinerary).toHaveBeenCalledWith(testCase.itineraryId);
            }, { timeout: 500 });
          } finally {
            unmount();
          }
        }
      ),
      {
        numRuns: 10,
        endOnFailure: true,
      }
    );
  });
});
