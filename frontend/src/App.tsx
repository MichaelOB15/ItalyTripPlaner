import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header, TabType } from './components/Header';
import { MainLayout } from './components/MainLayout';
import { HomeTab } from './components/HomeTab';
import { CompactActivityBrowser } from './components/CompactActivityBrowser';
import { ItineraryPanel } from './components/ItineraryPanel';
import { ProgressView } from './components/ProgressView';
import { PreferencesModal } from './components/PreferencesModal';
import { PlaceModal } from './components/PlaceModal';
import { ToastProvider, useToast } from './components/ToastContainer';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';
import { DatasetProvider, useDataset } from './contexts/DatasetContext';
import { FilterProvider } from './contexts/FilterContext';
import { ItineraryProvider, useItinerary } from './contexts/ItineraryContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { DnDProvider } from './components/DnDProvider';
import { apiClient } from './services/api';
import { UserPreferences } from './types';
import { generateRandomItineraryName } from './utils/nameGenerator';

// ============================================================================
// App Component
// ============================================================================

/**
 * Root App component that sets up the application structure
 * 
 * **Validates: Requirements 5.1, 5.2, 9.1, 9.2, 9.5, 9.6, 9.7, 14.1, 14.5**
 * 
 * Features:
 * - Clean tabbed interface with 3 distinct views
 * - Tab 1: Home - Landing page with CTA
 * - Tab 2: Browse Places - Full-width place explorer
 * - Tab 3: My Itinerary - Full-width itinerary panel
 * - Wraps app with all context providers (Auth, Dataset, Filter, Itinerary, UI)
 * - Sets up React Router for navigation
 * - Adds ErrorBoundary for global error handling
 * - Initial data load happens in DatasetContext on mount
 * - Provides clean provider nesting structure
 * - Includes skip link for screen reader accessibility (14.5)
 * - Uses semantic HTML structure throughout
 * 
 * Provider Nesting Order (outer to inner):
 * 1. ErrorBoundary - Catches all React errors
 * 2. BrowserRouter - Provides routing context
 * 3. ToastProvider - Provides toast notification system
 * 4. DnDProvider - Provides drag-and-drop context with multi-backend support (Req 2.1, 2.2, 11.1)
 * 5. AuthProvider - Manages authentication state and storage mode detection (Req 5.1, 5.2)
 * 6. DatasetContext - Manages place data and loading
 * 7. FilterContext - Manages filter state
 * 8. ItineraryContext - Manages itinerary state and persistence
 * 9. UIContext - Manages ephemeral UI state (modals, selected items)
 */
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <DnDProvider>
            <AuthProvider>
              <DatasetProvider>
                <FilterProvider>
                  <ItineraryProvider>
                    <UIProvider>
                      <AppContent />
                    </UIProvider>
                  </ItineraryProvider>
                </FilterProvider>
              </DatasetProvider>
            </AuthProvider>
          </DnDProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

/**
 * AppContent component that uses context hooks and manages tab state
 * Separated from App to allow context consumption
 */
