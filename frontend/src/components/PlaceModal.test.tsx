import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaceModal } from './PlaceModal';
import { Place } from '../types';

// ============================================================================
// Mock Data
// ============================================================================

const mockPlace: Place = {
  id: 'place_001',
  name: 'Uffizi Gallery',
  type: 'museum',
  city: 'Florence',
  region: 'Tuscany',
  neighborhood: 'Historic Center',
  latitude: 43.7686,
  longitude: 11.2558,
  description: 'One of the most famous art museums in the world.',
  hours: 'Tue-Sun 8:15-18:50, closed Mon',
  duration_minutes: 180,
  rating: 4.7,
  price_range: '€€',
  tags: ['art', 'renaissance', 'indoor'],
  seasonal_notes: 'Very crowded in summer months',
  booking_required: true,
};

const minimalPlace: Place = {
  id: 'place_002',
  name: 'Local Park',
  type: 'park',
  city: 'Rome',
  latitude: 41.9028,
  longitude: 12.4964,
};

// ============================================================================
// Tests
// ============================================================================

describe('PlaceModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAddToDay = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnAddToDay.mockClear();
  });

  afterEach(() => {
    // Clean up any body overflow styles
    document.body.style.overflow = '';
  });

  describe('Rendering and Visibility', () => {
    it('should not render when isOpen is false', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={false}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should lock body scroll when modal is open', () => {
      const { rerender } = render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <PlaceModal
          place={mockPlace}
          isOpen={false}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Place Information Display', () => {
    it('should display full place information (Requirement 3.5)', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      // Name and type
      expect(screen.getByText('Uffizi Gallery')).toBeInTheDocument();
      expect(screen.getByText(/Museum in Florence/i)).toBeInTheDocument();

      // Location details
      expect(screen.getByText(/City:/)).toBeInTheDocument();
      expect(screen.getByText('Florence')).toBeInTheDocument();
      expect(screen.getByText(/Region:/)).toBeInTheDocument();
      expect(screen.getByText('Tuscany')).toBeInTheDocument();
      expect(screen.getByText(/Neighborhood:/)).toBeInTheDocument();
      expect(screen.getByText('Historic Center')).toBeInTheDocument();

      // Coordinates
      expect(screen.getByText(/Coordinates:/)).toBeInTheDocument();
      expect(screen.getByText(/43\.768600, 11\.255800/)).toBeInTheDocument();

      // Description
      expect(
        screen.getByText('One of the most famous art museums in the world.')
      ).toBeInTheDocument();

      // Hours
      expect(screen.getByText('Tue-Sun 8:15-18:50, closed Mon')).toBeInTheDocument();

      // Duration
      expect(screen.getByText('180 minutes')).toBeInTheDocument();

      // Rating
      expect(screen.getByText('4.7')).toBeInTheDocument();

      // Price range
      expect(screen.getByText('€€')).toBeInTheDocument();

      // Tags
      expect(screen.getByText('art')).toBeInTheDocument();
      expect(screen.getByText('renaissance')).toBeInTheDocument();
      expect(screen.getByText('indoor')).toBeInTheDocument();
    });

    it('should display seasonal notes when present (Requirement 3.7)', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText('Seasonal Notes')).toBeInTheDocument();
      expect(screen.getByText('Very crowded in summer months')).toBeInTheDocument();
    });

    it('should show booking required indicator with explanation (Requirement 3.6)', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText('Booking Information')).toBeInTheDocument();
      expect(screen.getByText('Advance booking required')).toBeInTheDocument();
      expect(
        screen.getByText(/This place requires advance reservations/i)
      ).toBeInTheDocument();
    });
  });

  describe('Null/Empty Field Handling (Requirement 12.1)', () => {
    it('should show placeholders for missing optional fields', () => {
      render(
        <PlaceModal
          place={minimalPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      // Description placeholder
      expect(screen.getByText('No description available.')).toBeInTheDocument();

      // Hours placeholder
      expect(screen.getByText('Hours not specified')).toBeInTheDocument();

      // Duration placeholder
      expect(screen.getByText('Estimated 1 hour')).toBeInTheDocument();

      // Rating placeholder
      expect(screen.getByText('Unrated')).toBeInTheDocument();

      // Price placeholder
      expect(screen.getByText('Not specified')).toBeInTheDocument();
    });

    it('should not show sections for missing optional fields', () => {
      render(
        <PlaceModal
          place={minimalPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      // No region/neighborhood if not present
      expect(screen.queryByText(/Region:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Neighborhood:/)).not.toBeInTheDocument();

      // No tags section
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();

      // No seasonal notes
      expect(screen.queryByText('Seasonal Notes')).not.toBeInTheDocument();

      // No booking required
      expect(screen.queryByText('Booking Information')).not.toBeInTheDocument();
    });
  });

  describe('Rating Display', () => {
    it('should render rating stars correctly for whole numbers', () => {
      const placeWithRating = { ...minimalPlace, rating: 4 };
      render(
        <PlaceModal
          place={placeWithRating}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText('4.0')).toBeInTheDocument();
    });

    it('should render half stars for decimal ratings', () => {
      const placeWithRating = { ...minimalPlace, rating: 4.5 };
      render(
        <PlaceModal
          place={placeWithRating}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('should show "Unrated" for null rating', () => {
      render(
        <PlaceModal
          place={minimalPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText('Unrated')).toBeInTheDocument();
    });
  });

  describe('Add to Day Buttons', () => {
    it('should render three "Add to Day" buttons', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText('Add to Day 1')).toBeInTheDocument();
      expect(screen.getByText('Add to Day 2')).toBeInTheDocument();
      expect(screen.getByText('Add to Day 3')).toBeInTheDocument();
    });

    it('should call onAddToDay with correct parameters when button clicked', async () => {
      const user = userEvent.setup();
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      await user.click(screen.getByText('Add to Day 1'));
      expect(mockOnAddToDay).toHaveBeenCalledWith(mockPlace, 1);

      await user.click(screen.getByText('Add to Day 2'));
      expect(mockOnAddToDay).toHaveBeenCalledWith(mockPlace, 2);

      await user.click(screen.getByText('Add to Day 3'));
      expect(mockOnAddToDay).toHaveBeenCalledWith(mockPlace, 3);
    });

    it('should disable buttons for days where place is already added', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
          daysWithPlace={[1, 3]}
        />
      );

      const day1Button = screen.getByText(/✓ Added to Day 1/);
      const day2Button = screen.getByText('Add to Day 2');
      const day3Button = screen.getByText(/✓ Added to Day 3/);

      expect(day1Button).toBeDisabled();
      expect(day2Button).not.toBeDisabled();
      expect(day3Button).toBeDisabled();
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      const closeButton = screen.getByLabelText('Close modal');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key pressed', async () => {
      const user = userEvent.setup();
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay clicked', async () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      // Find the overlay element (first child with the bg-black class)
      const overlay = document.querySelector('.bg-black.bg-opacity-50') as HTMLElement;
      expect(overlay).toBeTruthy();
      
      // Simulate a direct click event on the overlay
      overlay.click();

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking inside modal content', async () => {
      const user = userEvent.setup();
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      const modalContent = screen.getByText('Uffizi Gallery');
      await user.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should have accessible button labels', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
          daysWithPlace={[1]}
        />
      );

      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
      expect(screen.getByLabelText('Already added to Day 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Add to Day 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Add to Day 3')).toBeInTheDocument();
    });
  });

  describe('Place Type Formatting', () => {
    it('should format place types with underscores correctly', () => {
      const places = [
        { ...minimalPlace, type: 'historic_site' as const },
        { ...minimalPlace, type: 'restaurant' as const },
      ];

      const { rerender } = render(
        <PlaceModal
          place={places[0]}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText(/Historic Site in Rome/i)).toBeInTheDocument();

      rerender(
        <PlaceModal
          place={places[1]}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText(/Restaurant in Rome/i)).toBeInTheDocument();
    });
  });

  describe('Tags Display', () => {
    it('should display all tags when present', () => {
      render(
        <PlaceModal
          place={mockPlace}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('art')).toBeInTheDocument();
      expect(screen.getByText('renaissance')).toBeInTheDocument();
      expect(screen.getByText('indoor')).toBeInTheDocument();
    });

    it('should not display tags section when empty', () => {
      const placeWithoutTags = { ...minimalPlace, tags: [] };
      render(
        <PlaceModal
          place={placeWithoutTags}
          isOpen={true}
          onClose={mockOnClose}
          onAddToDay={mockOnAddToDay}
        />
      );

      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });
  });
});
