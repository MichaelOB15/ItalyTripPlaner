import { useState, useCallback } from 'react';
import { PreferencesModal } from './PreferencesModal';
import { useToast } from './ToastContainer';
import { useItinerary } from '../contexts/ItineraryContext';
import { apiClient } from '../services/api';
import { UserPreferences } from '../types';

/**
 * RecommendationButton component
 * 
 * A button that opens the PreferencesModal and handles the recommendation generation workflow.
 * Manages loading states, error handling, and success feedback.
 * 
 * Features:
 * - Opens PreferencesModal on click
 * - Shows loading spinner during recommendation generation
 * - Displays error messages in the modal
 * - Shows success toast on completion
 * - Integrates with ItineraryContext to update itinerary
 * - Disables button during loading
 * 
 * **Validates: Requirements 9.5, 13.1, 18.1, 18.2, 18.3, 18.7, 18.8**
 */
export function RecommendationButton(): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { showSuccess, showError } = useToast();
  const { replaceItinerary } = useItinerary();

  /**
   * Handle opening the modal
   */
  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
    setError(null);
  }, []);

  /**
   * Handle closing the modal
   */
  const handleCloseModal = useCallback(() => {
    if (!isLoading) {
      setIsModalOpen(false);
      setError(null);
    }
  }, [isLoading]);

  /**
   * Handle preference submission and recommendation generation
   */
  const handleSubmit = useCallback(async (preferences: UserPreferences) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call recommendations API
      const response = await apiClient.getRecommendations(preferences);

      // Update itinerary with the recommendation
      if (response.itinerary) {
        replaceItinerary(response.itinerary);
        
        // Show success message
        showSuccess(
          `Generated itinerary with ${response.itinerary.days.flat().length} places across ${preferences.cities.length} cities!`
        );

        // Close modal
        setIsModalOpen(false);
      } else {
        throw new Error('No itinerary received from server');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate recommendations';
      setError(errorMessage);
      showError(errorMessage);
      console.error('[RecommendationButton] Error generating recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [replaceItinerary, showSuccess, showError]);

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={isLoading}
        className="inline-flex items-center px-6 py-3 border border-transparent shadow-lg text-base font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        aria-label="Generate itinerary recommendations"
      >
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        {isLoading ? 'Generating...' : 'Generate Itinerary'}
      </button>

      <PreferencesModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
      />
    </>
  );
}
