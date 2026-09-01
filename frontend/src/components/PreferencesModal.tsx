import React, { useState, useEffect, useRef } from 'react';
import { UserPreferences, TripPace } from '../types';

// ============================================================================
// Constants
// ============================================================================

const AVAILABLE_CITIES = [
  'Rome',
  'Florence',
  'Venice',
  'Milan',
  'Bologna',
  'Siena',
  'Parma',
  'Modena',
  'Como',
  'Bellagio',
  'Lenno',
  'Burano',
  'Padua',
  'Maranello',
  'Pienza',
  'Isola della Scala',
];

const AVAILABLE_TAGS = [
  'iconic',
  'historic',
  'art',
  'cultural',
  'food',
  'wine',
  'romantic',
  'scenic',
  'views',
  'local-favorite',
  'hidden-gem',
  'photogenic',
  'outdoors',
  'active',
  'relaxing',
  'family-friendly',
  'morning',
  'evening',
  'market',
  'experience',
  'budget',
  'splurge',
  'tourist-heavy',
  'rainy-day',
  'free',
  'modern',
  'lively',
  'quiet',
  'seasonal',
  'shop',
];

const PRICE_RANGES = ['€', '€€', '€€€', '€€€€'];

const PACE_OPTIONS: Array<{
  value: TripPace;
  label: string;
  description: string;
}> = [
  {
    value: 'relaxed',
    label: 'Relaxed',
    description: 'Take it easy with 3-4 places per day (6 hours of activities)',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced itinerary with 4-5 places per day (8 hours of activities)',
  },
  {
    value: 'packed',
    label: 'Packed',
    description: 'See it all with 5-6 places per day (10 hours of activities)',
  },
];

// ============================================================================
// Types
// ============================================================================

export interface PreferencesModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Callback when user submits preferences
   */
  onSubmit: (preferences: UserPreferences) => void;

  /**
   * Optional: Initial preferences to pre-populate the form
   */
  initialPreferences?: Partial<UserPreferences>;

  /**
   * Whether the form is currently submitting (shows loading spinner)
   */
  isLoading?: boolean;

  /**
   * Error message to display (if any)
   */
  error?: string | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PreferencesModal Component
 *
 * A modal form for collecting user preferences to generate itinerary recommendations.
 * Displays interactive form inputs with validation for user preference collection.
 *
 * Features:
 * - City multi-select (max 3 cities)
 * - Interests/tags multi-select (max 5 tags)
 * - Pace radio buttons (relaxed, moderate, packed) with descriptions
 * - Price range multi-select checkboxes (€, €€, €€€, €€€€)
 * - Booking required toggle
 * - Submit and cancel buttons
 * - Form validation: at least 1 city and 1 interest required
 * - Modal overlay with click-outside to close
 * - Keyboard support (Escape to close)
 * - Focus trap for accessibility
 * - Scroll lock when open
 *
 * Requirements Coverage:
 * - 18.2: Prompt for preferences including preferred cities, interests (tags), and trip pace
 *
 * @example
 * ```tsx
 * const [showPreferences, setShowPreferences] = useState(false);
 *
 * <PreferencesModal
 *   isOpen={showPreferences}
 *   onClose={() => setShowPreferences(false)}
 *   onSubmit={(prefs) => generateRecommendation(prefs)}
 * />
 * ```
 */
