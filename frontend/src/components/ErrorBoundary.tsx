import React, { Component, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional fallback UI to render when an error occurs
   */
  fallback?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode;
  /**
   * Optional callback when an error is caught
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ============================================================================
// Error Boundary Component
// ============================================================================

/**
 * Global ErrorBoundary component to catch and handle React errors
 * 
 * **Validates: Requirements 9.6**
 * 
 * Features:
 * - Catches errors in the component tree below it
 * - Displays user-friendly error message
 * - Provides error details in development
 * - Offers page reload option
 * - Logs errors for debugging
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state to trigger fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);

    // Update state with error details
    this.setState({
      errorInfo,
    });

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = (): void => {
    // Reset error state and reload the page
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  handleReset = (): void => {
    // Reset error state without reloading
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback && errorInfo) {
        return fallback(error, errorInfo);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-12 w-12 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600 mb-4">
                  We're sorry, but an unexpected error occurred. This has been logged
                  and we'll look into it.
                </p>

                {/* Error message */}
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <h2 className="text-sm font-semibold text-red-800 mb-1">
                    Error Details:
                  </h2>
                  <p className="text-sm text-red-700 font-mono break-words">
                    {error.message || 'Unknown error'}
                  </p>
                </div>

                {/* Development-only details */}
                {import.meta.env.DEV && errorInfo && (
                  <details className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                    <summary className="text-sm font-semibold text-gray-800 cursor-pointer">
                      Component Stack (Development Only)
                    </summary>
                    <pre className="mt-2 text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                {/* Action buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={this.handleReload}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Reload Page
                  </button>
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Try Again
                  </button>
                </div>

                {/* Help text */}
                <p className="text-sm text-gray-500 mt-4">
                  If this problem persists, try clearing your browser cache or contact
                  support.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
