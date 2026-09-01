import { useState, useCallback, useEffect } from 'react';
import { useItinerary } from '../contexts/ItineraryContext';
import { useToast } from './ToastContainer';
import { PreferencesModal } from './PreferencesModal';
import { apiClient } from '../services/api';
import { UserPreferences } from '../types';
import { generateRandomItineraryName } from '../utils/nameGenerator';

/**
 * ItineraryHeader component displays the itinerary title, actions, and metadata.
 * 
 * Features:
 * - Display itinerary title with inline edit capability
 * - Show last modified timestamp
 * - Export PDF action button with loading state
 * - Print action button
 * - Replan action button (regenerate itinerary with new preferences)
 * - Clear Itinerary action with confirmation dialog
 * - Success/error feedback via toast notifications
 * - Responsive design with Tailwind CSS
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.11, 8.12, 20.1**
 */
export function ItineraryHeader(): JSX.Element {
  const { state, updateItineraryName, clearItinerary, replaceItinerary, saveItinerary, undo, redo } = useItinerary();
  const { showSuccess, showError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);
  const [replanError, setReplanError] = useState<string | null>(null);
  const [showReplanModal, setShowReplanModal] = useState(false);
  const [showNewItineraryDropdown, setShowNewItineraryDropdown] = useState(false);

  const itinerary = state.currentItinerary;
  
  // Calculate undo/redo availability
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + Z = Undo
        if (e.key === 'z' && !e.shiftKey) {
          if (canUndo) {
            e.preventDefault();
            undo();
          }
        }
        // Ctrl/Cmd + Shift + Z = Redo
        else if (e.key === 'z' && e.shiftKey) {
          if (canRedo) {
            e.preventDefault();
            redo();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  // If no itinerary exists, don't render the header
  if (!itinerary) {
    return <></>;
  }

  const handleEditClick = () => {
    setEditedName(itinerary.name);
    setIsEditing(true);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      updateItineraryName(editedName.trim());
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!itinerary) return;
    
    setIsSaving(true);
    
    try {
      await saveItinerary();
      showSuccess('Itinerary saved successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save itinerary';
      showError(errorMessage);
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleGenerateWithAI = () => {
    setShowNewItineraryDropdown(false);
    setShowReplanModal(true);
    setReplanError(null);
  };

  const handleStartBlank = () => {
    setShowNewItineraryDropdown(false);
    setShowClearConfirmation(true);
  };

  const handleReplanSubmit = useCallback(async (preferences: UserPreferences) => {
    if (!itinerary) return;

    setIsReplanning(true);
    setReplanError(null);

    try {
      // Call recommendations API with existing itinerary for replan
      const response = await apiClient.getRecommendations(preferences, itinerary);

      // Replace the itinerary with new recommendations
      if (response.itinerary) {
        // Generate a random name for the replanned itinerary
        const randomName = generateRandomItineraryName();
        const itineraryWithRandomName = {
          ...response.itinerary,
          name: randomName,
        };
        
        replaceItinerary(itineraryWithRandomName);
        
        // Show success message
        showSuccess(
          `Replanned itinerary with ${response.itinerary.days.flat().length} places!`
        );

        // Close modal
        setShowReplanModal(false);
      } else {
        throw new Error('No itinerary received from server');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate new recommendations';
      setReplanError(errorMessage);
      showError(errorMessage);
      console.error('[ItineraryHeader] Replan error:', error);
    } finally {
      setIsReplanning(false);
    }
  }, [itinerary, replaceItinerary, showSuccess, showError]);

  const handleReplanClose = useCallback(() => {
    if (!isReplanning) {
      setShowReplanModal(false);
      setReplanError(null);
    }
  }, [isReplanning]);

  const handleClearClick = () => {
    setShowClearConfirmation(true);
  };

  const handleConfirmClear = () => {
    clearItinerary();
    setShowClearConfirmation(false);
  };

  const handleCancelClear = () => {
    setShowClearConfirmation(false);
  };

  const formatLastModified = (isoDate: string): string => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col gap-4">
          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3 py-1.5 text-xl font-semibold text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    aria-label="Edit itinerary name"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    aria-label="Save itinerary name"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                    {itinerary.name}
                  </h2>
                  <button
                    onClick={handleEditClick}
                    className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded p-1"
                    aria-label="Edit itinerary name"
                    title="Edit itinerary name"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Last Modified */}
            <div className="hidden sm:block text-sm text-gray-500">
              Last modified: {formatLastModified(itinerary.last_modified)}
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Undo/Redo Buttons */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
              aria-label="Undo last change"
              title="Undo (Ctrl+Z)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>
            
            <button
              onClick={redo}
              disabled={!canRedo}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
              aria-label="Redo last undone change"
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
                />
              </svg>
            </button>
            
            {/* Divider */}
            <div className="h-8 w-px bg-gray-300"></div>
            
            <button
              onClick={handleSave}
              disabled={isSaving || !state.hasUnsavedChanges}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Save itinerary"
              title={state.hasUnsavedChanges ? "Save changes" : "No unsaved changes"}
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4 mr-2"
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
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  {state.hasUnsavedChanges ? 'Save' : 'Saved'}
                </>
              )}
            </button>

            {/* New Itinerary Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setShowNewItineraryDropdown(!showNewItineraryDropdown)}
                disabled={isReplanning}
                className="inline-flex items-center px-4 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="New itinerary options"
              >
                {isReplanning ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4 mr-2"
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
                    Generating...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    New Itinerary
                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </>
                )}
              </button>

              {/* Dropdown Menu */}
              {showNewItineraryDropdown && (
                <>
                  {/* Backdrop to close dropdown when clicking outside */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNewItineraryDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={handleGenerateWithAI}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                      >
                        <svg
                          className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
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
                        <div>
                          <div className="text-sm font-medium text-gray-900">Generate Recommendations</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Create a new itinerary based on your preferences using recommendations
                          </div>
                        </div>
                      </button>
                      
                      <div className="border-t border-gray-100" />
                      
                      <button
                        onClick={handleStartBlank}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                      >
                        <svg
                          className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-gray-900">Start Blank</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Clear current itinerary and build your own from scratch
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Last Modified */}
          <div className="sm:hidden text-sm text-gray-500">
            Last modified: {formatLastModified(itinerary.last_modified)}
          </div>
        </div>
      </div>

      {/* New Itinerary Confirmation Modal */}
      {showClearConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleCancelClear}
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-dialog-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3
                  id="clear-dialog-title"
                  className="text-lg font-medium text-gray-900 mb-2"
                >
                  Start Blank Itinerary?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to start a blank itinerary? Your current itinerary will be cleared. 
                  Make sure you've saved it to "My Progress" if you want to keep it.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancelClear}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmClear}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Start Blank Itinerary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replan Modal */}
      {showReplanModal && itinerary && (
        <PreferencesModal
          isOpen={showReplanModal}
          onClose={handleReplanClose}
          onSubmit={handleReplanSubmit}
          initialPreferences={itinerary.preferences}
          isLoading={isReplanning}
          error={replanError}
        />
      )}
    </>
  );
}

