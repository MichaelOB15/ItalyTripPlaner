import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from './Header';
import { DatasetProvider } from '../contexts/DatasetContext';
import { AuthProvider } from '../contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock AuthContext to control authentication state
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Import the mocked useAuth
import { useAuth } from '../contexts/AuthContext';

const mockUseAuth = vi.mocked(useAuth);

/**
 * Helper to render Header with all required providers
 */
function renderHeader(activeTab: 'home' | 'browse' | 'itinerary' | 'progress' = 'home') {
  const mockOnTabChange = vi.fn();
  
  return {
    ...render(
      <BrowserRouter>
        <DatasetProvider>
          <AuthProvider>
            <Header activeTab={activeTab} onTabChange={mockOnTabChange} />
          </AuthProvider>
        </DatasetProvider>
      </BrowserRouter>
    ),
    mockOnTabChange,
  };
}

describe('Header Component - Authentication Status Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Guest User Display', () => {
    beforeEach(() => {
      // Mock unauthenticated state
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          isLoading: false,
          error: null,
        },
        signOut: vi.fn(),
        signIn: vi.fn(),
        signUp: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should display Sign In button when user is not authenticated', () => {
      renderHeader();

      const signInButton = screen.getByRole('button', { name: /sign in or create account/i });
      expect(signInButton).toBeInTheDocument();
      expect(signInButton).toHaveTextContent('Sign In');
    });

    it('should not display UserMenu when user is not authenticated', () => {
      renderHeader();

      // Guest indicator should not be visible in header (it's shown in UserMenu)
      const guestStatus = screen.queryByRole('status', { name: /guest mode/i });
      expect(guestStatus).not.toBeInTheDocument();
    });

    it('should open AuthModal when Sign In button is clicked', () => {
      renderHeader();

      const signInButton = screen.getByRole('button', { name: /sign in or create account/i });
      fireEvent.click(signInButton);

      // AuthModal should be rendered with sign-in form
      const authModalTitle = screen.getByRole('heading', { name: /sign in/i });
      expect(authModalTitle).toBeInTheDocument();
    });
  });

  describe('Authenticated User Display', () => {
    beforeEach(() => {
      // Mock authenticated state
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: true,
          user: {
            sub: 'test-user-123',
            email: 'test@example.com',
            emailVerified: true,
            username: 'testuser',
          },
          accessToken: 'mock-token',
          isLoading: false,
          error: null,
        },
        signOut: vi.fn(),
        signIn: vi.fn(),
        signUp: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should display UserMenu when user is authenticated', () => {
      renderHeader();

      // UserMenu displays user email
      const userEmail = screen.getByText('test@example.com');
      expect(userEmail).toBeInTheDocument();
    });

    it('should display Sign Out button when user is authenticated', () => {
      renderHeader();

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      expect(signOutButton).toBeInTheDocument();
    });

    it('should not display Sign In button when user is authenticated', () => {
      renderHeader();

      const signInButton = screen.queryByRole('button', { name: /sign in or create account/i });
      expect(signInButton).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          isLoading: false,
          error: null,
        },
        signOut: vi.fn(),
        signIn: vi.fn(),
        signUp: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should render all navigation tabs', () => {
      renderHeader();

      expect(screen.getByRole('tab', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /browse activities/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /itinerary builder/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /saved itineraries/i })).toBeInTheDocument();
    });

    it('should indicate active tab correctly', () => {
      renderHeader('browse');

      const browseTab = screen.getByRole('tab', { name: /browse activities/i });
      expect(browseTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Visual Separation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          isLoading: false,
          error: null,
        },
        signOut: vi.fn(),
        signIn: vi.fn(),
        signUp: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should have authentication status section separated from dataset switcher', () => {
      const { container } = renderHeader();

      // Authentication status section should have border-l class for visual separation
      const authSection = container.querySelector('.border-l.border-gray-300.pl-6');
      expect(authSection).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        state: {
          isAuthenticated: false,
          user: null,
          accessToken: null,
          isLoading: false,
          error: null,
        },
        signOut: vi.fn(),
        signIn: vi.fn(),
        signUp: vi.fn(),
        resetPassword: vi.fn(),
        confirmResetPassword: vi.fn(),
        refreshToken: vi.fn(),
      });
    });

    it('should have proper ARIA labels for Sign In button', () => {
      renderHeader();

      const signInButton = screen.getByRole('button', { name: /sign in or create account/i });
      expect(signInButton).toHaveAttribute('aria-label', 'Sign in or create account');
    });

    it('should have proper navigation structure', () => {
      renderHeader();

      const nav = screen.getByRole('tablist', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });
  });
});
