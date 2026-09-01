import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignInForm } from './SignInForm';
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
}));

// Mock Amplify configuration
vi.mock('../config/amplify', () => ({
  configureAmplify: vi.fn(),
}));

describe('SignInForm Component', () => {
  const mockOnSwitchToSignUp = vi.fn();
  const mockOnSwitchToPasswordReset = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSignInForm = (props = {}) => {
    return render(
      <AuthProvider>
        <SignInForm
          onSwitchToSignUp={mockOnSwitchToSignUp}
          onSwitchToPasswordReset={mockOnSwitchToPasswordReset}
          onSuccess={mockOnSuccess}
          {...props}
        />
      </AuthProvider>
    );
  };

  describe('Component Rendering', () => {
    it('should render sign in form with all required elements', () => {
      renderSignInForm();

      // Header
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();

      // Form fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Buttons and links
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('should render without optional callbacks', () => {
      render(
        <AuthProvider>
          <SignInForm />
        </AuthProvider>
      );

      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /forgot password/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument();
    });

    it('should focus email input on mount', () => {
      renderSignInForm();
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveFocus();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AuthProvider>
          <SignInForm className="custom-class" />
        </AuthProvider>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Form Validation', () => {
    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      renderSignInForm();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when email format is invalid', async () => {
      const user = userEvent.setup();
      renderSignInForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup();
      renderSignInForm();

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it('should clear validation errors when user types', async () => {
      const user = userEvent.setup();
      renderSignInForm();

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      // Type in email field
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Sign In Functionality', () => {
    it('should successfully sign in with valid credentials', async () => {
      const user = userEvent.setup();

      // Mock successful sign in
      vi.mocked(amplifyAuth.signIn).mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValueOnce({
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
            payload: { exp: Math.floor(Date.now() / 1000) + 3600 },
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

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Verify signIn was called
      await waitFor(() => {
        expect(amplifyAuth.signIn).toHaveBeenCalledWith({
          username: 'test@example.com',
          password: 'Password123!',
        });
      });

      // Verify success callback was called
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should display loading state during sign in', async () => {
      const user = userEvent.setup();

      // Mock sign in with delay
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

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Check for loading state
      expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();

      // Wait for completion
      await waitFor(
        () => {
          expect(screen.queryByText(/signing in.../i)).not.toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });

    it('should display error message on sign in failure', async () => {
      const user = userEvent.setup();

      // Mock sign in failure
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Incorrect email or password. Please try again.')
      );

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Check for error message
      await waitFor(() => {
        expect(
          screen.getByText(/incorrect email or password/i)
        ).toBeInTheDocument();
      });

      // Verify onSuccess was not called
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should handle user not confirmed error', async () => {
      const user = userEvent.setup();

      // Mock sign in failure
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('User is not confirmed')
      );

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Check for error message
      await waitFor(() => {
        expect(
          screen.getByText(/please verify your email before signing in/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links', () => {
    it('should call onSwitchToSignUp when sign up link is clicked', async () => {
      const user = userEvent.setup();
      renderSignInForm();

      const signUpButton = screen.getByRole('button', { name: /sign up/i });
      await user.click(signUpButton);

      expect(mockOnSwitchToSignUp).toHaveBeenCalled();
    });

    it('should call onSwitchToPasswordReset when forgot password link is clicked', async () => {
      const user = userEvent.setup();
      renderSignInForm();

      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
      await user.click(forgotPasswordButton);

      expect(mockOnSwitchToPasswordReset).toHaveBeenCalled();
    });

    it('should disable navigation links during loading', async () => {
      const user = userEvent.setup();

      // Mock sign in with delay
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

      renderSignInForm();

      // Fill in form and submit
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Check navigation links are disabled
      const forgotPasswordButton = screen.getByRole('button', { name: /forgot password/i });
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      expect(forgotPasswordButton).toBeDisabled();
      expect(signUpButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for form fields', () => {
      renderSignInForm();

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
    });

    it('should have proper ARIA attributes for error messages', async () => {
      const user = userEvent.setup();
      renderSignInForm();

      // Trigger validation error
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

        const errorMessage = screen.getByText(/email is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });

    it('should announce authentication errors to screen readers', async () => {
      const user = userEvent.setup();

      // Mock sign in failure
      vi.mocked(amplifyAuth.signIn).mockRejectedValueOnce(
        new Error('Incorrect email or password. Please try again.')
      );

      renderSignInForm();

      // Fill in form and submit
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword');

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Check for error alert
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
        expect(errorAlert).toHaveTextContent(/incorrect email or password/i);
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form on Enter key press', async () => {
      const user = userEvent.setup();

      // Mock successful sign in
      vi.mocked(amplifyAuth.signIn).mockResolvedValueOnce({
        isSignedIn: true,
        nextStep: { signInStep: 'DONE' },
      } as any);

      vi.mocked(amplifyAuth.fetchAuthSession).mockResolvedValueOnce({
        tokens: {
          accessToken: {
            toString: () => 'mock-access-token',
            payload: { exp: Math.floor(Date.now() / 1000) + 3600 },
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

      renderSignInForm();

      // Fill in form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');

      // Press Enter in password field
      await user.keyboard('{Enter}');

      // Verify signIn was called
      await waitFor(() => {
        expect(amplifyAuth.signIn).toHaveBeenCalled();
      });
    });

    it('should not submit form if validation fails', async () => {
      const user = userEvent.setup();
      renderSignInForm();

      // Submit without filling fields
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Verify signIn was not called
      expect(amplifyAuth.signIn).not.toHaveBeenCalled();

      // Verify validation errors are shown
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });
});
