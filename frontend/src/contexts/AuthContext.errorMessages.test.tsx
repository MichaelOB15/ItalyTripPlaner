import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import * as amplifyAuth from 'aws-amplify/auth';

/**
 * Unit tests for authentication error messages in AuthContext.
 * 
 * **Validates Requirement 9.1:**
 * - WHEN authentication fails, THE Frontend_App SHALL display a specific error 
 *   message indicating the reason for failure
 * 
 * This test suite verifies that:
 * - Sign-in failures show specific error messages
 * - Invalid credentials display appropriate messages
 * - Network errors provide clear feedback
 * - Sign-up errors are user-friendly
 * - Password reset errors are descriptive
 * - All error messages are specific, not generic
 */

// ============================================================================
// Test Wrapper
// ============================================================================

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ============================================================================
// Mock Setup
// ============================================================================

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
// Tests - Sign-In Error Messages
// ============================================================================

describe('AuthContext - Authentication Error Messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sign-In Error Messages', () => {
    it('should display specific error for incorrect credentials', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Incorrect username or password')
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

    it('should display specific error for non-existent user', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('User does not exist')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('nonexistent@example.com', 'Password123!')
      ).rejects.toThrow('Incorrect email or password. Please try again.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Incorrect email or password. Please try again.'
        );
      });
    });

    it('should display specific error for NotAuthorizedException', async () => {
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

    it('should display specific error for unconfirmed user', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('User is not confirmed')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('unconfirmed@example.com', 'Password123!')
      ).rejects.toThrow('Please verify your email before signing in.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Please verify your email before signing in.'
        );
      });
    });

    it('should display specific error for too many failed attempts', async () => {
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

    it('should display specific error for network issues during sign-in', async () => {
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

    it('should display specific error when access token is missing after sign-in', async () => {
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
        expect(result.current.state.error).toBe(
          'Failed to retrieve access token after sign-in'
        );
      });
    });

    it('should display specific error when user information is missing after sign-in', async () => {
      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => 'mock-token',
          },
          // Missing idToken
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

    it('should display specific error for incomplete sign-in requiring additional steps', async () => {
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
        expect(result.current.state.error).toBe(
          'Sign-in incomplete. Next step required: CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
        );
      });
    });

    it('should preserve custom error messages from Cognito', async () => {
      const customError = 'Your account has been temporarily locked';
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(new Error(customError));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(customError);

      await waitFor(() => {
        expect(result.current.state.error).toBe(customError);
      });
    });
  });

  // ============================================================================
  // Tests - Sign-Up Error Messages
  // ============================================================================

  describe('Sign-Up Error Messages', () => {
    it('should display specific error when email already exists', async () => {
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
      });
    });

    it('should display specific error when user already exists (alternate message)', async () => {
      const error = new Error('User already exists');
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('existing@example.com', 'Password123!')
      ).rejects.toThrow('An account with this email already exists.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'An account with this email already exists.'
        );
      });
    });

    it('should display specific error for invalid password requirements', async () => {
      const error = new Error('Password does not meet requirements');
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('test@example.com', 'weak')
      ).rejects.toThrow(
        'Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character.'
      );

      await waitFor(() => {
        expect(result.current.state.error).toContain(
          'Password does not meet requirements'
        );
      });
    });

    it('should display specific error for invalid email format during sign-up', async () => {
      const error = new Error('InvalidParameterException: Invalid email');
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('invalid-email', 'Password123!')
      ).rejects.toThrow('Invalid email address format.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Invalid email address format.'
        );
      });
    });

    it('should preserve custom sign-up error messages', async () => {
      const customError = new Error('Sign-up is currently disabled');
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(customError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow('Sign-up is currently disabled');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Sign-up is currently disabled'
        );
      });
    });

    it('should display generic error message as fallback for unknown sign-up errors', async () => {
      const error = new Error('Unexpected server error');
      vi.mocked(amplifyAuth.signUp).mockRejectedValue(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signUp('test@example.com', 'Password123!')
      ).rejects.toThrow('Unexpected server error');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Unexpected server error'
        );
      });
    });
  });

  // ============================================================================
  // Tests - Password Reset Error Messages
  // ============================================================================

  describe('Password Reset Error Messages', () => {
    it('should display specific error when user is not found for password reset', async () => {
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
      });
    });

    it('should display specific error for UserNotFoundException during reset', async () => {
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(
        new Error('UserNotFoundException: User not found')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.resetPassword('nonexistent@example.com')
      ).rejects.toThrow('No account found with this email address.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'No account found with this email address.'
        );
      });
    });

    it('should display specific error for too many password reset attempts', async () => {
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

    it('should display specific error for invalid confirmation code', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('Invalid code')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          'wrong-code',
          'NewPassword123!'
        )
      ).rejects.toThrow('Invalid or expired verification code.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Invalid or expired verification code.'
        );
      });
    });

    it('should display specific error for expired confirmation code', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('CodeExpiredException: Code has expired')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          'expired-code',
          'NewPassword123!'
        )
      ).rejects.toThrow('Invalid or expired verification code.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Invalid or expired verification code.'
        );
      });
    });

    it('should display specific error for code mismatch during confirmation', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('CodeMismatchException: Invalid code')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          'wrong-code',
          'NewPassword123!'
        )
      ).rejects.toThrow('Invalid or expired verification code.');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Invalid or expired verification code.'
        );
      });
    });

    it('should display specific error for invalid password during reset confirmation', async () => {
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValue(
        new Error('Password does not meet requirements')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.confirmResetPassword(
          'test@example.com',
          '123456',
          'weak'
        )
      ).rejects.toThrow(
        'Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character.'
      );

      await waitFor(() => {
        expect(result.current.state.error).toContain(
          'Password does not meet requirements'
        );
      });
    });

    it('should preserve custom password reset error messages', async () => {
      const customError = new Error('Password reset is temporarily unavailable');
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(customError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.resetPassword('test@example.com')
      ).rejects.toThrow('Password reset is temporarily unavailable');

      await waitFor(() => {
        expect(result.current.state.error).toBe(
          'Password reset is temporarily unavailable'
        );
      });
    });
  });

  // ============================================================================
  // Tests - Network Error Messages
  // ============================================================================

  describe('Network Error Messages', () => {
    it('should display specific network error message during sign-in', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Network request failed')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(
        'Network error. Please check your connection and try again.'
      );

      await waitFor(() => {
        expect(result.current.state.error).toContain('Network error');
      });
    });

    it('should display network error for timeout during authentication', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Network timeout occurred')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow(
        'Network error. Please check your connection and try again.'
      );

      await waitFor(() => {
        expect(result.current.state.error).toContain('Network error');
      });
    });
  });

  // ============================================================================
  // Tests - Error Message Accessibility
  // ============================================================================

  describe('Error Message Quality', () => {
    it('should provide user-friendly messages that avoid technical jargon', async () => {
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Incorrect username or password')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        result.current.signIn('test@example.com', 'Wrong')
      ).rejects.toThrow();

      await waitFor(() => {
        const errorMessage = result.current.state.error;
        
        // Should not contain technical terms
        expect(errorMessage).not.toContain('Exception');
        expect(errorMessage).not.toContain('API');
        expect(errorMessage).not.toContain('Token');
        
        // Should be actionable and user-friendly
        expect(errorMessage).toContain('Please');
        expect(errorMessage?.length).toBeGreaterThan(10); // Not empty or too short
        expect(errorMessage?.length).toBeLessThan(200); // Not too long
      });
    });

    it('should ensure error messages are specific and not generic', async () => {
      const testCases = [
        {
          cognitoError: 'Incorrect username or password',
          expectedContains: 'Incorrect email or password',
        },
        {
          cognitoError: 'User is not confirmed',
          expectedContains: 'verify your email',
        },
        {
          cognitoError: 'Password attempts exceeded',
          expectedContains: 'Too many failed attempts',
        },
        {
          cognitoError: 'Network error',
          expectedContains: 'Network error',
        },
      ];

      for (const testCase of testCases) {
        vi.mocked(amplifyAuth.signIn).mockRejectedValue(
          new Error(testCase.cognitoError)
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        try {
          await result.current.signIn('test@example.com', 'Password123!');
        } catch (error) {
          // Expected to throw
        }

        await waitFor(() => {
          expect(result.current.state.error).toContain(testCase.expectedContains);
          // Should not be generic "Sign-in failed"
          expect(result.current.state.error).not.toBe('Sign-in failed. Please try again.');
        });

        vi.clearAllMocks();
      }
    });

    it('should ensure all error messages end with punctuation', async () => {
      const errors = [
        'Incorrect username or password',
        'User is not confirmed',
        'Password attempts exceeded',
        'Network error',
        'User does not exist',
      ];

      for (const cognitoError of errors) {
        vi.mocked(amplifyAuth.signIn).mockRejectedValue(
          new Error(cognitoError)
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        try {
          await result.current.signIn('test@example.com', 'Password123!');
        } catch (error) {
          // Expected to throw
        }

        await waitFor(() => {
          const errorMessage = result.current.state.error;
          expect(errorMessage).toBeTruthy();
          expect(errorMessage?.endsWith('.')).toBe(true);
        });

        vi.clearAllMocks();
      }
    });
  });

  // ============================================================================
  // Tests - Error State Management
  // ============================================================================

  describe('Error State Lifecycle', () => {
    it('should clear error state on successful operation after previous error', async () => {
      // First, trigger an error
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Incorrect username or password')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      try {
        await result.current.signIn('test@example.com', 'WrongPassword');
      } catch (error) {
        // Expected
      }

      await waitFor(() => {
        expect(result.current.state.error).toBeTruthy();
      });

      // Now mock a successful sign-in
      vi.mocked(amplifyAuth.signIn).mockResolvedValue({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => 'valid-token',
            payload: {
              exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
            },
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

      await result.current.signIn('test@example.com', 'CorrectPassword');

      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
        expect(result.current.state.error).toBeNull();
      });
    });

    it('should not leak previous error messages between operations', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Error during sign-in
      vi.mocked(amplifyAuth.signIn).mockRejectedValue(
        new Error('Incorrect username or password')
      );

      try {
        await result.current.signIn('test@example.com', 'Wrong');
      } catch (error) {
        // Expected
      }

      await waitFor(() => {
        const signInError = result.current.state.error;
        expect(signInError).toBeTruthy();
      });

      // Different error during password reset
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValue(
        new Error('User does not exist')
      );

      try {
        await result.current.resetPassword('other@example.com');
      } catch (error) {
        // Expected
      }

      await waitFor(() => {
        const resetError = result.current.state.error;
        expect(resetError).toBeTruthy();
        expect(resetError).toContain('No account found');
      });
    });
  });
});
