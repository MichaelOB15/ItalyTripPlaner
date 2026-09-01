import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType } from './Toast';

/**
 * Toast Container and Context
 * 
 * Provides global toast notification system for the application.
 * Manages multiple toasts with auto-stacking and dismissal.
 * 
 * **Validates: Requirements 19.2, 13.1**
 * 
 * Features:
 * - Stack multiple toasts vertically
 * - Auto-dismiss with configurable duration
 * - Manual dismiss
 * - Type-safe toast creation API
 * - Global context for easy access from any component
 * 
 * @example
 * ```tsx
 * const { showToast } = useToast();
 * 
 * showToast('Place added successfully!', 'success');
 * showToast('Failed to load data', 'error');
 * ```
 */

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  /** Show a toast notification */
  showToast: (message: string, type: ToastType, duration?: number) => void;
  /** Show a success toast */
  showSuccess: (message: string, duration?: number) => void;
  /** Show an error toast */
  showError: (message: string, duration?: number) => void;
  /** Show a warning toast */
  showWarning: (message: string, duration?: number) => void;
  /** Show an info toast */
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Hook to access toast notification system
 * 
 * @throws Error if used outside ToastProvider
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
  /** Maximum number of toasts to show at once (default: 3) */
  maxToasts?: number;
}

/**
 * Toast Provider Component
 * 
 * Wrap your app with this provider to enable toast notifications.
 */
export function ToastProvider({
  children,
  maxToasts = 3,
}: ToastProviderProps): JSX.Element {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  /**
   * Generate unique ID for toast
   */
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * Show a toast notification
   */
  const showToast = useCallback(
    (message: string, type: ToastType, duration = 5000) => {
      const id = generateId();
      const newToast: ToastData = { id, message, type, duration };

      setToasts((prev) => {
        // Add new toast and limit to maxToasts
        const updated = [newToast, ...prev];
        return updated.slice(0, maxToasts);
      });
    },
    [generateId, maxToasts]
  );

  /**
   * Dismiss a toast by ID
   */
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Helper methods for common toast types
   */
  const showSuccess = useCallback(
    (message: string, duration?: number) => showToast(message, 'success', duration),
    [showToast]
  );

  const showError = useCallback(
    (message: string, duration?: number) => showToast(message, 'error', duration),
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, duration?: number) => showToast(message, 'warning', duration),
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, duration?: number) => showToast(message, 'info', duration),
    [showToast]
  );

  const value: ToastContextValue = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Container - fixed position, top-right */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        role="region"
        aria-label="Notifications"
        aria-live="assertive"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onDismiss={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
