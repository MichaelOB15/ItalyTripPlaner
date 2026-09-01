import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignUpForm } from './SignUpForm';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the AuthContext
const mockSignUp = vi.fn();
const mockConfirmSignUp = vi.fn();

vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      state: {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        isLoading: false,
        error: null,
      },
      signUp: mockSignUp,
      confirmSignUp: mockConfirmSignUp,
      signIn: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      confirmResetPassword: vi.fn(),
    }),
  };
});

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Registration Step', () => {
    it('renders sign up form with all fields', () => {
      render(<SignUpForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('displays password requirements', () => {
      render(<SignUpForm />);

      expect(screen.getByText(/password must contain:/i)).toBeInTheDocument();
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/one uppercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one lowercase letter/i)).toBeInTheDocument();
      expect(screen.getByText(/one number/i)).toBeInTheDocument();
      expect(screen.getByText(/one special character/i)).toBeInTheDocument();
    });

    it('shows password strength indicators as user types', async () => {
      render(<SignUpForm />);

      const passwordInput = screen.getByLabelText(/^password/i);

      // Type password that meets some requirements
      fireEvent.change(passwordInput, { target: { value: 'Pass1' } });

      // Wait for state updates
      await waitFor(() => {
        const requirements = screen.getByText(/one uppercase letter/i);
        expect(requirements).toHaveClass('text-green-600');
      });
    });

    it('shows validation error for invalid email', async () => {
      render(<SignUpForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email address/i)
        ).toBeInTheDocument();
      });
    });

    it('shows validation error for weak password', async () => {
      render(<SignUpForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'weak' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'weak' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
      });
    });

    it('shows validation error when passwords do not match', async () => {
      render(<SignUpForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password456!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it('calls signUp with correct credentials on valid submission', async () => {
      mockSignUp.mockResolvedValueOnce(undefined);

      const onSuccess = vi.fn();
      render(<SignUpForm onSuccess={onSuccess} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith('test@example.com', 'Password123!');
        expect(onSuccess).toHaveBeenCalledWith('test@example.com');
      });
    });

    it('shows link to sign in', () => {
      const onSwitchToSignIn = vi.fn();
      render(<SignUpForm onSwitchToSignIn={onSwitchToSignIn} />);

      const signInLink = screen.getByRole('button', { name: /sign in/i });
      expect(signInLink).toBeInTheDocument();

      fireEvent.click(signInLink);
      expect(onSwitchToSignIn).toHaveBeenCalled();
    });

    it('validates password requirements individually', async () => {
      render(<SignUpForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      // Test missing uppercase
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must contain at least one uppercase letter/i)
        ).toBeInTheDocument();
      });

      // Test missing lowercase
      fireEvent.change(passwordInput, { target: { value: 'PASSWORD123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'PASSWORD123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must contain at least one lowercase letter/i)
        ).toBeInTheDocument();
      });

      // Test missing number
      fireEvent.change(passwordInput, { target: { value: 'Password!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must contain at least one number/i)
        ).toBeInTheDocument();
      });

      // Test missing special character
      fireEvent.change(passwordInput, { target: { value: 'Password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must contain at least one special character/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Verification Step', () => {
    beforeEach(async () => {
      mockSignUp.mockResolvedValueOnce(undefined);
    });

    const navigateToVerificationStep = async () => {
      const { rerender } = render(<SignUpForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      });

      // Re-render to show verification step
      rerender(<SignUpForm />);
    };

    it('shows verification form after successful registration', async () => {
      await navigateToVerificationStep();

      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /verify email/i })
        ).toBeInTheDocument();
      });
    });

    it('shows registered email in verification step', async () => {
      await navigateToVerificationStep();

      await waitFor(() => {
        expect(screen.getByText(/test@example\.com/i)).toBeInTheDocument();
      });
    });

    it('validates verification code format', async () => {
      await navigateToVerificationStep();

      const codeInput = await screen.findByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify email/i });

      // Test empty code
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(
          screen.getByText(/verification code is required/i)
        ).toBeInTheDocument();
      });

      // Test invalid format
      fireEvent.change(codeInput, { target: { value: '123' } });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid 6-digit code/i)
        ).toBeInTheDocument();
      });
    });

    it('calls confirmSignUp with correct code', async () => {
      mockConfirmSignUp.mockResolvedValueOnce(undefined);
      await navigateToVerificationStep();

      const codeInput = await screen.findByLabelText(/verification code/i);
      const verifyButton = screen.getByRole('button', { name: /verify email/i });

      fireEvent.change(codeInput, { target: { value: '123456' } });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(mockConfirmSignUp).toHaveBeenCalledWith('test@example.com', '123456');
      });
    });

    it('allows navigating back to registration', async () => {
      await navigateToVerificationStep();

      const backButton = await screen.findByRole('button', {
        name: /back to registration/i,
      });

      fireEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByText(/create account/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('disables form during sign up', async () => {
      mockSignUp.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<SignUpForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password123!' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays authentication errors from AuthContext', () => {
      vi.mock('../contexts/AuthContext', async () => {
        const actual = await vi.importActual('../contexts/AuthContext');
        return {
          ...actual,
          useAuth: () => ({
            state: {
              isAuthenticated: false,
              user: null,
              accessToken: null,
              isLoading: false,
              error: 'Email already exists',
            },
            signUp: mockSignUp,
            confirmSignUp: mockConfirmSignUp,
            signIn: vi.fn(),
            signOut: vi.fn(),
            resetPassword: vi.fn(),
            confirmResetPassword: vi.fn(),
          }),
        };
      });

      render(<SignUpForm />);

      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible form labels', () => {
      render(<SignUpForm />);

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('id', 'sign-up-email');
      expect(screen.getByLabelText(/^password/i)).toHaveAttribute(
        'id',
        'sign-up-password'
      );
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute(
        'id',
        'sign-up-confirm-password'
      );
    });

    it('associates error messages with form fields', async () => {
      render(<SignUpForm />);

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      });
    });

    it('announces errors to screen readers', async () => {
      render(<SignUpForm />);

      const submitButton = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/email is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});
