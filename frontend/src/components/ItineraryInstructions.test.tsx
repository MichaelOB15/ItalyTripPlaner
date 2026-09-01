import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ItineraryInstructions } from './ItineraryInstructions';

// ============================================================================
// Test Suite: ItineraryInstructions Component
// ============================================================================

describe('ItineraryInstructions', () => {
  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  describe('Rendering', () => {
    it('should render the welcome header', () => {
      render(<ItineraryInstructions />);
      
      expect(screen.getByText('Welcome to Your Italy Trip Planner')).toBeInTheDocument();
      expect(
        screen.getByText('Create your perfect 3-day Italian adventure with our interactive planning tool')
      ).toBeInTheDocument();
    });

    it('should render all 4 instruction steps', () => {
      render(<ItineraryInstructions />);
      
      // Check for step numbers
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should render step 1: Generate or Create', () => {
      render(<ItineraryInstructions />);
      
      expect(screen.getByText('Generate or Create Your Itinerary')).toBeInTheDocument();
      expect(
        screen.getByText(/Use the "Generate Recommendation" button to get AI-powered suggestions/)
      ).toBeInTheDocument();
    });

    it('should render step 2: Browse and Add Places', () => {
      render(<ItineraryInstructions />);
      
      expect(screen.getByText('Browse and Add Places')).toBeInTheDocument();
      expect(
        screen.getByText(/Explore Italian destinations in the Place Explorer/)
      ).toBeInTheDocument();
    });

    it('should render step 3: Organize Your Days', () => {
      render(<ItineraryInstructions />);
      
      expect(screen.getByText('Organize Your Days')).toBeInTheDocument();
      expect(
        screen.getByText(/Drag and drop places to reorder them or move them between days/)
      ).toBeInTheDocument();
    });

    it('should render step 4: Export and Share', () => {
      render(<ItineraryInstructions />);
      
      expect(screen.getByText('Export and Share')).toBeInTheDocument();
      expect(
        screen.getByText(/When you're done planning, export your itinerary as a PDF/)
      ).toBeInTheDocument();
    });

    it('should render the Pro Tips section', () => {
      render(<ItineraryInstructions />);
      
      expect(screen.getByText('Pro Tips')).toBeInTheDocument();
      expect(
        screen.getByText(/Your itinerary is automatically saved in your browser/)
      ).toBeInTheDocument();
    });

    it('should render all 4 pro tips', () => {
      render(<ItineraryInstructions />);
      
      expect(
        screen.getByText(/Your itinerary is automatically saved in your browser/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Look for places with ⭐ ratings to find popular destinations/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Check the map on the right to see where places are located/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Places marked with 🗓️ require advance booking/)
      ).toBeInTheDocument();
    });

    it('should render the call to action note', () => {
      render(<ItineraryInstructions />);
      
      expect(
        screen.getByText(/Ready to begin\? Look for the "Generate Recommendation" or "New Itinerary" button above\./)
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Accessibility Tests
  // ==========================================================================

  describe('Accessibility', () => {
    it('should have appropriate ARIA labels for icons', () => {
      const { container } = render(<ItineraryInstructions />);
      
      // Check that decorative icons have aria-hidden
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should use semantic HTML for structure', () => {
      const { container } = render(<ItineraryInstructions />);
      
      // Check for heading elements
      expect(container.querySelector('h2')).toBeInTheDocument();
      expect(container.querySelector('h3')).toBeInTheDocument();
      expect(container.querySelector('h4')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Styling Tests
  // ==========================================================================

  describe('Styling', () => {
    it('should have proper spacing and layout classes', () => {
      const { container } = render(<ItineraryInstructions />);
      
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('max-w-2xl', 'mx-auto', 'p-6', 'text-center');
    });

    it('should style step numbers with blue background', () => {
      const { container } = render(<ItineraryInstructions />);
      
      // Find step number elements
      const stepNumbers = Array.from(
        container.querySelectorAll('.bg-blue-600.text-white.rounded-full')
      );
      expect(stepNumbers.length).toBe(4);
    });

    it('should style the Pro Tips section with blue background', () => {
      const { container } = render(<ItineraryInstructions />);
      
      const proTipsSection = container.querySelector('.bg-blue-50.border-blue-200');
      expect(proTipsSection).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Requirements Coverage Tests
  // ==========================================================================

  describe('Requirements Coverage', () => {
    it('should satisfy Requirement 14.6: Display clear instructions for creating an itinerary', () => {
      render(<ItineraryInstructions />);
      
      // Verify clear step-by-step instructions are present
      expect(screen.getByText('Generate or Create Your Itinerary')).toBeInTheDocument();
      expect(screen.getByText('Browse and Add Places')).toBeInTheDocument();
      expect(screen.getByText('Organize Your Days')).toBeInTheDocument();
      expect(screen.getByText('Export and Share')).toBeInTheDocument();
      
      // Verify instructional content is descriptive
      expect(
        screen.getByText(/Use the "Generate Recommendation" button/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Explore Italian destinations/)
      ).toBeInTheDocument();
    });

    it('should be responsive and usable (Requirement 9.7)', () => {
      const { container } = render(<ItineraryInstructions />);
      
      // Check for responsive layout classes
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('max-w-2xl'); // Max width constraint
      expect(mainContainer).toHaveClass('mx-auto'); // Centered
      expect(mainContainer).toHaveClass('p-6'); // Padding for mobile
    });
  });

  // ==========================================================================
  // Visual Structure Tests
  // ==========================================================================

  describe('Visual Structure', () => {
    it('should render the welcome icon', () => {
      const { container } = render(<ItineraryInstructions />);
      
      // Check for the icon container with blue background
      const iconContainer = container.querySelector('.bg-blue-100.rounded-full');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should organize steps in a vertical layout', () => {
      const { container } = render(<ItineraryInstructions />);
      
      // Check for the steps container with space-y class
      const stepsContainer = container.querySelector('.space-y-6');
      expect(stepsContainer).toBeInTheDocument();
    });

    it('should use list formatting for pro tips', () => {
      const { container } = render(<ItineraryInstructions />);
      
      // Check for unordered list in pro tips
      const list = container.querySelector('ul.list-disc.list-inside');
      expect(list).toBeInTheDocument();
      
      // Check that list has 4 items
      const listItems = list?.querySelectorAll('li');
      expect(listItems?.length).toBe(4);
    });
  });
});

