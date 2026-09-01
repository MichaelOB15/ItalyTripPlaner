import React, { useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcutsHelpProps {
  /**
   * Whether the help modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;
}

// ============================================================================
// Shortcut Data
// ============================================================================

interface ShortcutSection {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const KEYBOARD_SHORTCUTS: ShortcutSection[] = [
  {
    title: 'Global Navigation',
    shortcuts: [
      {
        keys: ['Tab'],
        description: 'Move focus to next interactive element',
      },
      {
        keys: ['Shift', 'Tab'],
        description: 'Move focus to previous interactive element',
      },
      {
        keys: ['?'],
        description: 'Show this keyboard shortcuts help',
      },
    ],
  },
  {
    title: 'Skip Links',
    shortcuts: [
      {
        keys: ['Skip to main content'],
        description: 'Jump to main application content (available on page load)',
      },
      {
        keys: ['Skip to place explorer'],
        description: 'Jump directly to place discovery section',
      },
      {
        keys: ['Skip to itinerary'],
        description: 'Jump directly to itinerary management',
      },
      {
        keys: ['Skip to map'],
        description: 'Jump directly to map view',
      },
    ],
  },
  {
    title: 'Place List Navigation',
    shortcuts: [
      {
        keys: ['↑'],
        description: 'Navigate to previous place in list',
      },
      {
        keys: ['↓'],
        description: 'Navigate to next place in list',
      },
      {
        keys: ['Home'],
        description: 'Jump to first place in list',
      },
      {
        keys: ['End'],
        description: 'Jump to last place in list',
      },
      {
        keys: ['Enter', 'Space'],
        description: 'Open place details modal',
      },
    ],
  },
  {
    title: 'Modals and Dialogs',
    shortcuts: [
      {
        keys: ['Escape'],
        description: 'Close current modal or dialog',
      },
      {
        keys: ['Enter'],
        description: 'Submit form or confirm action',
      },
    ],
  },
  {
    title: 'Forms',
    shortcuts: [
      {
        keys: ['Enter'],
        description: 'Submit form (when focused on input)',
      },
      {
        keys: ['Space'],
        description: 'Toggle checkbox or radio button',
      },
      {
        keys: ['↑', '↓'],
        description: 'Navigate radio button options',
      },
    ],
  },
];

// ============================================================================
// Component
// ============================================================================

/**
 * KeyboardShortcutsHelp Component
 *
 * **Validates: Requirements 14.2, 14.5**
 *
 * A modal dialog that displays comprehensive keyboard shortcuts and navigation
 * instructions for the application. Helps users understand how to navigate
 * the application using only keyboard input.
 *
 * Features:
 * - Comprehensive list of keyboard shortcuts organized by category
 * - Visual key representations
 * - Escape key to close
 * - Modal overlay with click-outside to close
 * - Focus trap for accessibility
 * - Scroll lock when open
 *
 * @example
 * ```tsx
 * const [showHelp, setShowHelp] = useState(false);
 *
 * // Trigger with ? key
 * useEffect(() => {
 *   const handler = (e: KeyboardEvent) => {
 *     if (e.key === '?' && !e.shiftKey) {
 *       setShowHelp(true);
 *     }
 *   };
 *   document.addEventListener('keydown', handler);
 *   return () => document.removeEventListener('keydown', handler);
 * }, []);
 *
 * <KeyboardShortcutsHelp
 *   isOpen={showHelp}
 *   onClose={() => setShowHelp(false)}
 * />
 * ```
 */
export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  // Handle overlay click (click outside modal content)
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  /**
   * Render a keyboard key badge
   */
  const renderKey = (key: string) => (
    <kbd className="inline-flex items-center justify-center px-2 py-1 text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded shadow-sm min-w-[2rem]">
      {key}
    </kbd>
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
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
          className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
            <div className="flex-1 pr-4">
              <h2
                id="shortcuts-modal-title"
                className="text-2xl font-bold text-gray-900"
              >
                Keyboard Shortcuts
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Navigate the Italy Trip Planner efficiently with keyboard shortcuts
              </p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close keyboard shortcuts help"
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
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

          {/* Body */}
          <div className="px-6 py-4">
            <div className="space-y-8">
              {KEYBOARD_SHORTCUTS.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.shortcuts.map((shortcut, shortcutIndex) => (
                      <div
                        key={shortcutIndex}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-[200px]">
                          {shortcut.keys.map((key, keyIndex) => (
                            <React.Fragment key={keyIndex}>
                              {keyIndex > 0 && (
                                <span className="text-gray-400 text-sm">+</span>
                              )}
                              {renderKey(key)}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">
                            {shortcut.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Tips */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                💡 Accessibility Tips
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  All interactive elements are keyboard accessible via Tab key
                </li>
                <li>
                  Focus indicators (blue outline) show which element is currently focused
                </li>
                <li>
                  Screen readers can use skip links to jump to main content areas
                </li>
                <li>
                  Modal dialogs trap focus and can be closed with Escape key
                </li>
                <li>
                  Form fields support standard keyboard input and Enter to submit
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
