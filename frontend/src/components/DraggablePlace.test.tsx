import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggablePlace } from './DraggablePlace';
import { Place } from '../types';

// ============================================================================
// Mock Data
// ============================================================================

const mockPlace: Place = {
  id: 'place_001',
  name: 'Colosseum',
  type: 'historic_site',
  city: 'Rome',
  latitude: 41.8902,
  longitude: 12.4922,
  description: 'Ancient Roman amphitheater',
  duration_minutes: 120,
  rating: 4.5,
  price_range: '€€',
  tags: ['ancient', 'monument'],
};

const mockPlaceWithoutDuration: Place = {
  id: 'place_002',
  name: 'Roman Forum',
  type: 'historic_site',
  city: 'Rome',
  latitude: 41.8925,
  longitude: 12.4853,
  description: 'Ancient Roman ruins',
  duration_minutes: null,
  rating: 4.3,
  price_range: '€',
  tags: ['ancient'],
};

// ============================================================================
// Mock window.confirm
// ============================================================================

beforeEach(() => {
  vi.stubGlobal('confirm', vi.fn());
});

// ============================================================================
// Test Wrapper
// ============================================================================

function renderWithDnd(component: React.ReactElement) {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('DraggablePlace Component', () => {
  describe('Rendering', () => {
    it('should render place name', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('Colosseum')).toBeInTheDocument();
    });

    it('should render time slot', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('08:00 AM')).toBeInTheDocument();
    });

    it('should render place type and city', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('historic site')).toBeInTheDocument();
      expect(screen.getByText('Rome')).toBeInTheDocument();
    });

    it('should format duration correctly', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('2 hours')).toBeInTheDocument();
    });

    it('should show default duration for places without duration_minutes', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlaceWithoutDuration}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('1 hour')).toBeInTheDocument();
    });

    it('should format duration with hours and minutes', () => {
      const place = { ...mockPlace, duration_minutes: 90 };
      
      renderWithDnd(
        <DraggablePlace
          place={place}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });

    it('should format duration with only minutes', () => {
      const place = { ...mockPlace, duration_minutes: 45 };
      
      renderWithDnd(
        <DraggablePlace
          place={place}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('45 min')).toBeInTheDocument();
    });
  });

  describe('Remove Button', () => {
    it('should render remove button', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      const removeButton = screen.getByLabelText('Remove Colosseum from day 1');
      expect(removeButton).toBeInTheDocument();
    });

    it('should show confirmation dialog when remove button clicked', () => {
      const mockConfirm = vi.fn(() => true);
      vi.stubGlobal('confirm', mockConfirm);

      const mockOnRemove = vi.fn();
      
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={mockOnRemove}
        />
      );

      const removeButton = screen.getByLabelText('Remove Colosseum from day 1');
      fireEvent.click(removeButton);

      expect(mockConfirm).toHaveBeenCalledWith('Remove "Colosseum" from Day 1?');
    });

    it('should call onRemove when confirmed', () => {
      const mockConfirm = vi.fn(() => true);
      vi.stubGlobal('confirm', mockConfirm);

      const mockOnRemove = vi.fn();
      
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={mockOnRemove}
        />
      );

      const removeButton = screen.getByLabelText('Remove Colosseum from day 1');
      fireEvent.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith(0);
      expect(mockOnRemove).toHaveBeenCalledTimes(1);
    });

    it('should not call onRemove when cancelled', () => {
      const mockConfirm = vi.fn(() => false);
      vi.stubGlobal('confirm', mockConfirm);

      const mockOnRemove = vi.fn();
      
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={mockOnRemove}
        />
      );

      const removeButton = screen.getByLabelText('Remove Colosseum from day 1');
      fireEvent.click(removeButton);

      expect(mockOnRemove).not.toHaveBeenCalled();
    });
  });

  describe('Drag Handle', () => {
    it('should render drag handle icon', () => {
      const { container } = renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      // Check for drag handle svg
      const dragHandles = container.querySelectorAll('svg');
      expect(dragHandles.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Colosseum at 08:00 AM')).toBeInTheDocument();
    });

    it('should have listitem role', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByRole('listitem')).toBeInTheDocument();
    });

    it('should have accessible remove button', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={2}
          dayNumber={3}
          timeSlot="02:00 PM"
          onRemove={vi.fn()}
        />
      );

      const removeButton = screen.getByLabelText('Remove Colosseum from day 3');
      expect(removeButton).toHaveAttribute('aria-label', 'Remove Colosseum from day 3');
    });
  });

  describe('Place Type Formatting', () => {
    it('should format place type with spaces', () => {
      const place = { ...mockPlace, type: 'historic_site' as const };
      
      renderWithDnd(
        <DraggablePlace
          place={place}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('historic site')).toBeInTheDocument();
    });

    it('should display place type', () => {
      const place = { ...mockPlace, type: 'restaurant' as const };
      
      renderWithDnd(
        <DraggablePlace
          place={place}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText('restaurant')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should accept and apply custom className', () => {
      const { container } = renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
          className="custom-test-class"
        />
      );

      const placeElement = container.querySelector('.custom-test-class');
      expect(placeElement).toBeInTheDocument();
    });
  });

  describe('Different Day Numbers', () => {
    it('should work with day 1', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={1}
          timeSlot="08:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Remove Colosseum from day 1')).toBeInTheDocument();
    });

    it('should work with day 2', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={2}
          timeSlot="10:00 AM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Remove Colosseum from day 2')).toBeInTheDocument();
    });

    it('should work with day 3', () => {
      renderWithDnd(
        <DraggablePlace
          place={mockPlace}
          index={0}
          dayNumber={3}
          timeSlot="02:00 PM"
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByLabelText('Remove Colosseum from day 3')).toBeInTheDocument();
    });
  });
});
