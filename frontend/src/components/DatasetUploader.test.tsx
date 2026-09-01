import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatasetUploader } from './DatasetUploader';
import { useDataset } from '../contexts/DatasetContext';
import { apiClient } from '../services/api';
import { ValidationResult, Place } from '../types';

// Mock dependencies
vi.mock('../contexts/DatasetContext');
vi.mock('../services/api');

describe('DatasetUploader', () => {
  const mockLoadCustomDataset = vi.fn();
  const mockValidateDataset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useDataset hook
    (useDataset as Mock).mockReturnValue({
      loadCustomDataset: mockLoadCustomDataset,
      state: {
        places: [],
        filteredPlaces: [],
        source: 'default',
        isLoading: false,
        error: null,
        filters: {},
        searchQuery: '',
      },
    });

    // Mock apiClient
    apiClient.validateDataset = mockValidateDataset;
  });

  it('renders the component with file input and upload button', () => {
    render(<DatasetUploader />);

    expect(screen.getByRole('heading', { name: 'Upload Custom Dataset' })).toBeInTheDocument();
    expect(screen.getByLabelText('Select JSON dataset file')).toBeInTheDocument();
    expect(screen.getByLabelText('Upload and validate custom dataset')).toBeInTheDocument();
  });

  it('validates file type and rejects non-JSON files', async () => {
    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    // Simulate file change event
    fireEvent.change(fileInput, { target: { files: [txtFile] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
  });

  it('displays file name and size after valid JSON file selection', async () => {
    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const jsonFile = new File(['{"test": "data"}'], 'dataset.json', { type: 'application/json' });

    await userEvent.upload(fileInput, jsonFile);

    await waitFor(() => {
      expect(screen.getByText('dataset.json')).toBeInTheDocument();
      expect(screen.getByText(/B|KB|MB/)).toBeInTheDocument();
    });
  });

  it('calls validateDataset API when upload button is clicked', async () => {
    const validResult: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: [],
      place_count: 5,
      excluded_count: 0,
    };

    mockValidateDataset.mockResolvedValue(validResult);

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const jsonFile = new File(['[{"id": "1", "name": "Place 1"}]'], 'dataset.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockValidateDataset).toHaveBeenCalledWith(jsonFile);
    });
  });

  it('displays success message when dataset is valid and loaded', async () => {
    const validResult: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: [],
      place_count: 10,
      excluded_count: 0,
    };

    mockValidateDataset.mockResolvedValue(validResult);

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const places: Place[] = [
      {
        id: 'place_001',
        name: 'Test Place',
        type: 'restaurant',
        city: 'Rome',
        latitude: 41.9028,
        longitude: 12.4964,
      },
    ];
    const jsonFile = new File([JSON.stringify(places)], 'dataset.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully loaded custom dataset with 10 places/i)).toBeInTheDocument();
      expect(mockLoadCustomDataset).toHaveBeenCalled();
    });
  });

  it('displays validation errors when dataset is invalid', async () => {
    const invalidResult: ValidationResult = {
      is_valid: false,
      errors: [
        {
          place_id: 'place_001',
          field: 'name',
          message: 'Name is required',
          severity: 'critical',
        },
        {
          place_id: 'place_002',
          field: 'latitude',
          message: 'Invalid latitude value',
          severity: 'non-critical',
        },
      ],
      warnings: [],
      place_count: 0,
      excluded_count: 2,
    };

    mockValidateDataset.mockResolvedValue(invalidResult);

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const jsonFile = new File(['[{}]'], 'invalid.json', { type: 'application/json' });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/Validation Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/2 critical error/i)).toBeInTheDocument();
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Invalid latitude value/i)).toBeInTheDocument();
    });
  });

  it('displays validation warnings when dataset is valid but has warnings', async () => {
    const validWithWarnings: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: [
        {
          place_id: 'place_001',
          field: 'description',
          message: 'Missing description',
          impact: 'Reduced information in place details view',
        },
        {
          place_id: 'place_002',
          field: 'duration_minutes',
          message: 'Missing duration',
          impact: 'Will use default 60-minute estimate for scheduling',
        },
      ],
      place_count: 5,
      excluded_count: 0,
    };

    mockValidateDataset.mockResolvedValue(validWithWarnings);

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const places: Place[] = [
      {
        id: 'place_001',
        name: 'Test Place',
        type: 'restaurant',
        city: 'Rome',
        latitude: 41.9028,
        longitude: 12.4964,
      },
    ];
    const jsonFile = new File([JSON.stringify(places)], 'dataset.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/Dataset Loaded with Warnings/i)).toBeInTheDocument();
      expect(screen.getByText(/2 non-critical issue/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing description/i)).toBeInTheDocument();
      expect(screen.getByText(/Reduced information in place details view/i)).toBeInTheDocument();
      expect(screen.getByText(/Learn More/i)).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    mockValidateDataset.mockRejectedValue(new Error('Network error'));

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const jsonFile = new File(['[]'], 'dataset.json', { type: 'application/json' });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('disables upload button when no file is selected', () => {
    render(<DatasetUploader />);

    const uploadButton = screen.getByLabelText('Upload and validate custom dataset') as HTMLButtonElement;
    expect(uploadButton).toBeDisabled();
  });

  it('disables upload button during validation', async () => {
    mockValidateDataset.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const jsonFile = new File(['[]'], 'dataset.json', { type: 'application/json' });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset') as HTMLButtonElement;
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(uploadButton).toBeDisabled();
      expect(screen.getByText(/Validating/i)).toBeInTheDocument();
    });
  });

  it('clears file selection when clear button is clicked', async () => {
    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const jsonFile = new File(['[]'], 'dataset.json', { type: 'application/json' });

    await userEvent.upload(fileInput, jsonFile);
    
    await waitFor(() => {
      expect(screen.getByText('dataset.json')).toBeInTheDocument();
    });

    const clearButton = screen.getByLabelText('Clear selected file');
    await userEvent.click(clearButton);

    expect(screen.queryByText('dataset.json')).not.toBeInTheDocument();
  });

  it('formats file size correctly', async () => {
    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    
    // Test KB size
    const content = 'x'.repeat(2048); // 2 KB
    const jsonFile = new File([content], 'dataset.json', { type: 'application/json' });

    await userEvent.upload(fileInput, jsonFile);

    await waitFor(() => {
      expect(screen.getByText(/2\.00 KB/i)).toBeInTheDocument();
    });
  });

  it('limits displayed errors to 10 items', async () => {
    const errors = Array.from({ length: 15 }, (_, i) => ({
      place_id: `place_${i}`,
      field: 'name',
      message: `Error ${i}`,
      severity: 'critical' as const,
    }));

    const invalidResult: ValidationResult = {
      is_valid: false,
      errors,
      warnings: [],
      place_count: 0,
      excluded_count: 15,
    };

    mockValidateDataset.mockResolvedValue(invalidResult);

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const jsonFile = new File(['[]'], 'dataset.json', { type: 'application/json' });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/\.\.\. and 5 more error/i)).toBeInTheDocument();
    });
  });

  it('limits displayed warnings and shows all in scrollable container', async () => {
    const warnings = Array.from({ length: 8 }, (_, i) => ({
      place_id: `place_${i}`,
      field: 'description',
      message: `Warning ${i}`,
      impact: 'Some impact',
    }));

    const validResult: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings,
      place_count: 8,
      excluded_count: 0,
    };

    mockValidateDataset.mockResolvedValue(validResult);

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const places: Place[] = [
      {
        id: 'place_001',
        name: 'Test Place',
        type: 'restaurant',
        city: 'Rome',
        latitude: 41.9028,
        longitude: 12.4964,
      },
    ];
    const jsonFile = new File([JSON.stringify(places)], 'dataset.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      // All 8 warnings should be displayed in the scrollable container
      expect(screen.getByText(/Warning Details \(8\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Warning 0/i)).toBeInTheDocument();
      expect(screen.getByText(/Warning 7/i)).toBeInTheDocument();
    });
  });

  it('displays warnings with place ID badges and impact descriptions', async () => {
    const validWithWarnings: ValidationResult = {
      is_valid: true,
      errors: [],
      warnings: [
        {
          place_id: 'place_123',
          field: 'rating',
          message: 'Missing rating field',
          impact: 'Place will show as "Unrated" in listings',
        },
      ],
      place_count: 1,
      excluded_count: 0,
    };

    mockValidateDataset.mockResolvedValue(validWithWarnings);

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const places: Place[] = [
      {
        id: 'place_123',
        name: 'Test Place',
        type: 'restaurant',
        city: 'Rome',
        latitude: 41.9028,
        longitude: 12.4964,
      },
    ];
    const jsonFile = new File([JSON.stringify(places)], 'dataset.json', {
      type: 'application/json',
    });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      // Check for place ID badge
      expect(screen.getByText('place_123')).toBeInTheDocument();
      
      // Check for field name
      expect(screen.getByText(/Missing: rating/i)).toBeInTheDocument();
      
      // Check for impact section
      expect(screen.getByText(/Impact:/i)).toBeInTheDocument();
      expect(screen.getByText(/Place will show as "Unrated" in listings/i)).toBeInTheDocument();
    });
  });

  it('shows validation warnings with errors when dataset is invalid', async () => {
    const invalidWithWarnings: ValidationResult = {
      is_valid: false,
      errors: [
        {
          place_id: 'place_001',
          field: 'name',
          message: 'Name is required',
          severity: 'critical',
        },
      ],
      warnings: [
        {
          place_id: 'place_002',
          field: 'description',
          message: 'Missing description',
          impact: 'Reduced information display',
        },
      ],
      place_count: 0,
      excluded_count: 1,
    };

    mockValidateDataset.mockResolvedValue(invalidWithWarnings);

    render(<DatasetUploader />);

    const fileInput = screen.getByLabelText('Select JSON dataset file') as HTMLInputElement;
    const jsonFile = new File(['[]'], 'invalid.json', { type: 'application/json' });

    await userEvent.upload(fileInput, jsonFile);
    
    const uploadButton = screen.getByLabelText('Upload and validate custom dataset');
    await userEvent.click(uploadButton);

    await waitFor(() => {
      // Should show both errors and warnings sections
      expect(screen.getByText(/Critical Errors \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Additional Warnings \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing description/i)).toBeInTheDocument();
    });
  });
});
