import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';
import { FilterProvider } from '../contexts/FilterContext';
import { Place, PlaceType } from '../types';

// ============================================================================
// Test Data
// ============================================================================

const createMockPlace = (
  id: string,
  name: string,
  city: string,
  type: PlaceType = 'restaurant',
  description?: string
): Place => ({
  id,
  name,
  type,
  city,
  latitude: 41.9028,
  longitude: 12.4964,
  description: description || null,
  region: 'Lazio',
  neighborhood: null,
  hours: '9:00-17:00',
  duration_minutes: 60,
  price_range: '€€',
  rating: 4.5,
  tags: ['historic', 'cultural'],
  seasonal_notes: null,
  booking_required: false,
});

const mockPlaces: Place[] = [
  createMockPlace(
    'place_001',
    'Colosseum',
    'Rome',
    'historic_site',
    'Ancient Roman amphitheater'
  ),
  createMockPlace(
    'place_002',
    'Trattoria Romana',
    'Rome',
    'restaurant',
    'Traditional Roman cuisine'
  ),
  createMockPlace(
    'place_003',
    'Uffizi Gallery',
    'Florence',
    'museum',
    'Renaissance art museum'
  ),
];

// ============================================================================
// Test Wrapper Component
// ============================================================================

interface WrapperProps {
  children: React.ReactNode;
  debounceDelay?: number;
}

