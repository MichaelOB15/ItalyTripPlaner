import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceList } from './PlaceList';
import { Place } from '../types';
import { UIProvider } from '../contexts/UIContext';

// ============================================================================
// Mock Data
// ============================================================================

const createMockPlace = (id: string, name: string): Place => ({
  id,
  name,
  type: 'restaurant',
  city: 'Rome',
  latitude: 41.9028,
  longitude: 12.4964,
  description: `Description for ${name}`,
  rating: 4.0,
  price_range: '€€',
  tags: ['italian'],
});

const mockPlaces: Place[] = [
  createMockPlace('place_001', 'Place 1'),
  createMockPlace('place_002', 'Place 2'),
  createMockPlace('place_003', 'Place 3'),
];

const mockManyPlaces: Place[] = Array.from({ length: 15 }, (_, i) =>
  createMockPlace(`place_${String(i + 1).padStart(3, '0')}`, `Place ${i + 1}`)
);

// ============================================================================
// Helper Functions
// ============================================================================

function renderWithUI(component: React.ReactElement) {
  return render(<UIProvider>{component}</UIProvider>);
}

// ============================================================================
// Tests
// ============================================================================

describe('PlaceList', () => {
  describe('Loading State', () => {
    it('should render loading skeletons when isLoading is true', () => {
      renderWithUI(<PlaceList places={[]} isLoading={true} />);

      // Check for skeleton elements (they have animate-pulse class)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show loading status for screen readers', () => {
      renderWithUI(<PlaceList places={[]} isLoading={true} />);

      expect(screen.getByRole('status', { name: /Loading places/ })).toBeInTheDocument();
    });

    it('should not show places when loading', () => {
      renderWithUI(<PlaceList places={mockPlaces} isLoading={true} />);

      expect(screen.queryByText('Place 1')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when places array is empty', () => {
      renderWithUI(<PlaceList places={[]} isLoading={false} />);

      expect(screen.getByText('No places match your filters')).toBeInTheDocument();
      expect(
        screen.getByText('Try adjusting your search or filter criteria to see more results.')
      ).toBeInTheDocument();
    });

    it('should show empty state status for screen readers', () => {
      renderWithUI(<PlaceList places={[]} isLoading={false} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should not show empty state when loading', () => {
      renderWithUI(<PlaceList places={[]} isLoading={true} />);

      expect(screen.queryByText('No places match your filters')).not.toBeInTheDocument();
    });
  });

  describe('Regular Grid Rendering (< 10 items)', () => {
    it('should render places in a regular grid when less than 10 items', () => {
      renderWithUI(<PlaceList places={mockPlaces} />);

      expect(screen.getByText('Place 1')).toBeInTheDocument();
      expect(screen.getByText('Place 2')).toBeInTheDocument();
      expect(screen.getByText('Place 3')).toBeInTheDocument();
    });

    it('should show place count', () => {
      renderWithUI(<PlaceList places={mockPlaces} />);

      expect(screen.getByText('Showing 3 places')).toBeInTheDocument();
    });

    it('should use singular "place" when count is 1', () => {
      const singlePlace = [mockPlaces[0]];
      renderWithUI(<PlaceList places={singlePlace} />);

      expect(screen.getByText('Showing 1 place')).toBeInTheDocument();
    });

    it('should have proper list semantics', () => {
      renderWithUI(<PlaceList places={mockPlaces} />);

      expect(screen.getByRole('list', { name: '3 places found' })).toBeInTheDocument();
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
    });
  });

  describe('Virtual Scrolling (>= 10 items)', () => {
    it('should use virtual scrolling for 10+ items', () => {
      renderWithUI(<PlaceList places={mockManyPlaces} />);

      // Virtual scrolling should render the list with specific aria-label
      expect(screen.getByRole('list', { name: '15 places found' })).toBeInTheDocument();
      expect(screen.getByText('Showing 15 places')).toBeInTheDocument();
    });

    it('should have proper border styling for virtual scroll container', () => {
      const { container } = renderWithUI(<PlaceList places={mockManyPlaces} />);

      const scrollContainer = container.querySelector('.border-gray-200.rounded-lg');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Itinerary Highlighting', () => {
    it('should highlight places that are in itinerary', () => {
      const itineraryIds = new Set(['place_001', 'place_003']);
      renderWithUI(
        <PlaceList places={mockPlaces} itineraryPlaceIds={itineraryIds} />
      );

      // The PlaceCard component handles the highlighting
      // We just verify the list renders with the prop
      expect(screen.getByText('Place 1')).toBeInTheDocument();
      expect(screen.getByText('Place 3')).toBeInTheDocument();
    });

    it('should work with empty itinerary set', () => {
      renderWithUI(
        <PlaceList places={mockPlaces} itineraryPlaceIds={new Set()} />
      );

      expect(screen.getByText('Place 1')).toBeInTheDocument();
    });
  });

  describe('Add to Itinerary Callback', () => {
    it('should pass onAddToItinerary to PlaceCard components', () => {
      const onAdd = vi.fn();
      renderWithUI(
        <PlaceList places={mockPlaces} onAddToItinerary={onAdd} />
      );

      // Check that add buttons are rendered
      const addButtons = screen.getAllByRole('button', { name: /Add .* to itinerary/ });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('should work without onAddToItinerary callback', () => {
      renderWithUI(<PlaceList places={mockPlaces} />);

      // Should render without add buttons
      expect(screen.getByText('Place 1')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Add to itinerary/ })).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = renderWithUI(
        <PlaceList places={mockPlaces} className="custom-class" />
      );

      const customElement = container.querySelector('.custom-class');
      expect(customElement).toBeInTheDocument();
    });

    it('should use custom itemHeight prop', () => {
      // This is harder to test without mocking react-window
      // but we can verify the component renders
      renderWithUI(
        <PlaceList places={mockManyPlaces} itemHeight={400} />
      );

      expect(screen.getByText('Showing 15 places')).toBeInTheDocument();
    });

    it('should use custom listHeight prop', () => {
      // This is harder to test without mocking react-window
      // but we can verify the component renders
      renderWithUI(
        <PlaceList places={mockManyPlaces} listHeight={800} />
      );

      expect(screen.getByText('Showing 15 places')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('should memoize the component', () => {
      // PlaceList is wrapped in React.memo
      // We verify it has the displayName set by React.memo
      expect(PlaceList.displayName).toContain('memo');
    });

    it('should render efficiently with many items', () => {
      const startTime = performance.now();
      renderWithUI(<PlaceList places={mockManyPlaces} />);
      const endTime = performance.now();

      // Virtual scrolling should render quickly
      expect(endTime - startTime).toBeLessThan(1000); // Should render in under 1 second
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for list', () => {
      renderWithUI(<PlaceList places={mockPlaces} />);

      expect(screen.getByRole('list', { name: '3 places found' })).toBeInTheDocument();
    });

    it('should maintain accessibility in loading state', () => {
      renderWithUI(<PlaceList places={[]} isLoading={true} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should maintain accessibility in empty state', () => {
      renderWithUI(<PlaceList places={[]} isLoading={false} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 10 items (boundary for virtual scrolling)', () => {
      const tenPlaces = Array.from({ length: 10 }, (_, i) =>
        createMockPlace(`place_${String(i + 1).padStart(3, '0')}`, `Place ${i + 1}`)
      );

      renderWithUI(<PlaceList places={tenPlaces} />);

      expect(screen.getByText('Showing 10 places')).toBeInTheDocument();
      expect(screen.getByRole('list', { name: '10 places found' })).toBeInTheDocument();
    });

    it('should handle exactly 9 items (just below virtual scrolling threshold)', () => {
      const ninePlaces = Array.from({ length: 9 }, (_, i) =>
        createMockPlace(`place_${String(i + 1).padStart(3, '0')}`, `Place ${i + 1}`)
      );

      renderWithUI(<PlaceList places={ninePlaces} />);

      expect(screen.getByText('Showing 9 places')).toBeInTheDocument();
      // Should use regular grid, so we should see listitem roles
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(9);
    });

    it('should handle very large dataset', () => {
      const manyPlaces = Array.from({ length: 150 }, (_, i) =>
        createMockPlace(`place_${String(i + 1).padStart(3, '0')}`, `Place ${i + 1}`)
      );

      renderWithUI(<PlaceList places={manyPlaces} />);

      expect(screen.getByText('Showing 150 places')).toBeInTheDocument();
    });
  });
});
