import React from 'react';
import { DayPlan as DayPlanComponent } from './DayPlan';
import { useItinerary } from '../contexts/ItineraryContext';

// ============================================================================
// Types
// ============================================================================

export interface DayPlanListProps {
  /**
   * Callback to open place selector modal for a specific day
   */
  onAddPlace?: (dayNumber: 1 | 2 | 3) => void;

  /**
   * Optional additional CSS classes
   */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format total duration in minutes as hours and minutes
 */
function formatTotalDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

/**
 * Calculate total places across all days
 */
function getTotalPlaces(days: [any, any, any]): number {
  return days.reduce((total, day) => total + day.places.length, 0);
}

/**
 * Calculate total duration across all days
 */
function getTotalDuration(days: [any, any, any]): number {
  return days.reduce((total, day) => total + day.total_duration, 0);
}

// ============================================================================
// Component
// ============================================================================

/**
 * DayPlanList Component
 * 
 * Organizes and displays all 3 days of the itinerary with drag-and-drop
 * functionality between days. Shows aggregate statistics across the entire
 * trip.
 * 
 * Features:
 * - Renders 3 DayPlan components (days 1, 2, 3)
 * - Passes day-specific places from ItineraryContext
 * - Handles drag-and-drop between days through ItineraryContext
 * - Shows aggregate statistics:
 *   - Total number of places across all days
 *   - Total duration across all days
 *   - Visual summary at the top
 * - Empty state when no itinerary exists
 * - Responsive grid layout for mobile/tablet/desktop
 * 
 * Requirements Coverage:
 * - 4.3: Display current itinerary organized by day
 * - 4.4: Update visual itinerary immediately (via context)
 * - 19.5: Move places between days
 * 
 * @example
 * ```tsx
 * <DayPlanList 
 *   onAddPlace={(dayNumber) => openPlaceSelector(dayNumber)}
 * />
 * ```
 */
export const DayPlanList = React.memo(function DayPlanList({
  onAddPlace,
  className = '',
}: DayPlanListProps): JSX.Element {
  
  const { state } = useItinerary();
  const { currentItinerary } = state;

  // If no itinerary exists, show empty state
  if (!currentItinerary) {
    return (
      <div className={`bg-white rounded-lg p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center text-center">
          <svg
            className="w-16 h-16 text-gray-300 mb-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Itinerary Yet
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Create a new itinerary or generate a recommendation to get started
          </p>
        </div>
      </div>
    );
  }

  const { days } = currentItinerary;
  const totalPlaces = getTotalPlaces(days);
  const totalDuration = getTotalDuration(days);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Aggregate Statistics Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center gap-6 text-sm">
          {/* Total Places */}
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <div>
              <div className="font-semibold text-gray-900">{totalPlaces}</div>
              <div className="text-xs text-gray-500">
                {totalPlaces === 1 ? 'Place' : 'Places'}
              </div>
            </div>
          </div>

          {/* Total Duration */}
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <div className="font-semibold text-gray-900">
                {formatTotalDuration(totalDuration)}
              </div>
              <div className="text-xs text-gray-500">Total Duration</div>
            </div>
          </div>

          {/* Average per Day */}
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <div className="font-semibold text-gray-900">
                {formatTotalDuration(Math.round(totalDuration / 3))}
              </div>
              <div className="text-xs text-gray-500">Avg per Day</div>
            </div>
          </div>
        </div>

        {/* Dynamic trip info based on actual itinerary */}
        {(() => {
          // Get actual cities from itinerary places
          const citiesInItinerary = new Set<string>();
          days.forEach(day => {
            day.places.forEach(place => {
              citiesInItinerary.add(place.city);
            });
          });
          
          const cityList = Array.from(citiesInItinerary).sort();
          const pace = currentItinerary.preferences?.pace || 'moderate';
          
          if (cityList.length > 0 || pace) {
            return (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                  <span className="font-medium">Trip Pace:</span>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full capitalize">
                    {pace}
                  </span>
                  {cityList.length > 0 && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="font-medium">Cities:</span>
                      <span>{cityList.join(', ')}</span>
                    </>
                  )}
                </div>
                {/* 30-minute travel buffer note */}
                <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <svg 
                    className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  <span>
                    All activities include a 30-minute travel buffer between them for simplicity.
                  </span>
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Day Plans Grid */}
      <div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        role="region"
        aria-label="Three-day itinerary"
      >
        {/* Day 1 */}
        <DayPlanComponent
          dayNumber={1}
          places={days[0].places}
          totalDuration={days[0].total_duration}
          startTime={days[0].start_time || '08:00'}
          onAddPlace={onAddPlace ? () => onAddPlace(1) : undefined}
        />

        {/* Day 2 */}
        <DayPlanComponent
          dayNumber={2}
          places={days[1].places}
          totalDuration={days[1].total_duration}
          startTime={days[1].start_time || '08:00'}
          onAddPlace={onAddPlace ? () => onAddPlace(2) : undefined}
        />

        {/* Day 3 */}
        <DayPlanComponent
          dayNumber={3}
          places={days[2].places}
          totalDuration={days[2].total_duration}
          startTime={days[2].start_time || '08:00'}
          onAddPlace={onAddPlace ? () => onAddPlace(3) : undefined}
        />
      </div>

      {/* Optional: Footer with helpful tips */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Tip:</p>
            <p>
              Drag activities from the left panel directly onto any day, or drag them between days to reorganize your itinerary.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});