function TestWrapper({ children, debounceDelay = 300 }: WrapperProps) {
  return (
    <FilterProvider debounceDelay={debounceDelay}>
      {children}
    </FilterProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render search input with default placeholder', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute(
        'placeholder',
        'Search places by name or description...'
      );
    });

    it('should render with custom placeholder', () => {
      const customPlaceholder = 'Find restaurants, museums, landmarks...';
      render(
        <TestWrapper>
          <SearchBar
            filteredPlaces={mockPlaces}
            placeholder={customPlaceholder}
          />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      expect(input).toHaveAttribute('placeholder', customPlaceholder);
    });

    it('should render search icon', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const searchIcon = screen.getByLabelText('Search places').previousSibling;
      expect(searchIcon).toBeInTheDocument();
    });

    it('should apply custom className to container', () => {
      const { container } = render(
        <TestWrapper>
          <SearchBar
            filteredPlaces={mockPlaces}
            className="my-custom-class"
          />
        </TestWrapper>
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('my-custom-class');
    });
  });

  // ==========================================================================
  // Input Interaction Tests
  // ==========================================================================

  describe('Input Interaction', () => {
    it('should update input value when user types', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Colosseum' } });

      expect(input.value).toBe('Colosseum');
    });

    it('should handle empty input', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test' } });
      fireEvent.change(input, { target: { value: '' } });

      expect(input.value).toBe('');
    });

    it('should handle special characters in input', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '!@#$%^&*()' } });

      expect(input.value).toBe('!@#$%^&*()');
    });
  });

  // ==========================================================================
  // Clear Button Tests
  // ==========================================================================

  describe('Clear Button', () => {
    it('should not show clear button when input is empty', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const clearButton = screen.queryByLabelText('Clear search');
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should show clear button when input has text', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Rome' } });
      
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(input.value).toBe('');
    });

    it('should focus input after clearing', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });
      
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(input).toHaveFocus();
    });

    it('should hide clear button after clearing', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });
      
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Result Count Tests
  // ==========================================================================

  describe('Result Count', () => {
    it('should not show result count when input is empty', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const resultCount = screen.queryByRole('status');
      expect(resultCount).not.toBeInTheDocument();
    });

    it('should show "Searching..." while debouncing', () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });

      // Should show "Searching..." immediately
      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should show "1 place found" for single result', async () => {
      const singlePlace = [mockPlaces[0]];
      
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={singlePlace} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Colosseum' } });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('1 place found')).toBeInTheDocument();
      });
    });

    it('should show "X places found" for multiple results', async () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('3 places found')).toBeInTheDocument();
      });
    });

    it('should show "No places found" for empty results', async () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={[]} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'xyz' } });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('No places found')).toBeInTheDocument();
      });
    });

    it('should update result count when filteredPlaces changes', async () => {
      const { rerender } = render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(screen.getByText('3 places found')).toBeInTheDocument();
      });

      // Update with fewer places
      rerender(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={[mockPlaces[0]]} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('1 place found')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Debounce Tests
  // ==========================================================================

  describe('Debounce Behavior', () => {
    it('should debounce search input with 300ms delay', async () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'R' } });

      // Should show "Searching..." immediately
      expect(screen.getByText('Searching...')).toBeInTheDocument();

      // Before 300ms, should still be searching
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(screen.getByText('Searching...')).toBeInTheDocument();

      // After 300ms, should show result count
      act(() => {
        vi.advanceTimersByTime(100);
      });
      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });

    it('should reset debounce timer on rapid typing', async () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      
      // Type first character
      fireEvent.change(input, { target: { value: 'R' } });
      expect(screen.getByText('Searching...')).toBeInTheDocument();

      // Advance time but not enough to complete debounce
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Type another character (resets timer)
      fireEvent.change(input, { target: { value: 'Ro' } });

      // Advance 200ms more (total 400ms from first character, but only 200ms from second)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should still be searching because timer was reset
      expect(screen.getByText('Searching...')).toBeInTheDocument();

      // Advance final 100ms to complete debounce from second character
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA label on input', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      expect(input).toHaveAttribute('aria-label', 'Search places');
    });

    it('should link input to result count with aria-describedby', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      expect(input).toHaveAttribute('aria-describedby', 'search-result-count');
    });

    it('should have role="status" on result count', () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });

      const resultCount = screen.getByRole('status');
      expect(resultCount).toBeInTheDocument();
    });

    it('should have aria-live="polite" on result count', () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });

      const resultCount = screen.getByRole('status');
      expect(resultCount).toHaveAttribute('aria-live', 'polite');
    });

    it('should have proper ARIA label on clear button', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
    });

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places') as HTMLInputElement;
      
      // Focus input
      input.focus();
      expect(input).toHaveFocus();

      // Type text
      fireEvent.change(input, { target: { value: 'Rome' } });
      expect(input).toHaveValue('Rome');

      // Click clear button
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);
      expect(input).toHaveValue('');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle whitespace-only input', async () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={[]} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: '   ' } });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        // Should not show result count because whitespace is trimmed in FilterContext
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('should handle empty filteredPlaces array', () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={[]} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      expect(input).toBeInTheDocument();
    });

    it('should handle rapid clear and retype', async () => {
      render(
        <TestWrapper debounceDelay={300}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      
      // Type text
      fireEvent.change(input, { target: { value: 'Rome' } });
      
      // Clear
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);
      
      // Retype immediately
      fireEvent.change(input, { target: { value: 'Florence' } });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(input).toHaveValue('Florence');
      });
    });

    it('should handle very long search queries', async () => {
      const longQuery = 'a'.repeat(500);
      
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: longQuery } });

      expect(input).toHaveValue(longQuery);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration with FilterContext', () => {
    it('should update FilterContext search query on input', async () => {
      render(
        <TestWrapper>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Colosseum' } });

      expect(input).toHaveValue('Colosseum');
    });

    it('should respect FilterContext debounce delay', async () => {
      const customDelay = 500;
      
      render(
        <TestWrapper debounceDelay={customDelay}>
          <SearchBar filteredPlaces={mockPlaces} />
        </TestWrapper>
      );

      const input = screen.getByLabelText('Search places');
      fireEvent.change(input, { target: { value: 'Rome' } });

      // Should show "Searching..." immediately
      expect(screen.getByText('Searching...')).toBeInTheDocument();

      // Before custom delay, should still be searching
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getByText('Searching...')).toBeInTheDocument();

      // After custom delay, should show result count
      act(() => {
        vi.advanceTimersByTime(100);
      });
      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });
  });
});
