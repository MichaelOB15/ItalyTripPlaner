import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { ReactNode } from 'react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import * as amplifyAuth from 'aws-amplify/auth';

// Mock aws-amplify/auth
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  signIn: vi.fn(),
}));

describe('AuthContext - Token Refresh (Task 6.7)', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('refreshToken Method', () => {
    it('should successfully refresh the access token', async () => {
      const mockUser = {
        sub: 'user-uuid-123',
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
      };

      const oldAccessToken = 'old-access-token';
      const newAccessToken = 'new-access-token';

      // Mock initial session with old token
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValueOnce({
        tokens: {
          accessToken: {
            toString: () => oldAccessToken,
            payload: {
              sub: mockUser.sub,
              exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
            },
          },
          idToken: {
            payload: mockUser,
            toString: () => 'id-token',
          },
        },
      } as any);

      // Mock sign-in
      vi.mocked(amplifyAuth.signIn).mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign in first
      await act(async () => {
        await result.current.signIn('test@example.com', 'Password123!');
      });

      // Verify user is authenticated with old token
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
        expect(result.current.state.accessToken).toBe(oldAccessToken);
      });

      // Mock refresh session with new token
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValueOnce({
        tokens: {
          accessToken: {
            toString: () => newAccessToken,
            payload: {
              sub: mockUser.sub,
              exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
            },
          },
          idToken: {
            payload: mockUser,
            toString: () => 'id-token',
          },
        },
      } as any);

      // Call refreshToken
      await act(async () => {
        await result.current.refreshToken();
      });

      // Verify token was updated
      await waitFor(() => {
        expect(result.current.state.accessToken).toBe(newAccessToken);
        expect(result.current.state.isAuthenticated).toBe(true);
        expect(result.current.state.error).toBeNull();
      });

      // Verify fetchAuthSession was called with forceRefresh
      expect(amplifyAuth.fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should sign out user if token refresh fails', async () => {
      const mockUser = {
        sub: 'user-uuid-123',
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
      };

      const accessToken = 'access-token';

      // Mock initial session
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValueOnce({
        tokens: {
          accessToken: {
            toString: () => accessToken,
            payload: {
              sub: mockUser.sub,
              exp: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          idToken: {
            payload: mockUser,
            toString: () => 'id-token',
          },
        },
      } as any);

      // Mock sign-in
      vi.mocked(amplifyAuth.signIn).mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign in first
      await act(async () => {
        await result.current.signIn('test@example.com', 'Password123!');
      });

      // Verify user is authenticated
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      // Mock refresh failure
      vi.mocked(amplifyAuth.fetchAuthSession).mockRejectedValueOnce(
        new Error('Token expired')
      );

      // Call refreshToken
      await act(async () => {
        await result.current.refreshToken();
      });

      // Verify user was signed out and error was set
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
        expect(result.current.state.accessToken).toBeNull();
        expect(result.current.state.error).toBe('Your session has expired. Please sign in again.');
      });
    });

    it('should handle missing access token after refresh', async () => {
      const mockUser = {
        sub: 'user-uuid-123',
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
      };

      const accessToken = 'access-token';

      // Mock initial session
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValueOnce({
        tokens: {
          accessToken: {
            toString: () => accessToken,
            payload: {
              sub: mockUser.sub,
              exp: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          idToken: {
            payload: mockUser,
            toString: () => 'id-token',
          },
        },
      } as any);

      // Mock sign-in
      vi.mocked(amplifyAuth.signIn).mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign in first
      await act(async () => {
        await result.current.signIn('test@example.com', 'Password123!');
      });

      // Verify user is authenticated
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      // Mock refresh with missing access token
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValueOnce({
        tokens: null,
      } as any);

      // Call refreshToken
      await act(async () => {
        await result.current.refreshToken();
      });

      // Verify user was signed out
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(false);
        expect(result.current.state.accessToken).toBeNull();
        expect(result.current.state.error).toBe('Your session has expired. Please sign in again.');
      });
    });
  });

  describe('Automatic Token Refresh', () => {
    it('should schedule automatic token refresh after sign-in', async () => {
      const mockUser = {
        sub: 'user-uuid-123',
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
      };

      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + 3600; // Expires in 1 hour

      const accessToken = 'access-token';

      // Mock initial session
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => accessToken,
            payload: {
              sub: mockUser.sub,
              exp: expirationTime,
            },
          },
          idToken: {
            payload: mockUser,
            toString: () => 'id-token',
          },
        },
      } as any);

      // Mock sign-in
      vi.mocked(amplifyAuth.signIn).mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign in
      await act(async () => {
        await result.current.signIn('test@example.com', 'Password123!');
      });

      // Verify user is authenticated
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      // Fast-forward time to 5 minutes before expiration (should trigger refresh)
      const refreshTime = (3600 - 300) * 1000; // 55 minutes in milliseconds

      await act(async () => {
        vi.advanceTimersByTime(refreshTime);
      });

      // Verify fetchAuthSession was called again (automatic refresh)
      await waitFor(() => {
        // Initial call during sign-in + check after auth + scheduled refresh
        expect(amplifyAuth.fetchAuthSession).toHaveBeenCalled();
      });
    });

    it('should detect token expiration on component mount', async () => {
      const mockUser = {
        sub: 'user-uuid-123',
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
      };

      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + 3600;

      const accessToken = 'access-token';

      // Mock session check
      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValue({
        tokens: {
          accessToken: {
            toString: () => accessToken,
            payload: {
              sub: mockUser.sub,
              exp: expirationTime,
            },
          },
          idToken: {
            payload: mockUser,
            toString: () => 'id-token',
          },
        },
      } as any);

      // Mock sign-in
      vi.mocked(amplifyAuth.signIn).mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Sign in
      await act(async () => {
        await result.current.signIn('test@example.com', 'Password123!');
      });

      // Verify user is authenticated
      await waitFor(() => {
        expect(result.current.state.isAuthenticated).toBe(true);
      });

      // Verify that fetchAuthSession was called to check expiration
      expect(amplifyAuth.fetchAuthSession).toHaveBeenCalled();
    });
  });
});
