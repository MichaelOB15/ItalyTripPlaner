import { useEffect, useRef, useState, RefObject } from 'react';

/**
 * useKeyboardListNavigation Hook
 * 
 * **Validates: Requirements 14.2, 14.5**
 * 
 * Provides arrow key navigation support for list items.
 * Manages focus state and keyboard event handlers for navigating
 * through a list of interactive elements using arrow keys.
 * 
 * Features:
 * - Arrow Up/Down navigation between list items
 * - Home/End keys to jump to first/last item
 * - Automatic focus management
 * - Wrapping behavior (optional)
 * - Works with any list of focusable elements
 * 
 * @param itemCount - Total number of items in the list
 * @param options - Configuration options
 * @returns Object with current focus index and key down handler
 * 
 * @example
 * ```tsx
 * const items = ['Item 1', 'Item 2', 'Item 3'];
 * const { focusedIndex, handleKeyDown } = useKeyboardListNavigation(items.length);
 * 
 * return (
 *   <div onKeyDown={handleKeyDown}>
 *     {items.map((item, index) => (
 *       <button
 *         key={index}
 *         ref={focusedIndex === index ? focusRef : null}
 *         tabIndex={focusedIndex === index ? 0 : -1}
 *       >
 *         {item}
 *       </button>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useKeyboardListNavigation(
  itemCount: number,
  options: {
    /** Whether to wrap from last to first item (and vice versa). Default: true */
    wrap?: boolean;
    /** Whether navigation is enabled. Default: true */
    enabled?: boolean;
    /** Orientation of the list. Default: 'vertical' */
    orientation?: 'vertical' | 'horizontal';
  } = {}
) {
  const { wrap = true, enabled = true, orientation = 'vertical' } = options;
  
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!enabled || itemCount === 0) return;

    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (event.key) {
      case nextKey: {
        event.preventDefault();
        setFocusedIndex((current) => {
          if (current === -1) return 0;
          if (current >= itemCount - 1) {
            return wrap ? 0 : current;
          }
          return current + 1;
        });
        break;
      }

      case prevKey: {
        event.preventDefault();
        setFocusedIndex((current) => {
          if (current === -1) return 0;
          if (current <= 0) {
            return wrap ? itemCount - 1 : 0;
          }
          return current - 1;
        });
        break;
      }

      case 'Home': {
        event.preventDefault();
        setFocusedIndex(0);
        break;
      }

      case 'End': {
        event.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
      }

      case 'Tab': {
        // Reset focus index when tabbing out
        setFocusedIndex(-1);
        break;
      }
    }
  };

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}

/**
 * useKeyboardFocusManager Hook
 * 
 * Manages focus state for a specific item in a keyboard-navigable list.
 * Automatically focuses the element when it becomes the focused item.
 * 
 * @param isFocused - Whether this item is currently focused
 * @returns Ref to attach to the focusable element
 * 
 * @example
 * ```tsx
 * function ListItem({ index, focusedIndex }) {
 *   const ref = useKeyboardFocusManager(focusedIndex === index);
 *   
 *   return (
 *     <button ref={ref} tabIndex={focusedIndex === index ? 0 : -1}>
 *       Item {index}
 *     </button>
 *   );
 * }
 * ```
 */
export function useKeyboardFocusManager<T extends HTMLElement>(
  isFocused: boolean
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus();
    }
  }, [isFocused]);

  return ref;
}
