import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DayPlan } from './DayPlan';
import { Place } from '../types';
import { ItineraryProvider } from '../contexts/ItineraryContext';

// ============================================================================
// Mock Data
// ============================================================================

const mockPlace1: Place = {
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

const mockPlace2: Place = {
  id: 'place_002',
  name: 'Trattoria Da Enzo',
  type: 'restaurant',
  city: 'Rome',
  latitude: 41.8867,
  longitude: 12.4696,
  description: 'Traditional Roman cuisine',
  duration_minutes: 90,
  rating: 4.7,
  price_range: '€€',
  tags: ['food', 'traditional'],
};

const mockPlace3: Place = {
  id: 'place_003',
  name: 'Vatican Museums',
  type: 'museum',
  city: 'Rome',
  latitude: 41.9065,
  longitude: 12.4536,
  description: 'World-famous art museums',
  duration_minutes: 180,
  rating: 4.8,
  price_range: '€€€',
  tags: ['art', 'culture'],
};

// ============================================================================
// Test Wrapper
// ============================================================================

function renderWithDndAndContext(component: React.ReactElement) {
  return render(
    <DndProvider backend={HTML5Backend}>
      <ItineraryProvider>
        {component}
      </ItineraryProvider>
    </DndProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('DayPlan Component', () => {
  describe('Rendering', () => {
    it('should render day number', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[]}
          totalDuration={0}
        />
      );

      expect(screen.getByText('Day 1')).toBeInTheDocument();
    });

    it('should render with custom start time', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={2}
          places={[]}
          totalDuration={0}
          startTime="09:00"
        />
      );

      expect(screen.getByText(/Start: 9:00 AM/)).toBeInTheDocument();
    });

    it('should display place count', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2]}
          totalDuration={210}
        />
      );

      expect(screen.getByText('2 places')).toBeInTheDocument();
    });

    it('should display singular "place" for 1 place', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1]}
          totalDuration={120}
        />
      );

      expect(screen.getByText('1 place')).toBeInTheDocument();
    });

    it('should display total duration', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2]}
          totalDuration={210}
        />
      );

      expect(screen.getByText('3h 30m')).toBeInTheDocument();
    });

    it('should format duration with only hours', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2]}
          totalDuration={240}
        />
      );

      expect(screen.getByText('4 hours')).toBeInTheDocument();
    });

    it('should format duration with only minutes', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1]}
          totalDuration={45}
        />
      );

      expect(screen.getByText('45 min')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no places', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[]}
          totalDuration={0}
        />
      );

      expect(screen.getByText(/No places added to Day 1 yet/)).toBeInTheDocument();
      expect(screen.getByText(/Browse places on the left and click "Add to Itinerary"/)).toBeInTheDocument();
    });

    it('should show "Add First Place" button in empty state', () => {
      const mockAddPlace = vi.fn();
      
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[]}
          totalDuration={0}
          onAddPlace={mockAddPlace}
        />
      );

      const addButton = screen.getByText('+ Add First Place');
      expect(addButton).toBeInTheDocument();
      
      fireEvent.click(addButton);
      expect(mockAddPlace).toHaveBeenCalledTimes(1);
    });

    it('should not show "Add First Place" button when onAddPlace not provided', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[]}
          totalDuration={0}
        />
      );

      expect(screen.queryByText('Add First Place')).not.toBeInTheDocument();
    });
  });

  describe('Places Display', () => {
    it('should render all places', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2, mockPlace3]}
          totalDuration={390}
        />
      );

      expect(screen.getByText('Colosseum')).toBeInTheDocument();
      expect(screen.getByText('Trattoria Da Enzo')).toBeInTheDocument();
      expect(screen.getByText('Vatican Museums')).toBeInTheDocument();
    });

    it('should calculate and display time slots', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2]}
          totalDuration={210}
          startTime="08:00"
        />
      );

      // First place starts at 8:00 AM
      expect(screen.getByText('8:00 AM')).toBeInTheDocument();
      
      // Second place starts after first place duration (120 min = 2 hours)
      // So second place should start at 10:00 AM
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });
  });

  describe('Warning Indicator', () => {
    it('should show warning when total duration exceeds 10 hours', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2, mockPlace3]}
          totalDuration={650} // 10 hours 50 minutes
        />
      );

      expect(
        screen.getByText(/This day exceeds 10 hours of activities/)
      ).toBeInTheDocument();
    });

    it('should not show warning when total duration is under 10 hours', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2]}
          totalDuration={210} // 3.5 hours
        />
      );

      expect(
        screen.queryByText(/This day exceeds 10 hours of activities/)
      ).not.toBeInTheDocument();
    });

    it('should not show warning at exactly 10 hours', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2, mockPlace3]}
          totalDuration={600} // Exactly 10 hours
        />
      );

      expect(
        screen.queryByText(/This day exceeds 10 hours of activities/)
      ).not.toBeInTheDocument();
    });
  });

  describe('Add Place Button', () => {
    it('should render "Add Place" button in header when onAddPlace provided', () => {
      const mockAddPlace = vi.fn();
      
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1]}
          totalDuration={120}
          onAddPlace={mockAddPlace}
        />
      );

      const addButtons = screen.getAllByText('Add Place');
      expect(addButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(addButtons[0]);
      expect(mockAddPlace).toHaveBeenCalledTimes(1);
    });

    it('should not render "Add Place" button when onAddPlace not provided', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1]}
          totalDuration={120}
        />
      );

      expect(screen.queryByText('Add Place')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1]}
          totalDuration={120}
        />
      );

      expect(screen.getByRole('region', { name: 'Day 1 itinerary' })).toBeInTheDocument();
    });

    it('should have list role for places container', () => {
      renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[mockPlace1, mockPlace2]}
          totalDuration={210}
        />
      );

      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should accept and apply custom className', () => {
      const { container } = renderWithDndAndContext(
        <DayPlan
          dayNumber={1}
          places={[]}
          totalDuration={0}
          className="custom-test-class"
        />
      );

      const dayPlanElement = container.querySelector('.custom-test-class');
      expect(dayPlanElement).toBeInTheDocument();
    });
  });

  describe('Integration with Context', () => {
    it('should render within ItineraryProvider without errors', () => {
      expect(() => {
        renderWithDndAndContext(
          <DayPlan
            dayNumber={1}
            places={[mockPlace1, mockPlace2]}
            totalDuration={210}
          />
        );
      }).not.toThrow();
    });
  });
});
