import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { AuthProvider, useAuth, AuthState, CognitoUser } from './AuthContext';
import * as amplifyAuth from 'aws-amplify/auth';

// ============================================================================
// Test Wrapper
// ============================================================================

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the AWS Amplify auth functions
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  fetchAuthSession: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  getCurrentUser: vi.fn(),
}));

// ============================================================================
// Tests
// ============================================================================

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });
  describe('Initial State', () => {
    it('should initialize with unauthenticated state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.user).toBeNull();
      expect(result.current.state.accessToken).toBeNull();
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Hook Usage', () => {
    it('should throw error when useAuth is used outside AuthProvider', () => {
      // Suppress console.error for this test since we expect an error
      const originalError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });
  });

  describe('AuthState Interface', () => {
    it('should have correct type structure for AuthState', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      const state: AuthState = result.current.state;

      // Verify all required fields exist with correct types
      expect(typeof state.isAuthenticated).toBe('boolean');
      expect(state.user === null || typeof state.user === 'object').toBe(true);
      expect(state.accessToken === null || typeof state.accessToken === 'string').toBe(true);
      expect(typeof state.isLoading).toBe('boolean');
      expect(state.error === null || typeof state.error === 'string').toBe(true);
    });
  });

  describe('CognitoUser Interface', () => {
    it('should support CognitoUser structure', () => {
      const mockUser: CognitoUser = {
        sub: 'user-uuid-123',
        email: 'test@example.com',
        emailVerified: true,
        username: 'testuser',
      };

      // Verify all required fields exist
      expect(mockUser.sub).toBe('user-uuid-123');
      expect(mockUser.email).toBe('test@example.com');
      expect(mockUser.emailVerified).toBe(true);
      expect(mockUser.username).toBe('testuser');
    });

    it('should allow optional username field', () => {
      const mockUser: CognitoUser = {
        sub: 'user-uuid-456',
        email: 'test2@example.com',
        emailVerified: false,
      };

      expect(mockUser.username).toBeUndefined();
    });
  });

  describe('signUp Method', () => {
    /**
     * **Validates Requirements:**
     * - 1.1: Provides user registration functionality accepting email and password
     * - 1.2: Creates new user account and assigns unique User_ID
     * - 9.1: Displays specific error messages on sign-up failure
     */

    it('should successfully sign up a new user', async () => {
      const mockResult = {
        isSignUpComplete: false,
        nextStep: {
          signUpStep: 'CONFIRM_SIGN_UP',
        },
        userId: 'user-uuid-new-123',
      };

      vi.mocked(amplifyAuth.signUp).mockResolvedValue(mockResult as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const signUpResult = await result.current.signUp(
        'newuser@example.com',
        'Password123!'
      );

      // Verify result matches expected format
      expect(signUpResult.isSignUpComplete).toBe(false);
      expect(signUpResult.nextStep).toBe('CONFIRM_SIGN_UP');
      expect(signUpResult.userId).toBe('user-uuid-new-123');

      // Verify user is NOT authenticated yet (email verification required)
      expect(result.current.state.isAuthenticated).toBe(false);
      expect(result.current.state.error).toBeNull();

      // Verify Amplify signUp was called correctly
      expect(amplifyAuth.signUp).toHaveBeenCalledWith({
        username: 'newuser@example.com',
        password: 'Password123!',
        options: {
          userAttributes: {
            email: 'newuser@example.com',
          },
          autoSignIn: false,
        },
      });
    });

    it('should set loading state during sign-up', async () => {
      vi.mocked(amplifyAuth.signUp).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  isSignUpComplete: false,
                  nextStep: { signUpStep: 'CONFIRM_SIGN_UP' },
                  userId: 'user-123',
                } as any),
              100
            );
          })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Start sign-up
      const signUpPromise = result.current.signUp(
        'test@example.com',
        'Password123!'
      );

      // Check loading state immediately
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(true);
      });

      // Wait for completion
      await signUpPromise;

      // Verify loading is false after completion  
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle username exists error', async () => {
      const error = new Error('UsernameExistsException');
      error.name = 'UsernameExistsException';
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('existing@example.com', 'Password123!')
      ).rejects.toThrow('An account with this email already exists.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'An account with this email already exists.'
        );
        expect(result.current.state.isAuthenticated).toBe(false);
      });
    });

    it('should handle invalid password error', async () => {
      const error = new Error('InvalidPasswordException');
      error.name = 'InvalidPasswordException';
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('test@example.com', 'weak')
      ).rejects.toThrow(
        'Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character.'
      );

      await waitFor(() => {
        expect(result.current.state.error).toContain('Password does not meet requirements');
      });
    });

    it('should handle invalid parameter error', async () => {
      const error = new Error('InvalidParameterException');
      error.name = 'InvalidParameterException';
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('invalid-email', 'Password123!')
      ).rejects.toThrow('Invalid email address format.');

      await waitFor(() => {
        expect(result.current.state.error).toBe('Invalid email address format.');
      });
    });

    it('should handle generic sign-up errors', async () => {
      const customError = new Error('Custom sign-up error');
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(customError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow('Custom sign-up error');

      await waitFor(() => {
        expect(result.current.state.error).toBe('Custom sign-up error');
      });
    });

    it('should return sign-up result when sign-up is complete', async () => {
      const mockResult = {
        isSignUpComplete: true,
        nextStep: {
          signUpStep: 'DONE',
        },
        userId: 'user-uuid-complete',
      };

      vi.mocked(amplifyAuth.signUp).mockResolvedValue(mockResult as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      const signUpResult = await result.current.signUp(
        'autoconfirmed@example.com',
        'Password123!'
      );

      expect(signUpResult.isSignUpComplete).toBe(true);
      expect(signUpResult.nextStep).toBe('DONE');
      expect(signUpResult.userId).toBe('user-uuid-complete');
    });
  });

  describe('signIn Method', () => {
    /**
     * **Validates Requirements:**
     * - 1.4: Authenticates user and returns JWT access token
     * - 1.5: Stores JWT access token in memory
     * - 9.1: Displays specific error messages on authentication failure
     */

    it('should successfully sign in and store JWT token in state', async () => {
      // Setup mock responses
      const mockAccessToken = 'mock-jwt-access-token-123';
      const mockUser = {
        sub: 'user-uuid-123',
        email: 'test@example.com',
        emailVerified: true,
        username: 'testuser',
      };

      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => mockAccessToken,
          },
          idToken: {
            payload: {
              sub: mockUser.sub,
              email: mockUser.email,
              email_verified: mockUser.emailVerified,
              'cognito:username': mockUser.username,
            },
          },
        },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Call signIn
      await result.current.signIn('test@example.com', 'Password123!');

      // Verify authentication state updated
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
        expect(result.current.state.accessToken).toBe(mockAccessToken);
        expect(result.current.state.user).toEqual(mockUser);
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.error).toBeNull();
      });

      // Verify Amplify functions were called correctly
      expect(amplifyAuth.signIn).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'Password123!',
      });
      expect(amplifyAuth.fetchAuthSession).toHaveBeenCalled();
    });

    it('should set loading state during sign-in', async () => {
      vi.mocked(amplifyAuth.signIn).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  isSignedIn: true,
                  nextStep: { signInStep: 'DONE' },
                } as any),
              100
            );
          })
      );

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: { toString: () => 'token' },
          idToken: {
            payload: {
              sub: 'user-123',
              email: 'test@example.com',
              email_verified: true,
            },
          },
        },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Start sign-in
      const signInPromise = result.current.signIn(
        'test@example.com',
        'Password123!'
      );

      // Check loading state immediately
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(true);
      });

      // Wait for completion
      await signInPromise;

      // Verify loading is false after completion
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle incorrect email or password error', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Incorrect username or password')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'WrongPassword')
      ).rejects.toThrow('Incorrect email or password. Please try again.');

      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
        expect(result.current.state.error).toBe(
          'Incorrect email or password. Please try again.'
        );
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle user not confirmed error', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('User is not confirmed')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow('Please verify your email before signing in.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Please verify your email before signing in.'
        );
      });
    });

    it('should handle too many attempts error', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Password attempts exceeded')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow('Too many failed attempts. Please try again later.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Too many failed attempts. Please try again later.'
        );
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Network error occurred')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(
        'Network error. Please check your connection and try again.'
      );

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Network error. Please check your connection and try again.'
        );
      });
    });

    it('should handle NotAuthorizedException error', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('NotAuthorizedException: Invalid credentials')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'WrongPassword')
      ).rejects.toThrow('Incorrect email or password. Please try again.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Incorrect email or password. Please try again.'
        );
      });
    });

    it('should handle generic errors with original message', async () => {
      const customError = 'Custom authentication error message';
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(new Error(customError));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(customError);

      await waitFor(() => {
        expect(result.current.state.error).toBe(customError);
      });
    });

    it('should handle missing access token after sign-in', async () => {
      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {},
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow('Failed to retrieve access token after sign-in');

      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
        expect(result.current.state.error).toBe(
          'Failed to retrieve access token after sign-in'
        );
      });
    });

    it('should handle missing ID token after sign-in', async () => {
      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => 'mock-token',
          },
        },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow('Failed to retrieve user information after sign-in');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Failed to retrieve user information after sign-in'
        );
      });
    });

    it('should handle incomplete sign-in with next steps', async () => {
      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: false,
        nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(
        'Sign-in incomplete. Next step required: CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
      );

      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
      });
    });

    it('should store user without username if not provided', async () => {
      const mockAccessToken = 'mock-jwt-access-token';
      const mockUser = {
        sub: 'user-uuid-789',
        email: 'noname@example.com',
        emailVerified: false,
      };

      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => mockAccessToken,
          },
          idToken: {
            payload: {
              sub: mockUser.sub,
              email: mockUser.email,
              email_verified: mockUser.emailVerified,
              // No username provided
            },
          },
        },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.signIn('noname@example.com', 'Password123!');

      await waitFor(() => {
        expect(result.current.state.user).toEqual({
          sub: mockUser.sub,
          email: mockUser.email,
          emailVerified: mockUser.emailVerified,
          username: undefined,
        });
      });
    });
  });

  describe('signOut Method', () => {
    /**
     * **Validates Requirements:**
     * - 1.6: Provides sign-out functionality that invalidates the current session
     * - 5.4: Clears authentication token when user signs out
     * - 7.7: Removes JWT token from memory on sign-out
     */

    it('should successfully sign out and clear authentication state', async () => {
      // First, set up an authenticated state
      const mockAccessToken = 'mock-jwt-access-token-123';
      const mockUser = {
        sub: 'user-uuid-123',
        email: 'test@example.com',
        emailVerified: true,
        username: 'testuser',
      };

      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => mockAccessToken,
          },
          idToken: {
            payload: {
              sub: mockUser.sub,
              email: mockUser.email,
              email_verified: mockUser.emailVerified,
              'cognito:username': mockUser.username,
            },
          },
        },
      } as any);

      vi.mocked(amplifyAuth.signOut).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign in first
      await result.current.signIn('test@example.com', 'Password123!');

      // Verify user is authenticated
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
        expect(result.current.state.accessToken).toBe(mockAccessToken);
        expect(result.current.state.user).toEqual(mockUser);
      });

      // Now sign out
      await result.current.signOut();

      // Verify authentication state was cleared
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
        expect(result.current.state.user).toBeNull();
        expect(result.current.state.accessToken).toBeNull();
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.error).toBeNull();
      });

      // Verify Amplify signOut was called
      expect(amplifyAuth.signOut).toHaveBeenCalled();
    });

    it('should clear local state even if Cognito signOut fails with network error', async () => {
      // Set up authenticated state
      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => 'mock-token',
          },
          idToken: {
            payload: {
              sub: 'user-123',
              email: 'test@example.com',
              email_verified: true,
            },
          },
        },
      } as any);

      // Mock signOut to fail with network error
      vi.mocked(amplifyAuth.signOut).mockRejectedValue(
        new Error('Network error occurred')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign in first
      await result.current.signIn('test@example.com', 'Password123!');

      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      // Sign out - should not throw despite network error
      await result.current.signOut();

      // Verify local state was still cleared (security feature)
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
        expect(result.current.state.user).toBeNull();
        expect(result.current.state.accessToken).toBeNull();
      });
    });

    it('should throw error if signOut fails with non-network error', async () => {
      // Set up authenticated state
      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => 'mock-token',
          },
          idToken: {
            payload: {
              sub: 'user-123',
              email: 'test@example.com',
              email_verified: true,
            },
          },
        },
      } as any);

      // Mock signOut to fail with non-network error
      vi.mocked(amplifyAuth.signOut).mockRejectedValue(
        new Error('Invalid session')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign in first
      await result.current.signIn('test@example.com', 'Password123!');

      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      // Sign out should throw
      await expect(result.current.signOut()).rejects.toThrow('Invalid session');

      // But local state should still be cleared
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
        expect(result.current.state.user).toBeNull();
        expect(result.current.state.accessToken).toBeNull();
      });
    });

    it('should handle signOut when user is not authenticated', async () => {
      vi.mocked(amplifyAuth.signOut).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Verify initial unauthenticated state
      expect(result.current.state.isAuthenticated).toBe(false);

      // Sign out without being signed in - should not throw
      await result.current.signOut();

      // Verify state remains unauthenticated
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
        expect(result.current.state.user).toBeNull();
        expect(result.current.state.accessToken).toBeNull();
      });

      // Verify Amplify signOut was still called
      expect(amplifyAuth.signOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword Method', () => {
    /**
     * **Validates Requirements:**
     * - 1.9: Supports password reset functionality via email verification
     * - 9.1: Displays specific error messages on failure
     */

    it('should successfully initiate password reset', async () => {
      vi.mocked(amplifyAuth.resetPassword).mockResolvedValue({} as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.resetPassword('test@example.com');

      // Verify Amplify resetPassword was called correctly
      expect(amplifyAuth.resetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
      });

      // Verify state is cleared (not loading, no error)
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.error).toBeNull();
      });

      // Verify authentication state unchanged (password reset doesn't sign user in/out)
      expect(result.current.state.isAuthenticated).toBe(false);
    });

    it('should set loading state during password reset request', async () => {
      vi.mocked(amplifyAuth.resetPassword).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({} as any), 100);
          })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      const resetPromise = result.current.resetPassword('test@example.com');

      // Check loading state immediately
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(true);
      });

      await resetPromise;

      // Verify loading is false after completion
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle user not found error', async () => {
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(
        new Error('User does not exist')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.resetPassword('nonexistent@example.com')
      ).rejects.toThrow('No account found with this email address.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'No account found with this email address.'
        );
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle invalid parameter error', async () => {
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(
        new Error('Invalid parameter')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.resetPassword('invalid-email')
      ).rejects.toThrow('Invalid email format. Please check and try again.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Invalid email format. Please check and try again.'
        );
      });
    });

    it('should handle limit exceeded error', async () => {
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(
        new Error('Limit exceeded')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.resetPassword('test@example.com')
      ).rejects.toThrow('Too many attempts. Please try again later.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Too many attempts. Please try again later.'
        );
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(
        new Error('Network error occurred')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.resetPassword('test@example.com')
      ).rejects.toThrow('Network error. Please check your connection and try again.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Network error. Please check your connection and try again.'
        );
      });
    });

    it('should handle generic errors with original message', async () => {
      const customError = 'Custom password reset error';
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(
        new Error(customError)
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.resetPassword('test@example.com')
      ).rejects.toThrow(customError);

      await waitFor(() => {
        expect(result.current.state.error).toBe(customError);
      });
    });
  });

  describe('confirmResetPassword Method', () => {
    /**
     * **Validates Requirements:**
     * - 1.9: Supports password reset functionality via email verification
     * - 9.1: Displays specific error messages on failure
     */

    it('should successfully confirm password reset', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.confirmResetPassword(
        'test@example.com',
        '123456',
        'NewPassword123!'
      );

      // Verify Amplify confirmResetPassword was called correctly
      expect(amplifyAuth.confirmResetPassword).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
        newPassword: 'NewPassword123!',
      });

      // Verify state is cleared (not loading, no error)
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
        expect(result.current.state.error).toBeNull();
      });

      // Verify authentication state unchanged
      expect(result.current.state.isAuthenticated).toBe(false);
    });

    it('should set loading state during password reset confirmation', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 100);
          })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      const confirmPromise = result.current.confirmResetPassword(
        'test@example.com',
        '123456',
        'NewPassword123!'
      );

      // Check loading state immediately
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(true);
      });

      await confirmPromise;

      // Verify loading is false after completion
      await waitFor(() => {
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle code mismatch error', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('Code mismatch')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          'wrong-code',
          'NewPassword123!'
        )
      ).rejects.toThrow('Invalid verification code. Please check and try again.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Invalid verification code. Please check and try again.'
        );
        expect(result.current.state.isLoading).toBe(false);
      });
    });

    it('should handle expired code error', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('Code expired')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          '123456',
          'NewPassword123!'
        )
      ).rejects.toThrow('Verification code has expired. Please request a new one.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Verification code has expired. Please request a new one.'
        );
      });
    });

    it('should handle password requirement error', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('Password does not meet policy requirement')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          '123456',
          'weak'
        )
      ).rejects.toThrow(
        'Password does not meet requirements (min 8 characters, uppercase, lowercase, number, special character).'
      );

      await waitFor(() => {
        expect(result.current.state.error).toContain(
          'Password does not meet requirements'
        );
      });
    });

    it('should handle limit exceeded error', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('Attempts limit exceeded')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          '123456',
          'NewPassword123!'
        )
      ).rejects.toThrow('Too many attempts. Please try again later.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Too many attempts. Please try again later.'
        );
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('Network error occurred')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          '123456',
          'NewPassword123!'
        )
      ).rejects.toThrow('Network error. Please check your connection and try again.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Network error. Please check your connection and try again.'
        );
      });
    });

    it('should handle generic errors with original message', async () => {
      const customError = 'Custom password reset confirmation error';
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error(customError)
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          '123456',
          'NewPassword123!'
        )
      ).rejects.toThrow(customError);

      await waitFor(() => {
        expect(result.current.state.error).toBe(customError);
      });
    });
  });
});

/**
 * Note: Additional tests for authentication methods (signUp, signIn, signOut, etc.)
 * will be added in tasks 6.3-6.7 when those methods are implemented.
 * 
 * This test file validates:
 * - Initial state structure (Requirement 1.5)
 * - Proper context hook usage patterns
 * - Type safety for AuthState and CognitoUser interfaces
 */
