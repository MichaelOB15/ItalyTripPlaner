package com.italytrip.validation;

import com.italytrip.models.Place;
import com.italytrip.models.ValidationError;
import com.italytrip.models.ValidationWarning;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Validates place data with intelligent criticality assessment.
 * Determines which missing fields are critical vs. non-critical based on feature dependencies.
 */
public class DataValidator {
    
    // Field criticality mapping
    private static final Map<String, FieldCriticality> FIELD_CRITICALITY_MAP;
    
    static {
        Map<String, FieldCriticality> map = new HashMap<>();
        
        // Critical always - required for basic functionality
        map.put("id", FieldCriticality.CRITICAL_ALWAYS);
        map.put("name", FieldCriticality.CRITICAL_ALWAYS);
        map.put("type", FieldCriticality.CRITICAL_ALWAYS);
        map.put("city", FieldCriticality.CRITICAL_ALWAYS);
        
        // Critical conditional - required for specific features
        map.put("latitude", FieldCriticality.CRITICAL_CONDITIONAL);
        map.put("longitude", FieldCriticality.CRITICAL_CONDITIONAL);
        
        // Important - degrades UX but not blocking
        map.put("description", FieldCriticality.IMPORTANT);
        map.put("hours", FieldCriticality.IMPORTANT);
        map.put("duration_minutes", FieldCriticality.IMPORTANT);
        map.put("rating", FieldCriticality.IMPORTANT);
        map.put("price_range", FieldCriticality.IMPORTANT);
        
        // Optional - nice to have
        map.put("region", FieldCriticality.OPTIONAL);
        map.put("neighborhood", FieldCriticality.OPTIONAL);
        map.put("tags", FieldCriticality.OPTIONAL);
        map.put("seasonal_notes", FieldCriticality.OPTIONAL);
        map.put("booking_required", FieldCriticality.OPTIONAL);
        
        FIELD_CRITICALITY_MAP = Collections.unmodifiableMap(map);
    }

    /**
     * Validates a place with the given validation context.
     * 
     * @param place The place to validate (may have null fields)
     * @param context The validation context specifying enabled features
     * @return ValidationOutcome with inclusion decision and validation messages
     */
    public ValidationOutcome validatePlace(Place place, ValidationContext context) {
        if (place == null) {
            return new ValidationOutcome(false, 
                List.of(new ValidationError(null, "place", "Place object is null", 
                    ValidationError.Severity.CRITICAL)),
                Collections.emptyList(), 
                null);
        }

        List<ValidationError> errors = new ArrayList<>();
        List<ValidationWarning> warnings = new ArrayList<>();

        // Validate always-critical fields
        validateAlwaysCriticalFields(place, errors);

        // Validate conditionally-critical fields
        validateConditionalFields(place, context, warnings);

        // Validate important fields
        validateImportantFields(place, warnings);

        // Determine if place should be included
        boolean shouldInclude = errors.isEmpty();

        // If including, apply defaults for missing fields
        Place processedPlace = shouldInclude ? fillDefaults(place) : null;

        return new ValidationOutcome(shouldInclude, errors, warnings, processedPlace);
    }

    /**
     * Validates a place with default context (all features enabled).
     */
    public ValidationOutcome validatePlace(Place place) {
        return validatePlace(place, ValidationContext.withAllFeatures());
    }

    /**
     * Validates always-critical fields (id, name, type, city).
     */
    private void validateAlwaysCriticalFields(Place place, List<ValidationError> errors) {
        String placeId = place.getId();
        
        if (isNullOrEmpty(place.getId())) {
            errors.add(new ValidationError(
                placeId,
                "id",
                "Missing unique identifier",
                ValidationError.Severity.CRITICAL
            ));
        }

        if (isNullOrEmpty(place.getName())) {
            errors.add(new ValidationError(
                placeId,
                "name",
                "Missing display name",
                ValidationError.Severity.CRITICAL
            ));
        }

        if (place.getType() == null) {
            errors.add(new ValidationError(
                placeId,
                "type",
                "Missing place type",
                ValidationError.Severity.CRITICAL
            ));
        }

        if (isNullOrEmpty(place.getCity())) {
            errors.add(new ValidationError(
                placeId,
                "city",
                "Missing city",
                ValidationError.Severity.CRITICAL
            ));
        }
    }

