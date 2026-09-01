import { useState, useRef, ChangeEvent } from 'react';
import { apiClient } from '../services/api';
import { useDataset } from '../contexts/DatasetContext';
import { ValidationResult, Place } from '../types';

/**
 * DatasetUploader component for uploading and validating custom dataset files.
 * 
 * Features:
 * - File input with JSON file type validation
 * - Display file name and size after selection
 * - Call validateDataset API to check format
 * - Show validation results: success/errors/warnings summary
 * - If valid, load custom dataset and update DatasetContext
 * - Show error messages for invalid datasets with specific field issues
 * 
 * **Validates: Requirements 16.1, 16.2, 16.3, 16.4**
 */
export function DatasetUploader(): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { loadCustomDataset } = useDataset();

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Reset states
    setError(null);
    setValidationResult(null);
    setSuccessMessage(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      setError('Invalid file type. Please select a JSON file.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  /**
   * Handle upload button click
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    // Reset states
    setError(null);
    setValidationResult(null);
    setSuccessMessage(null);
    setIsValidating(true);

    try {
      // Call validation API
      const result = await apiClient.validateDataset(selectedFile);
      setValidationResult(result);

      if (result.is_valid) {
        // If valid, load the dataset
        setIsLoading(true);
        await loadCustomDatasetFromFile(selectedFile);
        setSuccessMessage(`Successfully loaded custom dataset with ${result.place_count} places!`);
        
        // Reset file input
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate dataset';
      setError(errorMessage);
    } finally {
      setIsValidating(false);
      setIsLoading(false);
    }
  };

  /**
   * Load custom dataset from file
   */
  const loadCustomDatasetFromFile = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // Ensure data is an array
          const places: Place[] = Array.isArray(data) ? data : [];

          // Update DatasetContext with custom places
          loadCustomDataset(places);
          
          resolve();
        } catch (err) {
          reject(new Error('Failed to parse JSON file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  };

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * Clear file selection
   */
  const handleClearFile = () => {
    setSelectedFile(null);
    setError(null);
    setValidationResult(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Upload Custom Dataset
        </h2>
        <p 
          id="file-input-description"
          className="text-sm text-gray-600"
        >
          Upload a JSON file containing places in the same format as the default Italy dataset.
        </p>
      </div>

      {/* File Input */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label
            htmlFor="dataset-file-input"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 cursor-pointer transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Choose File
          </label>
          <input
            ref={fileInputRef}
            id="dataset-file-input"
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Select JSON dataset file to upload"
            aria-describedby="file-input-description"
          />

          {selectedFile && (
            <button
              onClick={handleClearFile}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
              aria-label="Clear selected file"
            >
              Clear
            </button>
          )}
        </div>

        {/* File Info */}
        {selectedFile && (
          <div 
            className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-md"
            role="status"
            aria-label={`Selected file: ${selectedFile.name}, size: ${formatFileSize(selectedFile.size)}`}
          >
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-gray-500">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isValidating || isLoading}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Upload and validate custom dataset"
        >
          {isValidating ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Validating...
            </>
          ) : isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading Dataset...
            </>
          ) : (
            'Upload Custom Dataset'
          )}
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div 
          className="bg-green-50 border border-green-200 rounded-md p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex">
            <svg
              className="w-5 h-5 text-green-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="ml-3 text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          className="bg-red-50 border border-red-200 rounded-md p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="ml-3 text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Validation Results - Failed */}
      {validationResult && !validationResult.is_valid && (
        <div className="space-y-4">
          <div className="bg-red-50 border-l-4 border-red-400 rounded-md p-5">
            {/* Header */}
            <div className="flex items-start mb-4">
              <svg
                className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-base font-semibold text-red-900">
                  Validation Failed
                </h3>
                <p className="text-sm text-red-800 mt-1">
                  Found {validationResult.errors.length} critical error(s) in the dataset.
                  {validationResult.excluded_count > 0 && 
                    ` ${validationResult.excluded_count} place(s) will be excluded due to missing critical fields.`
                  }
                </p>
              </div>
            </div>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-red-900 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Critical Errors ({validationResult.errors.length})
                </h4>
                <div className="bg-white border border-red-200 rounded-md divide-y divide-red-100 max-h-64 overflow-y-auto">
                  {validationResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="p-3 hover:bg-red-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              {error.place_id || 'File-level'}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">
                              {error.field}
                            </span>
                            {error.severity === 'critical' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-white">
                                Critical
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{error.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {validationResult.errors.length > 10 && (
                    <div className="p-3 text-center text-sm text-red-600 bg-red-50 font-medium">
                      ... and {validationResult.errors.length - 10} more error(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warnings (if any alongside errors) */}
            {validationResult.warnings.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-red-200">
                <h4 className="text-sm font-semibold text-red-900 flex items-center">
                  <svg
                    className="w-4 h-4 mr-1.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Additional Warnings ({validationResult.warnings.length})
                </h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md divide-y divide-yellow-100 max-h-48 overflow-y-auto">
                  {validationResult.warnings.slice(0, 5).map((warning, index) => (
                    <div key={index} className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {warning.place_id}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {warning.field}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{warning.message}</p>
                      <p className="text-xs text-yellow-700 pl-2 border-l-2 border-yellow-300">
                        Impact: {warning.impact}
                      </p>
                    </div>
                  ))}
                  {validationResult.warnings.length > 5 && (
                    <div className="p-2 text-center text-xs text-yellow-600 font-medium">
                      ... and {validationResult.warnings.length - 5} more warning(s)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Valid with Warnings - Enhanced Display */}
      {validationResult && validationResult.is_valid && validationResult.warnings.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-md p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3 flex-1">
              <h3 className="text-base font-semibold text-blue-900">
                Dataset Loaded with Warnings
              </h3>
              <p className="text-sm text-blue-800 mt-1">
                Found {validationResult.warnings.length} non-critical issue(s) in the dataset. 
                These warnings don't prevent the dataset from being used, but some features may have limited functionality for affected places.
              </p>
            </div>
          </div>

          {/* Warnings Grouped Display */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-blue-900 flex items-center">
              <svg
                className="w-4 h-4 mr-1.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Warning Details ({validationResult.warnings.length})
            </h4>
            
            <div className="bg-white border border-blue-200 rounded-md divide-y divide-blue-100 max-h-96 overflow-y-auto">
              {validationResult.warnings.map((warning, index) => (
                <div key={index} className="p-4 hover:bg-blue-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Place ID and Field */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                          {warning.place_id}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          Missing: {warning.field}
                        </span>
                      </div>
                      
                      {/* Message */}
                      <p className="text-sm text-gray-700 mb-2">
                        {warning.message}
                      </p>
                      
                      {/* Impact */}
                      <div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 rounded border-l-2 border-blue-300">
                        <svg
                          className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-800 mb-0.5">Impact:</p>
                          <p className="text-xs text-blue-700">{warning.impact}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Options */}
          <div className="flex items-center justify-between pt-2 border-t border-blue-200">
            <p className="text-xs text-blue-700">
              You can proceed with this dataset. Default values will be used for missing fields where applicable.
            </p>
            <a
              href="https://github.com/yourusername/italy-trip-planner#data-validation"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Learn More
              <svg
                className="w-3.5 h-3.5 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
