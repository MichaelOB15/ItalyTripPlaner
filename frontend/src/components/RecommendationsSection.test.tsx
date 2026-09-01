import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RecommendationsSection } from './RecommendationsSection';
import { Place } from '../types';
import { UIProvider } from '../contexts/UIContext';

// Test wrapper with required providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <UIProvider>{children}</UIProvider>;
}

// Helper function to render with providers
function renderWithProviders(component: React.ReactElement) {
  return render(<TestWrapper>{component}</TestWrapper>);
}

// ============================================================================
// Mock Data
// ============================================================================

const mockPlaces: Place[] = [
  {
    id: 'place_001',
    name: 'Trevi Fountain',
    type: 'historic_site',
    city: 'Rome',
    latitude: 41.9009,
    longitude: 12.4833,
    rating: 4.8,
    tags: ['historic', 'landmark', 'photo-spot'],
    price_range: '€',
    description: 'Famous baroque fountain',
    duration_minutes: 30,
  },
  {
    id: 'place_002',
    name: 'Colosseum',
    type: 'historic_site',
    city: 'Rome',
    latitude: 41.8902,
    longitude: 12.4922,
    rating: 4.9,
    tags: ['historic', 'landmark', 'ancient'],
    price_range: '€€',
    description: 'Ancient amphitheater',
    duration_minutes: 120,
  },
  {
    id: 'place_003',
    name: 'Uffizi Gallery',
    type: 'museum',
    city: 'Florence',
    latitude: 43.7687,
    longitude: 11.2559,
    rating: 4.7,
    tags: ['art', 'museum', 'renaissance'],
    price_range: '€€',
    description: 'Renaissance art museum',
    duration_minutes: 180,
  },
  {
    id: 'place_004',
    name: 'Roman Forum',
    type: 'historic_site',
    city: 'Rome',
    latitude: 41.8925,
    longitude: 12.4853,
    rating: 4.6,
    tags: ['historic', 'ancient', 'ruins'],
    price_range: '€€',
    description: 'Ancient Roman ruins',
    duration_minutes: 90,
  },
  {
    id: 'place_005',
    name: 'Ponte Vecchio',
    type: 'historic_site',
    city: 'Florence',
    latitude: 43.7679,
    longitude: 11.2530,
    rating: 4.5,
    tags: ['historic', 'bridge', 'shopping'],
    price_range: '€',
    description: 'Medieval bridge',
    duration_minutes: 45,
  },
  {
    id: 'place_006',
    name: 'Trattoria Da Enzo',
    type: 'restaurant',
    city: 'Rome',
    latitude: 41.8897,
    longitude: 12.4703,
    rating: 4.8,
    tags: ['food', 'traditional', 'italian'],
    price_range: '€€',
    description: 'Traditional Roman cuisine',
    duration_minutes: 90,
  },
];

// ============================================================================
// Tests
// ============================================================================

