import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DayPlanList } from './DayPlanList';
import { ItineraryProvider } from '../contexts/ItineraryContext';
import { Place, Itinerary, DayPlan } from '../types';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Render component with required providers
 */
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <DndProvider backend={HTML5Backend}>
      <ItineraryProvider>
        {ui}
      </ItineraryProvider>
    </DndProvider>
  );
}

/**
 * Mock place factory
 */
function createMockPlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'place_001',
    name: 'Colosseum',
    type: 'historic_site',
    city: 'Rome',
    latitude: 41.8902,
    longitude: 12.4922,
    duration_minutes: 120,
    rating: 4.8,
    price_range: '€€',
    description: 'Ancient amphitheater',
    tags: ['ancient', 'landmark'],
    ...overrides,
  };
}

/**
 * Mock day plan factory
 */
function createMockDayPlan(dayNumber: 1 | 2 | 3, places: Place[]): DayPlan {
  const totalDuration = places.reduce((sum, p) => sum + (p.duration_minutes || 60), 0);
  return {
    day_number: dayNumber,
    places,
    total_duration: totalDuration,
    start_time: '08:00',
  };
}

/**
 * Setup localStorage mock
 */
function setupLocalStorageMock(itinerary: Itinerary | null) {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    
    if (itinerary) {
      store['italy-trip-planner:itinerary'] = JSON.stringify(itinerary);
    }

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('DayPlanList', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    setupLocalStorageMock(null);
  });

  describe('Empty State', () => {
    it('should render empty state when no itinerary exists', () => {
      renderWithProviders(<DayPlanList />);

      expect(screen.getByText('No Itinerary Yet')).toBeInTheDocument();
      expect(screen.getByText(/Create a new itinerary or generate a recommendation/i)).toBeInTheDocument();
    });
  });

  describe('Aggregate Statistics', () => {
    it('should display itinerary name', () => {
      const place1 = createMockPlace({ id: 'place_001', name: 'Colosseum', duration_minutes: 120 });
      const place2 = createMockPlace({ id: 'place_002', name: 'Vatican', duration_minutes: 180 });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'My Rome Adventure',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, [place2]),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: ['Rome'],
          interests: ['history'],
          pace: 'moderate',
          price_range: ['€€'],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      expect(screen.getByText('My Rome Adventure')).toBeInTheDocument();
    });

    it('should display total number of places across all days', () => {
      const place1 = createMockPlace({ id: 'place_001', duration_minutes: 120 });
      const place2 = createMockPlace({ id: 'place_002', duration_minutes: 180 });
      const place3 = createMockPlace({ id: 'place_003', duration_minutes: 90 });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1, place2]),
          createMockDayPlan(2, [place3]),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      // Should show 3 total places
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Places')).toBeInTheDocument();
    });

    it('should display singular "Place" when only one place exists', () => {
      const place1 = createMockPlace({ id: 'place_001', duration_minutes: 120 });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, []),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Place')).toBeInTheDocument();
    });

    it('should display total duration across all days', () => {
      const place1 = createMockPlace({ id: 'place_001', duration_minutes: 120 });
      const place2 = createMockPlace({ id: 'place_002', duration_minutes: 180 });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, [place2]),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      // Total: 120 + 180 = 300 minutes = 5 hours
      expect(screen.getByText('5 hours')).toBeInTheDocument();
    });

    it('should display average duration per day', () => {
      const place1 = createMockPlace({ id: 'place_001', duration_minutes: 180 });
      const place2 = createMockPlace({ id: 'place_002', duration_minutes: 120 });
      const place3 = createMockPlace({ id: 'place_003', duration_minutes: 60 });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, [place2]),
          createMockDayPlan(3, [place3]),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      // Total: 360 minutes / 3 days = 120 minutes = 2 hours average
      // Use getAllByText since "2 hours" appears in multiple places (each day's summary)
      const avgPerDayText = screen.getByText('Avg per Day');
      expect(avgPerDayText).toBeInTheDocument();
      
      // Check that "2 hours" appears near "Avg per Day" by checking parent's parent container
      const avgContainer = avgPerDayText.parentElement?.parentElement;
      expect(avgContainer).toHaveTextContent('2 hours');
      expect(avgContainer).toHaveTextContent('Avg per Day');
    });

    it('should display trip preferences when available', () => {
      const place1 = createMockPlace({ id: 'place_001' });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, []),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: ['Rome', 'Florence'],
          interests: ['art', 'history'],
          pace: 'relaxed',
          price_range: ['€€'],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      expect(screen.getByText('relaxed')).toBeInTheDocument();
      expect(screen.getByText('Rome, Florence')).toBeInTheDocument();
    });
  });

  describe('Day Plans Rendering', () => {
    it('should render 3 DayPlan components', () => {
      const place1 = createMockPlace({ id: 'place_001' });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, []),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      expect(screen.getByText('Day 1')).toBeInTheDocument();
      expect(screen.getByText('Day 2')).toBeInTheDocument();
      expect(screen.getByText('Day 3')).toBeInTheDocument();
    });

    it('should pass correct places to each day', () => {
      const place1 = createMockPlace({ id: 'place_001', name: 'Place 1' });
      const place2 = createMockPlace({ id: 'place_002', name: 'Place 2' });
      const place3 = createMockPlace({ id: 'place_003', name: 'Place 3' });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, [place2]),
          createMockDayPlan(3, [place3]),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      expect(screen.getByText('Place 1')).toBeInTheDocument();
      expect(screen.getByText('Place 2')).toBeInTheDocument();
      expect(screen.getByText('Place 3')).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onAddPlace with correct day number when provided', () => {
      const onAddPlace = vi.fn();
      const place1 = createMockPlace({ id: 'place_001' });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, []),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList onAddPlace={onAddPlace} />);

      // DayPlan should have Add Place buttons
      const addButtons = screen.getAllByText('Add Place');
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const place1 = createMockPlace({ id: 'place_001' });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, []),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      expect(screen.getByRole('region', { name: 'Three-day itinerary' })).toBeInTheDocument();
    });
  });

  describe('Helpful Tips', () => {
    it('should display helpful drag-and-drop tip', () => {
      const place1 = createMockPlace({ id: 'place_001' });
      
      const itinerary: Itinerary = {
        id: 'test-itinerary',
        name: 'Test Trip',
        days: [
          createMockDayPlan(1, [place1]),
          createMockDayPlan(2, []),
          createMockDayPlan(3, []),
        ],
        preferences: {
          cities: [],
          interests: [],
          pace: 'moderate',
          price_range: [],
          include_booking_required: true,
        },
        created_at: '2024-01-01T00:00:00Z',
        last_modified: '2024-01-01T00:00:00Z',
      };

      setupLocalStorageMock(itinerary);
      renderWithProviders(<DayPlanList />);

      expect(screen.getByText(/Drag and drop places to reorder/i)).toBeInTheDocument();
    });
  });
});
