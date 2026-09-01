import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ItineraryPanel } from './ItineraryPanel';
import { ItineraryProvider } from '../contexts/ItineraryContext';
import { Place, Itinerary, DayPlan, UserPreferences } from '../types';
import { apiClient } from '../services/api';

// ============================================================================
// Mocks
// ============================================================================

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    getRecommendations: vi.fn(),
  },
}));

// Mock window.print
window.print = vi.fn();

// Mock window.confirm
window.confirm = vi.fn();

// Mock window.alert
window.alert = vi.fn();

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock place for testing
 */
function createMockPlace(overrides?: Partial<Place>): Place {
  return {
    id: 'place_001',
    name: 'Test Place',
    type: 'restaurant',
    city: 'Rome',
    latitude: 41.9028,
    longitude: 12.4964,
    description: 'Test description',
    hours: '9:00 AM - 5:00 PM',
    duration_minutes: 60,
    price_range: '€€',
    rating: 4.5,
    tags: ['food', 'popular'],
    seasonal_notes: null,
    booking_required: false,
    region: 'Lazio',
    neighborhood: 'Centro Storico',
    ...overrides,
  };
}

/**
 * Create a mock day plan
 */
function createMockDayPlan(
  dayNumber: 1 | 2 | 3,
  places: Place[] = []
): DayPlan {
  const totalDuration = places.reduce(
    (sum, place) => sum + (place.duration_minutes || 60),
    0
  );

  return {
    day_number: dayNumber,
    places,
    total_duration: totalDuration,
    start_time: '08:00',
  };
}

/**
 * Create a mock itinerary
 */
function createMockItinerary(
  places: [Place[], Place[], Place[]] = [[], [], []]
): Itinerary {
  return {
    id: 'itinerary_001',
    name: 'My Italy Trip',
    days: [
      createMockDayPlan(1, places[0]),
      createMockDayPlan(2, places[1]),
      createMockDayPlan(3, places[2]),
    ],
    preferences: {
      cities: ['Rome'],
      interests: ['food', 'history'],
      pace: 'moderate',
      price_range: ['€€'],
      include_booking_required: true,
    },
    created_at: new Date().toISOString(),
    last_modified: new Date().toISOString(),
  };
}

/**
 * Render component with necessary providers
 */
function renderWithProviders(component: React.ReactElement) {
  return render(
    <ItineraryProvider>
      <DndProvider backend={HTML5Backend}>{component}</DndProvider>
    </ItineraryProvider>
  );
}

/**
 * Setup a test with an active itinerary
 */
function setupWithItinerary(itinerary: Itinerary) {
  // Store the itinerary in localStorage
  localStorage.setItem('italy-trip-planner:itinerary', JSON.stringify(itinerary));
}

// ============================================================================
// Tests
// ============================================================================

