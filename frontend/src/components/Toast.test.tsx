import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { Toast, ToastType } from './Toast';

/**
 * Toast Component Tests
 * 
 * **Validates: Requirements 9.6, 14.7**
 * 
 * Tests cover:
 * - Rendering different toast types (success, error, warning, info)
 * - Auto-dismiss after configurable duration
 * - Manual dismissal via close button
 * - Accessibility attributes
 * - Proper styling for each type
 */

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders a success toast with correct message', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Operation successful!" type="success" onDismiss={onDismiss} />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Operation successful!')).toBeInTheDocument();
    });

    it('renders an error toast with correct styling', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Something went wrong" type="error" onDismiss={onDismiss} />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-red-50');
      expect(alert).toHaveClass('text-red-800');
      expect(alert).toHaveClass('border-red-500');
    });

    it('renders a warning toast with correct icon', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Warning message" type="warning" onDismiss={onDismiss} />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-yellow-50');
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('renders an info toast', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Information" type="info" onDismiss={onDismiss} />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('bg-blue-50');
      expect(screen.getByText('Information')).toBeInTheDocument();
    });
  });

  describe('Accessibility (Requirement 14.7)', () => {
    it('has proper ARIA attributes', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Test message" type="info" onDismiss={onDismiss} />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('has accessible dismiss button with aria-label', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Test message" type="info" onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
      expect(dismissButton).toBeInTheDocument();
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss notification');
    });
  });

  describe('Manual Dismissal', () => {
    it('calls onDismiss when close button is clicked', async () => {
      // Use real timers for this test to avoid interaction issues with userEvent
      vi.useRealTimers();
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(
        <Toast message="Test message" type="info" onDismiss={onDismiss} />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
      await user.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
      
      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });

  describe('Auto-Dismissal', () => {
    it('auto-dismisses after default duration (5000ms)', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Test message" type="success" onDismiss={onDismiss} />
      );

      // Should not be called immediately
      expect(onDismiss).not.toHaveBeenCalled();

      // Fast-forward time by 5000ms
      vi.advanceTimersByTime(5000);

      // Should be called after 5 seconds
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('auto-dismisses after custom duration', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Test message" type="success" onDismiss={onDismiss} duration={3000} />
      );

      // Should not be called before duration
      vi.advanceTimersByTime(2999);
      expect(onDismiss).not.toHaveBeenCalled();

      // Should be called after custom duration
      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('cleans up timer on unmount', () => {
      const onDismiss = vi.fn();
      const { unmount } = render(
        <Toast message="Test message" type="success" onDismiss={onDismiss} />
      );

      // Unmount before timeout
      unmount();
      vi.advanceTimersByTime(5000);

      // Should not be called after unmount
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Toast Types', () => {
    const types: ToastType[] = ['success', 'error', 'warning', 'info'];

    types.forEach((type) => {
      it(`renders ${type} toast with appropriate styling`, () => {
        const onDismiss = vi.fn();
        render(
          <Toast message={`${type} message`} type={type} onDismiss={onDismiss} />
        );

        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(screen.getByText(`${type} message`)).toBeInTheDocument();

        // Each type should have distinct background color
        const expectedBgClasses = {
          success: 'bg-green-50',
          error: 'bg-red-50',
          warning: 'bg-yellow-50',
          info: 'bg-blue-50',
        };
        expect(alert).toHaveClass(expectedBgClasses[type]);
      });
    });
  });

  describe('Styling', () => {
    it('includes animation class', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Test message" type="success" onDismiss={onDismiss} />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('animate-slide-in-right');
    });

    it('has max width constraint', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Test message" type="success" onDismiss={onDismiss} />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('max-w-md');
    });

    it('has proper layout classes', () => {
      const onDismiss = vi.fn();
      render(
        <Toast message="Test message" type="success" onDismiss={onDismiss} />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('flex');
      expect(alert).toHaveClass('items-start');
      expect(alert).toHaveClass('gap-3');
      expect(alert).toHaveClass('p-4');
      expect(alert).toHaveClass('rounded-lg');
      expect(alert).toHaveClass('shadow-lg');
    });
  });
});
