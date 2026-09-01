import { useMemo } from 'react';
import { SearchBar } from './SearchBar';
import { FilterPanel } from './FilterPanel';
import { PlaceList } from './PlaceList';
import { useDataset } from '../contexts/DatasetContext';
import { useFilter } from '../contexts/FilterContext';
import { useItinerary } from '../contexts/ItineraryContext';
import { Place } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PlaceExplorerProps {
  /**
   * Optional CSS class name for the container
   */
  className?: string;
  
  /**
   * Optional callback to add a place to the itinerary
   */
  onAddToItinerary?: (place: Place) => void;
  
  /**
   * Optional set of place IDs currently in the itinerary (for highlighting)
   */
  itineraryPlaceIds?: Set<string>;
}

// ============================================================================
// PlaceExplorer Component
// ============================================================================

/**
 * PlaceExplorer Component
 * 
 * Main component for place discovery that integrates SearchBar, FilterPanel,
 * and PlaceList. Manages the filtering and display of places from the dataset.
 * 
 * Features:
 * - Search functionality via SearchBar
 * - Comprehensive filter controls via FilterPanel
 * - Virtualized place list display via PlaceList
 * - Filtered count vs total count display
 * - Integration with DatasetContext and FilterContext
 * - Loading and error states
 * 
 * Requirements Coverage:
 * - 3.1: Displays all places in a browsable list
 * - 3.2: Provides filter controls for city, type, price range, and tags
 * - 3.3: Displays only places matching filter criteria
 * - 3.4: Displays place information (name, type, city, rating, price, description)
 * 
 * @example
 * ```tsx
 * function App() {
 *   const itineraryPlaceIds = new Set(itinerary.days.flatMap(d => d.places.map(p => p.id)));
 *   
 *   return (
 *     <DatasetProvider>
 *       <FilterProvider>
 *         <PlaceExplorer 
 *           onAddToItinerary={(place) => addPlaceToDay(place, activeDay)}
 *           itineraryPlaceIds={itineraryPlaceIds}
 *         />
 *       </FilterProvider>
 *     </DatasetProvider>
 *   );
 * }
 * ```
 */
export function PlaceExplorer({
  className = '',
  onAddToItinerary,
  itineraryPlaceIds,
}: PlaceExplorerProps): JSX.Element {
  const { state } = useDataset();
  const { applyFilters } = useFilter();
  const { state: itineraryState } = useItinerary();
  
  // Apply filters to get the filtered list of places
  // Memoized to avoid re-filtering on every render
  const filteredPlaces = useMemo(() => applyFilters(state.places), [applyFilters, state.places]);
  
  // Calculate counts for display
  const totalCount = state.places.length;
  const filteredCount = filteredPlaces.length;
  
  return (
    <nav className={`flex flex-col h-full ${className}`} aria-label="Place discovery and search">
      {/* Header Section */}
      <header className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Explore Activities</h2>
        
        {/* Search Bar */}
        <SearchBar filteredPlaces={filteredPlaces} />
        
        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-600">
          {filteredCount === totalCount ? (
            <p>Showing all <span className="font-semibold">{totalCount}</span> places</p>
          ) : (
            <p>
              Showing <span className="font-semibold">{filteredCount}</span> of{' '}
              <span className="font-semibold">{totalCount}</span> places
            </p>
          )}
        </div>
      </header>
      
      {/* Main Content - Two Column Layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column - Filter Panel */}
        <div className="w-64 flex-shrink-0 overflow-y-auto p-4 border-r border-gray-200 bg-gray-50">
          <FilterPanel places={state.places} />
        </div>
        
        {/* Right Column - Place List (Full Width) */}
        <div className="flex-1 overflow-y-auto p-4">
          {state.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading places...</p>
              </div>
            </div>
          ) : state.error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg 
                  className="w-16 h-16 text-red-400 mb-4 mx-auto" 
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Places</h3>
                <p className="text-gray-600">{state.error}</p>
              </div>
            </div>
          ) : (
            <PlaceList 
              places={filteredPlaces}
              itineraryPlaceIds={itineraryPlaceIds}
              onAddToItinerary={onAddToItinerary}
              isLoading={state.isLoading}
            />
          )}
        </div>
      </div>
    </nav>
  );
}
