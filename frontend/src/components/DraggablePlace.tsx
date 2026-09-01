import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Place } from '../types';
import { DRAG_TYPE, DragItem } from '../types/dnd';
import { useUI } from '../contexts/UIContext';

// ============================================================================
// Types
// ============================================================================

export interface DraggablePlaceProps {
  /**
   * Place object to display
   */
  place: Place;

  /**
   * Index of place in the day's places array
   */
  index: number;

  /**
   * Day number this place belongs to (1, 2, or 3)
   */
  dayNumber: 1 | 2 | 3;

  /**
   * Time slot for this place (e.g., "08:00 AM")
   */
  timeSlot: string;

  /**
   * Callback when remove button is clicked
   */
  onRemove: (index: number) => void;

  /**
   * Callback when reordering places in the same day
   */
  onReorder: (fromIndex: number, toIndex: number) => void;

  /**
   * Callback when moving place from another day
   */
  onMoveBetweenDays: (placeId: string, fromDay: 1 | 2 | 3, toDay: 1 | 2 | 3, targetIndex: number) => void;

  /**
   * Callback when adding new place from activity browser
   */
  onAddPlace: (place: Place, targetIndex: number) => void;

  /**
   * Optional additional CSS classes
   */
  className?: string;
}

/**
 * Drag item type for react-dnd
 */
export interface DragItemLegacy {
  type: string;
  place: Place;
  index: number;
  dayNumber: 1 | 2 | 3;
}

/**
 * Drag type constant for react-dnd
 */
export const DRAG_TYPE_LEGACY = 'PLACE';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format duration in minutes to human-readable format
 */
function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '1 hour'; // Default

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours}h ${mins}m`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * DraggablePlace Component
 * 
 * Displays a place within a day plan with drag-and-drop functionality.
 * Users can drag to reorder within the same day or move to a different day.
 * 
 * Features:
 * - Drag handle icon for intuitive interaction
 * - Place summary: name, duration, time slot
 * - Remove button with visual confirmation
 * - Visual feedback during drag (reduced opacity)
 * - Accessible keyboard interactions
 * 
 * Requirements Coverage:
 * - 19.2: Drag-and-drop reordering within day
 * - 19.3: Remove places from itinerary
 * 
 * @example
 * ```tsx
 * <DraggablePlace 
 *   place={place}
 *   index={0}
 *   dayNumber={1}
 *   timeSlot="08:00 AM"
 *   onRemove={(idx) => handleRemove(idx)}
 * />
 * ```
 */
export const DraggablePlace = React.memo(function DraggablePlace({
  place,
  index,
  dayNumber,
  timeSlot,
  onRemove,
  onReorder,
  onMoveBetweenDays,
  onAddPlace,
  className = '',
}: DraggablePlaceProps): JSX.Element {
  
  const ref = useRef<HTMLDivElement>(null);
  const { openPlaceDetailModal } = useUI();
  
  // Set up drag functionality
  const [{ isDragging }, dragRef] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: DRAG_TYPE.PLACE,
    item: { type: DRAG_TYPE.PLACE, place, index, dayNumber },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Set up drop functionality for insertion
  const [{ isOver, canDrop }, dropRef] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DRAG_TYPE.PLACE,
    hover: (item: DragItem, monitor) => {
      if (!ref.current) return;
      
      // Don't replace items with themselves
      if (item.dayNumber === dayNumber && item.index === index) {
        return;
      }

      // Determine drop position based on mouse position
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      
      if (!clientOffset) return;
      
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      // Determine target index based on hover position
      const targetIndex = hoverClientY < hoverMiddleY ? index : index + 1;
      
      // Store target index on the item for use in drop
      (item as any).targetIndex = targetIndex;
    },
    drop: (item: DragItem, monitor) => {
      if (monitor.didDrop()) return;
      
      const targetIndex = (item as any).targetIndex ?? index;
      
      // Case 1: Adding from activity browser (no dayNumber)
      if (item.dayNumber === undefined) {
        onAddPlace(item.place, targetIndex);
      }
      // Case 2: Moving from another day
      else if (item.dayNumber !== dayNumber) {
        onMoveBetweenDays(item.place.id, item.dayNumber, dayNumber, targetIndex);
      }
      // Case 3: Reordering within same day
      else if (item.index !== undefined && item.index !== targetIndex) {
        // Adjust target index if dragging downward
        const adjustedTarget = item.index < targetIndex ? targetIndex - 1 : targetIndex;
        onReorder(item.index, adjustedTarget);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  // Combine drag and drop refs
  dragRef(dropRef(ref));

  /**
   * Handle remove button click
   */
  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Simple confirmation
    if (window.confirm(`Remove "${place.name}" from Day ${dayNumber}?`)) {
      onRemove(index);
    }
  };

  /**
   * Handle card click to show details
   */
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking remove button or drag handle
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (!isDragging) {
      openPlaceDetailModal(place);
    }
  };

  const duration = formatDuration(place.duration_minutes);

  // Show insertion indicator when hovering
  const showInsertionIndicator = isOver && canDrop && !isDragging;

  return (
    <div className="relative">
      {/* Insertion indicator */}
      {showInsertionIndicator && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10">
          <div className="absolute -left-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
          <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      )}
      
      <div
        ref={ref}
        onClick={handleCardClick}
        className={`draggable-place bg-white rounded-lg border border-gray-200 p-4 mb-3 flex items-start gap-4 transition-all cursor-pointer shadow-sm ${
          isDragging ? 'opacity-50' : 'opacity-100'
        } ${
          showInsertionIndicator ? 'ring-2 ring-blue-500 border-blue-500' : ''
        } hover:border-blue-400 hover:shadow-md ${className}`}
        style={{ cursor: isDragging ? 'grabbing' : 'pointer' }}
        role="listitem"
        aria-label={`${place.name} at ${timeSlot}. Click for details.`}
        title="Click for details, drag to reorder"
      >
      {/* Drag Handle */}
      <div className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm6 0a2 2 0 10.001 4.001A2 2 0 0013 2zM7 8a2 2 0 10.001 4.001A2 2 0 007 8zm6 0a2 2 0 10.001 4.001A2 2 0 0013 8zM7 14a2 2 0 10.001 4.001A2 2 0 007 14zm6 0a2 2 0 10.001 4.001A2 2 0 0013 14z" />
        </svg>
      </div>

      {/* Place Content */}
      <div className="flex-1 min-w-0">
        {/* Time Slot */}
        <div className="flex items-center gap-2 mb-2">
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {timeSlot}
          </div>
          <span className="text-xs text-gray-500">• {duration}</span>
        </div>

        {/* Place Name */}
        <h4 className="text-base font-semibold text-gray-900 mb-1 leading-snug">
          {place.name}
        </h4>

        {/* Place Details */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            {place.city}
          </span>
          <span className="text-gray-400">•</span>
          <span className="capitalize">{place.type.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={handleRemoveClick}
        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
        aria-label={`Remove ${place.name} from day ${dayNumber}`}
        title="Remove from itinerary"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
    </div>
  );
});
