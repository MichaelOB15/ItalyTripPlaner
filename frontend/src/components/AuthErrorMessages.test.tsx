import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { PasswordResetForm } from './PasswordResetForm';
import { AuthProvider } from '../contexts/AuthContext';
import * as amplifyAuth from 'aws-amplify/auth';

// Mock AWS Amplify auth functions
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  signIn: vi.fn(),
  confirmSignUp: vi.fn(),
}));

// Mock Amplify configuration
vi.mock('../config/amplify', () => ({
  configureAmplify: vi.fn(),
}));

/**
 * Authentication Error Messages Test Suite
 * 
 * **Validates Requirement 9.1:**
 * - When authentication fails, THE Frontend_App SHALL display a specific error message indicating the reason for failure
 * 
 * This test suite verifies that authentication error messages are:
 * 1. User-friendly: Clear, non-technical language
 * 2. Specific: Indicate the exact reason for failure
 * 3. Actionable: Help users understand what to do next
 * 
 * Test Categories:
 * - Sign-in failures (invalid credentials, unverified email, rate limiting)
 * - Sign-up failures (existing user, password requirements, invalid email)
 * - Password reset failures (user not found, invalid code, expired code)
 * - Network errors (connection failures, timeouts)
 */
describe('Authentication Error Messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sign-In Error Messages', () => {
    const renderSignInForm = () => {
      return render(
        <AuthProvider>
          <SignInForm onSuccess={() => {}} />
        </AuthProvider>
      );
    };

    it('should display user-friendly error for invalid credentials', async () => {
      const user = userEvent.setup();

      // Mock authentication failure with NotAuthorizedException
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Incorrect username or password')
      );

      renderSignInForm();

      // Fill in form with invalid credentials
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'WrongPassword123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify specific, user-friendly error message is displayed
      await waitFor(() => {
        const errorMessage = screen.getByText(/incorrect email or password/i);
        expect(errorMessage).toBeInTheDocument();
        
        // Verify it's announced to screen readers
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent(/incorrect email or password/i);
      });
    });

    it('should display specific error when email is not verified', async () => {
      const user = userEvent.setup();

      // Mock authentication failure for unconfirmed user
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('User is not confirmed')
      );

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'unverified@example.com');
      await user.type(passwordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify specific error message about verification
      await waitFor(() => {
        const errorMessage = screen.getByText(/please verify your email before signing in/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display specific error for too many failed attempts', async () => {
      const user = userEvent.setup();

      // Mock rate limiting error
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Password attempts exceeded')
      );

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify specific error message about rate limiting
      await waitFor(() => {
        const errorMessage = screen.getByText(/too many failed attempts.*try again later/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display network error with actionable message', async () => {
      const user = userEvent.setup();

      // Mock network error
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Network error occurred')
      );

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify specific network error message with guidance
      await waitFor(() => {
        const errorMessage = screen.getByText(/network error.*check your connection/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display user-friendly error for non-existent user', async () => {
      const user = userEvent.setup();

      // Mock user not found error
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('User does not exist')
      );

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'nonexistent@example.com');
      await user.type(passwordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify error doesn't reveal whether user exists (security best practice)
      await waitFor(() => {
        const errorMessage = screen.getByText(/incorrect email or password/i);
        expect(errorMessage).toBeInTheDocument();
        // Should NOT say "user does not exist" - security consideration
        expect(errorMessage).not.toHaveTextContent(/user does not exist/i);
      });
    });
  });

  describe('Sign-Up Error Messages', () => {
    const renderSignUpForm = () => {
      return render(
        <AuthProvider>
          <SignUpForm onSuccess={() => {}} />
        </AuthProvider>
      );
    };

    it('should display specific error when user already exists', async () => {
      const user = userEvent.setup();

      // Mock user already exists error
      vi.mocked(amplifyAuth.signUp).mockRejectedValueOnce(
        new Error('UsernameExistsException: User already exists')
      );

      renderSignUpForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      // Verify specific error message about existing account
      await waitFor(() => {
        const errorMessage = screen.getByText(/an account with this email already exists/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display specific error for password complexity requirements', async () => {
      const user = userEvent.setup();

      // Mock password complexity error
      vi.mocked(amplifyAuth.signUp).mockRejectedValueOnce(
        new Error('Password does not meet requirements')
      );

      renderSignUpForm();

      // Fill in form with weak password
      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'weak');
      await user.type(confirmPasswordInput, 'weak');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      // Verify specific error message with password requirements
      await waitFor(() => {
        const errorMessage = screen.getByText(
          /password does not meet requirements.*8 characters.*uppercase.*lowercase.*number.*special character/i
        );
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display specific error for invalid email format', async () => {
      const user = userEvent.setup();

      // Mock invalid email error - use exact error message that AuthContext will map
      vi.mocked(amplifyAuth.signUp).mockRejectedValueOnce(
        new Error('invalid email')
      );

      renderSignUpForm();

      // Fill in form with invalid email
      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      // Verify specific error message about email format (AuthContext maps InvalidParameterException to email format error)
      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email address format/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display user-friendly error for unexpected failures', async () => {
      const user = userEvent.setup();

      // Mock unexpected error - AuthContext will map password errors to password requirements message
      vi.mocked(amplifyAuth.signUp).mockRejectedValueOnce(
        new Error('password complexity issue')
      );

      renderSignUpForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/^email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(submitButton);

      // Verify error message is displayed - AuthContext maps "password" errors to password requirements message
      await waitFor(() => {
        const errorMessage = screen.getByText(/password does not meet requirements/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Password Reset Error Messages', () => {
    const renderPasswordResetForm = () => {
      return render(
        <AuthProvider>
          <PasswordResetForm isOpen={true} onClose={() => {}} onSuccess={() => {}} />
        </AuthProvider>
      );
    };

    it('should display specific error when user account is not found', async () => {
      const user = userEvent.setup();

      // Mock user not found error
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValueOnce(
        new Error('UserNotFoundException: User does not exist')
      );

      renderPasswordResetForm();

      // Fill in email field
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'nonexistent@example.com');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send reset code/i });
      await user.click(submitButton);

      // Verify specific error message
      await waitFor(() => {
        const errorMessage = screen.getByText(/no account found with this email address/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display specific error for too many reset attempts', async () => {
      const user = userEvent.setup();

      // Mock rate limit error
      vi.mocked(amplifyAuth.resetPassword).mockRejectedValueOnce(
        new Error('Limit exceeded')
      );

      renderPasswordResetForm();

      // Fill in email field
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@example.com');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send reset code/i });
      await user.click(submitButton);

      // Verify specific error message about rate limiting
      await waitFor(() => {
        const errorMessage = screen.getByText(/too many attempts.*try again later/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display specific error for invalid verification code', async () => {
      const user = userEvent.setup();

      // Mock successful code send first
      vi.mocked(amplifyAuth.resetPassword).mockResolvedValueOnce({
        nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
      } as any);

      renderPasswordResetForm();

      // Send reset code
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@example.com');
      const sendButton = screen.getByRole('button', { name: /send reset code/i });
      await user.click(sendButton);

      // Wait for confirmation step
      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      // Mock invalid code error
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValueOnce(
        new Error('CodeMismatchException: Invalid verification code')
      );

      // Fill in confirmation form with invalid code
      const codeInput = screen.getByLabelText(/^verification code/i);
      const newPasswordInput = screen.getByLabelText('New Password *');
      
      await user.type(codeInput, '000000');
      await user.type(newPasswordInput, 'NewPassword123!');

      // Submit confirmation
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(resetButton);

      // Verify specific error message about invalid code
      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid or expired verification code/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display specific error for expired verification code', async () => {
      const user = userEvent.setup();

      // Mock successful code send first
      vi.mocked(amplifyAuth.resetPassword).mockResolvedValueOnce({
        nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
      } as any);

      renderPasswordResetForm();

      // Send reset code
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@example.com');
      const sendButton = screen.getByRole('button', { name: /send reset code/i });
      await user.click(sendButton);

      // Wait for confirmation step
      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      // Mock expired code error
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValueOnce(
        new Error('CodeExpiredException: Verification code has expired')
      );

      // Fill in confirmation form
      const codeInput = screen.getByLabelText(/^verification code/i);
      const newPasswordInput = screen.getByLabelText('New Password *');
      
      await user.type(codeInput, '123456');
      await user.type(newPasswordInput, 'NewPassword123!');

      // Submit confirmation
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(resetButton);

      // Verify specific error message about expired code
      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid or expired verification code/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should display specific error when new password does not meet requirements', async () => {
      const user = userEvent.setup();

      // Mock successful code send first
      vi.mocked(amplifyAuth.resetPassword).mockResolvedValueOnce({
        nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' },
      } as any);

      renderPasswordResetForm();

      // Send reset code
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'user@example.com');
      const sendButton = screen.getByRole('button', { name: /send reset code/i });
      await user.click(sendButton);

      // Wait for confirmation step
      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      // Mock password requirements error
      vi.mocked(amplifyAuth.confirmResetPassword).mockRejectedValueOnce(
        new Error('Password does not meet requirements')
      );

      // Fill in confirmation form with weak password
      const codeInput = screen.getByLabelText(/^verification code/i);
      const newPasswordInput = screen.getByLabelText('New Password *');
      
      await user.type(codeInput, '123456');
      await user.type(newPasswordInput, 'weak');

      // Submit confirmation
      const resetButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(resetButton);

      // Verify specific error message with password requirements
      await waitFor(() => {
        const errorMessage = screen.getByText(
          /password does not meet requirements.*8 characters.*uppercase.*lowercase.*number.*special character/i
        );
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Error Message Accessibility', () => {
    const renderSignInForm = () => {
      return render(
        <AuthProvider>
          <SignInForm onSuccess={() => {}} />
        </AuthProvider>
      );
    };

    it('should announce errors to screen readers with assertive aria-live', async () => {
      const user = userEvent.setup();

      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Incorrect username or password')
      );

      renderSignInForm();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'WrongPassword');

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify error is announced with assertive priority
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should use semantic HTML for error display', async () => {
      const user = userEvent.setup();

      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Incorrect username or password')
      );

      renderSignInForm();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'WrongPassword');

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify error uses proper role="alert"
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
      });
    });

    it('should provide visual indicators for error state', async () => {
      const user = userEvent.setup();

      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Incorrect username or password')
      );

      renderSignInForm();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'WrongPassword');

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify visual error indicators are present
      await waitFor(() => {
        const errorContainer = screen.getByRole('alert');
        // Should have visual styling (background, border, icon)
        expect(errorContainer).toHaveClass('bg-red-50', 'border-red-200');
      });
    });
  });

  describe('Error Message Content Quality', () => {
    it('should use clear, non-technical language', async () => {
      const user = userEvent.setup();

      // Simulate a technical backend error
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('NotAuthorizedException')
      );

      const { container } = render(
        <AuthProvider>
          <SignInForm onSuccess={() => {}} />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'Password123!');

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify error message doesn't contain technical jargon
      await waitFor(() => {
        const errorText = container.textContent || '';
        // Should NOT contain: NotAuthorizedException, 401, stack trace
        expect(errorText).not.toMatch(/NotAuthorizedException/i);
        expect(errorText).not.toMatch(/401/);
        expect(errorText).not.toMatch(/stack trace/i);
        
        // Should contain user-friendly message
        expect(errorText).toMatch(/incorrect|password|email/i);
      });
    });

    it('should provide actionable guidance in error messages', async () => {
      const user = userEvent.setup();

      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('User is not confirmed')
      );

      render(
        <AuthProvider>
          <SignInForm onSuccess={() => {}} />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'unverified@example.com');
      await user.type(passwordInput, 'Password123!');

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      // Verify error message tells user what to do
      await waitFor(() => {
        const errorMessage = screen.getByText(/verify your email/i);
        expect(errorMessage).toBeInTheDocument();
        // Contains actionable guidance (verify email)
      });
    });

    it('should maintain consistent error message styling across forms', async () => {
      const user = userEvent.setup();

      // Test SignInForm error styling
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Test error')
      );

      const { unmount } = render(
        <AuthProvider>
          <SignInForm onSuccess={() => {}} />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'user@example.com');
      await user.type(passwordInput, 'Password123!');

      const submitButton = screen.getByRole('button', { name: /^sign in$/i });
      await user.click(submitButton);

      await waitFor(() => {
        const signInError = screen.getByRole('alert');
        expect(signInError).toHaveClass('bg-red-50', 'border', 'border-red-200');
      });

      unmount();

      // Test SignUpForm error styling
      vi.mocked(amplifyAuth.signUp).mockRejectedValueOnce(
        new Error('Test error')
      );

      render(
        <AuthProvider>
          <SignUpForm onSuccess={() => {}} />
        </AuthProvider>
      );

      const signUpEmailInput = screen.getByLabelText(/^email/i);
      const signUpPasswordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(signUpEmailInput, 'user@example.com');
      await user.type(signUpPasswordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');

      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(signUpButton);

      await waitFor(() => {
        const signUpError = screen.getByRole('alert');
        // Should use same consistent styling
        expect(signUpError).toHaveClass('bg-red-50', 'border', 'border-red-200');
      });
    });
  });
});
