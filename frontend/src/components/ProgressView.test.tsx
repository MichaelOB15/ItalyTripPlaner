import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProgressView } from './ProgressView';
import { ItineraryContext, ItineraryContextValue } from '../contexts/ItineraryContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Itinerary } from '../types';

// Mock the useAuth hook
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

/**
 * Test suite for ProgressView component - Task 10.3, 10.6
 * 
 * Tests the three main itinerary actions:
 * - View: load itinerary in read-only mode
 * - Edit: load itinerary into editor
 * - Delete: show confirmation dialog, call deleteItinerary
 * - Guest user authentication gate
 * 
 * **Validates Requirements: 6.4, 6.5, 6.6, 8.3, 8.4, 8.5**
 */

// Mock itinerary data
const mockItinerary: Itinerary = {
  id: 'itin_123',
  name: 'Rome Adventure',
  days: [
    { day_number: 1, places: [], total_duration: 0, start_time: '08:00' },
    { day_number: 2, places: [], total_duration: 0, start_time: '08:00' },
    { day_number: 3, places: [], total_duration: 0, start_time: '08:00' },
  ],
  preferences: {
    cities: ['Rome'],
    interests: [],
    pace: 'moderate',
    price_range: [],
    include_booking_required: true,
  },
  created_at: '2024-01-15T10:00:00Z',
  last_modified: '2024-01-20T15:30:00Z',
};

const mockItinerary2: Itinerary = {
  ...mockItinerary,
  id: 'itin_456',
  name: 'Florence Weekend',
  created_at: '2024-01-10T09:00:00Z',
  last_modified: '2024-01-12T11:00:00Z',
};

