import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

export interface PasswordResetFormProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Optional callback when password reset is complete
   */
  onSuccess?: () => void;
}

type ResetStep = 'email' | 'code';

// ============================================================================
// Component
// ============================================================================

/**
 * PasswordResetForm Component
 *
 * A modal form for password reset with a two-step flow:
 * 1. Email input - sends verification code to user's email
 * 2. Code + new password - verifies code and sets new password
 *
 * Features:
 * - Two-step workflow with clear instructions for each step
 * - Email validation
 * - Password complexity requirements display
 * - Password visibility toggle
 * - Confirm password field with matching validation
 * - Loading states during API calls
 * - Error message display with specific feedback
 * - Success confirmation
 * - Modal overlay with click-outside to close
 * - Keyboard support (Escape to close)
 * - Focus management for accessibility
 * - Scroll lock when open
 *
 * **Validates Requirements 1.9:**
 * - Supports password reset functionality via email verification
 *
 * @example
 * ```tsx
 * const [showReset, setShowReset] = useState(false);
 *
 * <PasswordResetForm
 *   isOpen={showReset}
 *   onClose={() => setShowReset(false)}
 *   onSuccess={() => {
 *     setShowReset(false);
 *     showToast('Password reset successful!');
 *   }}
 * />
 * ```
 */
export function PasswordResetForm({
  isOpen,
  onClose,
  onSuccess,
}: PasswordResetFormProps): JSX.Element | null {
  const { resetPassword, confirmResetPassword, state } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    code?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setEmail('');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError(null);
      setSuccess(false);
      setValidationErrors({});
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

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

  // Focus management
  useEffect(() => {
    if (isOpen && step === 'email' && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [isOpen, step]);

  // Handle overlay click (click outside modal content)
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate password complexity
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  // Validate step 1 (email)
  const validateEmailStep = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate step 2 (code + password)
  const validateCodeStep = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!code.trim()) {
      errors.code = 'Verification code is required';
    }

    if (!newPassword) {
      errors.password = 'New password is required';
    } else {
      const passwordError = validatePassword(newPassword);
      if (passwordError) {
        errors.password = passwordError;
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle step 1 submit (send reset code)
  const handleSendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!validateEmailStep()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword(email.trim());
      setStep('code');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle step 2 submit (reset password)
  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!validateCodeStep()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmResetPassword(email.trim(), code.trim(), newPassword);
      setSuccess(true);
      setError(null);

      // Call onSuccess callback after a short delay to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle back to email step
  const handleBack = () => {
    setStep('email');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setValidationErrors({});
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
      aria-labelledby="password-reset-modal-title"
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
          <div className="border-b border-gray-200 px-6 py-4 flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2
                id="password-reset-modal-title"
                className="text-2xl font-bold text-gray-900"
              >
                Reset Password
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {step === 'email'
                  ? 'Enter your email address and we\'ll send you a verification code'
                  : 'Enter the verification code and your new password'}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close modal"
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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
          </div>

          {/* Success Message */}
          {success && (
            <div className="px-6 py-4 bg-green-50 border-b border-green-200">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Password reset successful!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    You can now sign in with your new password.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="ml-3 text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Form - Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendCode}>
              <div className="px-6 py-6 space-y-4">
                {/* Email Input */}
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={emailInputRef}
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) {
                        setValidationErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    disabled={isSubmitting}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}
                    `}
                    placeholder="your.email@example.com"
                    autoComplete="email"
                    aria-invalid={!!validationErrors.email}
                    aria-describedby={validationErrors.email ? 'email-error' : undefined}
                  />
                  {validationErrors.email && (
                    <p
                      id="email-error"
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {validationErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
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
                      Sending...
                    </>
                  ) : (
                    'Send Reset Code'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Form - Step 2: Code + Password */}
          {step === 'code' && !success && (
            <form onSubmit={handleResetPassword}>
              <div className="px-6 py-6 space-y-4">
                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="ml-3 text-sm text-blue-800">
                      We've sent a verification code to <strong>{email}</strong>. 
                      Please check your email and enter the code below.
                    </p>
                  </div>
                </div>

                {/* Verification Code Input */}
                <div>
                  <label
                    htmlFor="reset-code"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Verification Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (validationErrors.code) {
                        setValidationErrors((prev) => ({ ...prev, code: undefined }));
                      }
                    }}
                    disabled={isSubmitting}
                    className={`
                      w-full px-3 py-2 border rounded-md shadow-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      ${validationErrors.code ? 'border-red-500' : 'border-gray-300'}
                    `}
                    placeholder="Enter 6-digit code"
                    autoComplete="one-time-code"
                    aria-invalid={!!validationErrors.code}
                    aria-describedby={validationErrors.code ? 'code-error' : undefined}
                  />
                  {validationErrors.code && (
                    <p
                      id="code-error"
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {validationErrors.code}
                    </p>
                  )}
                </div>

                {/* New Password Input */}
                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reset-new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (validationErrors.password) {
                          setValidationErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      disabled={isSubmitting}
                      className={`
                        w-full px-3 py-2 pr-10 border rounded-md shadow-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        disabled:bg-gray-100 disabled:cursor-not-allowed
                        ${validationErrors.password ? 'border-red-500' : 'border-gray-300'}
                      `}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      aria-invalid={!!validationErrors.password}
                      aria-describedby={validationErrors.password ? 'password-error' : 'password-requirements'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p
                      id="password-error"
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {validationErrors.password}
                    </p>
                  )}
                  <div id="password-requirements" className="mt-2 text-xs text-gray-600">
                    <p className="font-medium mb-1">Password must contain:</p>
                    <ul className="space-y-0.5 list-disc list-inside">
                      <li>At least 8 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                      <li>One special character</li>
                    </ul>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (validationErrors.confirmPassword) {
                          setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      disabled={isSubmitting}
                      className={`
                        w-full px-3 py-2 pr-10 border rounded-md shadow-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        disabled:bg-gray-100 disabled:cursor-not-allowed
                        ${validationErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}
                      `}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      aria-invalid={!!validationErrors.confirmPassword}
                      aria-describedby={validationErrors.confirmPassword ? 'confirm-password-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p
                      id="confirm-password-error"
                      className="mt-1 text-sm text-red-600"
                      role="alert"
                    >
                      {validationErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between rounded-b-lg">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Back to Email
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
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
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
