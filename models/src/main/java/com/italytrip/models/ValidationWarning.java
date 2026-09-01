package com.italytrip.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Objects;

/**
 * Represents a validation warning for a dataset or itinerary.
 * Warnings indicate potential issues that do not prevent the data from being used,
 * but may affect functionality or user experience.
 */
public class ValidationWarning {
    @JsonProperty("place_id")
    private String placeId;

    @JsonProperty("field")
    private String field;

    @JsonProperty("message")
    private String message;

    @JsonProperty("impact")
    private String impact;

    // Default constructor for Jackson
    public ValidationWarning() {
    }

    // Full constructor
    public ValidationWarning(String placeId, String field, String message, String impact) {
        this.placeId = placeId;
        this.field = field;
        this.message = message;
        this.impact = impact;
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

    public String getImpact() {
        return impact;
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

    public void setImpact(String impact) {
        this.impact = impact;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ValidationWarning that = (ValidationWarning) o;
        return Objects.equals(placeId, that.placeId) &&
                Objects.equals(field, that.field) &&
                Objects.equals(message, that.message) &&
                Objects.equals(impact, that.impact);
    }

    @Override
    public int hashCode() {
        return Objects.hash(placeId, field, message, impact);
    }

    @Override
    public String toString() {
        return "ValidationWarning{" +
                "placeId='" + placeId + '\'' +
                ", field='" + field + '\'' +
                ", message='" + message + '\'' +
                ", impact='" + impact + '\'' +
                '}';
    }
}