describe('ProgressView - Itinerary Actions (Task 10.3, 10.6)', () => {
  let mockReplaceItinerary: ReturnType<typeof vi.fn>;
  let mockSetEditingMode: ReturnType<typeof vi.fn>;
  let mockDeleteItinerary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReplaceItinerary = vi.fn();
    mockSetEditingMode = vi.fn();
    mockDeleteItinerary = vi.fn().mockResolvedValue(undefined);
  });

  const renderWithContext = (savedItineraries: Itinerary[] = [], isAuthenticated = true) => {
    const mockContextValue: ItineraryContextValue = {
      state: {
        currentItinerary: null,
        savedItineraries,
        isEditing: false,
        hasUnsavedChanges: false,
        storageMode: 'api',
        isLoading: false,
        error: null,
      },
      replaceItinerary: mockReplaceItinerary,
      setEditingMode: mockSetEditingMode,
      deleteItinerary: mockDeleteItinerary,
      createItinerary: vi.fn(),
      updateItineraryName: vi.fn(),
      addPlaceToDay: vi.fn(),
      removePlaceFromDay: vi.fn(),
      reorderPlacesInDay: vi.fn(),
      movePlaceBetweenDays: vi.fn(),
      updateDayStartTime: vi.fn(),
      replacePlace: vi.fn(),
      clearDay: vi.fn(),
      clearItinerary: vi.fn(),
      updatePreferences: vi.fn(),
      saveItinerary: vi.fn(),
      loadItinerary: vi.fn(),
    };

    // Mock the useAuth hook to return the desired authentication state
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      state: {
        isAuthenticated,
        user: isAuthenticated ? {
          sub: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
        } : null,
        accessToken: isAuthenticated ? 'mock-token' : null,
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

    return render(
      <ItineraryContext.Provider value={mockContextValue}>
        <ProgressView />
      </ItineraryContext.Provider>
    );
  };

  describe('View Action (Requirement 6.4)', () => {
    test('should load itinerary in read-only mode when View button is clicked', () => {
      renderWithContext([mockItinerary]);
      const viewButton = screen.getByRole('button', { name: /view itinerary: rome adventure/i });
      fireEvent.click(viewButton);
      expect(mockReplaceItinerary).toHaveBeenCalledWith(mockItinerary);
      expect(mockSetEditingMode).toHaveBeenCalledWith(false);
    });
  });

  describe('Edit Action (Requirement 6.4)', () => {
    test('should load itinerary into editor when Edit button is clicked', () => {
      renderWithContext([mockItinerary]);
      const editButton = screen.getByRole('button', { name: /edit itinerary: rome adventure/i });
      fireEvent.click(editButton);
      expect(mockReplaceItinerary).toHaveBeenCalledWith(mockItinerary);
      expect(mockSetEditingMode).toHaveBeenCalledWith(true);
    });
  });

  describe('Delete Action (Requirements 6.5, 6.6)', () => {
    test('should show confirmation dialog when Delete button is clicked', () => {
      renderWithContext([mockItinerary]);
      const deleteButton = screen.getByRole('button', { name: /delete itinerary: rome adventure/i });
      fireEvent.click(deleteButton);
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel delete/i })).toBeInTheDocument();
      expect(mockDeleteItinerary).not.toHaveBeenCalled();
    });

    test('should call deleteItinerary when Confirm button is clicked', async () => {
      renderWithContext([mockItinerary]);
      const deleteButton = screen.getByRole('button', { name: /delete itinerary: rome adventure/i });
      fireEvent.click(deleteButton);
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      fireEvent.click(confirmButton);
      await waitFor(() => {
        expect(mockDeleteItinerary).toHaveBeenCalledWith('itin_123');
      });
    });

    test('should hide confirmation dialog when Cancel button is clicked', () => {
      renderWithContext([mockItinerary]);
      const deleteButton = screen.getByRole('button', { name: /delete itinerary: rome adventure/i });
      fireEvent.click(deleteButton);
      const cancelButton = screen.getByRole('button', { name: /cancel delete/i });
      fireEvent.click(cancelButton);
      expect(screen.queryByRole('button', { name: /confirm delete/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete itinerary: rome adventure/i })).toBeInTheDocument();
      expect(mockDeleteItinerary).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Itineraries', () => {
    test('should handle actions on correct itinerary when multiple exist', () => {
      renderWithContext([mockItinerary, mockItinerary2]);
      const viewButtons = screen.getAllByRole('button', { name: /view itinerary/i });
      fireEvent.click(viewButtons[1]);
      expect(mockReplaceItinerary).toHaveBeenCalledWith(mockItinerary2);
      expect(mockSetEditingMode).toHaveBeenCalledWith(false);
    });
  });

  describe('Guest User Authentication Gate (Task 10.6, Requirements 8.3, 8.4, 8.5)', () => {
    test('should show authentication gate for unauthenticated users', () => {
      renderWithContext([], false);
      expect(screen.getByText(/sign in to access your saved itineraries/i)).toBeInTheDocument();
      expect(screen.getByText(/guest mode limitations/i)).toBeInTheDocument();
      expect(screen.getByText(/stored locally on this device only/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/access your itineraries from any device/i)).toBeInTheDocument();
      expect(screen.getByText(/save multiple trip itineraries/i)).toBeInTheDocument();
      expect(screen.getByText(/never lose your travel plans/i)).toBeInTheDocument();
    });

    test('should not show itinerary list for unauthenticated users', () => {
      renderWithContext([mockItinerary], false);
      expect(screen.getByText(/sign in to access your saved itineraries/i)).toBeInTheDocument();
      expect(screen.queryByText('Rome Adventure')).not.toBeInTheDocument();
      expect(screen.queryByText(/my saved itineraries/i)).not.toBeInTheDocument();
    });

    test('should show itinerary list for authenticated users', () => {
      renderWithContext([mockItinerary], true);
      expect(screen.getByText(/my saved itineraries/i)).toBeInTheDocument();
      expect(screen.getByText('Rome Adventure')).toBeInTheDocument();
      expect(screen.queryByText(/sign in to access your saved itineraries/i)).not.toBeInTheDocument();
    });
  });
});

/**
 * Test suite for ProgressView display functionality - Task 12.15
 * 
 * Tests the Progress View component's display features:
 * - Correct display of itinerary fields (name, created date, modified date)
 * - Empty state handling
 * - Loading indicators
 * - Itinerary count display
 * - List sorting by modification time
 * 
 * **Validates Requirements: 6.2, 6.3, 6.7, 6.8, 9.6**
 * **Property 15: Progress View Field Display**
 */
