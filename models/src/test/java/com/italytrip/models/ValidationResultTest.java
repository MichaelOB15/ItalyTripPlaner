package com.italytrip.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for ValidationResult model.
 */
class ValidationResultTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void testDefaultConstructor() {
        // When
        ValidationResult result = new ValidationResult();

        // Then
        assertThat(result.isValid()).isTrue();
        assertThat(result.getErrors()).isEmpty();
        assertThat(result.getWarnings()).isEmpty();
        assertThat(result.getPlaceCount()).isEqualTo(0);
        assertThat(result.getExcludedCount()).isEqualTo(0);
    }

    @Test
    void testBuilder() {
        // Given
        ValidationError error = new ValidationError("place_001", "name", "Name is required", ValidationError.Severity.CRITICAL);
        ValidationWarning warning = new ValidationWarning("place_002", "description", "Missing description", "Reduced information display");

        // When
        ValidationResult result = new ValidationResult.Builder()
                .isValid(false)
                .addError(error)
                .addWarning(warning)
                .placeCount(100)
                .excludedCount(5)
                .build();

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getErrors()).hasSize(1);
        assertThat(result.getWarnings()).hasSize(1);
        assertThat(result.getPlaceCount()).isEqualTo(100);
        assertThat(result.getExcludedCount()).isEqualTo(5);
    }

    @Test
    void testAddError() {
        // Given
        ValidationResult result = new ValidationResult();
        ValidationError error = new ValidationError("place_001", "id", "Missing ID", ValidationError.Severity.CRITICAL);

        // When
        result.addError(error);

        // Then
        assertThat(result.getErrors()).hasSize(1);
        assertThat(result.isValid()).isFalse(); // Critical error makes result invalid
    }

    @Test
    void testAddWarning() {
        // Given
        ValidationResult result = new ValidationResult();
        ValidationWarning warning = new ValidationWarning("place_001", "hours", "Missing hours", "Will display 'Hours not specified'");

        // When
        result.addWarning(warning);

        // Then
        assertThat(result.getWarnings()).hasSize(1);
        assertThat(result.isValid()).isTrue(); // Warnings don't affect validity
    }

    @Test
    void testHasCriticalErrors() {
        // Given
        ValidationResult result = new ValidationResult();

        // When - no errors
        // Then
        assertThat(result.hasCriticalErrors()).isFalse();

        // When - non-critical error
        result.addError(new ValidationError("place_001", "description", "Missing description", ValidationError.Severity.NON_CRITICAL));
        // Then
        assertThat(result.hasCriticalErrors()).isFalse();

        // When - critical error
        result.addError(new ValidationError("place_002", "id", "Missing ID", ValidationError.Severity.CRITICAL));
        // Then
        assertThat(result.hasCriticalErrors()).isTrue();
    }

    @Test
    void testBuilderAutoDeterminesValidity() {
        // Given
        ValidationError criticalError = new ValidationError("place_001", "id", "Missing ID", ValidationError.Severity.CRITICAL);

        // When - builder with critical error
        ValidationResult result = new ValidationResult.Builder()
                .addError(criticalError)
                .build();

        // Then
        assertThat(result.isValid()).isFalse(); // Auto-set based on critical errors
    }

    @Test
    void testJsonSerialization() throws Exception {
        // Given
        ValidationResult result = new ValidationResult.Builder()
                .isValid(true)
                .placeCount(95)
                .excludedCount(5)
                .build();

        // When
        String json = objectMapper.writeValueAsString(result);

        // Then
        assertThat(json).contains("\"is_valid\":true");
        assertThat(json).contains("\"place_count\":95");
        assertThat(json).contains("\"excluded_count\":5");
        assertThat(json).contains("\"errors\":");
        assertThat(json).contains("\"warnings\":");
    }

    @Test
    void testJsonDeserialization() throws Exception {
        // Given
        String json = """
                {
                    "is_valid": false,
                    "errors": [],
                    "warnings": [],
                    "place_count": 90,
                    "excluded_count": 10
                }
                """;

        // When
        ValidationResult result = objectMapper.readValue(json, ValidationResult.class);

        // Then
        assertThat(result.isValid()).isFalse();
        assertThat(result.getPlaceCount()).isEqualTo(90);
        assertThat(result.getExcludedCount()).isEqualTo(10);
    }
}
