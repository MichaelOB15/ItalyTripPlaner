import { useAuth } from '../contexts/AuthContext';

/**
 * UserMenu component displays user authentication status and actions.
 * 
 * Features:
 * - Displays user email when authenticated
 * - Provides "Sign Out" button for authenticated users
 * - Shows "Guest" indicator when not authenticated
 * - Clean, accessible UI with Tailwind CSS
 * 
 * **Validates Requirements 1.8, 5.5:**
 * - 1.8: When a user is authenticated, THE Frontend_App SHALL display user account information and a sign-out option
 * - 5.5: THE Frontend_App SHALL display authentication status in the user interface showing whether the user is signed in or using guest mode
 */
export function UserMenu(): JSX.Element {
  const { state, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      // Error is already handled in AuthContext
    }
  };

  // Guest mode indicator
  if (!state.isAuthenticated) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600"
        role="status"
        aria-label="Guest mode"
      >
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span>Guest</span>
      </div>
    );
  }

  // Authenticated user display
  return (
    <div className="flex items-center gap-3">
      {/* User email display */}
      <div className="flex items-center gap-2 px-3 py-2">
        <svg
          className="w-5 h-5 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span 
          className="text-sm font-medium text-gray-900"
          aria-label={`Signed in as ${state.user?.email || 'user'}`}
        >
          {state.user?.email || 'User'}
        </span>
      </div>

      {/* Sign Out button */}
      <button
        onClick={handleSignOut}
        disabled={state.isLoading}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Sign out"
      >
        {state.isLoading ? 'Signing out...' : 'Sign Out'}
      </button>
    </div>
  );
}
