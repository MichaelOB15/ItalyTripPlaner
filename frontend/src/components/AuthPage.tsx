import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type AuthView = 'signin' | 'signup' | 'reset';

/**
 * AuthPage Component
 * 
 * Full-page authentication interface for sign-in and sign-up.
 * Used as the authentication gate before users can access the app.
 */
export function AuthPage(): JSX.Element {
  const { state, signIn, signUp, resetPassword, confirmResetPassword, confirmSignUp } = useAuth();
  const [currentView, setCurrentView] = useState<AuthView>('signin');

  // Form state for SignIn
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Form state for SignUp
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  // Form state for Password Reset
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  // Local error and success states
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle sign in
  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!signInEmail || !signInPassword) {
      setLocalError('Please enter both email and password.');
      return;
    }

    try {
      await signIn(signInEmail, signInPassword);
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError('Sign-in failed. Please try again.');
      }
    }
  };

  // Handle sign up
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

    if (signUpPassword.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }

    try {
      await signUp(signUpEmail, signUpPassword);
      setSuccessMessage('Account created! Please check your email for a verification code.');
      setShowVerification(true);
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError('Sign-up failed. Please try again.');
      }
    }
  };

  // Handle verification code submission
  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setSuccessMessage(null);

    if (!verificationCode.trim()) {
      setLocalError('Please enter the verification code.');
      return;
    }

    try {
      await confirmSignUp(signUpEmail, verificationCode);
      setSuccessMessage('Email verified! You can now sign in.');
      setTimeout(() => {
        setCurrentView('signin');
        setShowVerification(false);
        setVerificationCode('');
      }, 2000);
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError('Verification failed. Please try again.');
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
      setTimeout(() => {
        setCurrentView('signin');
      }, 2000);
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message);
      } else {
        setLocalError('Password reset confirmation failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Italy Trip Planner
          </h1>
          <p className="text-gray-600">
            Sign in to create and manage your travel itineraries
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl">
          {/* Card Header */}
          <div className="px-6 py-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentView === 'signin' && 'Sign In'}
              {currentView === 'signup' && !showVerification && 'Create Account'}
              {currentView === 'signup' && showVerification && 'Verify Email'}
              {currentView === 'reset' && 'Reset Password'}
            </h2>
          </div>

          {/* Card Body */}
          <div className="px-6 pb-6">
            {/* Error Message */}
            {(localError || state.error) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="ml-3 text-sm text-red-800">{localError || state.error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md" role="alert">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="ml-3 text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Sign In Form */}
            {currentView === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setCurrentView('reset')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {state.isLoading ? 'Signing in...' : 'Sign In'}
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
                  onClick={() => setCurrentView('signup')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Create New Account
                </button>
              </form>
            )}

            {/* Sign Up Form */}
            {currentView === 'signup' && !showVerification && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
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
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {state.isLoading ? 'Creating Account...' : 'Create Account'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCurrentView('signin')}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Already have an account?{' '}
                    <span className="text-blue-600 hover:text-blue-700 font-medium">Sign in</span>
                  </button>
                </div>
              </form>
            )}

            {/* Verification Code Form */}
            {currentView === 'signup' && showVerification && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  We've sent a verification code to <strong>{signUpEmail}</strong>. Please enter it below.
                </p>

                <div>
                  <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code
                  </label>
                  <input
                    id="verification-code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                    required
                    maxLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {state.isLoading ? 'Verifying...' : 'Verify Email'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVerification(false);
                      setVerificationCode('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← Back to sign up
                  </button>
                </div>
              </form>
            )}

            {/* Password Reset Form */}
            {currentView === 'reset' && resetStep === 'request' && (
              <form onSubmit={handleResetRequest} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Enter your email address and we'll send you a code to reset your password.
                </p>

                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {state.isLoading ? 'Sending code...' : 'Send Reset Code'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setCurrentView('signin')}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Remember your password? <span className="text-blue-600 hover:text-blue-700 font-medium">Sign in</span>
                  </button>
                </div>
              </form>
            )}

            {currentView === 'reset' && resetStep === 'confirm' && (
              <form onSubmit={handleResetConfirm} className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Enter the verification code sent to your email and your new password.
                </p>

                <div>
                  <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="reset-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={state.isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={state.isLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {state.isLoading ? 'Resetting password...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
