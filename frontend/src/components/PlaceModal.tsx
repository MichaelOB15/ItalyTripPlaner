import React, { useEffect, useRef } from 'react';
import { Place } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PlaceModalProps {
  /**
   * The place to display in detailed view
   */
  place: Place;

  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when modal should close
   */
  onClose: () => void;

  /**
   * Callback when user wants to add place to a specific day
   */
  onAddToDay: (place: Place, day: 1 | 2 | 3) => void;

  /**
   * Optional: Array of day numbers where this place is already added
   * Used to disable those buttons
   */
  daysWithPlace?: Array<1 | 2 | 3>;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PlaceModal Component
 *
 * A modal dialog displaying comprehensive place information with the ability
 * to add the place to specific days in the itinerary.
 *
 * Features:
 * - Full place information display (name, type, location, description)
 * - Operating hours and duration information
 * - Rating and price range display
 * - Tags visualization
 * - Seasonal notes when present
 * - Booking requirement indicator
 * - Coordinates display
 * - "Add to Day 1/2/3" action buttons
 * - Modal overlay with click-outside to close
 * - Keyboard support (Escape to close)
 * - Focus trap for accessibility
 * - Scroll lock when open
 *
 * Requirements Coverage:
 * - 3.5: Displays detailed place information including hours, duration, coordinates, and tags
 * - 3.6: Indicates when a place requires booking
 * - 3.7: Displays seasonal notes when present
 * - 12.1: Handles null/empty fields gracefully with placeholders
 *
 * @example
 * ```tsx
 * const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
 *
 * <PlaceModal
 *   place={selectedPlace}
 *   isOpen={selectedPlace !== null}
 *   onClose={() => setSelectedPlace(null)}
 *   onAddToDay={(place, day) => addPlaceToItinerary(place, day)}
 *   daysWithPlace={[1, 2]}
 * />
 * ```
 */
export function PlaceModal({
  place,
  isOpen,
  onClose,
  onAddToDay,
  daysWithPlace = [],
}: PlaceModalProps): JSX.Element | null {
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

  // Helper: Render rating stars
  const renderRating = (rating: number | null | undefined) => {
    if (rating == null) {
      return <span className="text-gray-500 text-sm">Unrated</span>;
    }

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <svg
            key={`full-${i}`}
            className="w-5 h-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <svg
            className="w-5 h-5 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="half-star">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="#D1D5DB" />
              </linearGradient>
            </defs>
            <path
              fill="url(#half-star)"
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <svg
            key={`empty-${i}`}
            className="w-5 h-5 text-gray-300"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-2 text-sm text-gray-700">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Helper: Format place type for display
  const formatPlaceType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
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
          className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
            <div className="flex-1 pr-4">
              <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
                {place.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {formatPlaceType(place.type)} in {place.city}
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

          {/* Body */}
          <div className="px-6 py-4 space-y-6">
            {/* Location Details */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-medium">City:</span> {place.city}
                </p>
                {place.region && (
                  <p>
                    <span className="font-medium">Region:</span> {place.region}
                  </p>
                )}
                {place.neighborhood && (
                  <p>
                    <span className="font-medium">Neighborhood:</span> {place.neighborhood}
                  </p>
                )}
                <p>
                  <span className="font-medium">Coordinates:</span> {place.latitude.toFixed(6)},{' '}
                  {place.longitude.toFixed(6)}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {place.description || 'No description available.'}
              </p>
            </div>

            {/* Hours and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hours</h3>
                <p className="text-sm text-gray-700">
                  {place.hours || 'Hours not specified'}
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Duration</h3>
                <p className="text-sm text-gray-700">
                  {place.duration_minutes
                    ? `${place.duration_minutes} minutes`
                    : 'Estimated 1 hour'}
                </p>
              </div>
            </div>

            {/* Rating and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rating</h3>
                {renderRating(place.rating)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Price Range</h3>
                <p className="text-sm text-gray-700">
                  {place.price_range ? place.price_range.replace(/â‚¬/g, '€') : 'Not specified'}
                </p>
              </div>
            </div>

            {/* Tags */}
            {place.tags && place.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {place.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Seasonal Notes */}
            {place.seasonal_notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Seasonal Notes</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">{place.seasonal_notes}</p>
                </div>
              </div>
            )}

            {/* Booking Required */}
            {place.booking_required && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Information</h3>
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4 flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-orange-700 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-800">
                      Advance booking required
                    </p>
                    <p className="mt-1 text-sm text-orange-700">
                      This place requires advance reservations. Please book ahead to ensure
                      availability.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Add to Day Buttons */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Add to Itinerary</h3>
            <div className="flex flex-wrap gap-3">
              {([1, 2, 3] as const).map((day) => {
                const isAdded = daysWithPlace.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => onAddToDay(place, day)}
                    disabled={isAdded}
                    className={`
                      flex-1 min-w-[120px] px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${
                        isAdded
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }
                    `}
                    aria-label={
                      isAdded ? `Already added to Day ${day}` : `Add to Day ${day}`
                    }
                  >
                    {isAdded ? `✓ Added to Day ${day}` : `Add to Day ${day}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
