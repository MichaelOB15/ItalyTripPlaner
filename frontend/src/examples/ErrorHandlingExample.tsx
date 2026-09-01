/**
 * Error Handling Usage Examples
 * 
 * **Validates: Requirements 9.6, 12.5**
 * 
 * This file demonstrates how to implement error handling with toast notifications
 * for API calls throughout the application.
 */

import { useAPIWithToast } from '../hooks/useAPIWithToast';
import { apiClient } from '../services/api';
import { Place } from '../types';

/**
 * Example 1: Basic API Call with Error Handling
 * 
 * This shows the simplest usage - automatic error handling with toast notifications
 */
export function BasicExample() {
  const { callAPI } = useAPIWithToast();

  const loadPlaces = async () => {
    const places = await callAPI(
      () => apiClient.getPlaces(),
      {
        successMessage: 'Places loaded successfully!',
      }
    );

    if (places) {
      // Handle successful response
      console.log('Loaded places:', places);
    }
    // Errors are automatically handled and toast is shown
  };

  return (
    <button onClick={loadPlaces}>
      Load Places
    </button>
  );
}

/**
 * Example 2: API Call with Custom Error Message
 * 
 * Override the default error message with a custom one
 */
export function CustomErrorMessageExample() {
  const { callAPI } = useAPIWithToast();

  const loadPlaces = async () => {
    const places = await callAPI(
      () => apiClient.getPlaces({ cities: 'Rome' }),
      {
        customErrorMessage: 'Failed to load places for Rome. Please try selecting a different city.',
      }
    );

    if (places) {
      console.log('Loaded places:', places);
    }
  };

  return (
    <button onClick={loadPlaces}>
      Load Rome Places
    </button>
  );
}

/**
 * Example 3: API Call with Error Callback
 * 
 * Execute custom logic when an error occurs
 */
export function ErrorCallbackExample() {
  const { callAPI } = useAPIWithToast();

  const loadPlaces = async () => {
    const places = await callAPI(
      () => apiClient.getPlaces(),
      {
        onError: (error) => {
          // Custom error handling logic
          console.error('Failed to load places:', error);
          // Could also update component state, log to analytics, etc.
        },
      }
    );

    if (places) {
      console.log('Loaded places:', places);
    }
  };

  return (
    <button onClick={loadPlaces}>
      Load Places with Error Callback
    </button>
  );
}

/**
 * Example 4: Silent Error Handling
 * 
 * Handle errors without showing toast notifications
 */
export function SilentErrorHandlingExample() {
  const { callAPI } = useAPIWithToast();

  const loadPlaces = async () => {
    const places = await callAPI(
      () => apiClient.getPlaces(),
      {
        showErrorToast: false,
        onError: (error) => {
          // Handle error silently - no toast shown
          console.error('Error:', error);
        },
      }
    );

    if (places) {
      console.log('Loaded places:', places);
    }
  };

  return (
    <button onClick={loadPlaces}>
      Load Places Silently
    </button>
  );
}

/**
 * Example 5: API Call with Success Callback
 * 
 * Execute custom logic on successful API call
 */
export function SuccessCallbackExample() {
  const { callAPI } = useAPIWithToast();

  const loadPlaces = async () => {
    const places = await callAPI(
      () => apiClient.getPlaces(),
      {
        successMessage: 'Places loaded!',
        onSuccess: () => {
          // Custom success handling
          console.log('Success! Updating analytics...');
        },
      }
    );

    if (places) {
      console.log('Loaded places:', places);
    }
  };

  return (
    <button onClick={loadPlaces}>
      Load Places with Success Callback
    </button>
  );
}

/**
 * Example 6: Complete Error Handling in a Component
 * 
 * Shows a realistic usage pattern with loading state and error handling
 */
export function CompleteExample() {
  const { callAPI } = useAPIWithToast();
  const [places, setPlaces] = React.useState<Place[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadPlaces = async () => {
    setIsLoading(true);
    
    const result = await callAPI(
      () => apiClient.getPlaces(),
      {
        successMessage: 'Places loaded successfully!',
        onError: () => {
          // Reset state on error
          setPlaces([]);
        },
      }
    );

    setIsLoading(false);

    if (result) {
      setPlaces(result);
    }
  };

  return (
    <div>
      <button onClick={loadPlaces} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Load Places'}
      </button>
      
      <div>
        {places.map(place => (
          <div key={place.id}>{place.name}</div>
        ))}
      </div>
    </div>
  );
}

/**
 * Error Types and Their Messages:
 * 
 * Network Errors (no connection):
 * - "Unable to connect. Check your internet connection."
 * 
 * Timeout Errors (408, 504, or message contains "timeout"):
 * - "Request timed out. Please try again."
 * - "Gateway timeout. Please try again." (for 504)
 * 
 * 400 Bad Request:
 * - "Invalid request. Please check your input."
 * 
 * 500 Server Errors:
 * - "Server error. Please try again later."
 * - "Bad gateway. The server is temporarily unavailable." (for 502)
 * - "Service unavailable. Please try again later." (for 503)
 * 
 * Other status codes:
 * - 401: "Authentication required. Please log in."
 * - 403: "You do not have permission to perform this action."
 * - 404: "The requested resource was not found."
 * - 429: "Too many requests. Please wait a moment and try again."
 */

// Need to import React for the last example
import React from 'react';
