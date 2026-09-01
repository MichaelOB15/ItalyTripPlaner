import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ItineraryHeader } from './ItineraryHeader';
import { ItineraryProvider } from '../contexts/ItineraryContext';
import { Itinerary, TripPace } from '../types';

// ============================================================================
// Mock Data
// ============================================================================

const mockItinerary: Itinerary = {
  id: 'test-itinerary-1',
  name: 'My Italy Adventure',
  days: [
    {
      day_number: 1,
      places: [],
      total_duration: 0,
      start_time: '08:00',
    },
    {
      day_number: 2,
      places: [],
      total_duration: 0,
      start_time: '08:00',
    },
    {
      day_number: 3,
      places: [],
      total_duration: 0,
      start_time: '08:00',
    },
  ],
  preferences: {
    cities: ['Rome'],
    interests: ['history'],
    pace: 'moderate' as TripPace,
    price_range: ['€€'],
    include_booking_required: true,
  },
  created_at: '2024-01-15T10:30:00',
  last_modified: '2024-01-15T14:45:00',
};

// ============================================================================
// Mock exportToPDF
// ============================================================================

const mockExportToPDF = vi.fn();
vi.mock('../services/exportToPDF', () => ({
  exportToPDF: (...args: unknown[]) => mockExportToPDF(...args),
}));

