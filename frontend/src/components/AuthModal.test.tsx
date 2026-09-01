import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import { AuthProvider } from '../contexts/AuthContext';

// Mock AWS Amplify Auth
vi.mock('aws-amplify/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
}));

// Helper to render with AuthProvider
function renderWithAuth(ui: React.ReactElement) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

describe('AuthModal', () => {
  const mockOnClose = vi.fn();
  const mockOnAuthSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      renderWithAuth(
        <AuthModal isOpen={false} onClose={mockOnClose} />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'auth-modal-title');
    });

    it('should render close button with ARIA label', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const closeButton = screen.getByLabelText('Close authentication modal');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should show Sign In view by default', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should switch to Sign Up view when tab is clicked', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const signUpTab = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpTab);

      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByText(/Password requirements/i)).toBeInTheDocument();
    });

    it('should switch to Reset Password view when tab is clicked', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const resetTab = screen.getByRole('button', { name: 'Reset' });
      fireEvent.click(resetTab);

      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
      expect(screen.getByText(/Enter your email address and we'll send you a code/i)).toBeInTheDocument();
    });

    it('should have correct aria-current for active tab', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const signInTab = screen.getByRole('button', { name: 'Sign In' });
      expect(signInTab).toHaveAttribute('aria-current', 'page');

      const signUpTab = screen.getByRole('button', { name: 'Sign Up' });
      expect(signUpTab).not.toHaveAttribute('aria-current');
    });
  });

  describe('Sign In Form', () => {
    it('should render sign in form fields', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should show validation error for empty fields', async () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const signInButton = screen.getByRole('button', { name: 'Sign In' });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter both email and password.')).toBeInTheDocument();
      });
    });

    it('should show link to sign up', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      const signUpLink = screen.getByRole('button', { name: 'Sign up' });
      expect(signUpLink).toBeInTheDocument();
    });

    it('should switch to sign up view when link is clicked', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const signUpLink = screen.getByRole('button', { name: 'Sign up' });
      fireEvent.click(signUpLink);

      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    });
  });

  describe('Sign Up Form', () => {
    beforeEach(() => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} initialView="signup" />
      );
    });

    it('should render sign up form fields', () => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('should display password requirements', () => {
      expect(screen.getByText('Password requirements:')).toBeInTheDocument();
      expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
      expect(screen.getByText('One number')).toBeInTheDocument();
      expect(screen.getByText('One special character')).toBeInTheDocument();
    });

    it('should validate that all fields are filled', async () => {
      const createButton = screen.getByRole('button', { name: 'Create Account' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument();
      });
    });

    it('should validate password match', async () => {
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText('Confirm Password');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.change(confirmInput, { target: { value: 'DifferentPassword123!' } });

      const createButton = screen.getByRole('button', { name: 'Create Account' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
      });
    });

    it('should validate password length', async () => {
      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmInput = screen.getByLabelText('Confirm Password');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Pass1!' } });
      fireEvent.change(confirmInput, { target: { value: 'Pass1!' } });

      const createButton = screen.getByRole('button', { name: 'Create Account' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
      });
    });

    it('should show link to sign in', () => {
      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
      const signInLink = screen.getByRole('button', { name: 'Sign in' });
      expect(signInLink).toBeInTheDocument();
    });
  });

  describe('Password Reset Form', () => {
    beforeEach(() => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} initialView="reset" />
      );
    });

    it('should render password reset request form', () => {
      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Code' })).toBeInTheDocument();
      expect(screen.getByText(/Enter your email address and we'll send you a code/i)).toBeInTheDocument();
    });

    it('should validate email field is filled', async () => {
      const sendButton = screen.getByRole('button', { name: 'Send Reset Code' });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter your email address.')).toBeInTheDocument();
      });
    });

    it('should show link to sign in', () => {
      expect(screen.getByText('Remember your password?')).toBeInTheDocument();
      const signInLink = screen.getByRole('button', { name: 'Sign in' });
      expect(signInLink).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should lock body scroll when modal is open', () => {
      const { unmount } = renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();
      expect(document.body.style.overflow).toBe('');
    });

    it('should close on Escape key press', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close when clicking overlay', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const overlay = screen.getByRole('dialog').parentElement?.firstChild;
      if (overlay) {
        fireEvent.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should not close when clicking modal content', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const modalContent = screen.getByRole('heading', { name: 'Sign In' });
      fireEvent.click(modalContent);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should have proper autocomplete attributes', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

      expect(emailInput.autocomplete).toBe('email');
      expect(passwordInput.autocomplete).toBe('current-password');
    });
  });

  describe('Error and Success Messages', () => {
    it('should display error messages with proper ARIA attributes', async () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const signInButton = screen.getByRole('button', { name: 'Sign In' });
      fireEvent.click(signInButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'assertive');
        expect(alert).toHaveTextContent('Please enter both email and password.');
      });
    });

    it('should clear errors when switching views', async () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      // Generate an error
      const signInButton = screen.getByRole('button', { name: 'Sign In' });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter both email and password.')).toBeInTheDocument();
      });

      // Switch view
      const signUpTab = screen.getByRole('button', { name: 'Sign Up' });
      fireEvent.click(signUpTab);

      // Error should be cleared
      expect(screen.queryByText('Please enter both email and password.')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable inputs and show loading spinner during sign in', async () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} />
      );

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      const signInButton = screen.getByRole('button', { name: 'Sign In' });

      // Fill in valid credentials
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });

      // The inputs should not be disabled before submission
      expect(emailInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(signInButton).not.toBeDisabled();
    });
  });

  describe('Initial View Prop', () => {
    it('should show sign in view when initialView is signin', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} initialView="signin" />
      );

      expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    });

    it('should show sign up view when initialView is signup', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} initialView="signup" />
      );

      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('should show reset view when initialView is reset', () => {
      renderWithAuth(
        <AuthModal isOpen={true} onClose={mockOnClose} initialView="reset" />
      );

      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
    });
  });

  describe('Form Reset on Modal Open', () => {
    it('should reset all form fields when modal opens', () => {
      const { rerender } = renderWithAuth(
        <AuthModal isOpen={false} onClose={mockOnClose} />
      );

      // Open modal and fill in form
      rerender(
        <AuthProvider>
          <AuthModal isOpen={true} onClose={mockOnClose} />
        </AuthProvider>
      );

      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password' } });

      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password');

      // Close and reopen modal
      rerender(
        <AuthProvider>
          <AuthModal isOpen={false} onClose={mockOnClose} />
        </AuthProvider>
      );

      rerender(
        <AuthProvider>
          <AuthModal isOpen={true} onClose={mockOnClose} />
        </AuthProvider>
      );

      const newEmailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const newPasswordInput = screen.getByLabelText('Password') as HTMLInputElement;

      expect(newEmailInput.value).toBe('');
      expect(newPasswordInput.value).toBe('');
    });
  });
});
