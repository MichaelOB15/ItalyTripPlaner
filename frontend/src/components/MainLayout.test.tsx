import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';

/**
 * Unit tests for MainLayout component
 * 
 * **Validates: Requirements 9.7, 14.1**
 * 
 * Tests cover:
 * - Rendering of all three sections
 * - Loading state display
 * - Error message display
 * - Empty state handling
 * - Semantic HTML structure
 * - Responsive layout classes
 */

describe('MainLayout', () => {
  describe('Basic Rendering', () => {
    it('renders all three sections when content is provided', () => {
      render(
        <MainLayout
          placeExplorer={<div>Place Explorer Content</div>}
          itineraryPanel={<div>Itinerary Panel Content</div>}
          mapView={<div>Map View Content</div>}
        />
      );

      expect(screen.getByText('Place Explorer Content')).toBeInTheDocument();
      expect(screen.getByText('Itinerary Panel Content')).toBeInTheDocument();
      expect(screen.getByText('Map View Content')).toBeInTheDocument();
    });

    it('renders with only placeExplorer content', () => {
      render(<MainLayout placeExplorer={<div>Only Explorer</div>} />);

      expect(screen.getByText('Only Explorer')).toBeInTheDocument();
      expect(
        screen.queryByText('Itinerary Panel Content')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Map View Content')).not.toBeInTheDocument();
    });

    it('renders with only itineraryPanel content', () => {
      render(<MainLayout itineraryPanel={<div>Only Itinerary</div>} />);

      expect(screen.getByText('Only Itinerary')).toBeInTheDocument();
      expect(
        screen.queryByText('Place Explorer Content')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Map View Content')).not.toBeInTheDocument();
    });

    it('renders with only mapView content', () => {
      render(<MainLayout mapView={<div>Only Map</div>} />);

      expect(screen.getByText('Only Map')).toBeInTheDocument();
      expect(
        screen.queryByText('Place Explorer Content')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Itinerary Panel Content')
      ).not.toBeInTheDocument();
    });

    it('renders without any content', () => {
      const { container } = render(<MainLayout />);

      // Should render the main element but no sections
      expect(container.querySelector('main')).toBeInTheDocument();
      expect(container.querySelectorAll('section[aria-label]')).toHaveLength(0);
    });
  });

  describe('Loading State', () => {
    it('displays loading indicator when isLoading is true', () => {
      render(<MainLayout isLoading={true} />);

      const loadingSection = screen.getByRole('status');
      expect(loadingSection).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not display loading indicator when isLoading is false', () => {
      render(<MainLayout isLoading={false} />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('does not display loading indicator by default', () => {
      render(<MainLayout />);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('displays loading spinner with correct aria attributes', () => {
      render(<MainLayout isLoading={true} />);

      const loadingSection = screen.getByRole('status');
      expect(loadingSection).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Display', () => {
    it('displays error message when error is provided', () => {
      const errorMessage = 'Failed to load data';
      render(<MainLayout error={errorMessage} />);

      const errorSection = screen.getByRole('alert');
      expect(errorSection).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('does not display error when error is null', () => {
      render(<MainLayout error={null} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not display error when error is undefined', () => {
      render(<MainLayout error={undefined} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not display error by default', () => {
      render(<MainLayout />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('displays error with correct aria attributes', () => {
      render(<MainLayout error="Test error" />);

      const errorSection = screen.getByRole('alert');
      expect(errorSection).toHaveAttribute('aria-live', 'assertive');
    });

    it('displays both loading and error when both are provided', () => {
      render(<MainLayout isLoading={true} error="Test error" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Semantic HTML Structure (Requirement 14.1)', () => {
    it('uses main element for primary content', () => {
      const { container } = render(
        <MainLayout placeExplorer={<div>Test</div>} />
      );

      const mainElement = container.querySelector('main');
      expect(mainElement).toBeInTheDocument();
    });

    it('uses section elements for each layout area', () => {
      render(
        <MainLayout
          placeExplorer={<div>Explorer</div>}
          itineraryPanel={<div>Itinerary</div>}
          mapView={<div>Map</div>}
        />
      );

      const sections = screen.getAllByRole('region');
      expect(sections).toHaveLength(3);
    });

    it('provides aria-label for each section', () => {
      render(
        <MainLayout
          placeExplorer={<div>Explorer</div>}
          itineraryPanel={<div>Itinerary</div>}
          mapView={<div>Map</div>}
        />
      );

      expect(screen.getByLabelText('Place Explorer')).toBeInTheDocument();
      expect(screen.getByLabelText('Itinerary Panel')).toBeInTheDocument();
      expect(screen.getByLabelText('Map View')).toBeInTheDocument();
    });

    it('error section has role="alert"', () => {
      render(<MainLayout error="Test error" />);

      const errorSection = screen.getByRole('alert');
      expect(errorSection).toBeInTheDocument();
    });

    it('loading section has role="status"', () => {
      render(<MainLayout isLoading={true} />);

      const loadingSection = screen.getByRole('status');
      expect(loadingSection).toBeInTheDocument();
    });
  });

  describe('Responsive Layout Classes (Requirement 9.7)', () => {
    it('applies responsive grid classes to layout container', () => {
      const { container } = render(
        <MainLayout placeExplorer={<div>Test</div>} />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1'); // Mobile: single column
      expect(gridContainer).toHaveClass('md:grid-cols-2'); // Tablet: 2 columns
      expect(gridContainer).toHaveClass('lg:grid-cols-3'); // Desktop: 3 columns
    });

    it('applies correct column span for place explorer on mobile', () => {
      render(<MainLayout placeExplorer={<div>Explorer</div>} />);

      const section = screen.getByLabelText('Place Explorer');
      expect(section).toHaveClass('md:col-span-1');
    });

    it('applies correct column span for itinerary panel on mobile', () => {
      render(<MainLayout itineraryPanel={<div>Itinerary</div>} />);

      const section = screen.getByLabelText('Itinerary Panel');
      expect(section).toHaveClass('md:col-span-1');
    });

    it('applies correct column span for map view on tablet and desktop', () => {
      render(<MainLayout mapView={<div>Map</div>} />);

      const section = screen.getByLabelText('Map View');
      // Tablet: spans 2 columns, Desktop: spans 1 column
      expect(section).toHaveClass('md:col-span-2');
      expect(section).toHaveClass('lg:col-span-1');
    });
  });

  describe('Styling and Visual Design', () => {
    it('applies background color to main element', () => {
      const { container } = render(<MainLayout />);

      const mainElement = container.querySelector('main');
      expect(mainElement).toHaveClass('bg-gray-50');
    });

    it('applies white background to sections', () => {
      render(
        <MainLayout
          placeExplorer={<div>Explorer</div>}
          itineraryPanel={<div>Itinerary</div>}
          mapView={<div>Map</div>}
        />
      );

      const sections = screen.getAllByRole('region');
      sections.forEach((section) => {
        expect(section).toHaveClass('bg-white');
      });
    });

    it('applies shadow to sections', () => {
      render(<MainLayout placeExplorer={<div>Explorer</div>} />);

      const section = screen.getByLabelText('Place Explorer');
      expect(section).toHaveClass('shadow');
    });

    it('applies rounded corners to sections', () => {
      render(<MainLayout placeExplorer={<div>Explorer</div>} />);

      const section = screen.getByLabelText('Place Explorer');
      expect(section).toHaveClass('rounded-lg');
    });

    it('applies padding to sections', () => {
      render(<MainLayout placeExplorer={<div>Explorer</div>} />);

      const section = screen.getByLabelText('Place Explorer');
      expect(section).toHaveClass('p-4');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string error', () => {
      render(<MainLayout error="" />);

      // Empty string is truthy, so error section should not render
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('handles complex JSX content', () => {
      const complexContent = (
        <div>
          <h2>Title</h2>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      );

      render(<MainLayout placeExplorer={complexContent} />);

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('handles very long error messages', () => {
      const longError =
        'This is a very long error message that should still be displayed correctly without breaking the layout or causing any issues with the component rendering.';
      render(<MainLayout error={longError} />);

      expect(screen.getByText(longError)).toBeInTheDocument();
    });
  });
});