describe('ItineraryPanel', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing when no itinerary exists', () => {
      renderWithProviders(<ItineraryPanel />);
      
      // Should show empty state
      expect(screen.getByText(/No Itinerary Yet/i)).toBeInTheDocument();
    });

    it('should render ItineraryHeader when itinerary exists', () => {
      const place1 = createMockPlace({ id: 'place_001', name: 'Colosseum' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Header should display itinerary name
      expect(screen.getByText('My Italy Trip')).toBeInTheDocument();
    });

    it('should render DayPlanList when itinerary exists', () => {
      const place1 = createMockPlace({ id: 'place_001', name: 'Colosseum' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Day headers should be visible
      expect(screen.getByText('Day 1')).toBeInTheDocument();
      expect(screen.getByText('Day 2')).toBeInTheDocument();
      expect(screen.getByText('Day 3')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderWithProviders(
        <ItineraryPanel className="custom-class" />
      );

      const panel = container.querySelector('.custom-class');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('DnD Provider', () => {
    it('should wrap content with DndProvider', () => {
      const place1 = createMockPlace({ id: 'place_001', name: 'Colosseum' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Places should be draggable (have drag handle)
      const dragHandle = screen.getByRole('listitem', { name: /Colosseum/i });
      expect(dragHandle).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should not show export error initially', () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // No error toast should be visible
      expect(screen.queryByText(/Export Failed/i)).not.toBeInTheDocument();
    });

    it('should show alert when export PDF is clicked (placeholder)', () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Click export PDF button
      const exportButton = screen.getByRole('button', { name: /Export itinerary as PDF/i });
      fireEvent.click(exportButton);

      // Should call alert with placeholder message
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('PDF export functionality will be implemented')
      );
    });
  });

  describe('Replan Functionality', () => {
    it('should open replan dialog when replan button is clicked', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Click replan button
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Dialog should be visible
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      expect(screen.getByText(/Replan Your Itinerary/i)).toBeInTheDocument();
    });

    it('should display current preferences in replan dialog', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Open replan dialog
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Replan Your Itinerary/i)).toBeInTheDocument();
      });

      // Current pace should be selected
      const moderateButton = screen.getByRole('button', { name: /^moderate$/i });
      expect(moderateButton).toHaveClass('bg-blue-600');

      // Current cities should be shown
      const citiesInput = screen.getByLabelText(/Preferred Cities/i);
      expect(citiesInput).toHaveValue('Rome');
    });

    it('should allow updating preferences in replan dialog', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Open replan dialog
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Replan Your Itinerary/i)).toBeInTheDocument();
      });

      // Change pace to relaxed
      const relaxedButton = screen.getByRole('button', { name: /^relaxed$/i });
      fireEvent.click(relaxedButton);

      expect(relaxedButton).toHaveClass('bg-blue-600');
    });

    it('should close replan dialog when cancel is clicked', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Open replan dialog
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Replan Your Itinerary/i)).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      // Dialog should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should call API when generate new itinerary is clicked', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      // Mock successful API response
      const mockResponse = {
        itinerary: createMockItinerary([[], [], []]),
        reasoning: 'New recommendations generated',
        alternative_places: [],
      };
      vi.mocked(apiClient.getRecommendations).mockResolvedValue(mockResponse);

      renderWithProviders(<ItineraryPanel />);

      // Open replan dialog
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Replan Your Itinerary/i)).toBeInTheDocument();
      });

      // Submit form
      const generateButton = screen.getByRole('button', { 
        name: /Generate New Itinerary/i 
      });
      fireEvent.click(generateButton);

      // Should call API with preferences
      await waitFor(() => {
        expect(apiClient.getRecommendations).toHaveBeenCalledWith(
          expect.objectContaining({
            cities: ['Rome'],
            pace: 'moderate',
          }),
          itinerary
        );
      });
    });

    it('should show loading state during replan', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      // Mock API with delay
      vi.mocked(apiClient.getRecommendations).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<ItineraryPanel />);

      // Open replan dialog
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Replan Your Itinerary/i)).toBeInTheDocument();
      });

      // Submit form
      const generateButton = screen.getByRole('button', { 
        name: /Generate New Itinerary/i 
      });
      fireEvent.click(generateButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Generating.../i)).toBeInTheDocument();
      });
      
      // Button should be disabled
      expect(generateButton).toBeDisabled();
    });

    it('should show error message when replan fails', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      // Mock API failure
      vi.mocked(apiClient.getRecommendations).mockRejectedValue(
        new Error('Network error')
      );

      renderWithProviders(<ItineraryPanel />);

      // Open replan dialog
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Replan Your Itinerary/i)).toBeInTheDocument();
      });

      // Submit form
      const generateButton = screen.getByRole('button', { 
        name: /Generate New Itinerary/i 
      });
      fireEvent.click(generateButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Add Place Callback', () => {
    it('should call onAddPlace when add place button is clicked', () => {
      const onAddPlace = vi.fn();
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel onAddPlace={onAddPlace} />);

      // Click add place button for day 1
      const addButtons = screen.getAllByRole('button', { name: /Add place/i });
      fireEvent.click(addButtons[0]);

      // Should call callback with day number 1
      expect(onAddPlace).toHaveBeenCalledWith(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog role for replan modal', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Open replan dialog
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Dialog should have proper role and aria attributes
      const dialog = await screen.findByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'replan-dialog-title');
    });

    it('should have proper labels for form inputs in replan dialog', async () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Open replan dialog
      const replanButton = screen.getByRole('button', { 
        name: /Regenerate itinerary with new preferences/i 
      });
      fireEvent.click(replanButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText(/Trip Pace/i)).toBeInTheDocument();
      });

      // All inputs should have labels
      expect(screen.getByLabelText(/Preferred Cities/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Interests\/Tags/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing itinerary gracefully', () => {
      renderWithProviders(<ItineraryPanel />);

      // Should show empty state without errors
      expect(screen.getByText(/No Itinerary Yet/i)).toBeInTheDocument();
    });

    it('should handle itinerary without preferences', () => {
      const place1 = createMockPlace({ id: 'place_001' });
      const itinerary = createMockItinerary([[place1], [], []]);
      
      // Remove preferences
      itinerary.preferences = {
        cities: [],
        interests: [],
        pace: 'moderate',
        price_range: [],
        include_booking_required: true,
      };
      
      setupWithItinerary(itinerary);

      renderWithProviders(<ItineraryPanel />);

      // Should render without errors - use getAllByText for multiple instances
      const titles = screen.getAllByText('My Italy Trip');
      expect(titles.length).toBeGreaterThan(0);
    });
  });
});
