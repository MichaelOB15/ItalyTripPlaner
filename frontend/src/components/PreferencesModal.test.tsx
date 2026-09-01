import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PreferencesModal } from './PreferencesModal';
import { UserPreferences } from '../types';

describe('PreferencesModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <PreferencesModal {...defaultProps} isOpen={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<PreferencesModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Trip Preferences')).toBeInTheDocument();
    });

    it('should render all form sections', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      expect(screen.getByText(/Cities/)).toBeInTheDocument();
      expect(screen.getByText(/Interests/)).toBeInTheDocument();
      expect(screen.getByText(/Trip Pace/)).toBeInTheDocument();
      expect(screen.getByText(/Price Range/)).toBeInTheDocument();
      expect(screen.getByText(/Include places that require booking/)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Itinerary/i })).toBeInTheDocument();
    });
  });

  describe('City Selection', () => {
    it('should allow selecting cities', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const romeButton = screen.getByRole('button', { name: 'Rome' });
      fireEvent.click(romeButton);
      
      expect(romeButton).toHaveClass('bg-blue-600');
      expect(screen.getByText(/1\/3 selected/)).toBeInTheDocument();
    });

    it('should allow deselecting cities', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const romeButton = screen.getByRole('button', { name: 'Rome' });
      fireEvent.click(romeButton);
      expect(romeButton).toHaveClass('bg-blue-600');
      
      fireEvent.click(romeButton);
      expect(romeButton).not.toHaveClass('bg-blue-600');
      expect(screen.getByText(/0\/3 selected/)).toBeInTheDocument();
    });

    it('should limit selection to 3 cities', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const cities = ['Rome', 'Florence', 'Venice', 'Milan'];
      cities.forEach((city) => {
        const button = screen.getByRole('button', { name: city });
        fireEvent.click(button);
      });
      
      expect(screen.getByText(/3\/3 selected/)).toBeInTheDocument();
      
      const milanButton = screen.getByRole('button', { name: 'Milan' });
      expect(milanButton).toBeDisabled();
    });

    it('should show validation error when no cities selected', async () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /Generate Itinerary/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please select at least 1 city/)).toBeInTheDocument();
      });
    });
  });

  describe('Interest Selection', () => {
    it('should allow selecting interests', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const iconicButton = screen.getByRole('button', { name: 'iconic' });
      fireEvent.click(iconicButton);
      
      expect(iconicButton).toHaveClass('bg-green-600');
      expect(screen.getByText(/1\/5 selected/)).toBeInTheDocument();
    });

    it('should allow deselecting interests', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const iconicButton = screen.getByRole('button', { name: 'iconic' });
      fireEvent.click(iconicButton);
      expect(iconicButton).toHaveClass('bg-green-600');
      
      fireEvent.click(iconicButton);
      expect(iconicButton).not.toHaveClass('bg-green-600');
      expect(screen.getByText(/0\/5 selected/)).toBeInTheDocument();
    });

    it('should limit selection to 5 interests', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const interests = ['iconic', 'historic', 'art', 'cultural', 'food', 'wine'];
      interests.forEach((interest) => {
        const button = screen.getByRole('button', { name: interest });
        fireEvent.click(button);
      });
      
      expect(screen.getByText(/5\/5 selected/)).toBeInTheDocument();
      
      const wineButton = screen.getByRole('button', { name: 'wine' });
      expect(wineButton).toBeDisabled();
    });

    it('should show validation error when no interests selected', async () => {
      render(<PreferencesModal {...defaultProps} />);
      
      // Select a city to pass that validation
      const romeButton = screen.getByRole('button', { name: 'Rome' });
      fireEvent.click(romeButton);
      
      const submitButton = screen.getByRole('button', { name: /Generate Itinerary/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Please select at least 1 interest/)).toBeInTheDocument();
      });
    });
  });

  describe('Pace Selection', () => {
    it('should have moderate pace selected by default', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const moderateRadio = screen.getByRole('radio', { name: /Moderate/ });
      expect(moderateRadio).toBeChecked();
    });

    it('should allow changing pace', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const relaxedRadio = screen.getByRole('radio', { name: /Relaxed/ });
      fireEvent.click(relaxedRadio);
      
      expect(relaxedRadio).toBeChecked();
    });

    it('should show pace descriptions', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      expect(screen.getByText(/Take it easy with 3-4 places per day/)).toBeInTheDocument();
      expect(screen.getByText(/Balanced itinerary with 4-5 places per day/)).toBeInTheDocument();
      expect(screen.getByText(/See it all with 5-6 places per day/)).toBeInTheDocument();
    });
  });

  describe('Price Range Selection', () => {
    it('should have default price ranges selected', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const euroCheckbox = screen.getByRole('checkbox', { name: '€' });
      const euroEuroCheckbox = screen.getByRole('checkbox', { name: '€€' });
      const euroEuroEuroCheckbox = screen.getByRole('checkbox', { name: '€€€' });
      
      expect(euroCheckbox).toBeChecked();
      expect(euroEuroCheckbox).toBeChecked();
      expect(euroEuroEuroCheckbox).toBeChecked();
    });

    it('should allow toggling price ranges', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const euroCheckbox = screen.getByRole('checkbox', { name: '€' });
      fireEvent.click(euroCheckbox);
      
      expect(euroCheckbox).not.toBeChecked();
    });

    it('should allow selecting expensive option', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const fourEuroCheckbox = screen.getByRole('checkbox', { name: '€€€€' });
      expect(fourEuroCheckbox).not.toBeChecked();
      
      fireEvent.click(fourEuroCheckbox);
      expect(fourEuroCheckbox).toBeChecked();
    });
  });

  describe('Booking Required Toggle', () => {
    it('should have booking required enabled by default', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const bookingCheckbox = screen.getByRole('checkbox', {
        name: /Include places that require booking/,
      });
      expect(bookingCheckbox).toBeChecked();
    });

    it('should allow toggling booking required', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const bookingCheckbox = screen.getByRole('checkbox', {
        name: /Include places that require booking/,
      });
      fireEvent.click(bookingCheckbox);
      
      expect(bookingCheckbox).not.toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('should submit valid form with all preferences', async () => {
      render(<PreferencesModal {...defaultProps} />);
      
      // Select cities
      fireEvent.click(screen.getByRole('button', { name: 'Rome' }));
      fireEvent.click(screen.getByRole('button', { name: 'Florence' }));
      
      // Select interests
      fireEvent.click(screen.getByRole('button', { name: 'iconic' }));
      fireEvent.click(screen.getByRole('button', { name: 'historic' }));
      
      // Select pace (moderate is default)
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Generate Itinerary/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          cities: ['Rome', 'Florence'],
          interests: ['iconic', 'historic'],
          pace: 'moderate',
          price_range: ['€', '€€', '€€€'],
          include_booking_required: true,
        });
      });
    });

    it('should submit with custom preferences', async () => {
      render(<PreferencesModal {...defaultProps} />);
      
      // Select city
      fireEvent.click(screen.getByRole('button', { name: 'Venice' }));
      
      // Select interests
      fireEvent.click(screen.getByRole('button', { name: 'romantic' }));
      
      // Change pace
      fireEvent.click(screen.getByRole('radio', { name: /Relaxed/ }));
      
      // Change price range
      fireEvent.click(screen.getByRole('checkbox', { name: '€' }));
      fireEvent.click(screen.getByRole('checkbox', { name: '€€€€' }));
      
      // Disable booking required
      fireEvent.click(
        screen.getByRole('checkbox', { name: /Include places that require booking/ })
      );
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /Generate Itinerary/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          cities: ['Venice'],
          interests: ['romantic'],
          pace: 'relaxed',
          price_range: ['€€', '€€€', '€€€€'],
          include_booking_required: false,
        });
      });
    });

    it('should not submit invalid form', async () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /Generate Itinerary/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
        expect(screen.getByText(/Please select at least 1 city/)).toBeInTheDocument();
        expect(screen.getByText(/Please select at least 1 interest/)).toBeInTheDocument();
      });
    });
  });

  describe('Initial Preferences', () => {
    it('should pre-populate form with initial preferences', () => {
      const initialPreferences: UserPreferences = {
        cities: ['Rome', 'Florence'],
        interests: ['iconic', 'historic', 'art'],
        pace: 'packed',
        price_range: ['€€€', '€€€€'],
        include_booking_required: false,
      };

      render(
        <PreferencesModal {...defaultProps} initialPreferences={initialPreferences} />
      );

      // Check cities
      expect(screen.getByRole('button', { name: /✓ Rome/ })).toHaveClass('bg-blue-600');
      expect(screen.getByRole('button', { name: /✓ Florence/ })).toHaveClass('bg-blue-600');

      // Check interests
      expect(screen.getByRole('button', { name: /✓ iconic/ })).toHaveClass('bg-green-600');
      expect(screen.getByRole('button', { name: /✓ historic/ })).toHaveClass('bg-green-600');
      expect(screen.getByRole('button', { name: /✓ art/ })).toHaveClass('bg-green-600');

      // Check pace
      expect(screen.getByRole('radio', { name: /Packed/ })).toBeChecked();

      // Check price range
      expect(screen.getByRole('checkbox', { name: '€' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: '€€' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: '€€€' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: '€€€€' })).toBeChecked();

      // Check booking required
      expect(
        screen.getByRole('checkbox', { name: /Include places that require booking/ })
      ).not.toBeChecked();
    });
  });

  describe('Modal Behavior', () => {
    it('should call onClose when cancel button clicked', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when close button clicked', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /Close modal/i });
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Escape key pressed', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay clicked', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const overlay = screen.getByRole('dialog').firstChild as HTMLElement;
      fireEvent.click(overlay);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'preferences-modal-title');
    });

    it('should mark required fields', () => {
      render(<PreferencesModal {...defaultProps} />);
      
      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers.length).toBeGreaterThan(0);
    });
  });
});