    /**
     * Validates conditionally-critical fields (coordinates).
     * These are only required for map features.
     */
    private void validateConditionalFields(Place place, ValidationContext context, 
                                          List<ValidationWarning> warnings) {
        String placeId = place.getId();
        
        // Coordinates are only critical for map visualization
        if (context.hasFeature("map")) {
            if (place.getLatitude() == null) {
                warnings.add(new ValidationWarning(
                    placeId,
                    "latitude",
                    "Missing latitude coordinate",
                    "Place will not appear on map but remains in lists"
                ));
            }

            if (place.getLongitude() == null) {
                warnings.add(new ValidationWarning(
                    placeId,
                    "longitude",
                    "Missing longitude coordinate",
                    "Place will not appear on map but remains in lists"
                ));
            }
        }
    }

    /**
     * Validates important fields and generates warnings for missing data.
     */
    private void validateImportantFields(Place place, List<ValidationWarning> warnings) {
        String placeId = place.getId();

        if (isNullOrEmpty(place.getDescription())) {
            warnings.add(new ValidationWarning(
                placeId,
                "description",
                "Missing description",
                "Reduced information in place details view"
            ));
        }

        if (place.getDurationMinutes() == null) {
            warnings.add(new ValidationWarning(
                placeId,
                "duration_minutes",
                "Missing duration",
                "Will use default 60-minute estimate for scheduling"
            ));
        }

        if (isNullOrEmpty(place.getHours())) {
            warnings.add(new ValidationWarning(
                placeId,
                "hours",
                "Missing hours",
                "Operating hours will not be displayed"
            ));
        }

        if (place.getRating() == null) {
            warnings.add(new ValidationWarning(
                placeId,
                "rating",
                "Missing rating",
                "Place will be shown as 'Unrated'"
            ));
        }

        if (isNullOrEmpty(place.getPriceRange())) {
            warnings.add(new ValidationWarning(
                placeId,
                "price_range",
                "Missing price range",
                "Will default to '€' (budget option)"
            ));
        }
    }

    /**
     * Applies sensible defaults for missing important fields.
     * Returns a new Place object with defaults applied.
     */
    private Place fillDefaults(Place place) {
        // Create a builder from existing place
        Place.Builder builder = new Place.Builder()
            .id(place.getId())
            .name(place.getName())
            .type(place.getType())
            .city(place.getCity())
            .latitude(place.getLatitude())
            .longitude(place.getLongitude())
            .region(place.getRegion())
            .neighborhood(place.getNeighborhood());

        // Apply defaults for important fields
        builder.description(
            isNullOrEmpty(place.getDescription()) 
                ? "No description available." 
                : place.getDescription()
        );

        builder.hours(
            isNullOrEmpty(place.getHours()) 
                ? "Hours not specified" 
                : place.getHours()
        );

        builder.durationMinutes(
            place.getDurationMinutes() != null 
                ? place.getDurationMinutes() 
                : 60
        );

        builder.priceRange(
            isNullOrEmpty(place.getPriceRange()) 
                ? "€" 
                : place.getPriceRange()
        );

        // Rating stays null if not provided (shows as "Unrated")
        builder.rating(place.getRating());

        // Optional fields - keep as-is
        builder.tags(place.getTags() != null ? place.getTags() : Collections.emptyList());
        builder.seasonalNotes(place.getSeasonalNotes());
        builder.bookingRequired(
            place.getBookingRequired() != null 
                ? place.getBookingRequired() 
                : false
        );

        return builder.build();
    }

    /**
     * Checks if a string is null or empty (including whitespace-only strings).
     */
    private boolean isNullOrEmpty(String str) {
        return str == null || str.trim().isEmpty();
    }

    /**
     * Returns the criticality level for a given field name.
     */
    public static FieldCriticality getFieldCriticality(String fieldName) {
        return FIELD_CRITICALITY_MAP.getOrDefault(fieldName, FieldCriticality.OPTIONAL);
    }
}
