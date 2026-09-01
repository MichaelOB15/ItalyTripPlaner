import { useItinerary } from '../contexts/ItineraryContext';
import { useAuth } from '../contexts/AuthContext';
import { Itinerary } from '../types';
import { useState } from 'react';

/**
 * ProgressView component displays a list of saved itineraries for authenticated users.
 * 
 * Features:
 * - Display list of saved itineraries sorted by last_modified (most recent first)
 * - Each itinerary card shows: name, created date, modified date
 * - Action buttons: View (load in read-only mode), Edit (load for editing), Delete (with confirmation)
 * - Empty state message when no itineraries exist
 * - Loading state during API operations
 * - Total itinerary count display
 * - Authentication gate for guest users with sign-in prompt
 * 
 * **Validates Requirements:**
 * - 6.1: THE Frontend_App SHALL provide a Progress_View accessible after successful authentication
 * - 6.2: THE Progress_View SHALL display a list of all saved itineraries for the authenticated user
 * - 6.3: THE Progress_View SHALL show each itinerary's name, creation date, and last modified date
 * - 6.4: WHEN a user selects an itinerary from the Progress_View, THE Frontend_App SHALL load that itinerary for viewing or editing
 * - 6.5: THE Progress_View SHALL provide options to delete itineraries with user confirmation
 * - 6.6: WHEN a user deletes an itinerary from the Progress_View, THE Frontend_App SHALL call the DELETE endpoint and remove the itinerary from the display
 * - 6.7: WHEN the Progress_View is loaded and no itineraries exist, THE Frontend_App SHALL display a message indicating no saved itineraries
 * - 6.8: THE Progress_View SHALL display the total number of saved itineraries
 * - 8.3: THE Frontend_App SHALL display a notice to guest users indicating their data is stored locally
 * - 8.4: THE Frontend_App SHALL provide a clear call-to-action for guest users to sign in or register
 * - 8.5: WHEN a guest user navigates to the Progress_View, THE Frontend_App SHALL prompt them to sign in
 */

export interface ProgressViewProps {
  onNavigateToItinerary?: () => void;
}

