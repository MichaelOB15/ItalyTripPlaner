/**
 * Custom Hook for API Calls with Toast Notifications
 * 
 * Wraps API calls with automatic error handling and user-friendly toast notifications.
 * 
 * **Validates: Requirements 9.6, 12.5**
 * 
 * Features:
 * - Automatic error handling with try-catch
 * - Transform errors to user-friendly messages
 * - Show toast notifications for errors
 * - Optional success toast notifications
 * - Type-safe API call wrapper
 * 
 * @example
 * ```tsx
 * const { callAPI } = useAPIWithToast();
 * 
 * const loadPlaces = async () => {
 *   const places = await callAPI(
 *     () => apiClient.getPlaces(),
 *     { successMessage: 'Places loaded successfully!' }
 *   );
 *   if (places) {
 *     setPlaces(places);
 *   }
 * };
 * ```
 */

import { useCallback } from 'react';
import { useToast } from '../components/ToastContainer';
import { getUserFriendlyErrorMessage } from '../utils/errorHandling';

export interface APICallOptions {
  /** Optional success message to show in toast */
  successMessage?: string;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
  /** Custom error message instead of auto-generated */
  customErrorMessage?: string;
  /** Callback to execute on error */
  onError?: (error: unknown) => void;
  /** Callback to execute on success */
  onSuccess?: () => void;
}

export interface UseAPIWithToastReturn {
  /**
   * Wrap an API call with automatic error handling and toast notifications
   * 
   * @param apiCall - The async API call function to execute
   * @param options - Configuration options for error/success handling
   * @returns The result of the API call, or undefined if it failed
   */
  callAPI: <T>(
    apiCall: () => Promise<T>,
    options?: APICallOptions
  ) => Promise<T | undefined>;
}

/**
 * Hook to wrap API calls with automatic error handling and toast notifications
 */
export function useAPIWithToast(): UseAPIWithToastReturn {
  const { showSuccess, showError } = useToast();

  const callAPI = useCallback(
    async <T,>(
      apiCall: () => Promise<T>,
      options?: APICallOptions
    ): Promise<T | undefined> => {
      const {
        successMessage,
        showErrorToast = true,
        customErrorMessage,
        onError,
        onSuccess,
      } = options || {};

      try {
        // Execute the API call
        const result = await apiCall();

        // Show success toast if message provided
        if (successMessage) {
          showSuccess(successMessage);
        }

        // Execute success callback if provided
        if (onSuccess) {
          onSuccess();
        }

        return result;
      } catch (error) {
        // Get user-friendly error message
        const errorMessage = customErrorMessage || getUserFriendlyErrorMessage(error);

        // Show error toast
        if (showErrorToast) {
          showError(errorMessage);
        }

        // Execute error callback if provided
        if (onError) {
          onError(error);
        }

        // Log error for debugging
        console.error('[API Call Error]', error);

        // Return undefined to indicate failure
        return undefined;
      }
    },
    [showSuccess, showError]
  );

  return { callAPI };
}
