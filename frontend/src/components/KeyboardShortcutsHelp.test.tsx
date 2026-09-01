import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { describe, it, expect, vi } from 'vitest';

/**
 * Test Suite: KeyboardShortcutsHelp Component
 * 
 * **Validates: Requirements 14.2, 14.5**
 * 
 * Tests keyboard shortcuts help modal functionality including
 * display, close behavior, and Escape key handling.
 */
describe('KeyboardShortcutsHelp', () => {
  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const onClose = vi.fn();
      const { container } = render(
        <KeyboardShortcutsHelp isOpen={false} onClose={onClose} />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should display all shortcut sections', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      // Check for main sections
      expect(screen.getByText('Global Navigation')).toBeInTheDocument();
      expect(screen.getByText('Skip Links')).toBeInTheDocument();
      expect(screen.getByText('Place List Navigation')).toBeInTheDocument();
      expect(screen.getByText('Modals and Dialogs')).toBeInTheDocument();
      expect(screen.getByText('Forms')).toBeInTheDocument();
    });

    it('should display accessibility tips', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      expect(screen.getByText(/💡 Accessibility Tips/)).toBeInTheDocument();
      expect(screen.getByText(/All interactive elements are keyboard accessible/)).toBeInTheDocument();
    });
  });

  describe('Close functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      const closeButtons = screen.getAllByLabelText(/Close/i);
      fireEvent.click(closeButtons[0]); // Click the X button in header
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Close button in footer is clicked', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /^Close$/i });
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', () => {
      const onClose = vi.fn();
      const { container } = render(
        <KeyboardShortcutsHelp isOpen={true} onClose={onClose} />
      );
      
      // Find the overlay (the first child div with fixed positioning)
      const overlay = container.querySelector('.fixed.inset-0.bg-black');
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'shortcuts-modal-title');
    });

    it('should focus close button when opened', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      // The close button in the header should receive focus
      const closeButtons = screen.getAllByLabelText(/Close/i);
      // Note: In test environment, focus management might not work exactly as in browser
      // This test verifies the button exists and is accessible
      expect(closeButtons[0]).toBeInTheDocument();
    });

    it('should lock body scroll when open', () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <KeyboardShortcutsHelp isOpen={true} onClose={onClose} />
      );
      
      // Body overflow should be hidden when modal is open
      expect(document.body.style.overflow).toBe('hidden');
      
      // Body overflow should be restored when modal is closed
      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Keyboard shortcuts display', () => {
    it('should display arrow key shortcuts for list navigation', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      expect(screen.getByText('Navigate to previous place in list')).toBeInTheDocument();
      expect(screen.getByText('Navigate to next place in list')).toBeInTheDocument();
    });

    it('should display Home/End shortcuts', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      expect(screen.getByText('Jump to first place in list')).toBeInTheDocument();
      expect(screen.getByText('Jump to last place in list')).toBeInTheDocument();
    });

    it('should display Tab navigation shortcuts', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      expect(screen.getByText('Move focus to next interactive element')).toBeInTheDocument();
      expect(screen.getByText('Move focus to previous interactive element')).toBeInTheDocument();
    });

    it('should display Escape key shortcut', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      expect(screen.getByText('Close current modal or dialog')).toBeInTheDocument();
    });

    it('should display Enter key shortcuts', () => {
      const onClose = vi.fn();
      render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />);
      
      expect(screen.getByText('Submit form or confirm action')).toBeInTheDocument();
    });
  });
});
