import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

export interface SignUpFormProps {
  /**
   * Callback when user wants to switch to sign in
   */
  onSwitchToSignIn?: () => void;

  /**
   * Callback when sign up is successful and verification code is sent
   */
  onSuccess?: (email: string) => void;

  /**
   * Optional class name for styling
   */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SignUpForm Component
 *
 * A form component for new user registration with email and password.
 * Integrates with AuthContext to perform sign-up operations.
 *
 * Features:
 * - Email, password, and confirm password input fields with validation
 * - Display password requirements
 * - "Sign Up" button with loading state
 * - Link to sign in for existing users
 * - Handle registration errors from AuthContext
 * - Form validation (email format, password requirements, password match)
 * - Accessible form structure with labels and ARIA attributes
 * - Loading spinner during registration
 * - Keyboard support (Enter to submit)
 * - Two-step flow: registration + email verification code input
 *
 * **Validates Requirements:**
 * - 1.1: User registration with email and password
 * - 1.2: Create new user account
 * - 1.3: Password complexity requirements enforced
 * - 1.7: Display sign-up interface with link to sign in
 * - 9.1: Display specific registration error messages
 *
 * @example
 * ```tsx
 * <SignUpForm
 *   onSwitchToSignIn={() => setView('signin')}
 *   onSuccess={(email) => console.log(`Verification code sent to ${email}`)}
 * />
 * ```
 */
export function SignUpForm({
  onSwitchToSignIn,
  onSuccess,
  className = '',
}: SignUpFormProps): JSX.Element {
  const { state: authState, signUp, confirmSignUp } = useAuth();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    verificationCode?: string;
  }>({});

  // Password strength indicators
  const [passwordChecks, setPasswordChecks] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  // Focus email input on mount, or code input when switching to verify step
  useEffect(() => {
    if (step === 'register') {
      emailInputRef.current?.focus();
    } else if (step === 'verify') {
      codeInputRef.current?.focus();
    }
  }, [step]);

  // Update password strength indicators
  useEffect(() => {
    setPasswordChecks({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    });
  }, [password]);

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

  useEffect(() => {
    if (errors.confirmPassword && confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  }, [confirmPassword, errors.confirmPassword]);

  useEffect(() => {
    if (errors.verificationCode && verificationCode) {
      setErrors((prev) => ({ ...prev, verificationCode: undefined }));
    }
  }, [verificationCode, errors.verificationCode]);

  // Validate registration form
  const validateRegister = (): boolean => {
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
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/\d/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate verification form
  const validateVerify = (): boolean => {
    const newErrors: typeof errors = {};

    if (!verificationCode.trim()) {
      newErrors.verificationCode = 'Verification code is required';
    } else if (!/^\d{6}$/.test(verificationCode.trim())) {
      newErrors.verificationCode = 'Please enter a valid 6-digit code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle registration submit
  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateRegister()) {
      return;
    }

    try {
      await signUp(email, password);
      // Registration successful, move to verification step
      setRegisteredEmail(email);
      setStep('verify');
      onSuccess?.(email);
    } catch (error) {
      // Error is handled by AuthContext and displayed via authState.error
      console.error('Sign up failed:', error);
    }
  };

  // Handle verification submit
  const handleVerifySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateVerify()) {
      return;
    }

    try {
      await confirmSignUp(registeredEmail, verificationCode);
      // Verification successful - AuthContext will update state
      // Parent component can handle the success via AuthContext state changes
    } catch (error) {
      // Error is handled by AuthContext and displayed via authState.error
      console.error('Verification failed:', error);
    }
  };

  // Render verification step
  if (step === 'verify') {
    return (
      <div className={`w-full max-w-md ${className}`}>
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Verify Your Email
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center">
              We've sent a verification code to{' '}
              <span className="font-medium">{registeredEmail}</span>
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
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            {/* Verification Code Field */}
            <div>
              <label
                htmlFor="verification-code"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Verification Code <span className="text-red-500">*</span>
              </label>
              <input
                ref={codeInputRef}
                type="text"
                id="verification-code"
                name="code"
                autoComplete="one-time-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                aria-invalid={!!errors.verificationCode}
                aria-describedby={
                  errors.verificationCode ? 'code-error' : undefined
                }
                className={`
                  w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                  ${
                    errors.verificationCode
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300'
                  }
                `}
                placeholder="123456"
                maxLength={6}
                disabled={authState.isLoading}
              />
              {errors.verificationCode && (
                <p
                  id="code-error"
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.verificationCode}
                </p>
              )}
            </div>

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
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          {/* Back to Register Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setStep('register')}
              className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:underline transition-colors"
              disabled={authState.isLoading}
            >
              ← Back to registration
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render registration step
  return (
    <div className={`w-full max-w-md ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Sign up to save your itineraries and access them from any device.
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
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label
              htmlFor="sign-up-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              ref={emailInputRef}
              type="email"
              id="sign-up-email"
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
              htmlFor="sign-up-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="sign-up-password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? 'password-error password-requirements' : 'password-requirements'
              }
              className={`
                w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                ${
                  errors.password
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
                }
              `}
              placeholder="Create a password"
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

            {/* Password Requirements */}
            <div
              id="password-requirements"
              className="mt-2 text-xs text-gray-600 space-y-1"
            >
              <p className="font-medium">Password must contain:</p>
              <ul className="space-y-1 pl-4">
                <li
                  className={`flex items-center ${
                    passwordChecks.minLength ? 'text-green-600' : ''
                  }`}
                >
                  <span className="mr-1">
                    {passwordChecks.minLength ? '✓' : '○'}
                  </span>
                  At least 8 characters
                </li>
                <li
                  className={`flex items-center ${
                    passwordChecks.hasUppercase ? 'text-green-600' : ''
                  }`}
                >
                  <span className="mr-1">
                    {passwordChecks.hasUppercase ? '✓' : '○'}
                  </span>
                  One uppercase letter (A-Z)
                </li>
                <li
                  className={`flex items-center ${
                    passwordChecks.hasLowercase ? 'text-green-600' : ''
                  }`}
                >
                  <span className="mr-1">
                    {passwordChecks.hasLowercase ? '✓' : '○'}
                  </span>
                  One lowercase letter (a-z)
                </li>
                <li
                  className={`flex items-center ${
                    passwordChecks.hasNumber ? 'text-green-600' : ''
                  }`}
                >
                  <span className="mr-1">
                    {passwordChecks.hasNumber ? '✓' : '○'}
                  </span>
                  One number (0-9)
                </li>
                <li
                  className={`flex items-center ${
                    passwordChecks.hasSpecial ? 'text-green-600' : ''
                  }`}
                >
                  <span className="mr-1">
                    {passwordChecks.hasSpecial ? '✓' : '○'}
                  </span>
                  One special character (!@#$%^&*...)
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="sign-up-confirm-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="sign-up-confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={
                errors.confirmPassword ? 'confirm-password-error' : undefined
              }
              className={`
                w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                ${
                  errors.confirmPassword
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300'
                }
              `}
              placeholder="Re-enter your password"
              disabled={authState.isLoading}
            />
            {errors.confirmPassword && (
              <p
                id="confirm-password-error"
                className="mt-1 text-sm text-red-600"
                role="alert"
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>

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
                Creating Account...
              </>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        {/* Sign In Link */}
        {onSwitchToSignIn && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignIn}
                className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:underline transition-colors"
                disabled={authState.isLoading}
              >
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
