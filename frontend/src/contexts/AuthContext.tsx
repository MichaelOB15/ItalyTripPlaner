import {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { 
  fetchAuthSession, 
  getCurrentUser,
  signOut as amplifySignOut,
  signUp as amplifySignUp, 
  SignUpOutput,
  resetPassword as amplifyResetPassword, 
  confirmResetPassword as amplifyConfirmResetPassword,
  signIn as amplifySignIn,
} from 'aws-amplify/auth';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents the current authentication state of the application.
 * Tracks user authentication status, tokens, loading state, and errors.
 * 
 * **Validates Requirements 1.5, 1.10:**
 * - Stores JWT access token securely in memory
 * - Tracks authentication status for session management
 */
export interface AuthState {
  /** Whether the user is currently authenticated with a valid session */
  isAuthenticated: boolean;
  
  /** Current authenticated user object from Cognito, null if not authenticated */
  user: CognitoUser | null;
  
  /** JWT access token for API requests, null if not authenticated */
  accessToken: string | null;
  
  /** JWT ID token for Cognito-authorized API requests, null if not authenticated */
  idToken: string | null;
  
  /** Loading state for async authentication operations */
  isLoading: boolean;
  
  /** Error message from authentication operations, null if no error */
  error: string | null;
}

/**
 * Represents a Cognito user with essential profile information.
 * Contains the user's unique ID (sub), email, and verification status.
 */
export interface CognitoUser {
  /** Unique user ID from Cognito (sub claim) - used as User_ID throughout system */
  sub: string;
  
  /** User's email address */
  email: string;
  
  /** Whether the user's email has been verified */
  emailVerified: boolean;
  
  /** Cognito username (may differ from email) */
  username?: string;
}

/**
 * Actions for authentication state management.
 * Handles all authentication transitions including sign-in, sign-out, token refresh, and errors.
 */
export type AuthAction =
  | { type: 'AUTH_START_LOADING' }
  | { type: 'AUTH_SUCCESS'; payload: { user: CognitoUser; accessToken: string; idToken: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_SIGN_OUT' }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_UPDATE_TOKEN'; payload: { accessToken: string; idToken: string } };

/**
 * Result of a sign-up operation.
 * Indicates whether email verification is required and provides the user ID.
 */
export interface SignUpResult {
  /** Whether the user needs to complete email verification */
  isSignUpComplete: boolean;
  /** Next step in the sign-up process (e.g., CONFIRM_SIGN_UP) */
  nextStep: string;
  /** User ID (sub) if available */
  userId?: string;
}

/**
 * Context value interface providing authentication state and operations.
 * Exposes all authentication methods and current state to consuming components.
 */
export interface AuthContextValue {
  state: AuthState;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  
  /**
   * Manually refresh the authentication token.
   * Attempts to use the refresh token to obtain a new access token.
   * If refresh fails, prompts user to sign in again.
   * 
   * **Validates Requirement 1.10:**
   * - When a Session token expires, THE Frontend_App SHALL prompt the user to sign in again
   */
  refreshToken: () => Promise<void>;
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial authentication state when application loads.
 * User starts as unauthenticated with no tokens or errors.
 */
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  idToken: null,
  isLoading: false,
  error: null,
};

// ============================================================================
// Reducer
// ============================================================================

/**
 * Reducer function for authentication state management.
 * Handles all authentication state transitions in a predictable, immutable way.
 * 
 * **Validates Requirements:**
 * - 1.4: Stores JWT access token on successful authentication
 * - 1.5: Manages token storage in memory
 * - 1.6: Clears authentication state on sign-out
 * - 1.10: Handles token expiration and refresh
 * - 9.1: Manages authentication error states
 * 
 * @param state - Current authentication state
 * @param action - Action to apply
 * @returns New authentication state after applying action
 */
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START_LOADING':
      // Start an authentication operation (sign-in, sign-up, etc.)
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'AUTH_SUCCESS':
      // Successfully authenticated - store user and tokens
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        idToken: action.payload.idToken,
        isLoading: false,
        error: null,
      };

    case 'AUTH_FAILURE':
      // Authentication operation failed - store error message
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        idToken: null,
        isLoading: false,
        error: action.payload,
      };

    case 'AUTH_SIGN_OUT':
      // User signed out or session invalidated - clear all auth state
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        idToken: null,
        isLoading: false,
        error: null,
      };

    case 'AUTH_CLEAR_ERROR':
      // Clear error message (e.g., when user closes error notification)
      return {
        ...state,
        error: null,
      };

    case 'AUTH_UPDATE_TOKEN':
      // Update tokens after refresh (maintains existing user state)
      return {
        ...state,
        accessToken: action.payload.accessToken,
        idToken: action.payload.idToken,
        error: null,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Props for AuthProvider component.
 */
export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication context provider component.
 * Manages user authentication state, JWT tokens, and session lifecycle.
 * 
 * Features:
 * - User sign-up and sign-in with email/password
 * - JWT token management (stored in memory for security)
 * - Automatic token refresh on expiration
 * - Password reset functionality
 * - Sign-out with state cleanup
 * - Error handling for authentication operations
 * 
 * **Validates Requirements:**
 * - 1.1-1.10: User authentication with AWS Cognito
 * - 5.1-5.8: Frontend integration with authentication
 * - 7.3: JWT token transmission via Authorization header
 * - 9.1: Specific authentication error messages
 * 
 * @param props - Component props
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const refreshTimerRef = useRef<number | null>(null);

  /**
   * Check for existing session on mount.
   * Attempts to recover user session from Amplify/Cognito storage.
   */
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // Try to get current user and session
        const currentUser = await getCurrentUser();
        const session = await fetchAuthSession();

        if (currentUser && session.tokens?.accessToken) {
          // Valid session found - restore auth state
          const accessToken = session.tokens.accessToken.toString();
          const idToken = session.tokens.idToken;

          if (idToken) {
            const claims = idToken.payload;
            const user: CognitoUser = {
              sub: claims.sub as string,
              email: claims.email as string,
              emailVerified: claims.email_verified as boolean,
              username: claims['cognito:username'] as string | undefined,
            };

            dispatch({
              type: 'AUTH_SUCCESS',
              payload: { 
                user, 
                accessToken,
                idToken: idToken.toString(),
              },
            });

            // Schedule token refresh
            if (session.tokens.accessToken.payload?.exp) {
              scheduleTokenRefresh(session.tokens.accessToken.payload.exp);
            }
          }
        }
      } catch (error) {
        // No existing session or session invalid - user needs to sign in
        console.log('[AuthContext] No existing session found');
      }
    };

    checkExistingSession();
  }, []); // Run once on mount

  /**
   * Manually refresh the authentication token.
   * Attempts to use the refresh token to obtain a new access token.
   * If refresh fails, clears auth state and prompts user to sign in again.
   * 
   * **Validates Requirement 1.10:**
   * - When a Session token expires, THE Frontend_App SHALL prompt the user to sign in again
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      // Attempt to refresh the session
      const session = await fetchAuthSession({ forceRefresh: true });

      // Verify we have valid tokens
      if (!session.tokens?.accessToken || !session.tokens?.idToken) {
        throw new Error('Failed to retrieve tokens after refresh');
      }

      // Extract new JWT tokens
      const accessToken = session.tokens.accessToken.toString();
      const idToken = session.tokens.idToken.toString();

      // Update tokens, keeping user info
      dispatch({
        type: 'AUTH_UPDATE_TOKEN',
        payload: { accessToken, idToken },
      });

      // Schedule next refresh if expiration time is available
      const expirationTime = session.tokens.accessToken.payload.exp;
      if (expirationTime) {
        scheduleTokenRefresh(expirationTime);
      }
    } catch (error) {
      // Refresh failed - user needs to sign in again
      console.error('Token refresh failed:', error);
      
      // Clear authentication state
      dispatch({ type: 'AUTH_SIGN_OUT' });
      
      // Optionally set error to prompt user
      dispatch({
        type: 'AUTH_FAILURE',
        payload: 'Your session has expired. Please sign in again.',
      });
    }
  }, []);

  /**
   * Schedule automatic token refresh before expiration.
   * Refreshes the token 5 minutes before it expires.
   * 
   * @param expirationTime - Token expiration time in seconds (Unix timestamp)
   */
  const scheduleTokenRefresh = useCallback((expirationTime: number) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }

    // Calculate time until token expires (in milliseconds)
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const expiresIn = expirationTime - now; // Seconds until expiration
    
    // Refresh 5 minutes (300 seconds) before expiration, or immediately if already expired
    const refreshIn = Math.max(0, (expiresIn - 300) * 1000); // Convert to milliseconds

    // Schedule refresh
    refreshTimerRef.current = window.setTimeout(() => {
      refreshToken();
    }, refreshIn);
  }, [refreshToken]);

  /**
   * Detect token expiration and automatically refresh.
   * Runs on component mount and when authentication state changes.
   */
  useEffect(() => {
    const checkAndScheduleRefresh = async () => {
      if (state.isAuthenticated && state.accessToken) {
        try {
          // Get current session to check token expiration
          const session = await fetchAuthSession();
          
          if (session.tokens?.accessToken) {
            const expirationTime = session.tokens.accessToken.payload.exp;
            if (expirationTime) {
              scheduleTokenRefresh(expirationTime);
            }
          }
        } catch (error) {
          console.error('Failed to check token expiration:', error);
          // Token might already be expired, attempt refresh
          refreshToken();
        }
      }
    };

    checkAndScheduleRefresh();

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [state.isAuthenticated, state.accessToken, scheduleTokenRefresh, refreshToken]);

  /**
   * Sign up a new user with email and password.
   * Creates a new Cognito user account and automatically signs them in.
   * 
   * **Validates Requirements:**
   * - 1.1: Provides user registration functionality
   * - 1.2: Creates new user account with unique User_ID
   * 
   * @param email - User's email address
   * @param password - User's password (must meet complexity requirements)
   * @returns SignUpResult with verification status
   * @throws Error with specific message on registration failure
   */
  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    dispatch({ type: 'AUTH_START_LOADING' });

    try {
      const { isSignUpComplete, userId, nextStep }: SignUpOutput = await amplifySignUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
          autoSignIn: true, // Auto-sign-in after registration (no verification required)
        },
      });

      dispatch({ type: 'AUTH_CLEAR_ERROR' });

      // If sign-up is complete (no verification required), automatically sign in
      if (isSignUpComplete) {
        try {
          await signIn(email, password);
        } catch (signInError) {
          console.error('[AuthContext] Auto sign-in after sign-up failed:', signInError);
          // Don't throw - user can manually sign in
        }
      }

      return {
        isSignUpComplete,
        nextStep: nextStep?.signUpStep || 'DONE',
        userId,
      };
    } catch (error) {
      let errorMessage = 'Sign-up failed. Please try again.';

      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('user already exists') || message.includes('usernameexistsexception')) {
          errorMessage = 'An account with this email already exists.';
        } else if (message.includes('password')) {
          errorMessage = 'Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character.';
        } else if (message.includes('invalid email') || message.includes('invalidparameterexception')) {
          errorMessage = 'Invalid email address format.';
        } else {
          errorMessage = error.message;
        }
      }

      dispatch({
        type: 'AUTH_FAILURE',
        payload: errorMessage,
      });

      throw new Error(errorMessage);
    }
  };

  /**
   * Sign in a user with email and password.
   * Calls AWS Cognito authentication, stores JWT token in memory, and updates state.
   * 
   * **Validates Requirements:**
   * - 1.4: Authenticates user and returns JWT access token
   * - 1.5: Stores JWT access token in memory
   * - 9.1: Displays specific error messages on authentication failure
   * 
   * @param email - User's email address
   * @param password - User's password
   * @throws Error with specific message on authentication failure
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START_LOADING' });

    try {
      // Call Cognito Auth.signIn with credentials
      const { isSignedIn, nextStep } = await amplifySignIn({
        username: email,
        password,
      });

      // Check if sign-in was successful
      if (!isSignedIn) {
        throw new Error(
          `Sign-in incomplete. Next step required: ${nextStep?.signInStep || 'unknown'}`
        );
      }

      // Fetch the authentication session to get tokens and user info
      const session = await fetchAuthSession();
      
      // Verify we have valid tokens
      if (!session.tokens?.accessToken) {
        throw new Error('Failed to retrieve access token after sign-in');
      }

      // Extract JWT access token
      const accessToken = session.tokens.accessToken.toString();

      // Extract user information from ID token claims
      const idToken = session.tokens.idToken;
      if (!idToken) {
        throw new Error('Failed to retrieve user information after sign-in');
      }

      const claims = idToken.payload;
      const user: CognitoUser = {
        sub: claims.sub as string,
        email: claims.email as string,
        emailVerified: claims.email_verified as boolean,
        username: claims['cognito:username'] as string | undefined,
      };

      // Update authentication state on success
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { 
          user, 
          accessToken,
          idToken: idToken.toString(),
        },
      });

      // Schedule automatic token refresh if expiration time is available
      if (session.tokens.accessToken.payload?.exp) {
        scheduleTokenRefresh(session.tokens.accessToken.payload.exp);
      }
    } catch (error) {
      // Handle authentication errors with specific messages
      let errorMessage = 'Sign-in failed. Please try again.';

      if (error instanceof Error) {
        // Map common Cognito errors to user-friendly messages
        const message = error.message.toLowerCase();
        
        if (message.includes('already a signed in user') || message.includes('there is already a signed in user')) {
          // User has a stale session - sign them out first and retry
          console.log('[AuthContext] Detected stale session, signing out and retrying...');
          try {
            await amplifySignOut();
            // Retry sign-in after clearing stale session
            return await signIn(email, password);
          } catch (signOutError) {
            errorMessage = 'Please refresh the page and try signing in again.';
          }
        } else if (message.includes('incorrect username or password') || 
            message.includes('user does not exist') ||
            message.includes('notauthorizedexception')) {
          errorMessage = 'Incorrect email or password. Please try again.';
        } else if (message.includes('user is not confirmed')) {
          errorMessage = 'Please verify your email before signing in.';
        } else if (message.includes('password attempts exceeded')) {
          errorMessage = 'Too many failed attempts. Please try again later.';
        } else if (message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          // Use the original error message if it's user-friendly
          errorMessage = error.message;
        }
      }

      dispatch({
        type: 'AUTH_FAILURE',
        payload: errorMessage,
      });

      throw new Error(errorMessage);
    }
  };

  /**
   * Sign out the current user.
   * Invalidates the session and clears all authentication state.
   * 
   * **Validates Requirement 1.6:**
   * - Provides sign-out functionality that invalidates the current Session
   * 
   * @throws Error if sign-out fails
   */
  const signOut = async (): Promise<void> => {
    try {
      // Clear refresh timer
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      // Call Cognito signOut
      await amplifySignOut();

      // Clear authentication state
      dispatch({ type: 'AUTH_SIGN_OUT' });
    } catch (error) {
      console.error('Sign-out failed:', error);
      
      // Even if Cognito sign-out fails, clear local state
      dispatch({ type: 'AUTH_SIGN_OUT' });
      
      throw new Error('Sign-out failed. Please try again.');
    }
  };

  /**
   * Initiate password reset for a user.
   * Sends a verification code to the user's email.
   * 
   * **Validates Requirement 1.9:**
   * - Supports password reset functionality via email verification
   * 
   * @param email - User's email address
   * @throws Error if password reset initiation fails
   */
  const resetPassword = async (email: string): Promise<void> => {
    dispatch({ type: 'AUTH_START_LOADING' });

    try {
      await amplifyResetPassword({ username: email });
      
      dispatch({ type: 'AUTH_CLEAR_ERROR' });
    } catch (error) {
      let errorMessage = 'Password reset failed. Please try again.';

      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('user does not exist') || message.includes('usernotfoundexception')) {
          errorMessage = 'No account found with this email address.';
        } else if (message.includes('limit exceeded')) {
          errorMessage = 'Too many attempts. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }

      dispatch({
        type: 'AUTH_FAILURE',
        payload: errorMessage,
      });

      throw new Error(errorMessage);
    }
  };

  /**
   * Confirm password reset with verification code.
   * Sets a new password for the user after verifying the code.
   * 
   * **Validates Requirement 1.9:**
   * - Supports password reset functionality via email verification
   * 
   * @param email - User's email address
   * @param code - Verification code from email
   * @param newPassword - New password (must meet complexity requirements)
   * @throws Error if password reset confirmation fails
   */
  const confirmResetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<void> => {
    dispatch({ type: 'AUTH_START_LOADING' });

    try {
      await amplifyConfirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      });

      dispatch({ type: 'AUTH_CLEAR_ERROR' });
    } catch (error) {
      let errorMessage = 'Password reset confirmation failed. Please try again.';

      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('invalid code') || message.includes('codeexpiredexception') || message.includes('codemismatchexception')) {
          errorMessage = 'Invalid or expired verification code.';
        } else if (message.includes('password')) {
          errorMessage = 'Password does not meet requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character.';
        } else {
          errorMessage = error.message;
        }
      }

      dispatch({
        type: 'AUTH_FAILURE',
        payload: errorMessage,
      });

      throw new Error(errorMessage);
    }
  };
  
  /**
   * Confirm sign-up with verification code (stub implementation).
   * TODO: Implement full sign-up confirmation flow with Cognito.
   */
  const confirmSignUp = async (email: string, code: string): Promise<void> => {
    console.log('[AuthContext] confirmSignUp called (stub)', { email, code });
    // Stub implementation - this feature is not fully implemented yet
    throw new Error('Sign-up confirmation is not yet implemented');
  };
  
  // Context value with all implemented authentication methods
  const contextValue: AuthContextValue = {
    state,
    signUp,
    confirmSignUp,
    signIn,
    signOut,
    resetPassword,
    confirmResetPassword,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook to access the Authentication context.
 * Provides access to authentication state and methods from any component.
 * 
 * @throws Error if used outside of AuthProvider
 * @returns Authentication context value
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
