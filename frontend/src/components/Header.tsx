import { useState } from 'react';
import { useDataset } from '../contexts/DatasetContext';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from './UserMenu';
import { AuthModal } from './AuthModal';

export type TabType = 'home' | 'itinerary' | 'progress';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

/**
 * Header component for the Italy Trip Planner application.
 * Clean tabbed navigation with branding, dataset switcher, and authentication status.
 * 
 * Features:
 * - Application branding
 * - Clean tab navigation: Home | Browse Places | My Itinerary | My Progress
 * - Dataset switcher (default vs custom)
 * - Authentication status display (UserMenu for authenticated users, Sign In button for guests)
 * - AuthModal for sign-in/sign-up flows
 * - Responsive design with Tailwind CSS
 * - Semantic HTML structure
 * 
 * **Validates: Requirements 1.8, 5.5, 9.7, 14.1, 14.2, 14.5, 16.5, 16.6, 16.7, 16.8**
 * - 1.8: When a user is authenticated, THE Frontend_App SHALL display user account information and a sign-out option
 * - 5.5: THE Frontend_App SHALL display authentication status in the user interface showing whether the user is signed in or using guest mode
 */
export function Header({ activeTab, onTabChange }: HeaderProps): JSX.Element {
  const { state, switchToDefault, switchToCustom, hasCustomDataset } = useDataset();
  const { state: authState } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSwitchToDefault = () => {
    switchToDefault();
  };

  const handleSwitchToCustom = () => {
    switchToCustom();
  };

  const handleOpenAuthModal = () => {
    setShowAuthModal(true);
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
  };

  const showSwitchToCustom = state.source === 'default' && hasCustomDataset();
  const showSwitchToDefault = state.source === 'custom';

  const tabClasses = (tab: TabType) => {
    const baseClasses = "px-4 py-3 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";
    if (activeTab === tab) {
      return `${baseClasses} border-blue-600 text-blue-600`;
    }
    return `${baseClasses} border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300`;
  };

  return (
    <>
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row: Branding, Dataset Switcher, and Auth Status */}
          <div className="flex items-center justify-between py-4">
            {/* Branding */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Itinerary Creator
            </h1>

            {/* Right Side: Dataset Switcher and Authentication Status */}
            <div className="flex items-center gap-6">
              {/* Dataset Switcher */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Dataset:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {state.source === 'default' ? 'Default (Italy)' : 'Custom'}
                  </span>
                </div>

                {showSwitchToDefault && (
                  <button
                    onClick={handleSwitchToDefault}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    aria-label="Switch to default Italy dataset"
                  >
                    Switch to Default
                  </button>
                )}

                {showSwitchToCustom && (
                  <button
                    onClick={handleSwitchToCustom}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    aria-label="Switch to custom dataset"
                  >
                    Switch to Custom
                  </button>
                )}
              </div>

              {/* Authentication Status */}
              <div className="flex items-center border-l border-gray-300 pl-6">
                {authState.isAuthenticated ? (
                  // Show UserMenu when authenticated
                  <UserMenu />
                ) : (
                  // Show Sign In button when guest
                  <button
                    onClick={handleOpenAuthModal}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    aria-label="Sign in or create account"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-8 -mb-px" role="tablist" aria-label="Main navigation">
          <button
            onClick={() => onTabChange('home')}
            className={tabClasses('home')}
            role="tab"
            aria-selected={activeTab === 'home'}
            aria-controls="home-panel"
          >
            Home
          </button>
          <button
            onClick={() => onTabChange('itinerary')}
            className={tabClasses('itinerary')}
            role="tab"
            aria-selected={activeTab === 'itinerary'}
            aria-controls="itinerary-panel"
          >
            Itinerary Builder
          </button>
          <button
            onClick={() => onTabChange('progress')}
            className={tabClasses('progress')}
            role="tab"
            aria-selected={activeTab === 'progress'}
            aria-controls="progress-panel"
          >
            Saved Itineraries
          </button>
        </nav>
      </div>
    </header>

    {/* AuthModal for sign-in/sign-up flows */}
    <AuthModal
      isOpen={showAuthModal}
      onClose={handleCloseAuthModal}
      initialView="signin"
    />
  </>
  );
}
