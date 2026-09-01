import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterPanel } from './FilterPanel';
import { FilterProvider } from '../contexts/FilterContext';
import { Place, PlaceType } from '../types';

// ============================================================================
// Test Data
// ============================================================================

const createMockPlace = (
  id: string,
  name: string,
  city: string,
  type: PlaceType,
  priceRange: string | null = '€€',
  tags: string[] = []
): Place => ({
  id,
  name,
  type,
  city,
  latitude: 41.9028,
  longitude: 12.4964,
  description: `Description for ${name}`,
  region: 'Lazio',
  neighborhood: null,
  hours: '9:00-17:00',
  duration_minutes: 60,
  price_range: priceRange,
  rating: 4.5,
  tags,
  seasonal_notes: null,
  booking_required: false,
});

const mockPlaces: Place[] = [
  createMockPlace('place_001', 'Colosseum', 'Rome', 'historic_site', '€€', [
    'iconic',
    'historic',
  ]),
  createMockPlace('place_002', 'Trattoria Romana', 'Rome', 'restaurant', '€€€', [
    'food',
    'local-favorite',
  ]),
  createMockPlace('place_003', 'Uffizi Gallery', 'Florence', 'museum', '€€', [
    'art',
    'cultural',
  ]),
  createMockPlace('place_004', 'Duomo', 'Florence', 'historic_site', '€', [
    'iconic',
    'religious',
  ]),
  createMockPlace('place_005', 'Piazza San Marco', 'Venice', 'viewpoint', null, [
    'scenic',
    'romantic',
  ]),
  createMockPlace('place_006', 'Cafe Florian', 'Venice', 'cafe', '€€€€', [
    'historic',
    'luxury',
  ]),
];

// ============================================================================
// Test Wrapper Component
// ============================================================================

interface WrapperProps {
  children: React.ReactNode;
}

function TestWrapper({ children }: WrapperProps) {
  return <FilterProvider>{children}</FilterProvider>;
}

// ============================================================================
// Tests
// ============================================================================

