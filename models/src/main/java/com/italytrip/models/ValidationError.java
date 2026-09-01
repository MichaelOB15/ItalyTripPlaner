package com.italytrip.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Objects;

/**
 * Represents a validation error found in a dataset or itinerary.
 * Contains information about the place, field, error message, and severity.
 */
public class ValidationError {
    @JsonProperty("place_id")
    private String placeId;

    @JsonProperty("field")
    private String field;

    @JsonProperty("message")
    private String message;

    @JsonProperty("severity")
    private Severity severity;

    // Default constructor for Jackson
    public ValidationError() {
    }

    // Full constructor
    public ValidationError(String placeId, String field, String message, Severity severity) {
        this.placeId = placeId;
        this.field = field;
        this.message = message;
        this.severity = severity;
    }

    // Getters
    public String getPlaceId() {
        return placeId;
    }

    public String getField() {
        return field;
    }

    public String getMessage() {
        return message;
    }

    public Severity getSeverity() {
        return severity;
    }

    // Setters
    public void setPlaceId(String placeId) {
        this.placeId = placeId;
    }

    public void setField(String field) {
        this.field = field;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setSeverity(Severity severity) {
        this.severity = severity;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ValidationError that = (ValidationError) o;
        return Objects.equals(placeId, that.placeId) &&
                Objects.equals(field, that.field) &&
                Objects.equals(message, that.message) &&
                severity == that.severity;
    }

    @Override
    public int hashCode() {
        return Objects.hash(placeId, field, message, severity);
    }

    @Override
    public String toString() {
        return "ValidationError{" +
                "placeId='" + placeId + '\'' +
                ", field='" + field + '\'' +
                ", message='" + message + '\'' +
                ", severity=" + severity +
                '}';
    }

    /**
     * Enumeration for error severity levels.
     */
    public enum Severity {
        @JsonProperty("critical")
        CRITICAL("critical"),

        @JsonProperty("non-critical")
        NON_CRITICAL("non-critical");

        private final String value;

        Severity(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }

        public static Severity fromValue(String value) {
            for (Severity severity : Severity.values()) {
                if (severity.value.equals(value)) {
                    return severity;
                }
            }
            throw new IllegalArgumentException("Unknown severity: " + value);
        }
    }
}
