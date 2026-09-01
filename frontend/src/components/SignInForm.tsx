import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

export interface SignInFormProps {
  /**
   * Callback when user wants to switch to sign up
   */
  onSwitchToSignUp?: () => void;

  /**
   * Callback when user wants to reset password
   */
  onSwitchToPasswordReset?: () => void;

  /**
   * Callback when sign in is successful
   */
  onSuccess?: () => void;

  /**
   * Optional class name for styling
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SignInForm Component
 *
 * A form component for user authentication with email and password.
 * Integrates with AuthContext to perform sign-in operations.
 *
 * Features:
 * - Email and password input fields with validation
 * - "Sign In" button with loading state
 * - Links to sign up and password reset flows
 * - Display authentication error messages from AuthContext
 * - Form validation (required fields, email format)
 * - Accessible form structure with labels and ARIA attributes
 * - Loading spinner during authentication
 * - Keyboard support (Enter to submit)
 *
 * **Validates Requirements:**
 * - 1.7: When a user is not authenticated, display sign-in interface
 * - 9.1: Display specific authentication error messages
 *
 * @example
 * ```tsx
 * <SignInForm
 *   onSwitchToSignUp={() => setView('signup')}
 *   onSwitchToPasswordReset={() => setView('reset')}
 *   onSuccess={() => navigate('/dashboard')}
 * />
 * ```
 */
export function SignInForm({
  onSwitchToSignUp,
  onSwitchToPasswordReset,
  onSuccess,
  className = '',
}: SignInFormProps): JSX.Element {
  const { state: authState, signIn } = useAuth();
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  // Focus email input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Clear validation errors when user types
  useEffect(() => {
    if (errors.email && email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  }, [email, errors.email]);

  useEffect(() => {
    if (errors.password && password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  }, [password, errors.password]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await signIn(email, password);
      // Sign in successful
      onSuccess?.();
    } catch (error) {
      // Error is handled by AuthContext and displayed via authState.error
      console.error('Sign in failed:', error);
    }
  };

  return (
    <div className={`w-full max-w-md ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Welcome back! Please sign in to continue.
          </p>
        </div>

        {/* Authentication Error from AuthContext */}
        {authState.error && (
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
              <p className="ml-3 text-sm text-red-800">{authState.error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label
              htmlFor="sign-in-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              ref={emailInputRef}
              type="email"
              id="sign-in-email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`
                w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                ${
                  errors.email
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
                }
              `}
              placeholder="you@example.com"
              disabled={authState.isLoading}
            />
            {errors.email && (
              <p
                id="email-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="sign-in-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="sign-in-password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={`
                w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                ${
                  errors.password
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
                }
              `}
              placeholder="Enter your password"
              disabled={authState.isLoading}
            />
            {errors.password && (
              <p
                id="password-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {errors.password}
              </p>
            )}
          </div>

          {/* Forgot Password Link */}
          {onSwitchToPasswordReset && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSwitchToPasswordReset}
                className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:underline transition-colors"
                disabled={authState.isLoading}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={authState.isLoading}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authState.isLoading ? (
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
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        {onSwitchToSignUp && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline transition-colors"
                disabled={authState.isLoading}
              >
                Sign up
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
