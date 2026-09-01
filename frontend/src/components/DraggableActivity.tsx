/**
 * DraggableActivity Component
 * 
 * Displays an activity from the activity browser that can be dragged
 * into day plans to add it to the itinerary.
 * 
 * **Validates Requirements 2.1, 7.5, 7.6, 8.5:**
 * - Provides drag source for activities
 * - Shows visual feedback during drag
 * - Indicates if activity is already in itinerary
 * - Displays essential activity information
 */

import React from 'react';
import { useDrag } from 'react-dnd';
import { Place } from '../types';
import { DRAG_TYPE, DragItem } from '../types/dnd';

// ============================================================================
// Types
// ============================================================================

export interface DraggableActivityProps {
  place: Place;
  isInItinerary: boolean;
  onAddToDay?: (dayNumber: 1 | 2 | 3) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '1 hour';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

// ============================================================================
// Component
// ============================================================================

export const DraggableActivity = React.memo(function DraggableActivity({
  place,
  isInItinerary,
}: DraggableActivityProps): JSX.Element {
  
  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE.PLACE,
    item: {
      type: DRAG_TYPE.PLACE,
      place,
      // No dayNumber/index since dragging from activity browser
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const duration = formatDuration(place.duration_minutes);

  return (
    <div
      ref={dragRef}
      className={`draggable-activity bg-white rounded-lg border p-4 transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${
        isInItinerary
          ? 'border-green-300 bg-green-50'
          : 'border-gray-300 hover:border-blue-400 hover:shadow-sm'
      }`}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Header with name and status badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 flex-1">
          {place.name}
        </h3>
        {isInItinerary && (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Added
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mb-2">
        <span className="inline-flex items-center capitalize">
          {place.type.replace('_', ' ')}
        </span>
        <span>•</span>
        <span>{place.city}</span>
        {place.price_range && (
          <>
            <span>•</span>
            <span>{place.price_range}</span>
          </>
        )}
      </div>

      {/* Duration */}
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        <span>{duration}</span>
      </div>

      {/* Description (if available) */}
      {place.description && (
        <p className="mt-2 text-xs text-gray-600 line-clamp-2">
          {place.description}
        </p>
      )}
    </div>
  );
});