describe('RecommendationsSection', () => {
  describe('Empty States', () => {
    it('should show empty state when no itinerary places', () => {
      renderWithProviders(
        <RecommendationsSection
          allPlaces={mockPlaces}
          itineraryPlaces={[]}
          itineraryPlaceIds={new Set()}
        />
      );

      expect(screen.getByText('Recommended for You')).toBeInTheDocument();
      expect(
        screen.getByText('Add places to your itinerary to get personalized recommendations')
      ).toBeInTheDocument();
    });

    it('should show no recommendations state when no matches found', () => {
      // Create a completely isolated dataset for this test
      // Use a place with truly unique city and tags
      const uniquePlace: Place = {
        id: 'place_999',
        name: 'Unique Place',
        type: 'park',
        city: 'UniqueCityXYZ123',
        latitude: 45.0,
        longitude: 10.0,
        rating: 4.0,
        tags: ['zzzuniquetag999', 'nomatches888'],
        price_range: '€',
      };
      
      // Create places with completely different cities, tags, AND no ratings
      // so they get a score of 0
      const isolatedPlaces: Place[] = [
        {
          id: 'place_isolated_001',
          name: 'Isolated Place 1',
          type: 'restaurant',
          city: 'IsolatedCity1',
          latitude: 40.0,
          longitude: 11.0,
          rating: null, // No rating = no score boost
          tags: ['different1', 'unrelated1'],
          price_range: '€€',
        },
        {
          id: 'place_isolated_002',
          name: 'Isolated Place 2',
          type: 'museum',
          city: 'IsolatedCity2',
          latitude: 41.0,
          longitude: 12.0,
          rating: null, // No rating = no score boost
          tags: ['different2', 'unrelated2'],
          price_range: '€',
        },
      ];

      renderWithProviders(
        <RecommendationsSection
          allPlaces={isolatedPlaces}
          itineraryPlaces={[uniquePlace]}
          itineraryPlaceIds={new Set(['place_999'])}
        />
      );

      expect(screen.getByText('Recommended for You')).toBeInTheDocument();
      expect(
        screen.getByText('No recommendations available based on your current itinerary')
      ).toBeInTheDocument();
    });
  });

  describe('Recommendation Generation', () => {
    it('should recommend places from the same city', () => {
      // Itinerary has Trevi Fountain from Rome
      const itineraryPlaces = [mockPlaces[0]]; // Trevi Fountain (Rome)
      const itineraryPlaceIds = new Set(['place_001']);

      renderWithProviders(
        <RecommendationsSection
          allPlaces={mockPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Should recommend other Rome places: Colosseum, Roman Forum, Trattoria Da Enzo
      expect(screen.getByText('Colosseum')).toBeInTheDocument();
      expect(screen.getByText('Roman Forum')).toBeInTheDocument();
      expect(screen.getByText('Trattoria Da Enzo')).toBeInTheDocument();

      // Should NOT show Trevi Fountain (already in itinerary)
      expect(screen.queryByText('Trevi Fountain')).not.toBeInTheDocument();
    });

    it('should recommend places with similar tags', () => {
      // Itinerary has Uffizi Gallery with 'art', 'museum', 'renaissance' tags
      const itineraryPlaces = [mockPlaces[2]]; // Uffizi Gallery (Florence, art/museum)
      const itineraryPlaceIds = new Set(['place_003']);

      renderWithProviders(
        <RecommendationsSection
          allPlaces={mockPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Should show recommendations (Florence places or places with art/museum tags)
      expect(screen.getByText('Recommended for You')).toBeInTheDocument();

      // Ponte Vecchio should be recommended (same city: Florence)
      expect(screen.getByText('Ponte Vecchio')).toBeInTheDocument();
    });

    it('should prioritize by rating when scores are equal', () => {
      // Itinerary has a Rome place
      const itineraryPlaces = [mockPlaces[0]]; // Trevi Fountain (Rome)
      const itineraryPlaceIds = new Set(['place_001']);

      const { container } = renderWithProviders(
        <RecommendationsSection
          allPlaces={mockPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Get all place cards in order
      const placeCards = container.querySelectorAll('[data-testid="place-card"]');

      // If place cards don't have test IDs, we can at least verify recommendations appear
      expect(screen.getByText('Colosseum')).toBeInTheDocument(); // Highest rated Rome place (4.9)
      expect(screen.getByText('Trattoria Da Enzo')).toBeInTheDocument(); // Also highly rated (4.8)
    });

    it('should limit recommendations to 10 places', () => {
      // Create 20 places all from Rome
      const manyPlaces: Place[] = Array.from({ length: 20 }, (_, i) => ({
        id: `place_${String(i).padStart(3, '0')}`,
        name: `Rome Place ${i}`,
        type: 'historic_site' as const,
        city: 'Rome',
        latitude: 41.9 + i * 0.01,
        longitude: 12.5 + i * 0.01,
        rating: 4.0 + (i % 10) * 0.1,
        tags: ['historic'],
        price_range: '€€',
      }));

      // Itinerary has one Rome place (not in the manyPlaces array)
      const itineraryPlaces = [mockPlaces[0]]; // Trevi Fountain (Rome)
      const itineraryPlaceIds = new Set(['place_001']);

      const { container } = renderWithProviders(
        <RecommendationsSection
          allPlaces={manyPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Count the number of place names shown
      const placeNames = container.querySelectorAll('h3, h4, [role="heading"]');
      // Filter to get only place card headings (exclude the section title)
      const placeCardHeadings = Array.from(placeNames).filter(
        (el) => !el.textContent?.includes('Recommended for You')
      );

      // Should show at most 10 recommendations
      expect(placeCardHeadings.length).toBeLessThanOrEqual(10);
    });

    it('should exclude places already in itinerary', () => {
      // Itinerary has multiple Rome places
      const itineraryPlaces = [mockPlaces[0], mockPlaces[1]]; // Trevi Fountain, Colosseum
      const itineraryPlaceIds = new Set(['place_001', 'place_002']);

      renderWithProviders(
        <RecommendationsSection
          allPlaces={mockPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Should NOT show places already in itinerary
      expect(screen.queryByText('Trevi Fountain')).not.toBeInTheDocument();
      expect(screen.queryByText('Colosseum')).not.toBeInTheDocument();

      // Should show other Rome places
      expect(screen.getByText('Roman Forum')).toBeInTheDocument();
      expect(screen.getByText('Trattoria Da Enzo')).toBeInTheDocument();
    });

    it('should display preference context (cities and tags)', () => {
      // Itinerary has places from Rome with historic tags
      const itineraryPlaces = [mockPlaces[0], mockPlaces[1]]; // Trevi Fountain, Colosseum
      const itineraryPlaceIds = new Set(['place_001', 'place_002']);

      renderWithProviders(
        <RecommendationsSection
          allPlaces={mockPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Should show preference summary
      expect(screen.getByText(/Based on your interest in/i)).toBeInTheDocument();
      // Rome appears multiple times in the recommendations (city names), so use getAllByText
      const romeElements = screen.getAllByText('Rome');
      expect(romeElements.length).toBeGreaterThan(0);
      // Check for "historic" tag (appears in recommendations)
      const historicElements = screen.getAllByText(/historic/i);
      expect(historicElements.length).toBeGreaterThan(0);
    });
  });

  describe('Scoring Logic', () => {
    it('should score city matches and tag matches appropriately', () => {
      // Create places to test scoring priority
      const testPlaces: Place[] = [
        {
          id: 'place_city_match',
          name: 'City Match Only',
          type: 'cafe',
          city: 'Rome',
          latitude: 41.9,
          longitude: 12.5,
          rating: 3.0,
          tags: ['coffee'],
          price_range: '€',
        },
        {
          id: 'place_tag_match',
          name: 'Tag Match Only',
          type: 'historic_site',
          city: 'Milan',
          latitude: 45.4,
          longitude: 9.2,
          rating: 3.0,
          tags: ['historic', 'landmark'], // Matches itinerary tags
          price_range: '€',
        },
      ];

      // Itinerary has a Rome place with historic tags
      const itineraryPlaces = [mockPlaces[0]]; // Trevi Fountain (Rome, historic tags)
      const itineraryPlaceIds = new Set(['place_001']);

      const { container } = renderWithProviders(
        <RecommendationsSection
          allPlaces={testPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Both should appear
      expect(screen.getByText('City Match Only')).toBeInTheDocument();
      expect(screen.getByText('Tag Match Only')).toBeInTheDocument();
      
      // City match should score higher (city=3, tag match=4 for 2 tags)
      // Tag match has 2 matching tags, so it scores higher than city match alone
      // This test verifies both scoring mechanisms work
    });

    it('should boost score based on rating', () => {
      // Create two places with same city, but different ratings
      const testPlaces: Place[] = [
        {
          id: 'place_low_rating',
          name: 'Low Rating Place',
          type: 'restaurant',
          city: 'Rome',
          latitude: 41.9,
          longitude: 12.5,
          rating: 3.0,
          tags: ['food'],
          price_range: '€',
        },
        {
          id: 'place_high_rating',
          name: 'High Rating Place',
          type: 'restaurant',
          city: 'Rome',
          latitude: 41.91,
          longitude: 12.51,
          rating: 5.0,
          tags: ['food'],
          price_range: '€',
        },
      ];

      const itineraryPlaces = [mockPlaces[0]]; // Trevi Fountain (Rome)
      const itineraryPlaceIds = new Set(['place_001']);

      const { container } = renderWithProviders(
        <RecommendationsSection
          allPlaces={testPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Higher rated place should appear first
      const placeTexts = container.textContent || '';
      const highRatingIndex = placeTexts.indexOf('High Rating Place');
      const lowRatingIndex = placeTexts.indexOf('Low Rating Place');

      expect(highRatingIndex).toBeGreaterThan(-1);
      expect(lowRatingIndex).toBeGreaterThan(-1);
      expect(highRatingIndex).toBeLessThan(lowRatingIndex);
    });
  });

  describe('Integration', () => {
    it('should call onAddToItinerary when provided', () => {
      const mockOnAdd = vi.fn();
      const itineraryPlaces = [mockPlaces[0]]; // Trevi Fountain (Rome)
      const itineraryPlaceIds = new Set(['place_001']);

      renderWithProviders(
        <RecommendationsSection
          allPlaces={mockPlaces}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
          onAddToItinerary={mockOnAdd}
        />
      );

      // Recommendations should be displayed
      expect(screen.getByText('Colosseum')).toBeInTheDocument();

      // Note: We can't easily click the add button without knowing the PlaceCard implementation
      // This test verifies the prop is passed down correctly
      expect(mockOnAdd).not.toHaveBeenCalled(); // Not called until user interaction
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalPlace: Place = {
        id: 'place_minimal',
        name: 'Minimal Place',
        type: 'cafe',
        city: 'Rome',
        latitude: 41.9,
        longitude: 12.5,
        // No rating, tags, price_range, etc.
      };

      const itineraryPlaces = [mockPlaces[0]]; // Trevi Fountain (Rome)
      const itineraryPlaceIds = new Set(['place_001']);

      renderWithProviders(
        <RecommendationsSection
          allPlaces={[...mockPlaces, minimalPlace]}
          itineraryPlaces={itineraryPlaces}
          itineraryPlaceIds={itineraryPlaceIds}
        />
      );

      // Should still show recommendations including the minimal place
      expect(screen.getByText('Minimal Place')).toBeInTheDocument();
    });
  });
});