describe('ProgressView - Display Functionality (Task 12.15)', () => {
  let mockReplaceItinerary: ReturnType<typeof vi.fn>;
  let mockSetEditingMode: ReturnType<typeof vi.fn>;
  let mockDeleteItinerary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReplaceItinerary = vi.fn();
    mockSetEditingMode = vi.fn();
    mockDeleteItinerary = vi.fn().mockResolvedValue(undefined);
  });

  const renderWithItineraries = (
    savedItineraries: Itinerary[] = [],
    isLoading: boolean = false
  ) => {
    const mockContextValue: ItineraryContextValue = {
      state: {
        currentItinerary: null,
        savedItineraries,
        isEditing: false,
        hasUnsavedChanges: false,
        storageMode: 'api',
        isLoading,
        error: null,
      },
      replaceItinerary: mockReplaceItinerary,
      setEditingMode: mockSetEditingMode,
      deleteItinerary: mockDeleteItinerary,
      createItinerary: vi.fn(),
      updateItineraryName: vi.fn(),
      addPlaceToDay: vi.fn(),
      removePlaceFromDay: vi.fn(),
      reorderPlacesInDay: vi.fn(),
      movePlaceBetweenDays: vi.fn(),
      updateDayStartTime: vi.fn(),
      replacePlace: vi.fn(),
      clearDay: vi.fn(),
      clearItinerary: vi.fn(),
      updatePreferences: vi.fn(),
      saveItinerary: vi.fn(),
      loadItinerary: vi.fn(),
    };

    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      state: {
        isAuthenticated: true,
        user: {
          sub: 'user-123',
          email: 'test@example.com',
          emailVerified: true,
        },
        accessToken: 'mock-token',
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

    return render(
      <ItineraryContext.Provider value={mockContextValue}>
        <ProgressView />
      </ItineraryContext.Provider>
    );
  };

  describe('Itinerary Display (Requirement 6.2, 6.3)', () => {
    test('should display itinerary name correctly', () => {
      renderWithItineraries([mockItinerary]);
      expect(screen.getByText('Rome Adventure')).toBeInTheDocument();
    });

    test('should display created date in human-readable format', () => {
      renderWithItineraries([mockItinerary]);
      expect(screen.getByText(/Created: Jan 15, 2024/i)).toBeInTheDocument();
    });

    test('should display modified date in human-readable format', () => {
      renderWithItineraries([mockItinerary]);
      expect(screen.getByText(/Modified: Jan 20, 2024/i)).toBeInTheDocument();
    });

    test('should display all fields for multiple itineraries', () => {
      renderWithItineraries([mockItinerary, mockItinerary2]);
      
      // First itinerary
      expect(screen.getByText('Rome Adventure')).toBeInTheDocument();
      expect(screen.getByText(/Created: Jan 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Modified: Jan 20, 2024/i)).toBeInTheDocument();
      
      // Second itinerary
      expect(screen.getByText('Florence Weekend')).toBeInTheDocument();
      expect(screen.getByText(/Created: Jan 10, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Modified: Jan 12, 2024/i)).toBeInTheDocument();
    });

    test('should handle invalid date formats gracefully', () => {
      const itineraryWithBadDate: Itinerary = {
        ...mockItinerary,
        created_at: 'invalid-date',
        last_modified: 'also-invalid',
      };
      
      renderWithItineraries([itineraryWithBadDate]);
      expect(screen.getByText('Rome Adventure')).toBeInTheDocument();
      expect(screen.getByText(/Created: Invalid date/i)).toBeInTheDocument();
      expect(screen.getByText(/Modified: Invalid date/i)).toBeInTheDocument();
    });
  });

  describe('Empty State (Requirement 6.7)', () => {
    test('should display empty state message when no itineraries exist', () => {
      renderWithItineraries([]);
      expect(screen.getByText(/no saved itineraries/i)).toBeInTheDocument();
    });

    test('should display call-to-action in empty state', () => {
      renderWithItineraries([]);
      expect(screen.getByText(/get started by creating your first italy trip itinerary/i)).toBeInTheDocument();
    });

    test('should show create button in empty state', () => {
      renderWithItineraries([]);
      const createButtons = screen.getAllByRole('button', { name: /create/i });
      expect(createButtons.length).toBeGreaterThan(0);
    });

    test('should not show empty state when itineraries exist', () => {
      renderWithItineraries([mockItinerary]);
      expect(screen.queryByText(/no saved itineraries/i)).not.toBeInTheDocument();
      expect(screen.getByText('Rome Adventure')).toBeInTheDocument();
    });
  });

  describe('Loading State (Requirement 9.6)', () => {
    test('should display loading indicator when isLoading is true', () => {
      renderWithItineraries([], true);
      expect(screen.getByText(/loading itineraries/i)).toBeInTheDocument();
    });

    test('should show spinner animation during loading', () => {
      renderWithItineraries([], true);
      const spinner = screen.getByText(/loading itineraries/i).previousElementSibling;
      expect(spinner).toHaveClass('animate-spin');
    });

    test('should not display itineraries while loading', () => {
      renderWithItineraries([mockItinerary], true);
      expect(screen.getByText(/loading itineraries/i)).toBeInTheDocument();
      expect(screen.queryByText('Rome Adventure')).not.toBeInTheDocument();
    });

    test('should not display empty state while loading', () => {
      renderWithItineraries([], true);
      expect(screen.getByText(/loading itineraries/i)).toBeInTheDocument();
      expect(screen.queryByText(/no saved itineraries/i)).not.toBeInTheDocument();
    });

    test('should display itineraries after loading completes', () => {
      const { rerender } = renderWithItineraries([mockItinerary], true);
      expect(screen.getByText(/loading itineraries/i)).toBeInTheDocument();
      
      // Simulate loading complete
      const mockContextValue: ItineraryContextValue = {
        state: {
          currentItinerary: null,
          savedItineraries: [mockItinerary],
          isEditing: false,
          hasUnsavedChanges: false,
          storageMode: 'api',
          isLoading: false,
          error: null,
        },
        replaceItinerary: mockReplaceItinerary,
        setEditingMode: mockSetEditingMode,
        deleteItinerary: mockDeleteItinerary,
        createItinerary: vi.fn(),
        updateItineraryName: vi.fn(),
        addPlaceToDay: vi.fn(),
        removePlaceFromDay: vi.fn(),
        reorderPlacesInDay: vi.fn(),
        movePlaceBetweenDays: vi.fn(),
        updateDayStartTime: vi.fn(),
        replacePlace: vi.fn(),
        clearDay: vi.fn(),
        clearItinerary: vi.fn(),
        updatePreferences: vi.fn(),
        saveItinerary: vi.fn(),
        loadItinerary: vi.fn(),
      };

      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: { sub: 'user-123', email: 'test@example.com', emailVerified: true },
          accessToken: 'mock-token',
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

      rerender(
        <ItineraryContext.Provider value={mockContextValue}>
          <ProgressView />
        </ItineraryContext.Provider>
      );
      
      expect(screen.queryByText(/loading itineraries/i)).not.toBeInTheDocument();
      expect(screen.getByText('Rome Adventure')).toBeInTheDocument();
    });
  });

  describe('Itinerary Count Display (Requirement 6.8)', () => {
    test('should display count of 0 for empty list', () => {
      renderWithItineraries([]);
      expect(screen.getByText(/total: 0 itineraries/i)).toBeInTheDocument();
    });

    test('should display singular "itinerary" for count of 1', () => {
      renderWithItineraries([mockItinerary]);
      expect(screen.getByText(/total: 1 itinerary$/i)).toBeInTheDocument();
    });

    test('should display plural "itineraries" for count of 2', () => {
      renderWithItineraries([mockItinerary, mockItinerary2]);
      expect(screen.getByText(/total: 2 itineraries/i)).toBeInTheDocument();
    });

    test('should display correct count for multiple itineraries', () => {
      const threeItineraries = [
        mockItinerary,
        mockItinerary2,
        { ...mockItinerary, id: 'itin_789', name: 'Venice Carnival' },
      ];
      renderWithItineraries(threeItineraries);
      expect(screen.getByText(/total: 3 itineraries/i)).toBeInTheDocument();
    });

    test('should update count when list changes', () => {
      const { rerender } = renderWithItineraries([mockItinerary]);
      expect(screen.getByText(/total: 1 itinerary/i)).toBeInTheDocument();
      
      // Add another itinerary
      const mockContextValue: ItineraryContextValue = {
        state: {
          currentItinerary: null,
          savedItineraries: [mockItinerary, mockItinerary2],
          isEditing: false,
          hasUnsavedChanges: false,
          storageMode: 'api',
          isLoading: false,
          error: null,
        },
        replaceItinerary: mockReplaceItinerary,
        setEditingMode: mockSetEditingMode,
        deleteItinerary: mockDeleteItinerary,
        createItinerary: vi.fn(),
        updateItineraryName: vi.fn(),
        addPlaceToDay: vi.fn(),
        removePlaceFromDay: vi.fn(),
        reorderPlacesInDay: vi.fn(),
        movePlaceBetweenDays: vi.fn(),
        updateDayStartTime: vi.fn(),
        replacePlace: vi.fn(),
        clearDay: vi.fn(),
        clearItinerary: vi.fn(),
        updatePreferences: vi.fn(),
        saveItinerary: vi.fn(),
        loadItinerary: vi.fn(),
      };

      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        state: {
          isAuthenticated: true,
          user: { sub: 'user-123', email: 'test@example.com', emailVerified: true },
          accessToken: 'mock-token',
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

      rerender(
        <ItineraryContext.Provider value={mockContextValue}>
          <ProgressView />
        </ItineraryContext.Provider>
      );
      
      expect(screen.getByText(/total: 2 itineraries/i)).toBeInTheDocument();
    });

    test('should accurately count large number of itineraries', () => {
      // Create 10 itineraries to test larger counts
      const manyItineraries = Array.from({ length: 10 }, (_, i) => ({
        ...mockItinerary,
        id: `itin_${i}`,
        name: `Trip ${i + 1}`,
      }));
      renderWithItineraries(manyItineraries);
      expect(screen.getByText(/total: 10 itineraries/i)).toBeInTheDocument();
    });

    test('should match displayed count to actual number of rendered itinerary cards', () => {
      const threeItineraries = [
        mockItinerary,
        mockItinerary2,
        { ...mockItinerary, id: 'itin_789', name: 'Venice Carnival' },
      ];
      renderWithItineraries(threeItineraries);
      
      // Verify count text
      expect(screen.getByText(/total: 3 itineraries/i)).toBeInTheDocument();
      
      // Verify actual number of itinerary cards rendered
      const viewButtons = screen.getAllByRole('button', { name: /view itinerary/i });
      expect(viewButtons).toHaveLength(3);
    });

    test('should continue to show count during loading state', () => {
      // The count reflects the current state and remains visible during loading
      renderWithItineraries([mockItinerary], true);
      expect(screen.getByText(/loading itineraries/i)).toBeInTheDocument();
      expect(screen.getByText(/total: 1 itinerary/i)).toBeInTheDocument();
    });
  });

  describe('List Sorting (Requirement 4.4)', () => {
    test('should sort itineraries by last_modified descending (most recent first)', () => {
      const oldItinerary: Itinerary = {
        ...mockItinerary,
        id: 'itin_old',
        name: 'Old Trip',
        last_modified: '2024-01-01T10:00:00Z',
      };
      
      const recentItinerary: Itinerary = {
        ...mockItinerary,
        id: 'itin_recent',
        name: 'Recent Trip',
        last_modified: '2024-01-25T10:00:00Z',
      };
      
      const middleItinerary: Itinerary = {
        ...mockItinerary,
        id: 'itin_middle',
        name: 'Middle Trip',
        last_modified: '2024-01-15T10:00:00Z',
      };

      // Render in non-sorted order
      renderWithItineraries([oldItinerary, recentItinerary, middleItinerary]);
      
      const itineraryNames = screen.getAllByText(/Trip$/).map(el => el.textContent);
      
      // Should be sorted by last_modified descending
      expect(itineraryNames[0]).toBe('Recent Trip');
      expect(itineraryNames[1]).toBe('Middle Trip');
      expect(itineraryNames[2]).toBe('Old Trip');
    });

    test('should handle equal modification timestamps', () => {
      const sameTime = '2024-01-15T10:00:00Z';
      const trip1: Itinerary = {
        ...mockItinerary,
        id: 'itin_1',
        name: 'Trip 1',
        last_modified: sameTime,
      };
      
      const trip2: Itinerary = {
        ...mockItinerary,
        id: 'itin_2',
        name: 'Trip 2',
        last_modified: sameTime,
      };

      renderWithItineraries([trip1, trip2]);
      
      // Both should be displayed (order doesn't matter when times are equal)
      expect(screen.getByText('Trip 1')).toBeInTheDocument();
      expect(screen.getByText('Trip 2')).toBeInTheDocument();
    });
  });

  describe('Header and Navigation', () => {
    test('should display "My Saved Itineraries" heading', () => {
      renderWithItineraries([mockItinerary]);
      expect(screen.getByText(/my saved itineraries/i)).toBeInTheDocument();
    });

    test('should display "New Itinerary" button in header', () => {
      renderWithItineraries([mockItinerary]);
      expect(screen.getByRole('button', { name: /new itinerary/i })).toBeInTheDocument();
    });

    test('should call setEditingMode when New Itinerary button is clicked', () => {
      renderWithItineraries([mockItinerary]);
      const newButton = screen.getByRole('button', { name: /new itinerary/i });
      fireEvent.click(newButton);
      expect(mockSetEditingMode).toHaveBeenCalledWith(true);
    });
  });
});