export function ProgressView({ onNavigateToItinerary }: ProgressViewProps = {}): JSX.Element {
  const { state, deleteItinerary, replaceItinerary, setEditingMode, clearItinerary } = useItinerary();
  const { state: authState } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [expandedItineraryId, setExpandedItineraryId] = useState<string | null>(null);

  /**
   * Format ISO 8601 date string to human-readable format.
   * Example: "2024-01-15T10:30:00Z" -> "Jan 15, 2024"
   */
  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  /**
   * Handle loading an itinerary for viewing (read-only mode).
   * **Validates Requirement 6.4:** Load itinerary for viewing
   * UX Fix: Navigate to My Itinerary tab after loading
   */
  const handleView = (itinerary: Itinerary) => {
    // Toggle inline preview
    if (expandedItineraryId === itinerary.id) {
      setExpandedItineraryId(null);
    } else {
      setExpandedItineraryId(itinerary.id);
    }
  };

  /**
   * Handle loading an itinerary for editing.
   * **Validates Requirement 6.4:** Load itinerary for editing
   * UX Fix: Navigate to My Itinerary tab after loading
   */
  const handleEdit = (itinerary: Itinerary) => {
    replaceItinerary(itinerary);
    setEditingMode(true);
    if (onNavigateToItinerary) {
      onNavigateToItinerary();
    }
  };

  /**
   * Handle delete itinerary with confirmation.
   * **Validates Requirements 6.5, 6.6:** Delete with confirmation and API call
   */
  const handleDeleteClick = (itinerary: Itinerary) => {
    setShowDeleteModal({ id: itinerary.id, name: itinerary.name });
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteModal) return;
    
    try {
      setDeletingId(showDeleteModal.id);
      await deleteItinerary(showDeleteModal.id);
      setShowDeleteModal(null);
    } catch (error) {
      console.error('[ProgressView] Failed to delete itinerary:', error);
      // Error handling is done in ItineraryContext
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Handle create new itinerary action.
   * Creates a fresh blank itinerary and navigates to the My Itinerary tab.
   * UX Fix: Clear existing itinerary and create fresh one before navigating
   */
  const handleCreateNew = () => {
    clearItinerary();
    setEditingMode(true);
    if (onNavigateToItinerary) {
      onNavigateToItinerary();
    }
  };

  // Sort itineraries by last_modified descending (most recent first)
  const sortedItineraries = [...state.savedItineraries].sort((a, b) => {
    return new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime();
  });

  /**
   * Guest user authentication gate.
   * **Validates Requirements 8.3, 8.4, 8.5:**
   * - Display notice about localStorage limitations
   * - Provide sign-in call-to-action
   * - Prompt guest users to sign in when accessing Progress View
   */
  if (!authState.isAuthenticated) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            Sign In to Access Your Saved Itineraries
          </h2>

          {/* Notice about localStorage limitations */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg
                className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-amber-900 mb-1">
                  Guest Mode Limitations
                </h3>
                <p className="text-sm text-amber-800">
                  You're currently using the app in guest mode. Your itinerary is stored locally on this device only and won't be accessible from other devices or browsers. Sign in to save your itineraries to the cloud and access them from anywhere.
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 text-center mb-8">
            Create an account or sign in to access cloud storage for your Italy trip itineraries. 
            Your saved itineraries will be accessible from any device, anytime.
          </p>

          {/* Call-to-action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                // This will be handled by the parent component or navigation system
                // For now, we'll trigger the auth modal/flow
                window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signin' } }));
              }}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signup' } }));
              }}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create Account
            </button>
          </div>

          {/* Additional info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Benefits of creating an account:
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Access your itineraries from any device
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save multiple trip itineraries
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Never lose your travel plans
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Secure cloud storage
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Saved Itineraries</h2>
          {/* Validates Requirement 6.8: Display total count */}
          <p className="text-sm text-gray-600 mt-1">
            Total: {state.savedItineraries.length} {state.savedItineraries.length === 1 ? 'itinerary' : 'itineraries'}
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          aria-label="Create new itinerary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Itinerary
        </button>
      </div>

      {/* Loading State */}
      {state.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading itineraries...</p>
          </div>
        </div>
      )}

      {/* Empty State - Validates Requirement 6.7 */}
      {!state.isLoading && sortedItineraries.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No saved itineraries</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first Italy trip itinerary.
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Itinerary
            </button>
          </div>
        </div>
      )}

      {/* Itinerary List - Validates Requirements 6.2, 6.3 */}
      {!state.isLoading && sortedItineraries.length > 0 && (
        <div className="space-y-4">
          {sortedItineraries.map((itinerary) => {
            const isExpanded = expandedItineraryId === itinerary.id;
            const totalPlaces = itinerary.days.reduce((sum, day) => sum + day.places.length, 0);
            const cities = Array.from(new Set(itinerary.days.flatMap(day => day.places.map(p => p.city)))).sort();
            
            return (
              <div
                key={itinerary.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Itinerary Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {itinerary.name}
                      </h3>
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span>Created: {formatDate(itinerary.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Modified: {formatDate(itinerary.last_modified)}</span>
                        </div>
                        {totalPlaces > 0 && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{totalPlaces} {totalPlaces === 1 ? 'place' : 'places'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Validates Requirements 6.4, 6.5, 6.6 */}
                    <div className="flex items-center gap-2 ml-4">
                      {/* View Button (now toggles dropdown) */}
                      <button
                        onClick={() => handleView(itinerary)}
                        className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                          isExpanded
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                        aria-label={`${isExpanded ? 'Hide' : 'View'} itinerary: ${itinerary.name}`}
                        aria-expanded={isExpanded}
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {isExpanded ? 'Hide' : 'View'}
                        <svg 
                          className={`w-4 h-4 ml-1.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleEdit(itinerary)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        aria-label={`Edit itinerary: ${itinerary.name}`}
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteClick(itinerary)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        aria-label={`Delete itinerary: ${itinerary.name}`}
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Preview (Read-only) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    {/* Overview */}
                    {cities.length > 0 && (
                      <div className="mb-4 text-sm text-gray-600">
                        <span className="font-medium">Cities:</span> {cities.join(', ')}
                      </div>
                    )}
                    
                    {/* Days */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {itinerary.days.map((day) => (
                        <div key={day.day_number} className="bg-white rounded-lg border border-gray-200 p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">
                            Day {day.day_number}
                          </h4>
                          
                          {day.places.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No activities planned</p>
                          ) : (
                            <div className="space-y-3">
                              {day.places.map((place, idx) => (
                                <div key={`${place.id}-${idx}`} className="text-sm">
                                  <div className="font-medium text-gray-900">{place.name}</div>
                                  <div className="text-gray-500 text-xs mt-1">
                                    {place.city} • {place.type.replace('_', ' ')}
                                  </div>
                                  {place.duration_minutes && (
                                    <div className="text-gray-400 text-xs mt-0.5">
                                      {Math.floor(place.duration_minutes / 60)}h {place.duration_minutes % 60}m
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Read-only indicator */}
                    <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Read-only preview • Click "Edit" to modify
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{state.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowDeleteModal(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              {/* Warning Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
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
                </div>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3
                  id="delete-dialog-title"
                  className="text-lg font-semibold text-gray-900 mb-2"
                >
                  Delete Itinerary?
                </h3>
                <p className="text-sm text-gray-600 mb-1">
                  Are you sure you want to delete <strong>"{showDeleteModal.name}"</strong>?
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  This action cannot be undone. The itinerary will be permanently deleted from your account.
                </p>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteModal(null)}
                    disabled={deletingId === showDeleteModal.id}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={deletingId === showDeleteModal.id}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === showDeleteModal.id ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        Deleting...
                      </>
                    ) : (
                      'Delete Itinerary'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
