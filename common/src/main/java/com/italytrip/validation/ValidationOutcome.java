package com.italytrip.validation;

import com.italytrip.models.Place;
import com.italytrip.models.ValidationError;
import com.italytrip.models.ValidationWarning;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Represents the outcome of validating a single place.
 * Contains validation errors, warnings, and the decision whether to include the place.
 */
public class ValidationOutcome {
    private final boolean shouldInclude;
    private final List<ValidationError> errors;
    private final List<ValidationWarning> warnings;
    private final Place place;

    public ValidationOutcome(boolean shouldInclude, List<ValidationError> errors, 
                             List<ValidationWarning> warnings, Place place) {
        this.shouldInclude = shouldInclude;
        this.errors = errors != null ? new ArrayList<>(errors) : new ArrayList<>();
        this.warnings = warnings != null ? new ArrayList<>(warnings) : new ArrayList<>();
        this.place = place;
    }

    /**
     * Returns whether the place should be included in the dataset.
     */
    public boolean shouldInclude() {
        return shouldInclude;
    }

    /**
     * Returns the list of validation errors (unmodifiable).
     */
    public List<ValidationError> getErrors() {
        return Collections.unmodifiableList(errors);
    }

    /**
     * Returns the list of validation warnings (unmodifiable).
     */
    public List<ValidationWarning> getWarnings() {
        return Collections.unmodifiableList(warnings);
    }

    /**
     * Returns the validated place (with defaults applied if necessary).
     * May be null if shouldInclude is false.
     */
    public Place getPlace() {
        return place;
    }

    /**
     * Checks if there are any errors.
     */
    public boolean hasErrors() {
        return !errors.isEmpty();
    }

    /**
     * Checks if there are any warnings.
     */
    public boolean hasWarnings() {
        return !warnings.isEmpty();
    }

    @Override
    public String toString() {
        return "ValidationOutcome{" +
                "shouldInclude=" + shouldInclude +
                ", errors=" + errors.size() +
                ", warnings=" + warnings.size() +
                ", place=" + (place != null ? place.getId() : "null") +
                '}';
    }
}