export function PreferencesModal({
  isOpen,
  onClose,
  onSubmit,
  initialPreferences,
  isLoading = false,
  error = null,
}: PreferencesModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Form state
  const [cities, setCities] = useState<string[]>(initialPreferences?.cities || []);
  const [interests, setInterests] = useState<string[]>(initialPreferences?.interests || []);
  const [pace, setPace] = useState<TripPace>(initialPreferences?.pace || 'moderate');
  const [priceRange, setPriceRange] = useState<string[]>(
    initialPreferences?.price_range || ['€', '€€', '€€€']
  );
  const [includeBookingRequired, setIncludeBookingRequired] = useState<boolean>(
    initialPreferences?.include_booking_required ?? true
  );

  // Validation errors
  const [errors, setErrors] = useState<{
    cities?: string;
    interests?: string;
  }>({});

  // Reset form when modal opens with new initial preferences
  useEffect(() => {
    if (isOpen) {
      setCities(initialPreferences?.cities || []);
      setInterests(initialPreferences?.interests || []);
      setPace(initialPreferences?.pace || 'moderate');
      setPriceRange(initialPreferences?.price_range || ['€', '€€', '€€€']);
      setIncludeBookingRequired(initialPreferences?.include_booking_required ?? true);
      setErrors({});
    }
  }, [isOpen, initialPreferences]);

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

  // Handle city toggle
  const handleCityToggle = (city: string) => {
    setCities((prev) => {
      if (prev.includes(city)) {
        // Remove city
        return prev.filter((c) => c !== city);
      } else {
        // Add city (max 3)
        if (prev.length >= 3) {
          return prev;
        }
        return [...prev, city];
      }
    });
    // Clear city error when user makes a selection
    if (errors.cities) {
      setErrors((prev) => ({ ...prev, cities: undefined }));
    }
  };

  // Handle interest toggle
  const handleInterestToggle = (interest: string) => {
    setInterests((prev) => {
      if (prev.includes(interest)) {
        // Remove interest
        return prev.filter((i) => i !== interest);
      } else {
        // Add interest (max 5)
        if (prev.length >= 5) {
          return prev;
        }
        return [...prev, interest];
      }
    });
    // Clear interests error when user makes a selection
    if (errors.interests) {
      setErrors((prev) => ({ ...prev, interests: undefined }));
    }
  };

  // Handle price range toggle
  const handlePriceRangeToggle = (price: string) => {
    setPriceRange((prev) => {
      if (prev.includes(price)) {
        // Remove price (but keep at least one)
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((p) => p !== price);
      } else {
        // Add price
        return [...prev, price];
      }
    });
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (cities.length === 0) {
      newErrors.cities = 'Please select at least 1 city';
    }

    if (interests.length === 0) {
      newErrors.interests = 'Please select at least 1 interest';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const preferences: UserPreferences = {
      cities,
      interests,
      pace,
      price_range: priceRange,
      include_booking_required: includeBookingRequired,
    };

    onSubmit(preferences);
  };

  // Handle cancel
  const handleCancel = () => {
    onClose();
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
      aria-labelledby="preferences-modal-title"
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
                id="preferences-modal-title"
                className="text-2xl font-bold text-gray-900"
              >
                Trip Preferences
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Tell us about your ideal trip and we'll create a personalized itinerary for you
              </p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close modal"
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Body */}
            <div className="px-6 py-4 space-y-6">
              {/* Cities Selection */}
              <div>
                <label 
                  id="cities-label"
                  className="block text-lg font-semibold text-gray-900 mb-2"
                >
                  Cities <span className="text-red-500">*</span>
                </label>
                <p 
                  id="cities-description"
                  className="text-sm text-gray-600 mb-3"
                >
                  Select up to 3 cities you'd like to visit ({cities.length}/3 selected)
                </p>
                <div 
                  role="group" 
                  aria-labelledby="cities-label"
                  aria-describedby="cities-description"
                  className="flex flex-wrap gap-2"
                >
                  {AVAILABLE_CITIES.map((city) => {
                    const isSelected = cities.includes(city);
                    const isDisabled = !isSelected && cities.length >= 3;
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => handleCityToggle(city)}
                        disabled={isDisabled}
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${city}`}
                        aria-pressed={isSelected}
                        className={`
                          px-4 py-2 rounded-full text-sm font-medium transition-all
                          ${
                            isSelected
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : isDisabled
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {isSelected && '✓ '}
                        {city}
                      </button>
                    );
                  })}
                </div>
                {errors.cities && (
                  <p 
                    className="mt-2 text-sm text-red-600"
                    role="alert"
                    aria-live="polite"
                  >
                    {errors.cities}
                  </p>
                )}
              </div>

              {/* Interests Selection */}
              <div>
                <label 
                  id="interests-label"
                  className="block text-lg font-semibold text-gray-900 mb-2"
                >
                  Interests <span className="text-red-500">*</span>
                </label>
                <p 
                  id="interests-description"
                  className="text-sm text-gray-600 mb-3"
                >
                  Select up to 5 interests or tags ({interests.length}/5 selected)
                </p>
                <div 
                  role="group"
                  aria-labelledby="interests-label"
                  aria-describedby="interests-description"
                  className="flex flex-wrap gap-2"
                >
                  {AVAILABLE_TAGS.map((tag) => {
                    const isSelected = interests.includes(tag);
                    const isDisabled = !isSelected && interests.length >= 5;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleInterestToggle(tag)}
                        disabled={isDisabled}
                        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${tag} interest`}
                        aria-pressed={isSelected}
                        className={`
                          px-3 py-1.5 rounded-full text-sm font-medium transition-all
                          ${
                            isSelected
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : isDisabled
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }
                        `}
                      >
                        {isSelected && '✓ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {errors.interests && (
                  <p 
                    className="mt-2 text-sm text-red-600"
                    role="alert"
                    aria-live="polite"
                  >
                    {errors.interests}
                  </p>
                )}
              </div>

              {/* Pace Selection */}
              <div>
                <fieldset>
                  <legend className="block text-lg font-semibold text-gray-900 mb-2">
                    Trip Pace <span className="text-red-500">*</span>
                  </legend>
                  <p 
                    id="pace-description"
                    className="text-sm text-gray-600 mb-3"
                  >
                    How much do you want to pack into each day?
                  </p>
                  <div 
                    className="space-y-3"
                    role="radiogroup"
                    aria-describedby="pace-description"
                  >
                  {PACE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`
                        flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all
                        ${
                          pace === option.value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="pace"
                        value={option.value}
                        checked={pace === option.value}
                        onChange={(e) => setPace(e.target.value as TripPace)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                        aria-label={`${option.label}: ${option.description}`}
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                </fieldset>
              </div>

              {/* Price Range Selection */}
              <div>
                <fieldset>
                  <legend className="block text-lg font-semibold text-gray-900 mb-2">
                    Price Range
                  </legend>
                  <p 
                    id="price-description"
                    className="text-sm text-gray-600 mb-3"
                  >
                    Select the price ranges you're comfortable with
                  </p>
                  <div 
                    className="flex flex-wrap gap-4"
                    role="group"
                    aria-describedby="price-description"
                  >
                  {PRICE_RANGES.map((price) => {
                    const isSelected = priceRange.includes(price);
                    return (
                      <label
                        key={price}
                        className="flex items-center cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePriceRangeToggle(price)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          aria-label={`Include ${price} price range`}
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {price}
                        </span>
                      </label>
                    );
                  })}
                </div>
                </fieldset>
              </div>

              {/* Booking Required Toggle */}
              <div>
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBookingRequired}
                    onChange={(e) => setIncludeBookingRequired(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    aria-label="Include places that require advance booking"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      Include places that require booking
                    </div>
                    <div className="text-sm text-gray-600">
                      Some places require advance reservations. Uncheck if you prefer
                      spontaneous visits.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer - Action Buttons */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
              {/* Error Message */}
              {error && (
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
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
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
                      Generating...
                    </>
                  ) : (
                    'Generate Itinerary'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