// ============================================================================
// Mock ToastContainer
// ============================================================================

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
vi.mock('./ToastContainer', () => ({
  useToast: vi.fn(() => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    showToast: vi.fn(),
  })),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ============================================================================
// Mock Context
// ============================================================================

const mockUpdateItineraryName = vi.fn();
const mockClearItinerary = vi.fn();

vi.mock('../contexts/ItineraryContext', async () => {
  const actual = await vi.importActual('../contexts/ItineraryContext');
  return {
    ...actual,
    useItinerary: () => ({
      state: {
        currentItinerary: mockItinerary,
        isEditing: false,
        hasUnsavedChanges: false,
        error: null,
      },
      updateItineraryName: mockUpdateItineraryName,
      clearItinerary: mockClearItinerary,
    }),
  };
});

// ============================================================================
// Mock window.print
// ============================================================================

const mockPrint = vi.fn();
Object.defineProperty(window, 'print', {
  writable: true,
  value: mockPrint,
});

// ============================================================================
// Mock window.alert
// ============================================================================

const mockAlert = vi.fn();
Object.defineProperty(window, 'alert', {
  writable: true,
  value: mockAlert,
});

// ============================================================================
// Tests
// ============================================================================

describe('ItineraryHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExportToPDF.mockResolvedValue(undefined);
  });

  it('renders itinerary name and last modified timestamp', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    expect(screen.getByText('My Italy Adventure')).toBeInTheDocument();
    // Use getAllByText because there are two copies for responsive design
    const lastModifiedElements = screen.getAllByText(/Last modified:/);
    expect(lastModifiedElements.length).toBeGreaterThan(0);
  });

  it('displays all action buttons', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    expect(screen.getByLabelText('Export itinerary as PDF')).toBeInTheDocument();
    expect(screen.getByLabelText('Print itinerary')).toBeInTheDocument();
    expect(screen.getByLabelText('Regenerate itinerary with new preferences')).toBeInTheDocument();
    expect(screen.getByLabelText('Clear entire itinerary')).toBeInTheDocument();
  });

  it('allows editing itinerary name', async () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    // Click edit button
    const editButton = screen.getByLabelText('Edit itinerary name');
    fireEvent.click(editButton);

    // Input should appear with current name
    const input = screen.getByRole('textbox', { name: 'Edit itinerary name' });
    expect(input).toHaveValue('My Italy Adventure');

    // Change the name
    fireEvent.change(input, { target: { value: 'Updated Trip Name' } });
    expect(input).toHaveValue('Updated Trip Name');

    // Save the change
    const saveButton = screen.getByLabelText('Save itinerary name');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateItineraryName).toHaveBeenCalledWith('Updated Trip Name');
    });
  });

  it('cancels editing when cancel button is clicked', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    // Click edit button
    const editButton = screen.getByLabelText('Edit itinerary name');
    fireEvent.click(editButton);

    // Input should be visible
    const input = screen.getByRole('textbox', { name: 'Edit itinerary name' });
    fireEvent.change(input, { target: { value: 'Changed Name' } });

    // Click cancel
    const cancelButton = screen.getByLabelText('Cancel editing');
    fireEvent.click(cancelButton);

    // Should return to display mode
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mockUpdateItineraryName).not.toHaveBeenCalled();
  });

  it('saves name on Enter key press', async () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    // Click edit button
    const editButton = screen.getByLabelText('Edit itinerary name');
    fireEvent.click(editButton);

    // Change name and press Enter
    const input = screen.getByRole('textbox', { name: 'Edit itinerary name' });
    fireEvent.change(input, { target: { value: 'Quick Edit' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockUpdateItineraryName).toHaveBeenCalledWith('Quick Edit');
    });
  });

  it('cancels editing on Escape key press', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    // Click edit button
    const editButton = screen.getByLabelText('Edit itinerary name');
    fireEvent.click(editButton);

    // Press Escape
    const input = screen.getByRole('textbox', { name: 'Edit itinerary name' });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    // Should exit edit mode
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mockUpdateItineraryName).not.toHaveBeenCalled();
  });

  it('calls window.print when Print button is clicked', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    const printButton = screen.getByLabelText('Print itinerary');
    fireEvent.click(printButton);

    expect(mockPrint).toHaveBeenCalled();
  });

  it('shows confirmation dialog when Clear Itinerary is clicked', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    const clearButton = screen.getByLabelText('Clear entire itinerary');
    fireEvent.click(clearButton);

    // Confirmation dialog should appear
    expect(screen.getByText('Clear Itinerary?')).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to clear your entire itinerary/)
    ).toBeInTheDocument();
  });

  it('clears itinerary when confirmed', async () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    // Open confirmation dialog
    const clearButton = screen.getByLabelText('Clear entire itinerary');
    fireEvent.click(clearButton);

    // Confirm clear
    const confirmButton = screen.getByRole('button', { name: 'Clear Itinerary' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockClearItinerary).toHaveBeenCalled();
    });
  });

  it('cancels clear action when Cancel is clicked in dialog', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    // Open confirmation dialog
    const clearButton = screen.getByLabelText('Clear entire itinerary');
    fireEvent.click(clearButton);

    // Cancel
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Dialog should close
    expect(screen.queryByText('Clear Itinerary?')).not.toBeInTheDocument();
    expect(mockClearItinerary).not.toHaveBeenCalled();
  });

  it('exports PDF and shows success toast when Export PDF button is clicked', async () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    const exportButton = screen.getByLabelText('Export itinerary as PDF');
    fireEvent.click(exportButton);

    // Button should show loading state
    await waitFor(() => {
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    // Should call exportToPDF with the itinerary
    await waitFor(() => {
      expect(mockExportToPDF).toHaveBeenCalledWith(mockItinerary);
    });

    // Should show success toast
    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('PDF exported successfully!');
    });
  });

  it('shows error toast when PDF export fails', async () => {
    const errorMessage = 'Failed to generate PDF';
    mockExportToPDF.mockRejectedValueOnce(new Error(errorMessage));

    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    const exportButton = screen.getByLabelText('Export itinerary as PDF');
    fireEvent.click(exportButton);

    // Should show error toast
    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(errorMessage);
    });
  });

  it('disables export button during PDF generation', async () => {
    // Make export take a while
    mockExportToPDF.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    const exportButton = screen.getByLabelText('Export itinerary as PDF');
    fireEvent.click(exportButton);

    // Button should be disabled during export
    await waitFor(() => {
      expect(exportButton).toBeDisabled();
    });

    // Wait for export to complete
    await waitFor(() => {
      expect(exportButton).not.toBeDisabled();
    }, { timeout: 200 });
  });

  it('shows placeholder alert for Replan (not yet implemented)', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    const replanButton = screen.getByLabelText('Regenerate itinerary with new preferences');
    fireEvent.click(replanButton);

    expect(mockAlert).toHaveBeenCalledWith(
      'Replan functionality will be implemented in a future task'
    );
  });

  it('does not trim empty spaces when saving name', async () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    // Click edit button
    const editButton = screen.getByLabelText('Edit itinerary name');
    fireEvent.click(editButton);

    // Try to save with only whitespace
    const input = screen.getByRole('textbox', { name: 'Edit itinerary name' });
    fireEvent.change(input, { target: { value: '   ' } });

    const saveButton = screen.getByLabelText('Save itinerary name');
    fireEvent.click(saveButton);

    // Should not call update with empty string
    await waitFor(() => {
      expect(mockUpdateItineraryName).not.toHaveBeenCalled();
    });
  });

  it('formats last modified date correctly', () => {
    render(
      <ItineraryProvider>
        <ItineraryHeader />
      </ItineraryProvider>
    );

    // Check that the date is formatted (exact format may vary by locale)
    const lastModifiedElements = screen.getAllByText(/Last modified:/);
    expect(lastModifiedElements.length).toBeGreaterThan(0);
    // The formatted date should contain Jan (from 2024-01-15)
    expect(lastModifiedElements[0].textContent).toContain('Jan');
  });
});
