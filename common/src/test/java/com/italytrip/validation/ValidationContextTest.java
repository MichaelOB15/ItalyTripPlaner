package com.italytrip.validation;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for ValidationContext.
 */
@DisplayName("ValidationContext")
class ValidationContextTest {

    @Test
    @DisplayName("should create context with all standard features")
    void shouldCreateContextWithAllFeatures() {
        // When
        ValidationContext context = ValidationContext.withAllFeatures();

        // Then
        assertThat(context.hasFeature("map")).isTrue();
        assertThat(context.hasFeature("recommendations")).isTrue();
        assertThat(context.hasFeature("export")).isTrue();
        assertThat(context.hasFeature("list")).isTrue();
    }

    @Test
    @DisplayName("should create minimal context with no features")
    void shouldCreateMinimalContext() {
        // When
        ValidationContext context = ValidationContext.minimal();

        // Then
        assertThat(context.hasFeature("map")).isFalse();
        assertThat(context.hasFeature("recommendations")).isFalse();
        assertThat(context.hasFeature("export")).isFalse();
        assertThat(context.getEnabledFeatures()).isEmpty();
    }

    @Test
    @DisplayName("should create context with custom features")
    void shouldCreateContextWithCustomFeatures() {
        // Given
        Set<String> features = new HashSet<>();
        features.add("map");
        features.add("export");

        // When
        ValidationContext context = new ValidationContext(features);

        // Then
        assertThat(context.hasFeature("map")).isTrue();
        assertThat(context.hasFeature("export")).isTrue();
        assertThat(context.hasFeature("recommendations")).isFalse();
        assertThat(context.hasFeature("list")).isFalse();
    }

    @Test
    @DisplayName("should handle null features set")
    void shouldHandleNullFeaturesSet() {
        // When
        ValidationContext context = new ValidationContext(null);

        // Then
        assertThat(context.getEnabledFeatures()).isEmpty();
        assertThat(context.hasFeature("map")).isFalse();
    }

    @Test
    @DisplayName("should return unmodifiable features set")
    void shouldReturnUnmodifiableFeaturesSet() {
        // Given
        Set<String> features = new HashSet<>();
        features.add("map");
        ValidationContext context = new ValidationContext(features);

        // When
        Set<String> returnedFeatures = context.getEnabledFeatures();

        // Then - attempt to modify should throw exception
        assertThat(returnedFeatures).containsExactly("map");
        try {
            returnedFeatures.add("new_feature");
            throw new AssertionError("Should have thrown UnsupportedOperationException");
        } catch (UnsupportedOperationException e) {
            // Expected
        }
    }

    @Test
    @DisplayName("should not be affected by external modifications to feature set")
    void shouldNotBeAffectedByExternalModifications() {
        // Given
        Set<String> features = new HashSet<>();
        features.add("map");
        ValidationContext context = new ValidationContext(features);

        // When - modify external set
        features.add("export");

        // Then - context should not be affected
        assertThat(context.hasFeature("map")).isTrue();
        assertThat(context.hasFeature("export")).isFalse();
    }
}
