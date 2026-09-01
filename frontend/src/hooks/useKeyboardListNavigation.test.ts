/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from '@testing-library/react';
import { useKeyboardListNavigation, useKeyboardFocusManager } from './useKeyboardListNavigation';

/**
 * Test Suite: useKeyboardListNavigation Hook
 * 
 * **Validates: Requirements 14.2, 14.5**
 * 
 * Tests arrow key navigation, Home/End keys, wrapping behavior,
 * and focus management for keyboard-accessible lists.
 */
describe('useKeyboardListNavigation', () => {
  describe('Arrow key navigation', () => {
    it('should navigate down through items with ArrowDown', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(5));

      // Initial state: no item focused
      expect(result.current.focusedIndex).toBe(-1);

      // Press ArrowDown - should focus first item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(0);

      // Press ArrowDown again - should focus second item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(1);
    });

    it('should navigate up through items with ArrowUp', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(5));

      // Set focus to item 2
      act(() => {
        result.current.setFocusedIndex(2);
      });

      // Press ArrowUp - should focus item 1
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(1);

      // Press ArrowUp again - should focus item 0
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(0);
    });

    it('should wrap from last to first item when wrapping is enabled', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(3, { wrap: true }));

      // Set focus to last item
      act(() => {
        result.current.setFocusedIndex(2);
      });

      // Press ArrowDown - should wrap to first item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(0);
    });

    it('should wrap from first to last item when wrapping is enabled', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(3, { wrap: true }));

      // Set focus to first item
      act(() => {
        result.current.setFocusedIndex(0);
      });

      // Press ArrowUp - should wrap to last item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(2);
    });

    it('should not wrap when wrapping is disabled', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(3, { wrap: false }));

      // Set focus to last item
      act(() => {
        result.current.setFocusedIndex(2);
      });

      // Press ArrowDown - should stay on last item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(2);

      // Set focus to first item
      act(() => {
        result.current.setFocusedIndex(0);
      });

      // Press ArrowUp - should stay on first item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(0);
    });
  });

  describe('Home and End keys', () => {
    it('should jump to first item with Home key', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(5));

      // Set focus to middle item
      act(() => {
        result.current.setFocusedIndex(3);
      });

      // Press Home - should focus first item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Home' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(0);
    });

    it('should jump to last item with End key', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(5));

      // Set focus to first item
      act(() => {
        result.current.setFocusedIndex(0);
      });

      // Press End - should focus last item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'End' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(4);
    });
  });

  describe('Horizontal orientation', () => {
    it('should use ArrowRight for next item in horizontal orientation', () => {
      const { result } = renderHook(() =>
        useKeyboardListNavigation(3, { orientation: 'horizontal' })
      );

      // Press ArrowRight - should focus first item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(0);

      // Press ArrowRight again - should focus second item
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(1);
    });

    it('should use ArrowLeft for previous item in horizontal orientation', () => {
      const { result } = renderHook(() =>
        useKeyboardListNavigation(3, { orientation: 'horizontal' })
      );

      // Set focus to item 1
      act(() => {
        result.current.setFocusedIndex(1);
      });

      // Press ArrowLeft - should focus item 0
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(0);
    });
  });

  describe('Tab key behavior', () => {
    it('should reset focus index when Tab is pressed', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(5));

      // Set focus to item 2
      act(() => {
        result.current.setFocusedIndex(2);
      });

      // Press Tab - should reset focus
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Tab' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(-1);
    });
  });

  describe('Disabled state', () => {
    it('should not navigate when disabled', () => {
      const { result } = renderHook(() =>
        useKeyboardListNavigation(5, { enabled: false })
      );

      // Press ArrowDown - should not change focus
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(-1);
    });
  });

  describe('Empty list', () => {
    it('should handle empty list gracefully', () => {
      const { result } = renderHook(() => useKeyboardListNavigation(0));

      // Press ArrowDown - should not crash
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        result.current.handleKeyDown(event as any);
      });
      expect(result.current.focusedIndex).toBe(-1);
    });
  });
});

describe('useKeyboardFocusManager', () => {
  it('should return a ref object', () => {
    const { result } = renderHook(() => useKeyboardFocusManager(false));
    expect(result.current).toHaveProperty('current');
  });

  it('should focus element when isFocused is true', () => {
    const mockElement = {
      focus: vi.fn(),
    } as any;

    const { result, rerender } = renderHook(
      ({ isFocused }) => useKeyboardFocusManager<HTMLElement>(isFocused),
      { initialProps: { isFocused: false } }
    );

    // Manually set the ref
    result.current.current = mockElement;

    // Trigger focus by setting isFocused to true
    rerender({ isFocused: true });

    expect(mockElement.focus).toHaveBeenCalled();
  });

  it('should not focus when isFocused is false', () => {
    const mockElement = {
      focus: vi.fn(),
    } as any;

    const { result } = renderHook(() => useKeyboardFocusManager<HTMLElement>(false));

    // Manually set the ref
    result.current.current = mockElement;

    expect(mockElement.focus).not.toHaveBeenCalled();
  });
});
