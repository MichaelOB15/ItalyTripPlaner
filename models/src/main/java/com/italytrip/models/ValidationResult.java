package com.italytrip.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Represents the result of validating a dataset or itinerary.
 * Contains validation errors, warnings, and summary statistics.
 */
public class ValidationResult {
    @JsonProperty("is_valid")
    private boolean isValid;

    @JsonProperty("errors")
    private List<ValidationError> errors;

    @JsonProperty("warnings")
    private List<ValidationWarning> warnings;

    @JsonProperty("place_count")
    private int placeCount;

    @JsonProperty("excluded_count")
    private int excludedCount;

    // Default constructor for Jackson
    public ValidationResult() {
        this.errors = new ArrayList<>();
        this.warnings = new ArrayList<>();
        this.isValid = true;
        this.placeCount = 0;
        this.excludedCount = 0;
    }

    // Constructor with validity flag
    public ValidationResult(boolean isValid) {
        this();
        this.isValid = isValid;
    }

    // Private constructor for builder
    private ValidationResult(Builder builder) {
        this.isValid = builder.isValid;
        this.errors = builder.errors != null ? new ArrayList<>(builder.errors) : new ArrayList<>();
        this.warnings = builder.warnings != null ? new ArrayList<>(builder.warnings) : new ArrayList<>();
        this.placeCount = builder.placeCount;
        this.excludedCount = builder.excludedCount;
    }

    // Getters
    public boolean isValid() {
        return isValid;
    }

    public List<ValidationError> getErrors() {
        return errors;
    }

    public List<ValidationWarning> getWarnings() {
        return warnings;
    }

    public int getPlaceCount() {
        return placeCount;
    }

    public int getExcludedCount() {
        return excludedCount;
    }

    // Setters
    public void setValid(boolean valid) {
        isValid = valid;
    }

    public void setErrors(List<ValidationError> errors) {
        this.errors = errors;
    }

    public void setWarnings(List<ValidationWarning> warnings) {
        this.warnings = warnings;
    }

    public void setPlaceCount(int placeCount) {
        this.placeCount = placeCount;
    }

    public void setExcludedCount(int excludedCount) {
        this.excludedCount = excludedCount;
    }

    // Helper methods
    /**
     * Adds a validation error to the result.
     * Automatically sets isValid to false if the error is critical.
     */
    public void addError(ValidationError error) {
        this.errors.add(error);
        if (error.getSeverity() == ValidationError.Severity.CRITICAL) {
            this.isValid = false;
        }
    }

    /**
     * Adds a validation warning to the result.
     */
    public void addWarning(ValidationWarning warning) {
        this.warnings.add(warning);
    }

    /**
     * Checks if there are any critical errors.
     */
    public boolean hasCriticalErrors() {
        return errors.stream()
                .anyMatch(error -> error.getSeverity() == ValidationError.Severity.CRITICAL);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ValidationResult that = (ValidationResult) o;
        return isValid == that.isValid &&
                placeCount == that.placeCount &&
                excludedCount == that.excludedCount &&
                Objects.equals(errors, that.errors) &&
                Objects.equals(warnings, that.warnings);
    }

    @Override
    public int hashCode() {
        return Objects.hash(isValid, errors, warnings, placeCount, excludedCount);
    }

    @Override
    public String toString() {
        return "ValidationResult{" +
                "isValid=" + isValid +
                ", errors=" + errors.size() +
                ", warnings=" + warnings.size() +
                ", placeCount=" + placeCount +
                ", excludedCount=" + excludedCount +
                '}';
    }

    // Builder pattern
    public static class Builder {
        private boolean isValid = true;
        private List<ValidationError> errors;
        private List<ValidationWarning> warnings;
        private int placeCount;
        private int excludedCount;

        public Builder isValid(boolean isValid) {
            this.isValid = isValid;
            return this;
        }

        public Builder errors(List<ValidationError> errors) {
            this.errors = errors;
            return this;
        }

        public Builder addError(ValidationError error) {
            if (this.errors == null) {
                this.errors = new ArrayList<>();
            }
            this.errors.add(error);
            return this;
        }

        public Builder warnings(List<ValidationWarning> warnings) {
            this.warnings = warnings;
            return this;
        }

        public Builder addWarning(ValidationWarning warning) {
            if (this.warnings == null) {
                this.warnings = new ArrayList<>();
            }
            this.warnings.add(warning);
            return this;
        }

        public Builder placeCount(int placeCount) {
            this.placeCount = placeCount;
            return this;
        }

        public Builder excludedCount(int excludedCount) {
            this.excludedCount = excludedCount;
            return this;
        }

        public ValidationResult build() {
            ValidationResult result = new ValidationResult(this);
            // Auto-determine validity if not explicitly set
            if (result.hasCriticalErrors()) {
                result.isValid = false;
            }
            return result;
        }
    }
}