function AppContent() {
  const { state: datasetState } = useDataset();
  const { state: authState } = useAuth();
  const { state: itineraryState, createItinerary, replaceItinerary, addPlaceToDay } = useItinerary();
  const { state: uiState, closePlaceDetailModal } = useUI();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleNavigateToItinerary = () => {
    setActiveTab('itinerary');
  };

  const handleStartFromScratch = () => {
    console.log('[App] handleStartFromScratch called');
    console.log('[App] Current itinerary before:', itineraryState.currentItinerary);
    
    try {
      createItinerary('My Italy Trip');
      console.log('[App] createItinerary called successfully');
    } catch (error) {
      console.error('[App] Error creating itinerary:', error);
      showError('Failed to create itinerary');
    }
  };

  const handleGenerateWithAI = () => {
    setShowPreferencesModal(true);
    setGenerationError(null);
  };

  const handlePreferencesSubmit = async (preferences: UserPreferences) => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Call recommendations API
      const response = await apiClient.getRecommendations(preferences);

      // Update itinerary with the recommendation
      if (response.itinerary) {
        // Generate a random name for the recommended itinerary
        const randomName = generateRandomItineraryName();
        const itineraryWithRandomName = {
          ...response.itinerary,
          name: randomName,
        };
        
        // VALIDATION: Check for mixed-city days (backend should prevent this but validate anyway)
        const mixedCityDays: number[] = [];
        response.itinerary.days.forEach((day, idx) => {
          const cities = new Set(day.places.map(p => p.city));
          if (cities.size > 1) {
            mixedCityDays.push(idx + 1);
            console.warn(
              `[App] WARNING: Generated itinerary has mixed cities on Day ${idx + 1}:`,
              Array.from(cities).join(', '),
              '\nThis should be prevented by the backend algorithm.'
            );
          }
        });
        
        if (mixedCityDays.length > 0) {
          showError(
            `Warning: The generated itinerary has activities from different cities on the same day (Days ${mixedCityDays.join(', ')}). ` +
            `This may result in excessive travel time. Please manually adjust the itinerary.`
          );
        }
        
        replaceItinerary(itineraryWithRandomName);
        
        // Show success message
        showSuccess(
          `Generated itinerary with ${response.itinerary.days.reduce((sum, day) => sum + day.places.length, 0)} places!`
        );

        // Close modal
        setShowPreferencesModal(false);
      } else {
        throw new Error('No itinerary received from server');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate recommendations';
      setGenerationError(errorMessage);
      showError(errorMessage);
      console.error('[App] Error generating recommendations:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div role="tabpanel" id="home-panel" aria-labelledby="home-tab">
            <HomeTab
              onGenerateWithAI={handleGenerateWithAI}
              onStartFromScratch={handleStartFromScratch}
            />
          </div>
        );
      
      case 'itinerary':
        // Show itinerary builder if there's a current itinerary (even if empty)
        const hasItinerary = itineraryState.currentItinerary !== null;

        return (
          <div role="tabpanel" id="itinerary-panel" aria-labelledby="itinerary-tab">
            {hasItinerary ? (
              // Two-column layout for editing existing itinerary
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left column: Compact Activity Browser (3 columns on large screens) */}
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-lg shadow p-4 h-[calc(100vh-12rem)] overflow-hidden sticky top-4">
                    <CompactActivityBrowser activities={datasetState.places} />
                  </div>
                </div>
                
                {/* Right column: Itinerary Panel (9 columns on large screens) */}
                <div className="lg:col-span-9">
                  <ItineraryPanel />
                </div>
              </div>
            ) : (
              // Empty state - show action buttons only
              <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
                <div className="text-center max-w-2xl px-4">
                  <svg
                    className="w-20 h-20 mx-auto mb-6 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Create Your Italy Itinerary
                  </h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Choose how you'd like to start building your perfect 3-day trip
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {/* Generate Recommendations button */}
                    <button
                      onClick={handleGenerateWithAI}
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
                    >
                      <svg
                        className="w-6 h-6"
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
                      <div className="text-left">
                        <div className="text-base font-semibold">Generate Recommendations</div>
                        <div className="text-sm text-blue-100 font-normal">
                          Get personalized recommendations
                        </div>
                      </div>
                    </button>

                    {/* Start from Scratch button */}
                    <button
                      onClick={() => {
                        console.log('[App] Start from Scratch clicked');
                        handleStartFromScratch();
                      }}
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 text-base font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all shadow-md hover:shadow-lg"
                    >
                      <svg
                        className="w-6 h-6"
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
                      <div className="text-left">
                        <div className="text-base font-semibold">Start from Scratch</div>
                        <div className="text-sm text-gray-500 font-normal">
                          Build your own custom itinerary
                        </div>
                      </div>
                    </button>
                  </div>

                  <p className="mt-8 text-sm text-gray-500">
                    You can always switch between modes later
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'progress':
        return (
          <div role="tabpanel" id="progress-panel" aria-labelledby="progress-tab" className="bg-white rounded-lg shadow p-6">
            <ProgressView onNavigateToItinerary={handleNavigateToItinerary} />
          </div>
        );
      
      default:
        return null;
    }
  };

  // If user is not authenticated, show authentication gate (full-screen page)
  if (!authState.isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded">
        Skip to main content
      </a>
      <div className="min-h-screen bg-gray-50">
        <Header activeTab={activeTab} onTabChange={handleTabChange} />
        <MainLayout
          isLoading={datasetState.isLoading}
          error={datasetState.error}
        >
          {renderTabContent()}
        </MainLayout>
      </div>

      {/* Preferences Modal for Generating Recommendations */}
      <PreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => !isGenerating && setShowPreferencesModal(false)}
        onSubmit={handlePreferencesSubmit}
        isLoading={isGenerating}
        error={generationError}
      />

      {/* Place Detail Modal */}
      {uiState.selectedPlace && (
        <PlaceModal
          place={uiState.selectedPlace}
          isOpen={uiState.modals.placeDetail}
          onClose={closePlaceDetailModal}
          onAddToDay={(place, dayNumber) => {
            // Check for cross-city warning before adding
            if (itineraryState.currentItinerary) {
              const targetDay = itineraryState.currentItinerary.days[dayNumber - 1];
              const cities = new Set(targetDay.places.map(p => p.city));
              cities.add(place.city);
              
              if (cities.size > 1) {
                // Multiple cities - show warning
                const cityList = Array.from(cities).join(', ');
                const proceed = window.confirm(
                  `Warning: Multiple Cities in One Day\n\n` +
                  `Adding "${place.name}" from ${place.city} will create a day with activities in multiple cities: ${cityList}\n\n` +
                  `Travel time between cities can be significant (1-3 hours each way). ` +
                  `You may not have enough time to visit all these activities in one day.\n\n` +
                  `Do you want to continue anyway?`
                );
                
                if (!proceed) {
                  return; // User cancelled
                }
              }
            }
            
            addPlaceToDay(place, dayNumber);
            showSuccess(`Added ${place.name} to Day ${dayNumber}`);
          }}
          daysWithPlace={
            // Calculate which days already have this place
            itineraryState.currentItinerary?.days
              .map((day, idx) => 
                day.places.some(p => p.id === uiState.selectedPlace?.id) 
                  ? (idx + 1) as 1 | 2 | 3
                  : null
              )
              .filter((day): day is 1 | 2 | 3 => day !== null) || []
          }
        />
      )}
    </>
  );
}

export default App;
