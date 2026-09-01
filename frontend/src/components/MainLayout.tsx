import { ReactNode } from 'react';

/**
 * MainLayout component that provides full-width layout for tabbed content
 * 
 * **Validates: Requirements 9.7, 14.1, 14.5**
 * 
 * Features:
 * - Full-width layout for each tab's content
 * - Loading indicators for async data
 * - Error message display area
 * - Semantic HTML (main, section elements)
 * - ARIA landmarks for screen readers
 * - Clean, uncluttered single-view design
 */

interface MainLayoutProps {
  /** Main content for the current tab */
  children: ReactNode;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

export function MainLayout({
  children,
  isLoading = false,
  error = null,
}: MainLayoutProps): JSX.Element {
  return (
    <main id="main-content" className="min-h-screen bg-gray-50" role="main">
      {/* Error Display Area */}
      {error && (
        <section
          className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 mx-4 mt-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </section>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <section
          className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 mx-4 mt-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">Loading...</p>
            </div>
          </div>
        </section>
      )}

      {/* Full-Width Content Area */}
      <div className="max-w-7xl mx-auto p-4">
        {children}
      </div>
    </main>
  );
}
