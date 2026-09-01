import { Place, DayPlan } from '../types';

/**
 * Calculate total duration for a day plan by summing all place durations.
 * Uses default of 60 minutes for places without duration_minutes set.
 * 
 * **Validates Requirement 5.1, 5.2:** Uses place duration_minutes when available,
 * defaults to 60 minutes when missing.
 * 
 * @param places - Array of places to calculate duration for
 * @returns Total duration in minutes
 */
export function calculateDayDuration(places: Place[]): number {
  return places.reduce((total, place) => {
    const duration = place.duration_minutes || 60; // Default 60 minutes
    return total + duration;
  }, 0);
}

/**
 * Convert minutes to human-readable duration string.
 * Formats as "Xh Ym", "Xh", or "Ym" depending on the duration.
 * 
 * @param minutes - Duration in minutes to format
 * @returns Formatted duration string (e.g., "2h 30m", "1h", "45m")
 * @example
 * formatDuration(150) // Returns "2h 30m"
 * formatDuration(60)  // Returns "1h"
 * formatDuration(45)  // Returns "45m"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

/**
 * Check if a day plan exceeds the recommended maximum duration of 12 hours.
 * Displays warning to users when a day is too packed.
 * 
 * **Validates Requirement 5.5:** Warns when Day_Plan exceeds 12 hours of activity.
 * 
 * @param dayPlan - The day plan to check
 * @returns true if total_duration exceeds 720 minutes (12 hours)
 */
export function isDayTooLong(dayPlan: DayPlan): boolean {
  const maxMinutes = 12 * 60; // 12 hours
  return dayPlan.total_duration > maxMinutes;
}

/**
 * Format price range for display with fallback for missing values.
 * 
 * **Validates Requirement 12.1:** Displays placeholder for null/empty fields.
 * 
 * @param priceRange - Price range string (e.g., "€€", "€€€")
 * @returns Formatted price range, defaults to "€" if missing
 */
export function formatPriceRange(priceRange?: string | null): string {
  return priceRange || '€';
}

/**
 * Format rating for display as star string with numeric value.
 * 
 * @param rating - Numeric rating (0.0-5.0)
 * @returns Star representation with rating (e.g., "★★★★☆ (4.2)") or "Unrated"
 * @example
 * formatRating(4.2)  // Returns "★★★★☆ (4.2)"
 * formatRating(5.0)  // Returns "★★★★★ (5.0)"
 * formatRating(null) // Returns "Unrated"
 */
export function formatRating(rating?: number | null): string {
  if (!rating) return 'Unrated';

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    '★'.repeat(fullStars) +
    (hasHalfStar ? '½' : '') +
    '☆'.repeat(emptyStars) +
    ` (${rating.toFixed(1)})`
  );
}

/**
 * Check if a place exists in any day of an itinerary.
 * Used to determine if "Add to Itinerary" button should be disabled.
 * 
 * @param placeId - Unique identifier of the place to check
 * @param days - Array of day plans (typically 3 days)
 * @returns true if place exists in any day, false otherwise
 */
export function isPlaceInItinerary(placeId: string, days: DayPlan[]): boolean {
  return days.some(day => day.places.some(place => place.id === placeId));
}

/**
 * Generate a unique identifier for objects (itineraries, etc.).
 * Uses timestamp and random string for uniqueness.
 * 
 * @returns Unique ID string in format "timestamp-randomstring"
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get display value for optional fields with fallback.
 * 
 * **Validates Requirement 12.1:** Displays placeholder for null/empty fields.
 * 
 * @param value - The value to display (may be null or undefined)
 * @param fallback - Fallback text to display if value is missing (default: "N/A")
 * @returns The value if present, otherwise the fallback
 */
export function getDisplayValue(value: string | null | undefined, fallback = 'N/A'): string {
  return value || fallback;
}

/**
 * Filter places by search query matching name, description, or city.
 * Uses case-insensitive substring matching.
 * 
 * **Validates Requirement 11.2, 11.3:** Filters places by matching text against
 * name and description fields with case-insensitive matching.
 * 
 * @param places - Array of places to filter
 * @param query - Search query string
 * @returns Filtered array of places matching the query
 */
export function filterPlacesBySearch(places: Place[], query: string): Place[] {
  if (!query.trim()) return places;

  const lowerQuery = query.toLowerCase();

  return places.filter(
    place =>
      place.name.toLowerCase().includes(lowerQuery) ||
      place.description?.toLowerCase().includes(lowerQuery) ||
      place.city.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Group places by city for geographic clustering.
 * Returns a map of city names to arrays of places in that city.
 * 
 * **Validates Requirement 7.1:** Recommends places in the same city
 * when Day_Plan contains places from a specific city.
 * 
 * @param places - Array of places to group
 * @returns Map of city names to arrays of places
 */
export function groupPlacesByCity(places: Place[]): Map<string, Place[]> {
  const grouped = new Map<string, Place[]>();

  places.forEach(place => {
    const cityPlaces = grouped.get(place.city) || [];
    cityPlaces.push(place);
    grouped.set(place.city, cityPlaces);
  });

  return grouped;
}

/**
 * Extract unique values from a specific field across all places.
 * Handles both single values and arrays (like tags).
 * Used to populate filter dropdown options.
 * 
 * @param places - Array of places to extract values from
 * @param key - The field key to extract values from
 * @returns Array of unique non-null values
 * @example
 * getUniqueValues(places, 'city')     // Returns ["Rome", "Florence", "Venice"]
 * getUniqueValues(places, 'tags')     // Returns ["art", "history", "food", ...]
 */
export function getUniqueValues<K extends keyof Place>(
  places: Place[],
  key: K
): Array<NonNullable<Place[K]>> {
  const values = new Set<NonNullable<Place[K]>>();

  places.forEach(place => {
    const value = place[key];
    if (value != null) {
      if (Array.isArray(value)) {
        value.forEach(v => values.add(v as NonNullable<Place[K]>));
      } else {
        values.add(value as NonNullable<Place[K]>);
      }
    }
  });

  return Array.from(values);
}
