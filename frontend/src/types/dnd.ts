/**
 * Drag-and-Drop Type Definitions
 * 
 * Core types and constants for React DnD drag-and-drop functionality
 * in the Manual Itinerary Builder feature.
 * 
 * **Validates Requirements 2.1, 2.2, 11.1:**
 * - Defines drag item structure for activities and places
 * - Provides type constants for drag source/drop target matching
 * - Supports both mouse (HTML5) and touch backends
 */

import { Place } from './index';

/**
 * Drag type constant for matching drag sources with drop targets.
 * All draggable activities and places use this type.
 */
export const DRAG_TYPE = {
  PLACE: 'PLACE',
} as const;

/**
 * Drag item structure containing place data and optional day context.
 * 
 * **Context Interpretation:**
 * - No dayNumber/index: Dragging from ActivityBrowser (adding new activity)
 * - With dayNumber/index: Dragging from DayPlan (reordering or moving between days)
 * 
 * This single interface handles all drag scenarios:
 * 1. ActivityBrowser → DayPlan (add)
 * 2. DayPlan → DayPlan (move between days)
 * 3. Within DayPlan (reorder)
 */
export interface DragItem {
  type: typeof DRAG_TYPE.PLACE;
  place: Place;
  dayNumber?: 1 | 2 | 3;  // Source day number (undefined if from ActivityBrowser)
  index?: number;          // Source position index (undefined if from ActivityBrowser)
}

/**
 * Drop result interface for communicating drop outcome.
 * Currently unused but reserved for future enhancements.
 */
export interface DropResult {
  success: boolean;
  message?: string;
}
