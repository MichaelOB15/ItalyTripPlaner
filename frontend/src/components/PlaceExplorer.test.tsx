import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PlaceExplorer } from './PlaceExplorer';
import { DatasetProvider } from '../contexts/DatasetContext';
import { FilterProvider } from '../contexts/FilterContext';
import { UIProvider } from '../contexts/UIContext';
import { ItineraryProvider } from '../contexts/ItineraryContext';
import { AuthProvider } from '../contexts/AuthContext';
import { Place, PlaceType } from '../types';
import * as api from '../services/api';

// Mock the API client module
vi.mock('../services/api', () => ({
  apiClient: {
    getPlaces: vi.fn(),
  },
}));

// ============================================================================
// Test Data
// ============================================================================

const mockPlaces: Place[] = [
  {
    id: 'place_001',
    name: 'Trattoria Roma',
    type: 'restaurant' as PlaceType,
    city: 'Rome',
    latitude: 41.9028,
    longitude: 12.4964,
    neighborhood: 'Trastevere',
    description: 'Authentic Roman cuisine',
    rating: 4.5,
    price_range: '€€',
    tags: ['italian', 'pasta', 'wine'],
    duration_minutes: 90,
    booking_required: true,
  },
  {
    id: 'place_002',
    name: 'Colosseum',
    type: 'historic_site' as PlaceType,
    city: 'Rome',
    latitude: 41.8902,
    longitude: 12.4922,
    description: 'Ancient Roman amphitheater',
    rating: 4.8,
    price_range: '€',
    tags: ['history', 'monument', 'unesco'],
    duration_minutes: 120,
    booking_required: false,
  },
  {
    id: 'place_003',
    name: 'Florence Cathedral',
    type: 'historic_site' as PlaceType,
    city: 'Florence',
    latitude: 43.7731,
    longitude: 11.2560,
    description: 'Iconic Renaissance cathedral',
    rating: 4.7,
    price_range: '€',
    tags: ['architecture', 'renaissance', 'unesco'],
    duration_minutes: 60,
    booking_required: false,
  },
];

// ============================================================================
// Test Wrapper Component
// ============================================================================

interface TestWrapperProps {
  children: React.ReactNode;
}