describe('FilterPanel Component', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render filter panel with title', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('should render all filter sections', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByText('City')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Price Range')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('should extract unique cities from places', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByText('Rome')).toBeInTheDocument();
      expect(screen.getByText('Florence')).toBeInTheDocument();
      expect(screen.getByText('Venice')).toBeInTheDocument();
    });

    it('should extract unique types from places', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByText('Historic Site')).toBeInTheDocument();
      expect(screen.getByText('Restaurant')).toBeInTheDocument();
      expect(screen.getByText('Museum')).toBeInTheDocument();
      expect(screen.getByText('Viewpoint')).toBeInTheDocument();
      expect(screen.getByText('Cafe')).toBeInTheDocument();
    });

    it('should extract unique price ranges from places', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByText('€')).toBeInTheDocument();
      expect(screen.getAllByText('€€').length).toBeGreaterThan(0);
      expect(screen.getByText('€€€')).toBeInTheDocument();
      expect(screen.getByText('€€€€')).toBeInTheDocument();
    });

    it('should extract unique tags from places', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByText('iconic')).toBeInTheDocument();
      expect(screen.getByText('historic')).toBeInTheDocument();
      expect(screen.getByText('food')).toBeInTheDocument();
      expect(screen.getByText('local-favorite')).toBeInTheDocument();
      expect(screen.getByText('art')).toBeInTheDocument();
      expect(screen.getByText('cultural')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} className="my-custom-class" />
        </TestWrapper>
      );

      const filterPanel = container.firstChild;
      expect(filterPanel).toHaveClass('my-custom-class');
    });

    it('should show empty state message when no filters are active', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(
        screen.getByText('No filters applied. Select options above to filter places.')
      ).toBeInTheDocument();
    });

    it('should not show Clear All button when no filters are active', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // City Filter Tests
  // ==========================================================================

  describe('City Filter', () => {
    it('should toggle city filter on checkbox click', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome') as HTMLInputElement;
      expect(romeCheckbox.checked).toBe(false);

      fireEvent.click(romeCheckbox);
      expect(romeCheckbox.checked).toBe(true);

      fireEvent.click(romeCheckbox);
      expect(romeCheckbox.checked).toBe(false);
    });

    it('should allow multiple city selections', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome') as HTMLInputElement;
      const florenceCheckbox = screen.getByLabelText('Filter by Florence') as HTMLInputElement;

      fireEvent.click(romeCheckbox);
      fireEvent.click(florenceCheckbox);

      expect(romeCheckbox.checked).toBe(true);
      expect(florenceCheckbox.checked).toBe(true);
    });

    it('should display selected city as chip', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome');
      fireEvent.click(romeCheckbox);

      // Check for chip in Active Filters section
      const chips = screen.getAllByText('Rome');
      expect(chips.length).toBeGreaterThan(1); // One in checkbox, one in chip
    });

    it('should remove city filter when chip close button is clicked', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome') as HTMLInputElement;
      fireEvent.click(romeCheckbox);
      expect(romeCheckbox.checked).toBe(true);

      const removeButton = screen.getByLabelText('Remove Rome filter');
      fireEvent.click(removeButton);
      expect(romeCheckbox.checked).toBe(false);
    });
  });

  // ==========================================================================
  // Type Filter Tests
  // ==========================================================================

  describe('Type Filter', () => {
    it('should toggle type filter on checkbox click', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const museumCheckbox = screen.getByLabelText('Filter by museum') as HTMLInputElement;
      expect(museumCheckbox.checked).toBe(false);

      fireEvent.click(museumCheckbox);
      expect(museumCheckbox.checked).toBe(true);

      fireEvent.click(museumCheckbox);
      expect(museumCheckbox.checked).toBe(false);
    });

    it('should allow multiple type selections', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const museumCheckbox = screen.getByLabelText('Filter by museum') as HTMLInputElement;
      const restaurantCheckbox = screen.getByLabelText('Filter by restaurant') as HTMLInputElement;

      fireEvent.click(museumCheckbox);
      fireEvent.click(restaurantCheckbox);

      expect(museumCheckbox.checked).toBe(true);
      expect(restaurantCheckbox.checked).toBe(true);
    });

    it('should display selected type as chip', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const museumCheckbox = screen.getByLabelText('Filter by museum');
      fireEvent.click(museumCheckbox);

      // Check for chip in Active Filters section
      const chips = screen.getAllByText('Museum');
      expect(chips.length).toBeGreaterThan(1);
    });

    it('should remove type filter when chip close button is clicked', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const museumCheckbox = screen.getByLabelText('Filter by museum') as HTMLInputElement;
      fireEvent.click(museumCheckbox);
      expect(museumCheckbox.checked).toBe(true);

      const removeButton = screen.getByLabelText('Remove Museum filter');
      fireEvent.click(removeButton);
      expect(museumCheckbox.checked).toBe(false);
    });

    it('should format snake_case types correctly', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByText('Historic Site')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Price Range Filter Tests
  // ==========================================================================

  describe('Price Range Filter', () => {
    it('should toggle price range filter on checkbox click', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const eurCheckbox = screen.getByLabelText('Filter by €') as HTMLInputElement;
      expect(eurCheckbox.checked).toBe(false);

      fireEvent.click(eurCheckbox);
      expect(eurCheckbox.checked).toBe(true);

      fireEvent.click(eurCheckbox);
      expect(eurCheckbox.checked).toBe(false);
    });

    it('should allow multiple price range selections', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const eurCheckbox = screen.getByLabelText('Filter by €') as HTMLInputElement;
      const allEurCheckboxes = screen.getAllByLabelText(/Filter by €{2,3}/) as HTMLInputElement[];
      const eur2Checkbox = allEurCheckboxes.find(cb => cb.getAttribute('aria-label') === 'Filter by €€')!;

      fireEvent.click(eurCheckbox);
      fireEvent.click(eur2Checkbox);

      expect(eurCheckbox.checked).toBe(true);
      expect(eur2Checkbox.checked).toBe(true);
    });

    it('should display selected price range as chip', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const eurCheckbox = screen.getByLabelText('Filter by €');
      fireEvent.click(eurCheckbox);

      // Check for chip in Active Filters section
      const chips = screen.getAllByText('€');
      expect(chips.length).toBeGreaterThan(1);
    });

    it('should remove price range filter when chip close button is clicked', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const eurCheckbox = screen.getByLabelText('Filter by €') as HTMLInputElement;
      fireEvent.click(eurCheckbox);
      expect(eurCheckbox.checked).toBe(true);

      const removeButton = screen.getByLabelText('Remove € filter');
      fireEvent.click(removeButton);
      expect(eurCheckbox.checked).toBe(false);
    });

    it('should sort price ranges by length', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const priceSection = screen.getByText('Price Range').parentElement;
      const checkboxLabels = priceSection?.querySelectorAll('label span');
      
      // Should be sorted as: €, €€, €€€, €€€€
      expect(checkboxLabels?.[0]?.textContent).toBe('€');
      expect(checkboxLabels?.[1]?.textContent).toBe('€€');
      expect(checkboxLabels?.[2]?.textContent).toBe('€€€');
      expect(checkboxLabels?.[3]?.textContent).toBe('€€€€');
    });
  });

  // ==========================================================================
  // Tag Filter Tests
  // ==========================================================================

  describe('Tag Filter', () => {
    it('should toggle tag filter on button click', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      expect(iconicButton).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(iconicButton);
      expect(iconicButton).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(iconicButton);
      expect(iconicButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should allow multiple tag selections', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      const historicButton = screen.getByLabelText('Toggle historic tag filter');

      fireEvent.click(iconicButton);
      fireEvent.click(historicButton);

      expect(iconicButton).toHaveAttribute('aria-pressed', 'true');
      expect(historicButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should change button style when tag is selected', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      
      // Initial state
      expect(iconicButton).toHaveClass('bg-gray-100');
      expect(iconicButton).not.toHaveClass('bg-blue-600');

      fireEvent.click(iconicButton);

      // Selected state
      expect(iconicButton).toHaveClass('bg-blue-600');
      expect(iconicButton).not.toHaveClass('bg-gray-100');
    });

    it('should display selected tag as chip', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      fireEvent.click(iconicButton);

      // Check for chip in Active Filters section
      const chips = screen.getAllByText('iconic');
      expect(chips.length).toBeGreaterThan(1);
    });

    it('should remove tag filter when chip close button is clicked', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      fireEvent.click(iconicButton);
      expect(iconicButton).toHaveAttribute('aria-pressed', 'true');

      const removeButton = screen.getByLabelText('Remove iconic filter');
      fireEvent.click(removeButton);
      expect(iconicButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ==========================================================================
  // Clear All Tests
  // ==========================================================================

  describe('Clear All Functionality', () => {
    it('should show Clear All button when filters are active', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();

      const romeCheckbox = screen.getByLabelText('Filter by Rome');
      fireEvent.click(romeCheckbox);

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('should clear all city filters when Clear All is clicked', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome') as HTMLInputElement;
      const florenceCheckbox = screen.getByLabelText('Filter by Florence') as HTMLInputElement;

      fireEvent.click(romeCheckbox);
      fireEvent.click(florenceCheckbox);
      expect(romeCheckbox.checked).toBe(true);
      expect(florenceCheckbox.checked).toBe(true);

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(romeCheckbox.checked).toBe(false);
      expect(florenceCheckbox.checked).toBe(false);
    });

    it('should clear all type filters when Clear All is clicked', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const museumCheckbox = screen.getByLabelText('Filter by museum') as HTMLInputElement;
      const restaurantCheckbox = screen.getByLabelText('Filter by restaurant') as HTMLInputElement;

      fireEvent.click(museumCheckbox);
      fireEvent.click(restaurantCheckbox);

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(museumCheckbox.checked).toBe(false);
      expect(restaurantCheckbox.checked).toBe(false);
    });

    it('should clear all tag filters when Clear All is clicked', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      const historicButton = screen.getByLabelText('Toggle historic tag filter');

      fireEvent.click(iconicButton);
      fireEvent.click(historicButton);

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(iconicButton).toHaveAttribute('aria-pressed', 'false');
      expect(historicButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should clear all price range filters when Clear All is clicked', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const eurCheckbox = screen.getByLabelText('Filter by €') as HTMLInputElement;
      fireEvent.click(eurCheckbox);

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(eurCheckbox.checked).toBe(false);
    });

    it('should hide Active Filters section after clearing all', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome');
      fireEvent.click(romeCheckbox);

      expect(screen.getByText('Active Filters')).toBeInTheDocument();

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(screen.queryByText('Active Filters')).not.toBeInTheDocument();
    });

    it('should show empty state message after clearing all', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome');
      fireEvent.click(romeCheckbox);

      const clearAllButton = screen.getByText('Clear All');
      fireEvent.click(clearAllButton);

      expect(
        screen.getByText('No filters applied. Select options above to filter places.')
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Active Filters Display Tests
  // ==========================================================================

  describe('Active Filters Display', () => {
    it('should show Active Filters section when filters are applied', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.queryByText('Active Filters')).not.toBeInTheDocument();

      const romeCheckbox = screen.getByLabelText('Filter by Rome');
      fireEvent.click(romeCheckbox);

      expect(screen.getByText('Active Filters')).toBeInTheDocument();
    });

    it('should display chips with different colors for different filter types', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome');
      const museumCheckbox = screen.getByLabelText('Filter by museum');
      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      const eurCheckbox = screen.getByLabelText('Filter by €');

      fireEvent.click(romeCheckbox);
      fireEvent.click(museumCheckbox);
      fireEvent.click(iconicButton);
      fireEvent.click(eurCheckbox);

      // Check that chips exist (we can't easily check colors in JSDOM)
      expect(screen.getByLabelText('Remove Rome filter')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove Museum filter')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove iconic filter')).toBeInTheDocument();
      expect(screen.getByLabelText('Remove € filter')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty places array', () => {
      render(
        <TestWrapper>
          <FilterPanel places={[]} />
        </TestWrapper>
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
      // When places array is empty, filter sections won't render
      expect(screen.queryByText('City')).not.toBeInTheDocument();
      expect(screen.queryByText('Type')).not.toBeInTheDocument();
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
      expect(screen.queryByText('Price Range')).not.toBeInTheDocument();
    });

    it('should handle places with null price_range', () => {
      const placesWithNull = [
        createMockPlace('place_001', 'Free Place', 'Rome', 'park', null, []),
      ];

      render(
        <TestWrapper>
          <FilterPanel places={placesWithNull} />
        </TestWrapper>
      );

      // Should not crash; Price Range section won't render if no places have price_range
      expect(screen.queryByText('Price Range')).not.toBeInTheDocument();
    });

    it('should handle places with empty tags array', () => {
      const placesWithNoTags = [
        createMockPlace('place_001', 'No Tags Place', 'Rome', 'restaurant', '€€', []),
      ];

      render(
        <TestWrapper>
          <FilterPanel places={placesWithNoTags} />
        </TestWrapper>
      );

      // Tags section won't render if no places have tags
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('should handle rapid filter toggling', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome') as HTMLInputElement;

      // Rapid toggles
      fireEvent.click(romeCheckbox);
      fireEvent.click(romeCheckbox);
      fireEvent.click(romeCheckbox);
      fireEvent.click(romeCheckbox);
      fireEvent.click(romeCheckbox);

      // Should end up checked
      expect(romeCheckbox.checked).toBe(true);
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels on checkboxes', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Filter by Rome')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by museum')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by €')).toBeInTheDocument();
    });

    it('should have proper ARIA labels on tag buttons', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Toggle iconic tag filter')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle historic tag filter')).toBeInTheDocument();
    });

    it('should have proper ARIA labels on chip remove buttons', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome');
      fireEvent.click(romeCheckbox);

      expect(screen.getByLabelText('Remove Rome filter')).toBeInTheDocument();
    });

    it('should have proper role attributes on filter groups', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      expect(screen.getByRole('group', { name: 'Filter by city' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Filter by place type' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Filter by tags' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Filter by price range' })).toBeInTheDocument();
    });

    it('should have aria-pressed on tag buttons', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      expect(iconicButton).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(iconicButton);
      expect(iconicButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should have role="list" on active filters container', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome');
      fireEvent.click(romeCheckbox);

      expect(screen.getByRole('list', { name: 'Active filters' })).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Integration with FilterContext
  // ==========================================================================

  describe('Integration with FilterContext', () => {
    it('should update FilterContext when city filter is toggled', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const romeCheckbox = screen.getByLabelText('Filter by Rome') as HTMLInputElement;
      fireEvent.click(romeCheckbox);

      expect(romeCheckbox.checked).toBe(true);
    });

    it('should update FilterContext when type filter is toggled', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const museumCheckbox = screen.getByLabelText('Filter by museum') as HTMLInputElement;
      fireEvent.click(museumCheckbox);

      expect(museumCheckbox.checked).toBe(true);
    });

    it('should update FilterContext when tag filter is toggled', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const iconicButton = screen.getByLabelText('Toggle iconic tag filter');
      fireEvent.click(iconicButton);

      expect(iconicButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should update FilterContext when price filter is toggled', () => {
      render(
        <TestWrapper>
          <FilterPanel places={mockPlaces} />
        </TestWrapper>
      );

      const eurCheckbox = screen.getByLabelText('Filter by €') as HTMLInputElement;
      fireEvent.click(eurCheckbox);

      expect(eurCheckbox.checked).toBe(true);
    });
  });
});
