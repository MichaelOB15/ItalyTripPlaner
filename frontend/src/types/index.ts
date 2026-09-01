// Core data models for the Italy Trip Planner
// These interfaces match the Java backend models for type safety and consistency

export type PlaceType =
  | 'restaurant'
  | 'historic_site'
  | 'museum'
  | 'neighborhood'
  | 'market'
  | 'cafe'
  | 'viewpoint'
  | 'experience'
  | 'park'
  | 'shop';

/**
 * Represents a single place/location in the dataset.
 * Matches the Java Place model with snake_case JSON property names.
 * 
 * @see com.italytrip.models.Place
 */
export interface Place {
  // Required fields
  id: string;
  name: string;
  type: PlaceType;
  city: string;
  latitude: number;
  longitude: number;

  // Optional fields
  region?: string | null;
  neighborhood?: string | null;
  description?: string | null;
  hours?: string | null;
  duration_minutes?: number | null;
  price_range?: string | null;
  rating?: number | null;
  tags?: string[];
  seasonal_notes?: string | null;
  booking_required?: boolean | null;
}

/**
 * Represents a single day's plan within a 3-day itinerary.
 * Matches the Java DayPlan model with snake_case JSON property names.
 * 
 * @see com.italytrip.models.DayPlan
 */
export interface DayPlan {
  day_number: 1 | 2 | 3;
  places: Place[];
  total_duration: number; // Total minutes
  start_time: string; // Default "08:00"
}

/**
 * Represents a complete 3-day travel itinerary.
 * Matches the Java Itinerary model with snake_case JSON property names.
 * 
 * Date fields are serialized as ISO 8601 strings (e.g., "2024-01-15T10:30:00").
 * 
 * @see com.italytrip.models.Itinerary
 */
export interface Itinerary {
  id: string;
  name: string;
  days: [DayPlan, DayPlan, DayPlan]; // Fixed 3-day structure
  preferences: UserPreferences;
  created_at: string; // ISO 8601 datetime string
  last_modified: string; // ISO 8601 datetime string
}

/**
 * Trip pace/activity level for itinerary generation.
 * Matches the Java TripPace enum.
 * 
 * @see com.italytrip.models.UserPreferences.TripPace
 */
export type TripPace = 'relaxed' | 'moderate' | 'packed';

/**
 * User preferences for itinerary generation and recommendations.
 * Matches the Java UserPreferences model with snake_case JSON property names.
 * 
 * @see com.italytrip.models.UserPreferences
 */
export interface UserPreferences {
  cities: string[]; // Max 3 cities
  interests: string[]; // Tags/interests, max 5
  pace: TripPace;
  price_range: string[]; // Budget constraints (€, €€, €€€, €€€€)
  include_booking_required: boolean;
}

/**
 * Frontend-only filter state (not sent to backend).
 * Used for client-side filtering UI state management.
 */
export interface FilterState {
  cities: string[];
  types: PlaceType[];
  tags: string[];
  priceRanges: string[];
  searchQuery: string;
  hasCoordinates?: boolean;
  bookingRequired?: boolean | null; // null = show all, true = only booking required, false = only non-booking
  minRating?: number | null; // null = no filter, otherwise minimum star rating (0-5)
}

/**
 * Error severity levels for validation.
 * Matches the Java ValidationError.Severity enum.
 * 
 * @see com.italytrip.models.ValidationError.Severity
 */
export type ValidationSeverity = 'critical' | 'non-critical';

/**
 * Represents a validation error found in a dataset or itinerary.
 * Matches the Java ValidationError model with snake_case JSON property names.
 * 
 * @see com.italytrip.models.ValidationError
 */
export interface ValidationError {
  place_id: string | null; // Null for file-level errors
  field: string;
  message: string;
  severity: ValidationSeverity;
}

/**
 * Represents a validation warning for a dataset or itinerary.
 * Warnings indicate potential issues that do not prevent data usage.
 * Matches the Java ValidationWarning model with snake_case JSON property names.
 * 
 * @see com.italytrip.models.ValidationWarning
 */
export interface ValidationWarning {
  place_id: string;
  field: string;
  message: string;
  impact: string; // Description of feature impact
}

/**
 * Result of validating a dataset or itinerary.
 * Matches the Java ValidationResult model with snake_case JSON property names.
 * 
 * @see com.italytrip.models.ValidationResult
 */
export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  place_count: number;
  excluded_count: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Query parameters for GET /places endpoint.
 * Uses comma-separated strings for array parameters.
 */
export interface GetPlacesQuery {
  cities?: string; // Comma-separated city names
  types?: string; // Comma-separated place types
  tags?: string; // Comma-separated tags
  limit?: number; // Default 100
  offset?: number; // Pagination offset
}

/**
 * Response from GET /places endpoint.
 */
export interface GetPlacesResponse {
  places: Place[];
  total: number;
  has_more: boolean;
}

/**
 * Request body for POST /recommendations endpoint.
 */
export interface RecommendationsRequest {
  preferences: UserPreferences;
  existingItinerary?: Itinerary; // For replan functionality
}

/**
 * Response from POST /recommendations endpoint.
 */
export interface RecommendationsResponse {
  itinerary: Itinerary;
  reasoning: string; // Human-readable explanation
  alternative_places: Place[]; // Runner-up suggestions
}

/**
 * Request body for creating/updating an itinerary.
 */
export interface ItineraryRequest {
  name: string;
  days: DayPlan[];
  preferences?: UserPreferences;
}

/**
 * Response when creating/updating an itinerary.
 */
export interface ItineraryResponse {
  itinerary: Itinerary;
  message?: string;
}