function TestWrapper({ children }: TestWrapperProps) {
  return (
    <AuthProvider>
      <DatasetProvider>
        <FilterProvider>
          <ItineraryProvider>
            <UIProvider>
              {children}
            </UIProvider>
          </ItineraryProvider>
        </FilterProvider>
      </DatasetProvider>
    </AuthProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('PlaceExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock implementation
    vi.mocked(api.apiClient.getPlaces).mockResolvedValue(mockPlaces);
  });
  
  describe('Rendering', () => {
    it('should render the component with header', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      expect(screen.getByText('Explore Activities')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search places/i)).toBeInTheDocument();
    });
    
    it('should display places after loading', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      // Wait for places to load
      expect(await screen.findByText('Trattoria Roma')).toBeInTheDocument();
      expect(screen.getByText('Colosseum')).toBeInTheDocument();
      expect(screen.getByText('Florence Cathedral')).toBeInTheDocument();
    });
  });
  
  describe('Place Count Display', () => {
    it('should show count of places', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      // Wait for places to load
      await screen.findByText('Trattoria Roma');
      
      // Should show some indication of place count
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });
    
    it('should show filtered count vs total count', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      // Wait for places to load
      await screen.findByText('Trattoria Roma');
      
      // Type in search box to filter
      const searchInput = screen.getByPlaceholderText(/search places/i);
      await user.type(searchInput, 'Colosseum');
      
      // Wait for debounce and filtering
      await waitFor(() => {
        expect(screen.getByText(/showing 1 of 3 places/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });
  });
  
  describe('Search Integration', () => {
    it('should integrate SearchBar component', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      await screen.findByText('Trattoria Roma');
      
      const searchInput = screen.getByPlaceholderText(/search places/i);
      expect(searchInput).toBeInTheDocument();
    });
    
    it('should filter places based on search query', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      await screen.findByText('Trattoria Roma');
      
      const searchInput = screen.getByPlaceholderText(/search places/i);
      await user.type(searchInput, 'Cathedral');
      
      // Wait for debounce and filtering
      await waitFor(() => {
        expect(screen.queryByText('Trattoria Roma')).not.toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should only show Florence Cathedral
      expect(screen.queryByText('Colosseum')).not.toBeInTheDocument();
      expect(screen.getByText('Florence Cathedral')).toBeInTheDocument();
    });
  });
  
  describe('FilterPanel Integration', () => {
    it('should not display FilterPanel when no filters are active', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      await screen.findByText('Trattoria Roma');
      
      expect(screen.queryByText('Active Filters')).not.toBeInTheDocument();
    });
    
    // Note: Full filter interaction tests will be added when FilterPanel UI is implemented
  });
  
  describe('PlaceList Integration', () => {
    it('should display all places in the list', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      await screen.findByText('Trattoria Roma');
      
      expect(screen.getByText('Trattoria Roma')).toBeInTheDocument();
      expect(screen.getByText('Colosseum')).toBeInTheDocument();
      expect(screen.getByText('Florence Cathedral')).toBeInTheDocument();
    });
    
    it('should display place details correctly', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      // Wait for places to load
      await screen.findByText('Trattoria Roma');
      
      // Check that basic place details are shown
      expect(screen.getByText('Trattoria Roma')).toBeInTheDocument();
      expect(screen.getAllByText(/rome/i).length).toBeGreaterThan(0);
    });
    
    it('should show empty state when no places match filters', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      await screen.findByText('Trattoria Roma');
      
      const searchInput = screen.getByPlaceholderText(/search places/i);
      await user.type(searchInput, 'nonexistent place xyz');
      
      // Wait for debounce and filtering
      await waitFor(() => {
        expect(screen.getByText(/no places match your filters/i)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      expect(screen.getByText(/try adjusting your search or filter criteria/i)).toBeInTheDocument();
    });
  });
  
  describe('Error Handling', () => {
    it('should display error state when loading fails', async () => {
      vi.mocked(api.apiClient.getPlaces).mockRejectedValueOnce(new Error('Failed to load places'));
      
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      await waitFor(() => {
        expect(screen.getByText(/error loading places/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
  
  describe('Callbacks', () => {
    it('should support onAddToItinerary callback', async () => {
      const onAddToItinerary = vi.fn();
      
      render(
        <TestWrapper>
          <PlaceExplorer onAddToItinerary={onAddToItinerary} />
        </TestWrapper>
      );
      
      // Wait for places to load
      await screen.findByText('Trattoria Roma');
      
      // Component should render successfully with callback prop
      expect(screen.getByText('Trattoria Roma')).toBeInTheDocument();
    });
  });
  
  describe('Context Integration', () => {
    it('should consume DatasetContext for places', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      // Verify it loads places from context
      await screen.findByText('Trattoria Roma');
      expect(screen.getByText('Colosseum')).toBeInTheDocument();
    });
    
    it('should consume FilterContext for filter state', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      await screen.findByText('Trattoria Roma');
      
      // Use search which goes through FilterContext
      const searchInput = screen.getByPlaceholderText(/search places/i);
      await user.type(searchInput, 'Rome');
      
      // Wait for debounce and filtering
      await waitFor(() => {
        expect(screen.getByText('Trattoria Roma')).toBeInTheDocument();
        expect(screen.getByText('Colosseum')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should filter through FilterContext
      expect(screen.queryByText('Florence Cathedral')).not.toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA roles and labels', async () => {
      render(
        <TestWrapper>
          <PlaceExplorer />
        </TestWrapper>
      );
      
      await screen.findByText('Trattoria Roma');
      
      // Check for search input
      const searchInput = screen.getByPlaceholderText(/search places/i);
      expect(searchInput).toHaveAttribute('aria-label', 'Search places');
    });
  });
  
  describe('Custom className', () => {
    it('should apply custom className', async () => {
      const { container } = render(
        <TestWrapper>
          <PlaceExplorer className="custom-class" />
        </TestWrapper>
      );
      
      await screen.findByText(/explore activities/i);
      
      const explorer = container.querySelector('.custom-class');
      expect(explorer).toBeInTheDocument();
    });
  });
});
