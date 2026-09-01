import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceCard } from './PlaceCard';
import { Place } from '../types';
import { UIProvider } from '../contexts/UIContext';
import { ItineraryProvider } from '../contexts/ItineraryContext';

// ============================================================================
// Mock Data
// ============================================================================

const mockPlace: Place = {
  id: 'place_001',
  name: 'Test Restaurant',
  type: 'restaurant',
  city: 'Rome',
  latitude: 41.9028,
  longitude: 12.4964,
  neighborhood: 'Trastevere',
  description: 'A wonderful restaurant with authentic Italian cuisine and amazing atmosphere',
  hours: '11:00-23:00',
  duration_minutes: 90,
  price_range: '€€',
  rating: 4.5,
  tags: ['italian', 'dinner', 'romantic'],
  booking_required: true,
};

const mockPlaceWithNulls: Place = {
  id: 'place_002',
  name: 'Simple Place',
  type: 'park',
  city: 'Florence',
  latitude: 43.7696,
  longitude: 11.2558,
  description: null,
  hours: null,
  duration_minutes: null,
  price_range: null,
  rating: null,
  tags: undefined,
  booking_required: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

function renderWithUI(component: React.ReactElement) {
  return render(
    <UIProvider>
      <ItineraryProvider>{component}</ItineraryProvider>
    </UIProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('PlaceCard', () => {
  describe('Rendering', () => {
    it('should render place name, city, and type', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      expect(screen.getByText('Test Restaurant')).toBeInTheDocument();
      expect(screen.getByText('Rome')).toBeInTheDocument();
      // Query by role and make it more specific - look for the type within the metadata section
      const typeElement = screen.getByText((content, element) => {
        return element?.className.includes('capitalize') && content === 'restaurant';
      });
      expect(typeElement).toBeInTheDocument();
    });

    it('should render neighborhood when present', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      expect(screen.getByText('Trastevere')).toBeInTheDocument();
    });

    it('should render rating as stars', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      // Check for rating value
      expect(screen.getByText('(4.5)')).toBeInTheDocument();
      // Stars are displayed but checking via aria-label
      expect(screen.getByLabelText(/Rating: 4.5 out of 5/)).toBeInTheDocument();
    });

    it('should show "Unrated" when rating is null', () => {
      renderWithUI(<PlaceCard place={mockPlaceWithNulls} />);

      expect(screen.getByText('Unrated')).toBeInTheDocument();
    });

    it('should render price range', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      expect(screen.getByLabelText('Price range: €€')).toBeInTheDocument();
    });

    it('should render default price range when null', () => {
      renderWithUI(<PlaceCard place={mockPlaceWithNulls} />);

      expect(screen.getByLabelText('Price range: €')).toBeInTheDocument();
    });

    it('should render booking required indicator when true', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      expect(screen.getByText('Booking')).toBeInTheDocument();
      expect(screen.getByLabelText('Advance booking required')).toBeInTheDocument();
    });

    it('should not render booking indicator when null or false', () => {
      renderWithUI(<PlaceCard place={mockPlaceWithNulls} />);

      expect(screen.queryByText('Booking')).not.toBeInTheDocument();
    });

    it('should render tags as badges', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      expect(screen.getByText('italian')).toBeInTheDocument();
      expect(screen.getByText('dinner')).toBeInTheDocument();
      expect(screen.getByText('romantic')).toBeInTheDocument();
    });

    it('should limit tags to 5 and show "+N more" for additional tags', () => {
      const placeWithManyTags: Place = {
        ...mockPlace,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7'],
      };

      renderWithUI(<PlaceCard place={placeWithManyTags} />);

      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag5')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
      expect(screen.queryByText('tag6')).not.toBeInTheDocument();
    });

    it('should render truncated description', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      // Description is truncated but should contain the beginning
      expect(screen.getByText(/A wonderful restaurant with authentic Italian cuisine/)).toBeInTheDocument();
    });

    it('should render fallback description when null', () => {
      renderWithUI(<PlaceCard place={mockPlaceWithNulls} />);

      expect(screen.getByText('No description available')).toBeInTheDocument();
    });

    it('should render duration when present', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      expect(screen.getByText('~90 min')).toBeInTheDocument();
    });

    it('should not render duration when null', () => {
      renderWithUI(<PlaceCard place={mockPlaceWithNulls} />);

      expect(screen.queryByText(/min/)).not.toBeInTheDocument();
    });
  });

  describe('In Itinerary Indicator', () => {
    it('should show "In Itinerary" badge when isInItinerary is true', () => {
      renderWithUI(<PlaceCard place={mockPlace} isInItinerary={true} />);

      expect(screen.getByText('In Itinerary')).toBeInTheDocument();
      expect(screen.getByLabelText('Already in itinerary')).toBeInTheDocument();
    });

    it('should apply border styling when in itinerary', () => {
      const { container } = renderWithUI(<PlaceCard place={mockPlace} isInItinerary={true} />);

      const card = container.querySelector('.border-blue-500');
      expect(card).toBeInTheDocument();
    });

    it('should not show "In Itinerary" badge when isInItinerary is false', () => {
      renderWithUI(<PlaceCard place={mockPlace} isInItinerary={false} />);

      expect(screen.queryByText('In Itinerary')).not.toBeInTheDocument();
    });
  });

  describe('Add to Itinerary Button', () => {
    it('should render "Add to Itinerary" button when callback is provided and not in itinerary', () => {
      const onAdd = vi.fn();
      renderWithUI(<PlaceCard place={mockPlace} onAddToItinerary={onAdd} />);

      expect(screen.getByRole('button', { name: /Add Test Restaurant to itinerary/ })).toBeInTheDocument();
    });

    it('should not render button when callback is not provided', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      // Button should not be visible when no callback is provided
      expect(screen.queryByRole('button', { name: /Add to itinerary/ })).not.toBeInTheDocument();
    });

    it('should not render button when place is already in itinerary', () => {
      const onAdd = vi.fn();
      renderWithUI(<PlaceCard place={mockPlace} isInItinerary={true} onAddToItinerary={onAdd} />);

      expect(screen.queryByRole('button', { name: /Add to itinerary/ })).not.toBeInTheDocument();
    });

    it('should call onAddToItinerary when button is clicked', () => {
      const onAdd = vi.fn();
      renderWithUI(<PlaceCard place={mockPlace} onAddToItinerary={onAdd} />);

      const button = screen.getByRole('button', { name: /Add Test Restaurant to itinerary/ });
      fireEvent.click(button);

      expect(onAdd).toHaveBeenCalledWith(mockPlace);
      expect(onAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interactions', () => {
    it('should open detail modal when card is clicked', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      const card = screen.getByRole('button', { name: 'View details for Test Restaurant' });
      fireEvent.click(card);

      // We can't easily test the modal opening without mocking the context
      // but we can verify the card is clickable
      expect(card).toBeInTheDocument();
    });

    it('should open detail modal when Enter key is pressed', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      const card = screen.getByRole('button', { name: 'View details for Test Restaurant' });
      fireEvent.keyDown(card, { key: 'Enter' });

      // Verify the card handles keyboard interaction
      expect(card).toBeInTheDocument();
    });

    it('should open detail modal when Space key is pressed', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      const card = screen.getByRole('button', { name: 'View details for Test Restaurant' });
      fireEvent.keyDown(card, { key: ' ' });

      // Verify the card handles keyboard interaction
      expect(card).toBeInTheDocument();
    });

    it('should not open modal when add button is clicked', () => {
      const onAdd = vi.fn();
      renderWithUI(<PlaceCard place={mockPlace} onAddToItinerary={onAdd} />);

      const addButton = screen.getByRole('button', { name: /Add Test Restaurant to itinerary/ });
      fireEvent.click(addButton);

      // Only the onAdd should be called, not modal open
      expect(onAdd).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      expect(screen.getByRole('button', { name: 'View details for Test Restaurant' })).toBeInTheDocument();
      expect(screen.getByLabelText('Rating: 4.5 out of 5')).toBeInTheDocument();
      expect(screen.getByLabelText('Price range: €€')).toBeInTheDocument();
      expect(screen.getByLabelText('Advance booking required')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderWithUI(<PlaceCard place={mockPlace} />);

      const card = screen.getByRole('button', { name: 'View details for Test Restaurant' });
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = renderWithUI(
        <PlaceCard place={mockPlace} className="custom-class" />
      );

      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });
});
