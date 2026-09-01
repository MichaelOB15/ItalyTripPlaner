import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

export type AuthView = 'signin' | 'signup' | 'reset';

export interface AuthModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Initial view to show (defaults to 'signin')
   */
  initialView?: AuthView;

  /**
   * Callback when authentication succeeds
   */
  onAuthSuccess?: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * AuthModal Component
 *
 * A modal container for authentication flows with tab switching between
 * sign in, sign up, and password reset.
 *
 * Features:
 * - Tab-based navigation between authentication views
 * - SignInForm for user login
 * - SignUpForm for new account creation
 * - PasswordResetForm for password recovery
 * - Close button with ARIA labels
 * - Modal overlay with click-outside to close
 * - Keyboard support (Escape to close)
 * - Focus trap for accessibility
 * - Scroll lock when open
 * - Error and success message handling
 *
 * Requirements Coverage:
 * - 1.7: Displays sign-in interface with options to sign in or register
 *
 * @example
 * ```tsx
 * const [showAuth, setShowAuth] = useState(false);
 *
 * <AuthModal
 *   isOpen={showAuth}
 *   onClose={() => setShowAuth(false)}
 *   initialView="signin"
 *   onAuthSuccess={() => handleAuthSuccess()}
 * />
 * ```
 */
export function AuthModal({
  isOpen,
  onClose,
  initialView = 'signin',
  onAuthSuccess,
}: AuthModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const initializedRef = useRef<boolean>(false);
  const { state, signIn, signUp, resetPassword, confirmResetPassword, confirmSignUp } = useAuth();

  // View state
  const [currentView, setCurrentView] = useState<AuthView>(initialView);

  // Form state for SignIn
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInNeedsVerification, setSignInNeedsVerification] = useState(false);
  const [signInVerificationCode, setSignInVerificationCode] = useState('');

  // Form state for SignUp
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Form state for Password Reset
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  // Local error and success states
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset form when modal opens (but not when it's already open)
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      // Only initialize once when modal first opens
      setCurrentView(initialView);
      setSignInEmail('');
      setSignInPassword('');
      setSignInNeedsVerification(false);
      setSignInVerificationCode('');
      setSignUpEmail('');
      setSignUpPassword('');
      setConfirmPassword('');
      setResetEmail('');
      setResetCode('');
      setNewPassword('');
      setResetStep('request');
      setLocalError(null);
      setSuccessMessage(null);
      initializedRef.current = true;
    } else if (!isOpen) {
      // Reset initialization flag when modal closes
      initializedRef.current = false;
    }
  }, [isOpen, initialView]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap: focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle successful authentication
  useEffect(() => {
    if (state.isAuthenticated) {
      onAuthSuccess?.();
      onClose();
    }
  }, [state.isAuthenticated, onAuthSuccess, onClose]);

  // Handle overlay click (click outside modal content)
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Switch view
  const switchView = (view: AuthView) => {
    setCurrentView(view);
    setLocalError(null);
    setSuccessMessage(null);
  };

  // Handle sign in submission
  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    // If we're at the verification step
    if (signInNeedsVerification) {
      if (!signInVerificationCode.trim()) {
        setLocalError('Please enter the verification code.');
        return;
      }

      try {
        await confirmSignUp(signInEmail, signInVerificationCode);
        setSuccessMessage('Email verified! Please sign in.');
        // Reset to sign-in form
        setSignInNeedsVerification(false);
        setSignInVerificationCode('');
        setSignInPassword('');
      } catch (error) {
        if (error instanceof Error) {
          setLocalError(error.message);
        } else {
          setLocalError('Email verification failed. Please try again.');
        }
      }
      return;
    }

    // Normal sign-in flow
    if (!signInEmail || !signInPassword) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      await signIn(signInEmail, signInPassword);
      // Success handling happens in useEffect watching state.isAuthenticated
    } catch (error) {
      if (error instanceof Error) {
        // Check if the error is about unverified email
        if (error.message.toLowerCase().includes('verify your email') ||
            error.message.toLowerCase().includes('not confirmed')) {
          setLocalError('Your email is not verified. Please check your email and click the verification link. If you need a new link, create your account again.');
        } else {
          setLocalError(error.message);
        }
      } else {
        setLocalError('Sign-in failed. Please try again.');
      }
    }
  };

  // Handle sign up submission
  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!signUpEmail || !signUpPassword || !confirmPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (signUpPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    // Basic password validation
    if (signUpPassword.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }

    try {
      const result = await signUp(signUpEmail, signUpPassword);
      
      if (!result.isSignUpComplete) {
        setSuccessMessage(
          'Account created! Please check your email and click the verification link to activate your account. Then return here to sign in.'
        );
        // Switch to sign-in view after a brief delay
        setTimeout(() => {
          switchView('signin');
        }, 5000);
      }
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError('Sign-up failed. Please try again.');
      }
    }
  };

  // Handle password reset request
  const handleResetRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!resetEmail) {
      setLocalError('Please enter your email address.');
      return;
    }

    try {
      await resetPassword(resetEmail);
      setSuccessMessage('Password reset code sent! Check your email.');
      setResetStep('confirm');
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError('Password reset request failed. Please try again.');
      }
    }
  };

  // Handle password reset confirmation
  const handleResetConfirm = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!resetEmail || !resetCode || !newPassword) {
      setLocalError('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }

    try {
      await confirmResetPassword(resetEmail, resetCode, newPassword);
      setSuccessMessage('Password reset successful! You can now sign in.');
      // Switch to sign-in view after a brief delay
      setTimeout(() => {
        switchView('signin');
      }, 2000);
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError('Password reset confirmation failed. Please try again.');
      }
    }
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleOverlayClick}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal Content */}
        <div
          ref={modalRef}
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white px-6 py-6 flex items-start justify-between rounded-t-lg">
            <div className="flex-1 pr-4">
              <h2 id="auth-modal-title" className="text-2xl font-bold text-gray-900">
                {currentView === 'signin' && 'Sign In'}
                {currentView === 'signup' && 'Create Account'}
                {currentView === 'reset' && 'Reset Password'}
              </h2>
            </div>
            {isOpen && onClose && onClose.toString() !== '() => {}' && (
              <button
                ref={closeButtonRef}
                onClick={onClose}
                aria-label="Close authentication modal"
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Error Message */}
            {(localError || state.error) && (
              <div
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="ml-3 text-sm text-red-800">{localError || state.error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div
                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="ml-3 text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Sign In Form */}
            {currentView === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {signInNeedsVerification ? (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      We've sent a verification code to <strong>{signInEmail}</strong>. 
                      Please enter it below to verify your email.
                    </p>
                    
                    <div>
                      <label
                        htmlFor="signin-verification-code"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Verification Code
                      </label>
                      <input
                        id="signin-verification-code"
                        type="text"
                        value={signInVerificationCode}
                        onChange={(e) => setSignInVerificationCode(e.target.value)}
                        disabled={state.isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="123456"
                        required
                        autoComplete="one-time-code"
                        maxLength={6}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={state.isLoading}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Verifying...
                        </>
                      ) : (
                        'Verify Email'
                      )}
                    </button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSignInNeedsVerification(false);
                          setSignInVerificationCode('');
                          setLocalError(null);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        ← Back to sign in
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="signin-email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email
                      </label>
                      <input
                        id="signin-email"
                        type="email"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        disabled={state.isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="your@email.com"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="signin-password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Password
                      </label>
                      <input
                        id="signin-password"
                        type="password"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        disabled={state.isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => switchView('reset')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={state.isLoading}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>

                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">or</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => switchView('signup')}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Create New Account
                    </button>
                  </>
                )}
              </form>
            )}

            {/* Sign Up Form */}
            {currentView === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                    aria-describedby="password-requirements"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div
                  id="password-requirements"
                  className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md"
                >
                  <p className="font-medium mb-1">Password requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>At least 8 characters</li>
                    <li>One uppercase letter</li>
                    <li>One lowercase letter</li>
                    <li>One number</li>
                    <li>One special character</li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => switchView('signin')}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Already have an account?{' '}
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Sign in
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* Password Reset Form */}
            {currentView === 'reset' && (
              <>
                {resetStep === 'request' ? (
                  <form onSubmit={handleResetRequest} className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Enter your email address and we'll send you a code to reset your password.
                    </p>

                    <div>
                      <label
                        htmlFor="reset-email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email
                      </label>
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        disabled={state.isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="your@email.com"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={state.isLoading}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Sending code...
                        </>
                      ) : (
                        'Send Reset Code'
                      )}
                    </button>

                    <p className="text-center text-sm text-gray-600">
                      Remember your password?{' '}
                      <button
                        type="button"
                        onClick={() => switchView('signin')}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Sign in
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleResetConfirm} className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Enter the verification code sent to your email and your new password.
                    </p>

                    <div>
                      <label
                        htmlFor="reset-code"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Verification Code
                      </label>
                      <input
                        id="reset-code"
                        type="text"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        disabled={state.isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="123456"
                        required
                        autoComplete="one-time-code"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="reset-new-password"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        New Password
                      </label>
                      <input
                        id="reset-new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={state.isLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                        aria-describedby="new-password-requirements"
                      />
                    </div>

                    <div
                      id="new-password-requirements"
                      className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md"
                    >
                      <p className="font-medium mb-1">Password requirements:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>At least 8 characters</li>
                        <li>One uppercase letter</li>
                        <li>One lowercase letter</li>
                        <li>One number</li>
                        <li>One special character</li>
                      </ul>
                    </div>

                    <button
                      type="submit"
                      disabled={state.isLoading}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {state.isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                          Resetting password...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </button>

                    <p className="text-center text-sm text-gray-600">
                      <button
                        type="button"
                        onClick={() => setResetStep('request')}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Back to email entry
                      </button>
                    </p>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
