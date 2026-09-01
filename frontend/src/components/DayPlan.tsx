import React, { useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { Place } from '../types';
import { DraggablePlace } from './DraggablePlace';
import { DRAG_TYPE, DragItem } from '../types/dnd';
import { useItinerary } from '../contexts/ItineraryContext';
import { CrossCityWarningModal } from './CrossCityWarningModal';

// ============================================================================
// Types
// ============================================================================

export interface DayPlanProps {
  /**
   * Day number (1, 2, or 3)
   */
  dayNumber: 1 | 2 | 3;

  /**
   * Places assigned to this day
   */
  places: Place[];

  /**
   * Total duration in minutes for this day
   */
  totalDuration: number;

  /**
   * Start time for the day (e.g., "08:00")
   */
  startTime?: string;

  /**
   * Callback to open place selector modal
   */
  onAddPlace?: () => void;

  /**
   * Optional additional CSS classes
   */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_START_TIME = '08:00';
const MAX_DAILY_MINUTES = 600; // 10 hours warning threshold
const MINUTES_PER_HOUR = 60;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse time string (HH:MM) and add minutes to get new time
 */
function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  if (!timeStr || typeof timeStr !== 'string') {
    console.error('[DayPlan] Invalid timeStr:', timeStr);
    return '8:00 AM'; // Default fallback
  }
  
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    console.error('[DayPlan] Invalid time format:', timeStr);
    return '8:00 AM'; // Default fallback
  }
  
  const [hours, minutes] = parts.map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('[DayPlan] NaN in time parsing:', { timeStr, hours, minutes });
    return '8:00 AM'; // Default fallback
  }
  
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  
  const period = newHours >= 12 ? 'PM' : 'AM';
  const displayHours = newHours === 0 ? 12 : newHours > 12 ? newHours - 12 : newHours;
  
  return `${displayHours}:${newMinutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convert display time back to HH:MM format
 */
function timeDisplayToHHMM(displayTime: string): string {
  if (!displayTime || typeof displayTime !== 'string') {
    console.error('[DayPlan] Invalid displayTime:', displayTime);
    return '08:00'; // Default fallback
  }
  
  const parts = displayTime.split(' ');
  if (parts.length !== 2) {
    // Already in HH:MM format, validate it
    if (displayTime.includes(':')) {
      return displayTime;
    }
    console.error('[DayPlan] Invalid display time format:', displayTime);
    return '08:00';
  }
  
  const [time, period] = parts;
  const timeParts = time.split(':');
  if (timeParts.length !== 2) {
    console.error('[DayPlan] Invalid time in display format:', displayTime);
    return '08:00';
  }
  
  const [hours, minutes] = timeParts.map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('[DayPlan] NaN in time conversion:', { displayTime, hours, minutes });
    return '08:00';
  }
  
  let hour24 = hours;
  if (period === 'PM' && hours !== 12) {
    hour24 = hours + 12;
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculate time slots for each place based on start time and durations
 * Adds 30-minute buffer between activities for travel time
 */
function calculateTimeSlots(places: Place[], startTime: string): string[] {
  if (!places || !Array.isArray(places)) {
    console.error('[DayPlan] Invalid places array:', places);
    return [];
  }
  
  if (!startTime) {
    console.warn('[DayPlan] No start time provided, using default');
    startTime = DEFAULT_START_TIME;
  }
  
  const TRAVEL_BUFFER = 30; // 30 minutes between activities
  const slots: string[] = [];
  let currentTimeHHMM = startTime; // Keep in HH:MM format
  
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    if (!place) {
      console.error('[DayPlan] Invalid place at index', i);
      continue;
    }
    
    try {
      // Add display time for this place
      const displayTime = addMinutesToTime(currentTimeHHMM, 0);
      slots.push(displayTime);
      
      // Calculate next time slot: duration + 30 min buffer
      const duration = place.duration_minutes || 60;
      const totalTime = duration + (i < places.length - 1 ? TRAVEL_BUFFER : 0); // No buffer after last activity
      const nextDisplayTime = addMinutesToTime(currentTimeHHMM, totalTime);
      currentTimeHHMM = timeDisplayToHHMM(nextDisplayTime);
    } catch (error) {
      console.error('[DayPlan] Error calculating time slot for place:', place, error);
      slots.push('--:-- --'); // Placeholder for error
    }
  }
  
  return slots;
}

/**
 * Format total duration as hours and minutes
 */
function formatTotalDuration(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const mins = minutes % MINUTES_PER_HOUR;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * DayPlan Component
 * 
 * Displays a single day's itinerary with drag-and-drop functionality.
 * Users can add places, reorder them, and move them between days.
 * 
 * Features:
 * - Drop target for adding/reordering places
 * - Day header with summary stats (place count, total duration)
 * - Time slot calculation starting at 8:00 AM (or custom start time)
 * - Warning indicator when total duration > 10 hours
 * - Empty state with "Add Place" prompt
 * - Handles drop events from external sources, within day, and between days
 * - Visual feedback during drag over
 * 
 * Requirements Coverage:
 * - 4.3: Display current itinerary organized by day
 * - 4.4: Update visual itinerary immediately
 * - 5.3: Display total time required for each day
 * - 5.4: Display individual time slots
 * - 5.5: Warning when day exceeds 12 hours (using 10 hours per design)
 * - 19.2: Reorder places within day
 * - 19.5: Move places between days
 * 
 * @example
 * ```tsx
 * <DayPlan 
 *   dayNumber={1}
 *   places={dayPlaces}
 *   totalDuration={480}
 *   startTime="08:00"
 *   onAddPlace={() => openPlaceSelector(1)}
 * />
 * ```
 */
export const DayPlan = React.memo(function DayPlan({
  dayNumber,
  places,
  totalDuration,
  startTime = DEFAULT_START_TIME,
  onAddPlace,
  className = '',
}: DayPlanProps): JSX.Element {
  
  const { 
    addPlaceToDay, 
    removePlaceFromDay, 
    reorderPlacesInDay,
    movePlaceBetweenDays,
    updateDayStartTime 
  } = useItinerary();

  const [isHighlighted, setIsHighlighted] = useState(false);
  const [showCrossCityWarning, setShowCrossCityWarning] = useState(false);
  const [pendingPlace, setPendingPlace] = useState<Place | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);

  // Helper to add place with cross-city check
  const handleAddPlaceWithCheck = useCallback((place: Place) => {
    const cities = new Set(places.map(p => p.city));
    cities.add(place.city);
    
    if (cities.size > 1) {
      setPendingPlace(place);
      setShowCrossCityWarning(true);
    } else {
      addPlaceToDay(place, dayNumber);
    }
  }, [places, addPlaceToDay, dayNumber]);

  // Set up drop target functionality
  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DRAG_TYPE.PLACE,
    drop: (item: DragItem, monitor) => {
      // Don't handle nested drops
      if (monitor.didDrop()) {
        return;
      }

      // Case 1: Adding from external source (e.g., activity browser)
      if (item.dayNumber === undefined) {
        handleAddPlaceWithCheck(item.place);
      }
      // Case 2: Moving from another day
      else if (item.dayNumber !== dayNumber) {
        // Check for cross-city warning before moving
        const cities = new Set(places.map(p => p.city));
        cities.add(item.place.city);
        
        if (cities.size > 1) {
          setPendingPlace(item.place);
          setShowCrossCityWarning(true);
        } else {
          movePlaceBetweenDays(item.place.id, item.dayNumber, dayNumber);
        }
      }
      // Case 3: Reordering within the same day
      else if (item.index !== undefined) {
        // Find current position of the place (might have changed)
        const currentIndex = places.findIndex(p => p.id === item.place.id);
        if (currentIndex !== -1 && currentIndex !== places.length - 1) {
          // Move to end of list when dropped on the day (not between items)
          reorderPlacesInDay(dayNumber, currentIndex, places.length - 1);
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
    hover: () => {
      setIsHighlighted(true);
    },
  });

  // Reset highlight when not hovering
  React.useEffect(() => {
    if (!isOver) {
      setIsHighlighted(false);
    }
  }, [isOver]);

  /**
   * Handle removing a place from this day
   * Memoized to prevent re-creating this function on every render
   */
  const handleRemovePlace = useCallback((index: number) => {
    removePlaceFromDay(dayNumber, index);
  }, [removePlaceFromDay, dayNumber]);

  /**
   * Handle adding a place (open selector)
   * Memoized to prevent re-creating this function on every render
   */
  const handleAddPlace = useCallback(() => {
    if (onAddPlace) {
      onAddPlace();
    }
  }, [onAddPlace]);

  // Calculate time slots for each place
  const timeSlots = calculateTimeSlots(places, startTime);
  
  // Check if duration exceeds warning threshold
  const isOverloaded = totalDuration > MAX_DAILY_MINUTES;
  
  // Format duration display
  const durationDisplay = formatTotalDuration(totalDuration);

  // Determine border style based on drag state
  const borderClass = isOver && canDrop
    ? 'border-blue-500 border-2 bg-blue-50'
    : isHighlighted
    ? 'border-blue-300 border-2'
    : 'border-gray-300';

  return (
    <div
      ref={dropRef}
      className={`day-plan bg-gray-50 rounded-lg p-4 min-h-[300px] ${borderClass} transition-colors ${className}`}
      role="region"
      aria-label={`Day ${dayNumber} itinerary`}
    >
      {/* Day Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            Day {dayNumber}
          </h2>
          
          {/* Add Place Button */}
          {onAddPlace && (
            <button
              onClick={handleAddPlace}
              className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={`Add place to day ${dayNumber}`}
              title={`Add place to day ${dayNumber}`}
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Place
            </button>
          )}
        </div>

        {/* Summary Stats */}
        <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
          {/* Places count */}
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4 text-gray-500"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="font-medium">{places.length}</span>
            <span className="text-gray-500">{places.length === 1 ? 'activity' : 'activities'}</span>
          </div>

          {/* Duration */}
          <div className={`flex items-center gap-1.5 ${isOverloaded ? 'text-orange-700' : ''}`} title="Total duration for this day">
            <svg
              className="w-4 h-4"
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
            <span className="font-medium">{durationDisplay}</span>
            {isOverloaded && (
              <svg
                className="w-4 h-4 text-orange-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                aria-label="Day exceeds 10 hours"
              >
                <title>This day exceeds 10 hours</title>
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          {/* Start time */}
          <div className="flex items-center gap-2" title="Day start time (click Edit to change)">
            {!isEditingTime ? (
              <>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-500">Starts</span>
                  <span className="font-medium">{addMinutesToTime(startTime, 0)}</span>
                </div>
                <button
                  onClick={() => setIsEditingTime(true)}
                  className="px-2 py-0.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  title="Click to edit start time"
                >
                  Edit
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    updateDayStartTime(dayNumber, e.target.value);
                    setIsEditingTime(false);
                  }}
                  onBlur={() => setIsEditingTime(false)}
                  autoFocus
                  className="border border-blue-500 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">↵ Save</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning Message */}
        {isOverloaded && (
          <div 
            className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800"
            role="alert"
            aria-live="polite"
          >
            ⚠️ This day exceeds 10 hours of activities. Consider moving some places to another day.
          </div>
        )}
      </div>

      {/* Places List */}
      {places.length > 0 ? (
        <div className="space-y-2" role="list">
          {places.map((place, index) => (
            <DraggablePlace
              key={`${place.id}-${index}`}
              place={place}
              index={index}
              dayNumber={dayNumber}
              timeSlot={timeSlots[index]}
              onRemove={handleRemovePlace}
              onReorder={(fromIndex, toIndex) => reorderPlacesInDay(dayNumber, fromIndex, toIndex)}
              onMoveBetweenDays={(placeId, fromDay, toDay, targetIndex) => {
                // Move the place
                movePlaceBetweenDays(placeId, fromDay, toDay);
                // Note: Precise index positioning would require updating movePlaceBetweenDays in context
                // For now, it will add to end of day
              }}
              onAddPlace={(place, targetIndex) => {
                // Add at specific index (approximation - adds to end for now)
                handleAddPlaceWithCheck(place);
              }}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mb-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <p className="text-gray-700 font-medium text-base mb-1">
            No places added to Day {dayNumber} yet
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Browse places on the left and click "Add to Itinerary",<br />
            or drag places directly here to get started
          </p>
          {onAddPlace && (
            <button
              onClick={handleAddPlace}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label={`Add first place to day ${dayNumber}`}
            >
              + Add First Place
            </button>
          )}
        </div>
      )}

      {/* Drop Zone Indicator (when dragging) */}
      {isOver && canDrop && (
        <div className="mt-4 p-3 border-2 border-dashed border-blue-400 bg-blue-50 rounded-lg text-center text-sm text-blue-700">
          Drop here to add to Day {dayNumber}
        </div>
      )}

      {/* Cross-City Warning Modal */}
      <CrossCityWarningModal
        isOpen={showCrossCityWarning}
        cities={Array.from(new Set([...places.map(p => p.city), pendingPlace?.city].filter(Boolean) as string[]))}
        places={pendingPlace ? [...places, pendingPlace] : places}
        onContinue={() => {
          if (pendingPlace) {
            // Check if this is a move from another day or a new add
            const isMove = places.length === 0 || pendingPlace.id; // Simple heuristic
            addPlaceToDay(pendingPlace, dayNumber);
          }
          setShowCrossCityWarning(false);
          setPendingPlace(null);
        }}
        onCancel={() => {
          setShowCrossCityWarning(false);
          setPendingPlace(null);
        }}
      />
    </div>
  );
});
