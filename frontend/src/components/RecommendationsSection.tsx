import { useMemo } from 'react';
import { Place } from '../types';
import { PlaceCard } from './PlaceCard';

// ============================================================================
// Types
// ============================================================================

export interface RecommendationsSectionProps {
  /**
   * All available places from the dataset
   */
  allPlaces: Place[];
  
  /**
   * Places currently in the itinerary (across all days)
   */
  itineraryPlaces: Place[];
  
  /**
   * Set of place IDs currently in the itinerary (for highlighting)
   */
  itineraryPlaceIds: Set<string>;
  
  /**
   * Callback to add a place to the itinerary
   */
  onAddToItinerary?: (place: Place) => void;
  
  /**
   * Optional CSS class name for the container
   */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract unique cities from itinerary places
 */
function extractCities(places: Place[]): string[] {
  const cities = new Set(places.map(p => p.city));
  return Array.from(cities);
}

/**
 * Extract unique tags from itinerary places
 */
function extractTags(places: Place[]): string[] {
  const tags = new Set<string>();
  places.forEach(place => {
    if (place.tags) {
      place.tags.forEach(tag => tags.add(tag));
    }
  });
  return Array.from(tags);
}

/**
 * Calculate preference match score for a place
 * 
 * Scoring:
 * - City match: +3 points
 * - Tag match: +2 points per matching tag
 * - Rating boost: +0.5 * rating
 */
function calculateRecommendationScore(
  place: Place,
  preferredCities: string[],
  preferredTags: string[]
): number {
  let score = 0;
  
  // City match (weight: 3)
  if (preferredCities.includes(place.city)) {
    score += 3;
  }
  
  // Tag match (weight: 2 per match)
  if (place.tags) {
    const matchingTags = place.tags.filter(tag => preferredTags.includes(tag));
    score += matchingTags.length * 2;
  }
  
  // Rating boost (weight: rating / 2)
  if (place.rating) {
    score += place.rating / 2;
  }
  
  return score;
}

/**
 * Generate recommendations based on itinerary preferences
 * 
 * Requirements:
 * - 7.1: Recommend places from same cities as itinerary
 * - 7.2: Recommend places with similar tags
 * - 7.3: Prioritize by rating
 * - 7.4: Display in dedicated section
 * - 7.5: Limit to 10 recommendations
 * - 7.6: Show empty state if no recommendations
 */
function generateRecommendations(
  allPlaces: Place[],
  itineraryPlaces: Place[],
  itineraryPlaceIds: Set<string>
): Place[] {
  // If no itinerary places, no recommendations
  if (itineraryPlaces.length === 0) {
    return [];
  }
  
  // Extract preferences from itinerary
  const preferredCities = extractCities(itineraryPlaces);
  const preferredTags = extractTags(itineraryPlaces);
  
  // Filter out places already in itinerary
  const candidatePlaces = allPlaces.filter(place => !itineraryPlaceIds.has(place.id));
  
  // Score and filter places
  const scoredPlaces = candidatePlaces
    .map(place => ({
      place,
      score: calculateRecommendationScore(place, preferredCities, preferredTags)
    }))
    .filter(({ score }) => score > 0); // Only places with preference match
  
  // Sort by score (primary) and rating (secondary)
  scoredPlaces.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score; // Higher score first
    }
    // Tie-breaker: rating
    const ratingA = a.place.rating || 0;
    const ratingB = b.place.rating || 0;
    return ratingB - ratingA;
  });
  
  // Limit to 10 recommendations
  return scoredPlaces.slice(0, 10).map(({ place }) => place);
}

// ============================================================================
// RecommendationsSection Component
// ============================================================================

/**
 * RecommendationsSection Component
 * 
 * Displays contextual recommendations based on the current itinerary.
 * Analyzes existing places to suggest similar options.
 * 
 * Features:
 * - Analyzes cities and tags from itinerary
 * - Filters similar places from dataset
 * - Sorts by rating and preference match
 * - Limits to 10 recommendations
 * - Shows empty state when no itinerary or no recommendations
 * 
 * Requirements Coverage:
 * - 7.1: Recommend places from same cities
 * - 7.2: Recommend places with similar tags
 * - 7.3: Prioritize by rating
 * - 7.4: Display in dedicated section
 * - 7.5: Limit to 10 recommendations
 * - 7.6: Show empty state if no recommendations
 * 
 * @example
 * ```tsx
 * <RecommendationsSection
 *   allPlaces={places}
 *   itineraryPlaces={allItineraryPlaces}
 *   itineraryPlaceIds={itineraryPlaceIds}
 *   onAddToItinerary={addPlaceToDay}
 * />
 * ```
 */
export function RecommendationsSection({
  allPlaces,
  itineraryPlaces,
  itineraryPlaceIds,
  onAddToItinerary,
  className = '',
}: RecommendationsSectionProps): JSX.Element {
  // Generate recommendations using memoization to avoid recalculation
  const recommendations = useMemo(() => {
    return generateRecommendations(allPlaces, itineraryPlaces, itineraryPlaceIds);
  }, [allPlaces, itineraryPlaces, itineraryPlaceIds]);
  
  // Extract preference context for display
  const preferredCities = useMemo(() => extractCities(itineraryPlaces), [itineraryPlaces]);
  const preferredTags = useMemo(() => extractTags(itineraryPlaces), [itineraryPlaces]);
  
  // Empty state: no itinerary
  if (itineraryPlaces.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Recommended for You
        </h3>
        <div className="text-center py-8">
          <svg
            className="w-16 h-16 text-gray-300 mb-4 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p className="text-gray-600 text-sm">
            Add places to your itinerary to get personalized recommendations
          </p>
        </div>
      </div>
    );
  }
  
  // Empty state: no recommendations found
  if (recommendations.length === 0) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Recommended for You
        </h3>
        <div className="text-center py-8">
          <svg
            className="w-16 h-16 text-gray-300 mb-4 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-600 text-sm">
            No recommendations available based on your current itinerary
          </p>
        </div>
      </div>
    );
  }
  
  // Display recommendations
  return (
    <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Recommended for You
        </h3>
        <p className="text-sm text-gray-600">
          Based on your interest in{' '}
          {preferredCities.length > 0 && (
            <>
              <span className="font-medium">{preferredCities.join(', ')}</span>
              {preferredTags.length > 0 && ' and '}
            </>
          )}
          {preferredTags.length > 0 && (
            <span className="font-medium">{preferredTags.slice(0, 3).join(', ')}</span>
          )}
        </p>
      </div>
      
      <div className="space-y-4">
        {recommendations.map(place => (
          <PlaceCard
            key={place.id}
            place={place}
            isInItinerary={false}
            onAddToItinerary={onAddToItinerary}
          />
        ))}
      </div>
    </div>
  );
}
