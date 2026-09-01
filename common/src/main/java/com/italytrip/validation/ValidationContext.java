package com.italytrip.validation;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Provides context for validation operations, including which features are enabled.
 * This allows conditional validation based on feature requirements.
 */
public class ValidationContext {
    private final Set<String> enabledFeatures;

    public ValidationContext(Set<String> enabledFeatures) {
        this.enabledFeatures = enabledFeatures != null 
            ? new HashSet<>(enabledFeatures) 
            : new HashSet<>();
    }

    /**
     * Creates a default validation context with all standard features enabled.
     */
    public static ValidationContext withAllFeatures() {
        Set<String> features = new HashSet<>();
        features.add("map");
        features.add("recommendations");
        features.add("export");
        features.add("list");
        return new ValidationContext(features);
    }

    /**
     * Creates a validation context with no features enabled.
     * Useful for minimal validation scenarios.
     */
    public static ValidationContext minimal() {
        return new ValidationContext(Collections.emptySet());
    }

    /**
     * Checks if a specific feature is enabled.
     */
    public boolean hasFeature(String feature) {
        return enabledFeatures.contains(feature);
    }

    /**
     * Returns an unmodifiable set of enabled features.
     */
    public Set<String> getEnabledFeatures() {
        return Collections.unmodifiableSet(enabledFeatures);
    }
}
