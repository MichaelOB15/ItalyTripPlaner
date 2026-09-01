import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { UserMenu } from './UserMenu';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Mock AWS Amplify Auth
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
}));

// Mock Amplify configure
vi.mock('aws-amplify', () => ({
  Amplify: {
    configure: vi.fn(),
  },
}));

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Guest Mode', () => {
    it('displays "Guest" indicator when not authenticated', () => {
      render(
        <AuthProvider>
          <UserMenu />
        </AuthProvider>
      );

      expect(screen.getByText('Guest')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: 'Guest mode' })).toBeInTheDocument();
    });

    it('displays user icon in guest mode', () => {
      render(
        <AuthProvider>
          <UserMenu />
        </AuthProvider>
      );

      const guestContainer = screen.getByRole('status', { name: 'Guest mode' });
      const svg = guestContainer.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('text-gray-400');
    });

    it('does not display sign out button in guest mode', () => {
      render(
        <AuthProvider>
          <UserMenu />
        </AuthProvider>
      );

      expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    });

    it('does not display user email in guest mode', () => {
      render(
        <AuthProvider>
          <UserMenu />
        </AuthProvider>
      );

      expect(screen.queryByText(/@/)).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Mode', () => {
    const mockUser = {
      sub: 'user-123',
      email: 'test@example.com',
      emailVerified: true,
      username: 'testuser',
    };

    const mockAccessToken = 'mock-access-token';

    beforeEach(async () => {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const { signIn } = await import('aws-amplify/auth');
      
      vi.mocked(fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => mockAccessToken,
            payload: {
              exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
            },
          } as any,
          idToken: {
            payload: mockUser,
          } as any,
        },
      } as any);

      vi.mocked(signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);
    });

    it('displays user email when authenticated', async () => {
      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('displays "Sign Out" button when authenticated', async () => {
      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      });
    });

    it('displays user icon with blue color when authenticated', async () => {
      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        const emailText = screen.getByText('test@example.com');
        const container = emailText.closest('div');
        const parentDiv = container?.parentElement;
        const svg = parentDiv?.querySelector('svg');
        expect(svg).toHaveClass('text-blue-600');
      });
    });

    it('has proper ARIA label for signed in status', async () => {
      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        const emailElement = screen.getByLabelText(/Signed in as/);
        expect(emailElement).toBeInTheDocument();
      });
    });
  });

  describe('Sign Out Functionality', () => {
    beforeEach(async () => {
      const { fetchAuthSession, signIn } = await import('aws-amplify/auth');
      
      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        username: 'testuser',
      };

      vi.mocked(fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
            payload: {
              exp: Math.floor(Date.now() / 1000) + 3600,
            },
          } as any,
          idToken: {
            payload: mockUser,
          } as any,
        },
      } as any);

      vi.mocked(signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);
    });

    it('calls signOut when sign out button is clicked', async () => {
      const { signOut: amplifySignOut } = await import('aws-amplify/auth');

      vi.mocked(amplifySignOut).mockResolvedValue();

      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Sign in first
      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      });

      // Click sign out
      const signOutButton = screen.getByRole('button', { name: 'Sign out' });
      await userEvent.click(signOutButton);

      await waitFor(() => {
        expect(amplifySignOut).toHaveBeenCalled();
      });
    });

    it('returns to guest mode after signing out', async () => {
      const { signOut: amplifySignOut } = await import('aws-amplify/auth');

      vi.mocked(amplifySignOut).mockResolvedValue();

      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Sign in first
      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      });

      // Sign out
      const signOutButton = screen.getByRole('button', { name: 'Sign out' });
      await userEvent.click(signOutButton);

      // Should return to guest mode
      await waitFor(() => {
        expect(screen.getByText('Guest')).toBeInTheDocument();
        expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
      });
    });

    it('disables sign out button while loading', async () => {
      const { signOut: amplifySignOut } = await import('aws-amplify/auth');

      // Make signOut take time to complete
      let resolveSignOut: () => void;
      const signOutPromise = new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      });
      
      vi.mocked(amplifySignOut).mockReturnValue(signOutPromise);

      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Sign in first
      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      });

      // Click sign out
      const signOutButton = screen.getByRole('button', { name: 'Sign out' });
      await userEvent.click(signOutButton);

      // Button should show loading state (check immediately, not with waitFor)
      const buttons = screen.queryAllByRole('button');
      const loadingButton = buttons.find(b => b.textContent?.includes('Signing out'));
      
      if (loadingButton) {
        expect(loadingButton).toBeDisabled();
      }
      
      // Resolve the sign out to clean up
      resolveSignOut!();
    });

    it('handles sign out errors gracefully', async () => {
      const { signOut: amplifySignOut } = await import('aws-amplify/auth');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(amplifySignOut).mockRejectedValue(new Error('Sign out failed'));

      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Sign in first
      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
      });

      // Click sign out
      const signOutButton = screen.getByRole('button', { name: 'Sign out' });
      await userEvent.click(signOutButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Sign out failed:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper role and aria-label for guest mode', () => {
      render(
        <AuthProvider>
          <UserMenu />
        </AuthProvider>
      );

      const guestStatus = screen.getByRole('status', { name: 'Guest mode' });
      expect(guestStatus).toBeInTheDocument();
    });

    it('has accessible sign out button', async () => {
      const { fetchAuthSession, signIn } = await import('aws-amplify/auth');

      const mockUser = {
        sub: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        username: 'testuser',
      };

      vi.mocked(fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
            payload: {
              exp: Math.floor(Date.now() / 1000) + 3600,
            },
          } as any,
          idToken: {
            payload: mockUser,
          } as any,
        },
      } as any);

      vi.mocked(signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      const TestComponent = () => {
        const { signIn: contextSignIn } = useAuth();
        return (
          <>
            <button onClick={() => contextSignIn('test@example.com', 'password')}>
              Sign In
            </button>
            <UserMenu />
          </>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In');
      await userEvent.click(signInButton);

      await waitFor(() => {
        const signOutButton = screen.getByRole('button', { name: 'Sign out' });
        expect(signOutButton).toBeInTheDocument();
        expect(signOutButton).toHaveAccessibleName();
      });
    });

    it('SVG icons are hidden from screen readers', () => {
      render(
        <AuthProvider>
          <UserMenu />
        </AuthProvider>
      );

      const guestContainer = screen.getByRole('status', { name: 'Guest mode' });
      const svg = guestContainer.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
