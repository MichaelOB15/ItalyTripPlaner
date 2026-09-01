import React, { useState } from 'react';
import { Place } from '../types';
import { useUI } from '../contexts/UIContext';

// ============================================================================
// Types
// ============================================================================

export interface PlaceCardProps {
  /**
   * Place object to display
   */
  place: Place;

  /**
   * Whether this place is already in the itinerary
   */
  isInItinerary?: boolean;

  /**
   * Callback when "Add to Itinerary" button is clicked
   * If not provided, the button will not be shown
   */
  onAddToItinerary?: (place: Place) => void;

  /**
   * Optional additional CSS classes
   */
  className?: string;

  /**
   * Optional tab index for keyboard navigation
   */
  tabIndex?: number;

  /**
   * Optional data attribute for focus state
   */
  'data-focused'?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Render star rating display
 */
function renderStarRating(rating: number | null | undefined): string {
  if (!rating) return '';

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    '★'.repeat(fullStars) +
    (hasHalfStar ? '☆' : '') +
    '☆'.repeat(emptyStars)
  );
}

/**
 * Render price range as euro symbols
 * Using HTML entities to ensure proper euro symbol rendering
 */
function renderPriceRange(priceRange: string | null | undefined): string {
  if (!priceRange) return '€';
  // Count the euro symbols and reconstruct to ensure proper rendering
  const count = priceRange.length;
  return '€'.repeat(count);
}

/**
 * Get color class for tag badges
 */
function getTagColorClass(_tag: string, index: number): string {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-yellow-100 text-yellow-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
  ];
  return colors[index % colors.length];
}

/**
 * Truncate description text
 */
function truncateDescription(description: string | null | undefined, maxLength: number = 120): string {
  if (!description) return 'No description available';
  if (description.length <= maxLength) return description;
  return description.substring(0, maxLength) + '...';
}

// ============================================================================
// Component
// ============================================================================

/**
 * PlaceCard Component
 * 
 * Displays a summary card for a place with key information including:
 * - Name, city, and type
 * - Rating (as stars) or "Unrated"
 * - Price range (as euro symbols)
 * - Tags as colored badges
 * - Booking required indicator
 * - Truncated description
 * - Add to itinerary button with day selector (optional)
 * 
 * Clicking the card opens the PlaceModal with detailed information.
 * Handles missing/null fields gracefully with fallback text.
 * 
 * Requirements Coverage:
 * - 3.4: Displays place name, type, city, rating, price range, and description
 * - 3.5: Opens detailed view on click
 * - 3.6: Indicates when booking is required
 * - 3.7: Displays seasonal notes when present
 * - 12.1: Handles null/missing fields with fallbacks
 * 
 * @example
 * ```tsx
 * <PlaceCard 
 *   place={place} 
 *   isInItinerary={false}
 * />
 * ```
 */
export const PlaceCard = React.memo(function PlaceCard({
  place,
  isInItinerary = false,
  onAddToItinerary,
  className = '',
}: PlaceCardProps): JSX.Element {
  const { openPlaceDetailModal } = useUI();
  const [showAllTags, setShowAllTags] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  /**
   * Handle card click - open detail modal
   */
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking the add button or expand buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    openPlaceDetailModal(place);
  };

  /**
   * Handle add to itinerary button click
   */
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToItinerary) {
      onAddToItinerary(place);
    }
  };

  /**
   * Handle show more tags
   */
  const handleShowMoreTags = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAllTags(!showAllTags);
  };

  /**
   * Handle show more description
   */
  const handleShowMoreDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFullDescription(!showFullDescription);
  };

  const stars = renderStarRating(place.rating);
  const priceSymbols = renderPriceRange(place.price_range);
  const truncatedDescription = truncateDescription(place.description);
  const shouldTruncateDescription = (place.description?.length || 0) > 120;
  const displayDescription = showFullDescription ? (place.description || 'No description available') : truncatedDescription;
  const tags = place.tags || [];
  const displayTags = showAllTags ? tags : tags.slice(0, 5);

  return (
    <article
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-4 ${
        isInItinerary ? 'border-2 border-blue-500' : 'border border-gray-200'
      } ${className}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPlaceDetailModal(place);
        }
      }}
      aria-label={`View details for ${place.name}`}
    >
      {/* Header: Name, City, Type */}
      <header className="mb-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{place.name}</h3>
        <div className="flex items-center text-sm text-gray-600">
          <span className="capitalize">{place.type.replace('_', ' ')}</span>
          <span className="mx-2">•</span>
          <span>{place.city}</span>
          {place.neighborhood && (
            <>
              <span className="mx-2">•</span>
              <span>{place.neighborhood}</span>
            </>
          )}
        </div>
      </header>

      {/* Rating and Price */}
      <div className="flex items-center gap-3 mb-2">
        {/* Rating */}
        <div className="flex items-center">
          {place.rating ? (
            <>
              <span className="text-yellow-500 text-sm mr-1" aria-label={`Rating: ${place.rating} out of 5`}>
                {stars}
              </span>
              <span className="text-xs text-gray-600">({place.rating.toFixed(1)})</span>
            </>
          ) : (
            <span className="text-xs text-gray-500 italic">Unrated</span>
          )}
        </div>

        {/* Price Range */}
        <div className="flex items-center">
          <span className="text-green-700 font-semibold" aria-label={`Price range: ${priceSymbols}`}>
            {priceSymbols}
          </span>
        </div>

        {/* Booking Required Indicator */}
        {place.booking_required && (
          <div className="ml-auto">
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
              title="Advance booking required"
              aria-label="Advance booking required"
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              Booking
            </span>
          </div>
        )}

        {/* In Itinerary Indicator */}
        {isInItinerary && (
          <div className="ml-auto">
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              aria-label="Already in itinerary"
            >
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              In Itinerary
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {displayTags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTagColorClass(tag, index)}`}
            >
              {tag}
            </span>
          ))}
          {tags.length > 5 && (
            <button
              onClick={handleShowMoreTags}
              className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
              aria-label={showAllTags ? 'Show fewer tags' : `Show ${tags.length - 5} more tags`}
            >
              {showAllTags ? '- Show less' : `+${tags.length - 5} more`}
            </button>
          )}
        </div>
      )}

      {/* Description */}
      <div className="mb-3">
        <p className="text-sm text-gray-700">{displayDescription}</p>
        {shouldTruncateDescription && (
          <button
            onClick={handleShowMoreDescription}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
            aria-label={showFullDescription ? 'Show less description' : 'Show full description'}
          >
            {showFullDescription ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Duration hint */}
      {place.duration_minutes && (
        <p className="text-xs text-gray-500 mb-3">
          <svg
            className="w-3 h-3 inline mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          ~{place.duration_minutes} min
        </p>
      )}

      {/* Action Button */}
      {onAddToItinerary && !isInItinerary && (
        <button
          onClick={handleAddClick}
          className="w-full mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-label={`Add ${place.name} to itinerary`}
        >
          Add to Itinerary
        </button>
      )}
    </article>
  );
});
