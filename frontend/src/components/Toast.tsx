import { useEffect } from 'react';

/**
 * Toast Component
 * 
 * A notification component for displaying temporary messages to users.
 * Automatically dismisses after a specified duration.
 * 
 * **Validates: Requirements 19.2, 13.1**
 * 
 * Features:
 * - Auto-dismiss after configured duration
 * - Different types: success, error, warning, info
 * - Accessible with ARIA attributes
 * - Animated entrance/exit
 * - Manual dismiss option
 * 
 * @example
 * ```tsx
 * <Toast
 *   message="Place added to itinerary!"
 *   type="success"
 *   onDismiss={() => setShowToast(false)}
 * />
 * ```
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  /** Message to display */
  message: string;
  /** Type of toast (determines styling) */
  type: ToastType;
  /** Callback when toast is dismissed */
  onDismiss: () => void;
  /** Duration in milliseconds before auto-dismiss (default: 5000) */
  duration?: number;
}

const TOAST_STYLES: Record<ToastType, {
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: JSX.Element;
}> = {
  success: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    textColor: 'text-green-800',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    textColor: 'text-red-800',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-800',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-800',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
};

export function Toast({
  message,
  type,
  onDismiss,
  duration = 5000,
}: ToastProps): JSX.Element {
  const styles = TOAST_STYLES[type];

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`
        ${styles.bgColor} ${styles.textColor}
        border-l-4 ${styles.borderColor}
        p-4 rounded-lg shadow-lg
        flex items-start gap-3
        animate-slide-in-right
        max-w-md
      `}
    >
      {/* Icon */}
      <div className="flex-shrink-0">{styles.icon}</div>

      {/* Message */}
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className={`
          flex-shrink-0
          ${styles.textColor}
          opacity-70 hover:opacity-100
          transition-opacity
        `}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
