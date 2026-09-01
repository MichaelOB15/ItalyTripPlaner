package com.italytrip.validation;

import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.ValidationError;
import com.italytrip.models.ValidationWarning;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for DataValidator with criticality assessment.
 */
@DisplayName("DataValidator")
class DataValidatorTest {

    private DataValidator validator;

    @BeforeEach
    void setUp() {
        validator = new DataValidator();
    }

    @Nested
    @DisplayName("when validating complete place")
    class CompletePlace {

        @Test
        @DisplayName("should accept place with all required fields")
        void shouldAcceptCompletePlace() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .description("Ancient amphitheater")
                .hours("9:00 AM - 7:00 PM")
                .durationMinutes(120)
                .priceRange("€€")
                .rating(4.7)
                .tags(Arrays.asList("historic", "architecture"))
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isTrue();
            assertThat(outcome.hasErrors()).isFalse();
            assertThat(outcome.hasWarnings()).isFalse();
            assertThat(outcome.getPlace()).isNotNull();
            assertThat(outcome.getPlace().getId()).isEqualTo("place_001");
        }
    }

    @Nested
    @DisplayName("when validating critical fields")
    class CriticalFields {

        @Test
        @DisplayName("should reject place missing id")
        void shouldRejectMissingId() {
            // Given
            Place place = new Place.Builder()
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9)
                .longitude(12.5)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isFalse();
            assertThat(outcome.hasErrors()).isTrue();
            assertThat(outcome.getErrors()).hasSize(1);
            
            ValidationError error = outcome.getErrors().get(0);
            assertThat(error.getField()).isEqualTo("id");
            assertThat(error.getMessage()).contains("Missing unique identifier");
            assertThat(error.getSeverity()).isEqualTo(ValidationError.Severity.CRITICAL);
        }

        @Test
        @DisplayName("should reject place missing name")
        void shouldRejectMissingName() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isFalse();
            assertThat(outcome.hasErrors()).isTrue();
            
            boolean hasNameError = outcome.getErrors().stream()
                .anyMatch(e -> e.getField().equals("name"));
            assertThat(hasNameError).isTrue();
        }

        @Test
        @DisplayName("should reject place missing type")
        void shouldRejectMissingType() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isFalse();
            assertThat(outcome.hasErrors()).isTrue();
            
            boolean hasTypeError = outcome.getErrors().stream()
                .anyMatch(e -> e.getField().equals("type"));
            assertThat(hasTypeError).isTrue();
        }

        @Test
        @DisplayName("should reject place missing city")
        void shouldRejectMissingCity() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isFalse();
            assertThat(outcome.hasErrors()).isTrue();
            
            boolean hasCityError = outcome.getErrors().stream()
                .anyMatch(e -> e.getField().equals("city"));
            assertThat(hasCityError).isTrue();
        }

        @Test
        @DisplayName("should reject place with multiple missing critical fields")
        void shouldRejectMultipleMissingCriticalFields() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isFalse();
            assertThat(outcome.getErrors()).hasSizeGreaterThanOrEqualTo(3);
            assertThat(outcome.getPlace()).isNull();
        }

        @Test
        @DisplayName("should reject place with empty string as id")
        void shouldRejectEmptyStringId() {
            // Given
            Place place = new Place.Builder()
                .id("   ")  // whitespace-only
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isFalse();
            boolean hasIdError = outcome.getErrors().stream()
                .anyMatch(e -> e.getField().equals("id"));
            assertThat(hasIdError).isTrue();
        }
    }

    @Nested
    @DisplayName("when validating conditionally critical fields")
    class ConditionalFields {

        @Test
        @DisplayName("should include place with missing coordinates but generate warnings when map enabled")
        void shouldIncludePlaceWithoutCoordinatesWithMapWarnings() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            ValidationContext context = ValidationContext.withAllFeatures();

            // When
            ValidationOutcome outcome = validator.validatePlace(place, context);

            // Then
            assertThat(outcome.shouldInclude()).isTrue();
            assertThat(outcome.hasErrors()).isFalse();
            assertThat(outcome.hasWarnings()).isTrue();
            
            List<ValidationWarning> warnings = outcome.getWarnings();
            boolean hasLatWarning = warnings.stream()
                .anyMatch(w -> w.getField().equals("latitude"));
            boolean hasLonWarning = warnings.stream()
                .anyMatch(w -> w.getField().equals("longitude"));
            
            assertThat(hasLatWarning).isTrue();
            assertThat(hasLonWarning).isTrue();
            
            // Verify warning impact mentions map
            ValidationWarning latWarning = warnings.stream()
                .filter(w -> w.getField().equals("latitude"))
                .findFirst()
                .orElseThrow();
            assertThat(latWarning.getImpact()).contains("map");
            assertThat(latWarning.getImpact()).contains("remains in lists");
        }

        @Test
        @DisplayName("should include place with missing latitude only")
        void shouldIncludePlaceWithMissingLatitude() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .longitude(12.5)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isTrue();
            assertThat(outcome.hasErrors()).isFalse();
            assertThat(outcome.hasWarnings()).isTrue();
            
            boolean hasLatWarning = outcome.getWarnings().stream()
                .anyMatch(w -> w.getField().equals("latitude"));
            assertThat(hasLatWarning).isTrue();
        }

        @Test
        @DisplayName("should include place with missing longitude only")
        void shouldIncludePlaceWithMissingLongitude() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isTrue();
            assertThat(outcome.hasErrors()).isFalse();
            
            boolean hasLonWarning = outcome.getWarnings().stream()
                .anyMatch(w -> w.getField().equals("longitude"));
            assertThat(hasLonWarning).isTrue();
        }

        @Test
        @DisplayName("should not warn about coordinates when map feature disabled")
        void shouldNotWarnAboutCoordinatesWithoutMapFeature() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            ValidationContext context = new ValidationContext(new HashSet<>());

            // When
            ValidationOutcome outcome = validator.validatePlace(place, context);

            // Then
            assertThat(outcome.shouldInclude()).isTrue();
            // Should still have warnings for other missing fields, but not coordinates
            boolean hasCoordinateWarnings = outcome.getWarnings().stream()
                .anyMatch(w -> w.getField().equals("latitude") || w.getField().equals("longitude"));
            assertThat(hasCoordinateWarnings).isFalse();
        }
    }

    @Nested
    @DisplayName("when validating important fields")
    class ImportantFields {

        @Test
        @DisplayName("should generate warning for missing description")
        void shouldWarnAboutMissingDescription() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9)
                .longitude(12.5)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isTrue();
            assertThat(outcome.hasWarnings()).isTrue();
            
            boolean hasDescWarning = outcome.getWarnings().stream()
                .anyMatch(w -> w.getField().equals("description"));
            assertThat(hasDescWarning).isTrue();
        }

        @Test
        @DisplayName("should generate warning for missing duration_minutes")
        void shouldWarnAboutMissingDuration() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9)
                .longitude(12.5)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.hasWarnings()).isTrue();
            
            ValidationWarning durationWarning = outcome.getWarnings().stream()
                .filter(w -> w.getField().equals("duration_minutes"))
                .findFirst()
                .orElseThrow();
            
            assertThat(durationWarning.getMessage()).contains("Missing duration");
            assertThat(durationWarning.getImpact()).contains("60-minute");
        }

        @Test
        @DisplayName("should generate warning for missing hours")
        void shouldWarnAboutMissingHours() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9)
                .longitude(12.5)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            boolean hasHoursWarning = outcome.getWarnings().stream()
                .anyMatch(w -> w.getField().equals("hours"));
            assertThat(hasHoursWarning).isTrue();
        }

        @Test
        @DisplayName("should generate warning for missing rating")
        void shouldWarnAboutMissingRating() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9)
                .longitude(12.5)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            boolean hasRatingWarning = outcome.getWarnings().stream()
                .anyMatch(w -> w.getField().equals("rating"));
            assertThat(hasRatingWarning).isTrue();
        }

        @Test
        @DisplayName("should generate warning for missing price_range")
        void shouldWarnAboutMissingPriceRange() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9)
                .longitude(12.5)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            boolean hasPriceWarning = outcome.getWarnings().stream()
                .anyMatch(w -> w.getField().equals("price_range"));
            assertThat(hasPriceWarning).isTrue();
        }
    }

    @Nested
    @DisplayName("when applying default values")
    class DefaultValues {

        @Test
        @DisplayName("should apply default description")
        void shouldApplyDefaultDescription() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isTrue();
            Place processedPlace = outcome.getPlace();
            assertThat(processedPlace.getDescription()).isEqualTo("No description available.");
        }

        @Test
        @DisplayName("should apply default hours")
        void shouldApplyDefaultHours() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            Place processedPlace = outcome.getPlace();
            assertThat(processedPlace.getHours()).isEqualTo("Hours not specified");
        }

        @Test
        @DisplayName("should apply default duration_minutes of 60")
        void shouldApplyDefaultDuration() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            Place processedPlace = outcome.getPlace();
            assertThat(processedPlace.getDurationMinutes()).isEqualTo(60);
        }

        @Test
        @DisplayName("should apply default price_range of €")
        void shouldApplyDefaultPriceRange() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            Place processedPlace = outcome.getPlace();
            assertThat(processedPlace.getPriceRange()).isEqualTo("€");
        }

        @Test
        @DisplayName("should keep rating as null when not provided")
        void shouldKeepRatingNull() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            Place processedPlace = outcome.getPlace();
            assertThat(processedPlace.getRating()).isNull();
        }

        @Test
        @DisplayName("should apply default empty list for tags")
        void shouldApplyDefaultTags() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            Place processedPlace = outcome.getPlace();
            assertThat(processedPlace.getTags()).isNotNull();
            assertThat(processedPlace.getTags()).isEmpty();
        }

        @Test
        @DisplayName("should apply default false for booking_required")
        void shouldApplyDefaultBookingRequired() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            Place processedPlace = outcome.getPlace();
            assertThat(processedPlace.getBookingRequired()).isFalse();
        }

        @Test
        @DisplayName("should not override existing values with defaults")
        void shouldNotOverrideExistingValues() {
            // Given
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .description("My description")
                .durationMinutes(90)
                .priceRange("€€€")
                .bookingRequired(true)
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            Place processedPlace = outcome.getPlace();
            assertThat(processedPlace.getDescription()).isEqualTo("My description");
            assertThat(processedPlace.getDurationMinutes()).isEqualTo(90);
            assertThat(processedPlace.getPriceRange()).isEqualTo("€€€");
            assertThat(processedPlace.getBookingRequired()).isTrue();
        }
    }

    @Nested
    @DisplayName("when handling optional fields")
    class OptionalFields {

        @Test
        @DisplayName("should not warn about missing optional fields")
        void shouldNotWarnAboutOptionalFields() {
            // Given - place with all required + important fields, but no optional fields
            Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9)
                .longitude(12.5)
                .description("A description")
                .hours("9-5")
                .durationMinutes(60)
                .priceRange("€€")
                .rating(4.5)
                // No region, neighborhood, tags, seasonal_notes
                .build();

            // When
            ValidationOutcome outcome = validator.validatePlace(place);

            // Then
            assertThat(outcome.shouldInclude()).isTrue();
            
            // Should not have warnings about optional fields
            boolean hasOptionalFieldWarnings = outcome.getWarnings().stream()
                .anyMatch(w -> w.getField().equals("region") 
                    || w.getField().equals("neighborhood")
                    || w.getField().equals("tags")
                    || w.getField().equals("seasonal_notes"));
            
            assertThat(hasOptionalFieldWarnings).isFalse();
        }
    }

    @Nested
    @DisplayName("when validating null place")
    class NullPlace {

        @Test
        @DisplayName("should reject null place object")
        void shouldRejectNullPlace() {
            // When
            ValidationOutcome outcome = validator.validatePlace(null);

            // Then
            assertThat(outcome.shouldInclude()).isFalse();
            assertThat(outcome.hasErrors()).isTrue();
            assertThat(outcome.getPlace()).isNull();
            
            ValidationError error = outcome.getErrors().get(0);
            assertThat(error.getField()).isEqualTo("place");
            assertThat(error.getMessage()).contains("null");
        }
    }

    @Nested
    @DisplayName("field criticality classification")
    class FieldCriticalityClassification {

        @Test
        @DisplayName("should classify id as critical always")
        void shouldClassifyIdAsCriticalAlways() {
            FieldCriticality criticality = DataValidator.getFieldCriticality("id");
            assertThat(criticality).isEqualTo(FieldCriticality.CRITICAL_ALWAYS);
        }

        @Test
        @DisplayName("should classify coordinates as critical conditional")
        void shouldClassifyCoordinatesAsConditional() {
            assertThat(DataValidator.getFieldCriticality("latitude"))
                .isEqualTo(FieldCriticality.CRITICAL_CONDITIONAL);
            assertThat(DataValidator.getFieldCriticality("longitude"))
                .isEqualTo(FieldCriticality.CRITICAL_CONDITIONAL);
        }

        @Test
        @DisplayName("should classify description as important")
        void shouldClassifyDescriptionAsImportant() {
            assertThat(DataValidator.getFieldCriticality("description"))
                .isEqualTo(FieldCriticality.IMPORTANT);
        }

        @Test
        @DisplayName("should classify tags as optional")
        void shouldClassifyTagsAsOptional() {
            assertThat(DataValidator.getFieldCriticality("tags"))
                .isEqualTo(FieldCriticality.OPTIONAL);
        }

        @Test
        @DisplayName("should classify unknown fields as optional")
        void shouldClassifyUnknownFieldsAsOptional() {
            assertThat(DataValidator.getFieldCriticality("unknown_field"))
                .isEqualTo(FieldCriticality.OPTIONAL);
        }
    }
}
