/**
 * DnD Provider Component
 * 
 * Configures React DnD with multi-backend support for both HTML5 (mouse/desktop)
 * and Touch (mobile/tablet) drag-and-drop interactions.
 * 
 * **Validates Requirements 2.1, 2.2, 11.1:**
 * - Provides DnD context to all child components
 * - Supports HTML5 backend for mouse interactions
 * - Supports Touch backend for mobile devices
 * - Automatically switches between backends based on input method
 */

import { ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { MouseTransition, TouchTransition, MultiBackend } from 'dnd-multi-backend';

/**
 * Multi-backend configuration for React DnD
 * Switches between HTML5 (desktop) and Touch (mobile) backends
 */
const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: {
        // Enable touch events
        enableMouseEvents: false,
        // Add delay before drag starts to distinguish from scroll
        delayTouchStart: 200,
        // Allow scrolling while touch is held
        ignoreContextMenu: true,
      },
      preview: true,
      transition: TouchTransition,
    },
  ],
};

interface DnDProviderProps {
  children: ReactNode;
}

/**
 * DnD Provider wrapper component
 * 
 * Wraps the application with React DnD context using multi-backend support.
 * This enables drag-and-drop functionality across all child components.
 * 
 * @param children - Child components that need access to DnD context
 */
export function DnDProvider({ children }: DnDProviderProps) {
  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      {children}
    </DndProvider>
  );
}
