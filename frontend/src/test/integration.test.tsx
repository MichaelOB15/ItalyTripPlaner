/**
 * Frontend Integration Tests - Task 20
 * 
 * Comprehensive end-to-end integration tests covering:
 * - Place discovery workflow: browse, filter, search, view details
 * - Manual itinerary creation: add, remove, reorder, move places
 * - Drag-and-drop functionality between days
 * - Recommendation workflow: enter preferences, generate, view itinerary
 * - Replan workflow: update preferences, regenerate
 * - Custom dataset upload: validate, load, switch datasets
 * - Export functionality: PDF export, print view
 * - Map visualization: markers display, clustering, popups
 * - Error handling: network errors, validation errors
 * 
 * **Validates: Requirements 3, 4, 5, 6, 7, 8, 11, 16, 18, 19, 20**
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BrowserRouter } from 'react-router-dom';

// Mock the exportToPDF service at the top level
vi.mock('../services/exportToPDF', () => ({
  exportToPDF: vi.fn().mockResolvedValue(undefined),
}));

// Import contexts and components
import { DatasetProvider } from '../contexts/DatasetContext';
import { FilterProvider } from '../contexts/FilterContext';
import { ItineraryProvider } from '../contexts/ItineraryContext';
import { UIProvider } from '../contexts/UIContext';
import { ToastProvider } from '../components/ToastContainer';
import { PlaceExplorer } from '../components/PlaceExplorer';
import { ItineraryPanel } from '../components/ItineraryPanel';
import { MapView } from '../components/MapView';
import { DatasetUploader } from '../components/DatasetUploader';
import { Place, Itinerary, DayPlan, UserPreferences } from '../types';
import { exportToPDF } from '../services/exportToPDF';

// ============================================================================
// Mock Data
// ============================================================================

const mockPlaces: Place[] = [
  {
    id: 'place_001',
    name: 'Colosseum',
    type: 'historic_site',
    city: 'Rome',
    latitude: 41.8902,
    longitude: 12.4922,
    neighborhood: 'Colosseo',
    description: 'Ancient Roman amphitheater and iconic landmark',
    hours: '09:00-19:00',
    duration_minutes: 120,
    price_range: '€€',
    rating: 4.8,
    tags: ['history', 'iconic', 'ancient'],
    booking_required: true,
  },
  {
    id: 'place_002',
    name: 'Trattoria Roma',
    type: 'restaurant',
    city: 'Rome',
    latitude: 41.9028,
    longitude: 12.4964,
    neighborhood: 'Trastevere',
    description: 'Traditional Roman cuisine in cozy atmosphere',
    hours: '12:00-23:00',
    duration_minutes: 90,
    price_range: '€€',
    rating: 4.5,
    tags: ['italian', 'traditional', 'dinner'],
    booking_required: false,
  },
  {
    id: 'place_003',
    name: 'Uffizi Gallery',
    type: 'museum',
    city: 'Florence',
    latitude: 43.7686,
    longitude: 11.2556,
    neighborhood: 'Centro Storico',
    description: 'World-renowned art museum with Renaissance masterpieces',
    hours: '08:15-18:50',
    duration_minutes: 180,
    price_range: '€€€',
    rating: 4.7,
    tags: ['art', 'renaissance', 'museum'],
    booking_required: true,
  },
  {
    id: 'place_004',
    name: 'Ponte Vecchio',
    type: 'historic_site',
    city: 'Florence',
    latitude: 43.7679,
    longitude: 11.2531,
    neighborhood: 'Centro Storico',
    description: 'Medieval stone bridge famous for jewelry shops',
    hours: 'Open 24 hours',
    duration_minutes: 30,
    price_range: '€',
    rating: 4.6,
    tags: ['bridge', 'shopping', 'historic'],
    booking_required: false,
  },
  {
    id: 'place_005',
    name: 'Venice Canals',
    type: 'experience',
    city: 'Venice',
    latitude: 45.4408,
    longitude: 12.3155,
    description: 'Romantic gondola rides through historic waterways',
    hours: '08:00-20:00',
    duration_minutes: 60,
    price_range: '€€€',
    rating: 4.9,
    tags: ['romantic', 'water', 'gondola'],
    booking_required: true,
  },
];

const mockItinerary: Itinerary = {
  id: 'itin_001',
  name: 'My Italy Adventure',
  days: [
    {
      day_number: 1,
      places: [mockPlaces[0]],
      total_duration: 120,
      start_time: '08:00',
    },
    {
      day_number: 2,
      places: [mockPlaces[2]],
      total_duration: 180,
      start_time: '08:00',
    },
    {
      day_number: 3,
      places: [],
      total_duration: 0,
      start_time: '08:00',
    },
  ] as [DayPlan, DayPlan, DayPlan],
  preferences: {
    cities: ['Rome', 'Florence'],
    interests: ['history', 'art'],
    pace: 'moderate',
    price_range: ['€€', '€€€'],
    include_booking_required: true,
  },
  created_at: new Date().toISOString(),
  last_modified: new Date().toISOString(),
};

// ============================================================================
// Test Helpers
// ============================================================================

function renderWithProviders(component: React.ReactElement) {
  return render(
    <BrowserRouter>
      <ToastProvider>
        <DatasetProvider>
          <FilterProvider>
            <ItineraryProvider>
              <UIProvider>
                {component}
              </UIProvider>
            </ItineraryProvider>
          </FilterProvider>
        </DatasetProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

let mockAxios: MockAdapter;

beforeEach(() => {
  mockAxios = new MockAdapter(axios);
  // Default mock for places endpoint
  mockAxios.onGet(/\/places/).reply(200, {
    places: mockPlaces,
    total: mockPlaces.length,
    has_more: false,
  });
  
  // Clear localStorage before each test
  localStorage.clear();
  
  // Mock window.print for print tests
  vi.spyOn(window, 'print').mockImplementation(() => {});
});

afterEach(() => {
  mockAxios.reset();
  vi.clearAllMocks();
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Frontend Integration Tests', () => {
  
  // ==========================================================================
  // Place Discovery Workflow
  // ==========================================================================
  
  describe('Place Discovery Workflow', () => {
    it('should browse all places', async () => {
      renderWithProviders(<PlaceExplorer />);
      
      // Wait for places to load
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Verify all places are displayed
      expect(screen.getByText('Colosseum')).toBeInTheDocument();
      expect(screen.getByText('Trattoria Roma')).toBeInTheDocument();
      expect(screen.getByText('Uffizi Gallery')).toBeInTheDocument();
      expect(screen.getByText('Ponte Vecchio')).toBeInTheDocument();
      expect(screen.getByText('Venice Canals')).toBeInTheDocument();
    });

    it('should filter places by city', async () => {
      renderWithProviders(<PlaceExplorer />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Open filter panel and select Rome
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      const romeCheckbox = screen.getByRole('checkbox', { name: /rome/i });
      fireEvent.click(romeCheckbox);
      
      // Should show only Rome places
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
        expect(screen.getByText('Trattoria Roma')).toBeInTheDocument();
        expect(screen.queryByText('Uffizi Gallery')).not.toBeInTheDocument();
      });
    });

    it('should filter places by type', async () => {
      renderWithProviders(<PlaceExplorer />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Filter by restaurant type
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      const restaurantCheckbox = screen.getByRole('checkbox', { name: /restaurant/i });
      fireEvent.click(restaurantCheckbox);
      
      // Should show only restaurants
      await waitFor(() => {
        expect(screen.getByText('Trattoria Roma')).toBeInTheDocument();
        expect(screen.queryByText('Colosseum')).not.toBeInTheDocument();
      });
    });

    it('should search places by name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<PlaceExplorer />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Search for "Uffizi"
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Uffizi');
      
      // Wait for debounce (300ms) and filtering
      await waitFor(() => {
        expect(screen.getByText('Uffizi Gallery')).toBeInTheDocument();
        expect(screen.queryByText('Colosseum')).not.toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should view place details', async () => {
      renderWithProviders(<PlaceExplorer />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Click on a place card
      const placeCard = screen.getByRole('button', { name: /view details for colosseum/i });
      fireEvent.click(placeCard);
      
      // Modal should open with detailed information
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/ancient roman amphitheater/i)).toBeInTheDocument();
        expect(screen.getByText(/09:00-19:00/)).toBeInTheDocument();
      });
    });

    it('should combine multiple filters', async () => {
      renderWithProviders(<PlaceExplorer />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Apply city and type filters
      const filterButton = screen.getByRole('button', { name: /filters/i });
      fireEvent.click(filterButton);
      
      const florenceCheckbox = screen.getByRole('checkbox', { name: /florence/i });
      fireEvent.click(florenceCheckbox);
      
      const historicSiteCheckbox = screen.getByRole('checkbox', { name: /historic site/i });
      fireEvent.click(historicSiteCheckbox);
      
      // Should show only Florence historic sites
      await waitFor(() => {
        expect(screen.getByText('Ponte Vecchio')).toBeInTheDocument();
        expect(screen.queryByText('Uffizi Gallery')).not.toBeInTheDocument();
        expect(screen.queryByText('Colosseum')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Manual Itinerary Creation
  // ==========================================================================
  
  describe('Manual Itinerary Creation', () => {
    it('should add place to itinerary day', async () => {
      const { container } = renderWithProviders(
        <>
          <PlaceExplorer />
          <ItineraryPanel />
        </>
      );
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Add place to Day 1
      const addButton = screen.getAllByRole('button', { name: /add.*to itinerary/i })[0];
      fireEvent.click(addButton);
      
      // Select Day 1
      const day1Button = screen.getByRole('button', { name: /day 1/i });
      fireEvent.click(day1Button);
      
      // Place should appear in itinerary
      await waitFor(() => {
        const itinerary = screen.getByRole('region', { name: /itinerary/i });
        expect(within(itinerary).getByText('Colosseum')).toBeInTheDocument();
      });
    });

    it('should remove place from itinerary', async () => {
      // Pre-populate itinerary
      localStorage.setItem('itinerary', JSON.stringify(mockItinerary));
      
      renderWithProviders(<ItineraryPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Click remove button
      const removeButton = screen.getByRole('button', { name: /remove.*colosseum/i });
      fireEvent.click(removeButton);
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
      
      // Place should be removed
      await waitFor(() => {
        expect(screen.queryByText('Colosseum')).not.toBeInTheDocument();
      });
    });

    it('should reorder places within a day', async () => {
      // Create itinerary with multiple places in day 1
      const itineraryWithMultiplePlaces = {
        ...mockItinerary,
        days: [
          {
            day_number: 1,
            places: [mockPlaces[0], mockPlaces[1]],
            total_duration: 210,
            start_time: '08:00',
          },
          mockItinerary.days[1],
          mockItinerary.days[2],
        ] as [DayPlan, DayPlan, DayPlan],
      };
      
      localStorage.setItem('itinerary', JSON.stringify(itineraryWithMultiplePlaces));
      
      renderWithProviders(<ItineraryPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Get initial order
      const day1 = screen.getByRole('region', { name: /day 1/i });
      const placeElements = within(day1).getAllByRole('listitem');
      
      expect(placeElements[0]).toHaveTextContent('Colosseum');
      expect(placeElements[1]).toHaveTextContent('Trattoria Roma');
      
      // Simulate drag-and-drop reorder (this is simplified)
      const dragHandle = within(placeElements[1]).getByRole('button', { name: /drag/i });
      
      // Trigger drag start
      fireEvent.dragStart(dragHandle);
      fireEvent.dragOver(placeElements[0]);
      fireEvent.drop(placeElements[0]);
      
      // Verify new order
      await waitFor(() => {
        const updatedPlaces = within(day1).getAllByRole('listitem');
        expect(updatedPlaces[0]).toHaveTextContent('Trattoria Roma');
        expect(updatedPlaces[1]).toHaveTextContent('Colosseum');
      });
    });

    it('should move place between days', async () => {
      localStorage.setItem('itinerary', JSON.stringify(mockItinerary));
      
      renderWithProviders(<ItineraryPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Find place in Day 1
      const day1 = screen.getByRole('region', { name: /day 1/i });
      const placeInDay1 = within(day1).getByText('Colosseum');
      
      // Click move button
      const moveButton = within(day1).getByRole('button', { name: /move to another day/i });
      fireEvent.click(moveButton);
      
      // Select Day 2
      const day2Button = screen.getByRole('button', { name: /move to day 2/i });
      fireEvent.click(day2Button);
      
      // Place should now be in Day 2
      await waitFor(() => {
        const day2 = screen.getByRole('region', { name: /day 2/i });
        expect(within(day2).getByText('Colosseum')).toBeInTheDocument();
        expect(within(day1).queryByText('Colosseum')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Drag-and-Drop Functionality
  // ==========================================================================
  
  describe('Drag-and-Drop Between Days', () => {
    it('should drag place from one day to another', async () => {
      localStorage.setItem('itinerary', JSON.stringify(mockItinerary));
      
      renderWithProviders(<ItineraryPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      const day1 = screen.getByRole('region', { name: /day 1/i });
      const day3 = screen.getByRole('region', { name: /day 3/i });
      
      const placeItem = within(day1).getByRole('listitem');
      const dragHandle = within(placeItem).getByRole('button', { name: /drag/i });
      
      // Simulate drag from Day 1 to Day 3
      fireEvent.dragStart(dragHandle);
      fireEvent.dragEnter(day3);
      fireEvent.dragOver(day3);
      fireEvent.drop(day3);
      fireEvent.dragEnd(dragHandle);
      
      // Verify place moved to Day 3
      await waitFor(() => {
        expect(within(day3).getByText('Colosseum')).toBeInTheDocument();
        expect(within(day1).queryByText('Colosseum')).not.toBeInTheDocument();
      });
    });

    it('should show drop indicator when dragging over a day', async () => {
      localStorage.setItem('itinerary', JSON.stringify(mockItinerary));
      
      const { container } = renderWithProviders(<ItineraryPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      const day1 = screen.getByRole('region', { name: /day 1/i });
      const day2 = screen.getByRole('region', { name: /day 2/i });
      
      const placeItem = within(day1).getByRole('listitem');
      const dragHandle = within(placeItem).getByRole('button', { name: /drag/i });
      
      // Start dragging
      fireEvent.dragStart(dragHandle);
      fireEvent.dragEnter(day2);
      
      // Check for visual drop indicator (CSS class)
      await waitFor(() => {
        expect(day2).toHaveClass('drag-over');
      });
    });
  });

  // ==========================================================================
  // Recommendation Workflow
  // ==========================================================================
  
  describe('Recommendation Workflow', () => {
    it('should generate itinerary from preferences', async () => {
      mockAxios.onPost(/\/recommendations/).reply(200, {
        itinerary: mockItinerary,
        reasoning: 'Generated based on your preferences for history and art in Rome and Florence',
        alternative_places: [],
      });
      
      renderWithProviders(<ItineraryPanel />);
      
      // Click generate recommendation button
      const generateButton = screen.getByRole('button', { name: /generate recommendation/i });
      fireEvent.click(generateButton);
      
      // Fill preferences form
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /preferences/i })).toBeInTheDocument();
      });
      
      // Select cities
      const romeCheckbox = screen.getByRole('checkbox', { name: /rome/i });
      const florenceCheckbox = screen.getByRole('checkbox', { name: /florence/i });
      fireEvent.click(romeCheckbox);
      fireEvent.click(florenceCheckbox);
      
      // Select interests
      const historyCheckbox = screen.getByRole('checkbox', { name: /history/i });
      const artCheckbox = screen.getByRole('checkbox', { name: /art/i });
      fireEvent.click(historyCheckbox);
      fireEvent.click(artCheckbox);
      
      // Select pace
      const moderatePace = screen.getByRole('radio', { name: /moderate/i });
      fireEvent.click(moderatePace);
      
      // Submit preferences
      const submitButton = screen.getByRole('button', { name: /generate/i });
      fireEvent.click(submitButton);
      
      // Wait for itinerary to be generated
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
        expect(screen.getByText('Uffizi Gallery')).toBeInTheDocument();
      });
      
      // Verify API was called with correct preferences
      expect(mockAxios.history.post.length).toBe(1);
      const requestData = JSON.parse(mockAxios.history.post[0].data);
      expect(requestData.preferences.cities).toContain('Rome');
      expect(requestData.preferences.interests).toContain('history');
    });

    it('should display generated itinerary', async () => {
      mockAxios.onPost(/\/recommendations/).reply(200, {
        itinerary: mockItinerary,
        reasoning: 'Balanced itinerary across Rome and Florence',
        alternative_places: [mockPlaces[4]],
      });
      
      renderWithProviders(<ItineraryPanel />);
      
      const generateButton = screen.getByRole('button', { name: /generate recommendation/i });
      fireEvent.click(generateButton);
      
      // Quick select defaults and submit
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
      });
      
      const submitButton = screen.getByRole('button', { name: /generate/i });
      fireEvent.click(submitButton);
      
      // Verify itinerary is displayed
      await waitFor(() => {
        expect(screen.getByText('My Italy Adventure')).toBeInTheDocument();
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /day 1/i })).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Replan Workflow
  // ==========================================================================
  
  describe('Replan Workflow', () => {
    it('should update preferences and regenerate itinerary', async () => {
      localStorage.setItem('itinerary', JSON.stringify(mockItinerary));
      
      const updatedItinerary = {
        ...mockItinerary,
        name: 'Updated Italy Trip',
        days: [
          {
            day_number: 1,
            places: [mockPlaces[4]], // Venice
            total_duration: 60,
            start_time: '08:00',
          },
          mockItinerary.days[1],
          mockItinerary.days[2],
        ] as [DayPlan, DayPlan, DayPlan],
      };
      
      mockAxios.onPost(/\/recommendations/).reply(200, {
        itinerary: updatedItinerary,
        reasoning: 'Replanned with updated preferences',
        alternative_places: [],
      });
      
      renderWithProviders(<ItineraryPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Click replan button
      const replanButton = screen.getByRole('button', { name: /replan/i });
      fireEvent.click(replanButton);
      
      // Update preferences in modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Change preferences
      const veniceCheckbox = screen.getByRole('checkbox', { name: /venice/i });
      fireEvent.click(veniceCheckbox);
      
      const romanticCheckbox = screen.getByRole('checkbox', { name: /romantic/i });
      fireEvent.click(romanticCheckbox);
      
      // Submit replan
      const replanSubmitButton = screen.getByRole('button', { name: /regenerate/i });
      fireEvent.click(replanSubmitButton);
      
      // Verify new itinerary is displayed
      await waitFor(() => {
        expect(screen.getByText('Venice Canals')).toBeInTheDocument();
        expect(screen.queryByText('Colosseum')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Custom Dataset Upload
  // ==========================================================================
  
  describe('Custom Dataset Upload', () => {
    it('should validate and load custom dataset', async () => {
      const customDataset = [
        {
          id: 'custom_001',
          name: 'Custom Place',
          type: 'restaurant',
          city: 'Milan',
          latitude: 45.4642,
          longitude: 9.1900,
        },
      ];
      
      mockAxios.onPost(/\/validate/).reply(200, {
        is_valid: true,
        errors: [],
        warnings: [],
        place_count: 1,
        excluded_count: 0,
      });
      
      mockAxios.onGet(/\/places/).reply(200, {
        places: customDataset,
        total: 1,
        has_more: false,
      });
      
      renderWithProviders(<DatasetUploader />);
      
      // Create a mock file
      const file = new File([JSON.stringify(customDataset)], 'custom.json', {
        type: 'application/json',
      });
      
      const fileInput = screen.getByLabelText(/upload dataset/i);
      await userEvent.upload(fileInput, file);
      
      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText(/validation successful/i)).toBeInTheDocument();
      });
      
      // Confirm load
      const loadButton = screen.getByRole('button', { name: /load dataset/i });
      fireEvent.click(loadButton);
      
      // Verify dataset is loaded
      await waitFor(() => {
        expect(screen.getByText(/dataset loaded/i)).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid dataset', async () => {
      mockAxios.onPost(/\/validate/).reply(200, {
        is_valid: false,
        errors: [
          {
            place_id: 'place_999',
            field: 'name',
            message: 'Name is required',
            severity: 'critical',
          },
        ],
        warnings: [],
        place_count: 1,
        excluded_count: 1,
      });
      
      renderWithProviders(<DatasetUploader />);
      
      const file = new File(['invalid json'], 'invalid.json', {
        type: 'application/json',
      });
      
      const fileInput = screen.getByLabelText(/upload dataset/i);
      await userEvent.upload(fileInput, file);
      
      // Wait for validation errors
      await waitFor(() => {
        expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should switch back to default dataset', async () => {
      // Start with custom dataset
      localStorage.setItem('activeDataset', 'custom');
      
      mockAxios.onGet(/\/places/).reply(200, {
        places: mockPlaces,
        total: mockPlaces.length,
        has_more: false,
      });
      
      renderWithProviders(<DatasetUploader />);
      
      // Click switch to default button
      const switchButton = screen.getByRole('button', { name: /switch to default/i });
      fireEvent.click(switchButton);
      
      // Verify switched
      await waitFor(() => {
        expect(screen.getByText(/using default dataset/i)).toBeInTheDocument();
      });
      
      expect(localStorage.getItem('activeDataset')).toBe('default');
    });
  });

  // ==========================================================================
  // Export Functionality
  // ==========================================================================
  
  describe('Export Functionality', () => {
    it('should export itinerary as PDF', async () => {
      localStorage.setItem('itinerary', JSON.stringify(mockItinerary));
      
      // Clear the mock before test
      vi.mocked(exportToPDF).mockClear();
      
      renderWithProviders(<ItineraryPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Click export PDF button
      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      fireEvent.click(exportButton);
      
      // Verify export was called
      await waitFor(() => {
        expect(exportToPDF).toHaveBeenCalledWith(expect.objectContaining({
          name: 'My Italy Adventure',
        }));
      });
    });

    it('should open print view', async () => {
      localStorage.setItem('itinerary', JSON.stringify(mockItinerary));
      
      renderWithProviders(<ItineraryPanel />);
      
      await waitFor(() => {
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      });
      
      // Click print button
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      // Verify window.print was called
      await waitFor(() => {
        expect(window.print).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Map Visualization
  // ==========================================================================
  
  describe('Map Visualization', () => {
    it('should display place markers on map', async () => {
      renderWithProviders(<MapView />);
      
      await waitFor(() => {
        // Check for map container
        expect(screen.getByRole('region', { name: /map/i })).toBeInTheDocument();
      });
      
      // Verify markers are rendered (check for map marker elements)
      const mapContainer = screen.getByRole('region', { name: /map/i });
      expect(within(mapContainer).getAllByRole('button', { name: /marker/i }).length).toBeGreaterThan(0);
    });

    it('should show popup on marker click', async () => {
      renderWithProviders(<MapView />);
      
      await waitFor(() => {
        expect(screen.getByRole('region', { name: /map/i })).toBeInTheDocument();
      });
      
      // Click a marker
      const marker = screen.getAllByRole('button', { name: /marker/i })[0];
      fireEvent.click(marker);
      
      // Popup should appear
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('should highlight itinerary places on map', async () => {
      localStorage.setItem('itinerary', JSON.stringify(mockItinerary));
      
      const { container } = renderWithProviders(<MapView />);
      
      await waitFor(() => {
        // Look for highlighted markers (they have different styling)
        const highlightedMarkers = container.querySelectorAll('.marker-highlighted');
        expect(highlightedMarkers.length).toBeGreaterThan(0);
      });
    });

    it('should cluster markers when zoomed out', async () => {
      const { container } = renderWithProviders(<MapView />);
      
      await waitFor(() => {
        // At low zoom levels, markers should be clustered
        const clusters = container.querySelectorAll('.marker-cluster');
        expect(clusters.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================
  
  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Simulate network error
      mockAxios.onGet(/\/places/).networkError();
      
      renderWithProviders(<PlaceExplorer />);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to load places/i)).toBeInTheDocument();
      });
      
      // Should show retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle API errors with status codes', async () => {
      mockAxios.onGet(/\/places/).reply(500, {
        message: 'Internal server error',
      });
      
      renderWithProviders(<PlaceExplorer />);
      
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    it('should handle validation errors on recommendation', async () => {
      mockAxios.onPost(/\/recommendations/).reply(400, {
        message: 'Invalid preferences',
        details: 'At least one city must be selected',
      });
      
      renderWithProviders(<ItineraryPanel />);
      
      const generateButton = screen.getByRole('button', { name: /generate recommendation/i });
      fireEvent.click(generateButton);
      
      // Submit without selecting cities
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /generate/i });
        fireEvent.click(submitButton);
      });
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/at least one city must be selected/i)).toBeInTheDocument();
      });
    });

    it('should show toast notification on error', async () => {
      mockAxios.onPost(/\/recommendations/).reply(500);
      
      renderWithProviders(<ItineraryPanel />);
      
      const generateButton = screen.getByRole('button', { name: /generate recommendation/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /generate/i });
        fireEvent.click(submitButton);
      });
      
      // Toast should appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });
});
