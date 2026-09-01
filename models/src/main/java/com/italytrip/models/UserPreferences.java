package com.italytrip.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Represents user preferences for itinerary generation and recommendations.
 * Used by the recommendation engine to personalize trip suggestions.
 */
public class UserPreferences {
    @JsonProperty("cities")
    private List<String> cities;

    @JsonProperty("interests")
    private List<String> interests;

    @JsonProperty("pace")
    private TripPace pace;

    @JsonProperty("price_range")
    private List<String> priceRange;

    @JsonProperty("include_booking_required")
    private Boolean includeBookingRequired;

    // Default constructor for Jackson
    public UserPreferences() {
        this.cities = new ArrayList<>();
        this.interests = new ArrayList<>();
        this.priceRange = new ArrayList<>();
        this.pace = TripPace.MODERATE;
        this.includeBookingRequired = true;
    }

    // Private constructor for builder
    private UserPreferences(Builder builder) {
        this.cities = builder.cities != null ? new ArrayList<>(builder.cities) : new ArrayList<>();
        this.interests = builder.interests != null ? new ArrayList<>(builder.interests) : new ArrayList<>();
        this.pace = builder.pace;
        this.priceRange = builder.priceRange != null ? new ArrayList<>(builder.priceRange) : new ArrayList<>();
        this.includeBookingRequired = builder.includeBookingRequired;
    }

    // Getters
    public List<String> getCities() {
        return cities;
    }

    public List<String> getInterests() {
        return interests;
    }

    public TripPace getPace() {
        return pace;
    }

    public List<String> getPriceRange() {
        return priceRange;
    }

    public Boolean getIncludeBookingRequired() {
        return includeBookingRequired;
    }

    // Setters
    public void setCities(List<String> cities) {
        this.cities = cities;
    }

    public void setInterests(List<String> interests) {
        this.interests = interests;
    }

    public void setPace(TripPace pace) {
        this.pace = pace;
    }

    public void setPriceRange(List<String> priceRange) {
        this.priceRange = priceRange;
    }

    public void setIncludeBookingRequired(Boolean includeBookingRequired) {
        this.includeBookingRequired = includeBookingRequired;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserPreferences that = (UserPreferences) o;
        return Objects.equals(cities, that.cities) &&
                Objects.equals(interests, that.interests) &&
                pace == that.pace &&
                Objects.equals(priceRange, that.priceRange) &&
                Objects.equals(includeBookingRequired, that.includeBookingRequired);
    }

    @Override
    public int hashCode() {
        return Objects.hash(cities, interests, pace, priceRange, includeBookingRequired);
    }

    @Override
    public String toString() {
        return "UserPreferences{" +
                "cities=" + cities +
                ", interests=" + interests +
                ", pace=" + pace +
                ", priceRange=" + priceRange +
                ", includeBookingRequired=" + includeBookingRequired +
                '}';
    }

    // Builder pattern
    public static class Builder {
        private List<String> cities;
        private List<String> interests;
        private TripPace pace = TripPace.MODERATE;
        private List<String> priceRange;
        private Boolean includeBookingRequired = true;

        public Builder cities(List<String> cities) {
            this.cities = cities;
            return this;
        }

        public Builder addCity(String city) {
            if (this.cities == null) {
                this.cities = new ArrayList<>();
            }
            this.cities.add(city);
            return this;
        }

        public Builder interests(List<String> interests) {
            this.interests = interests;
            return this;
        }

        public Builder addInterest(String interest) {
            if (this.interests == null) {
                this.interests = new ArrayList<>();
            }
            this.interests.add(interest);
            return this;
        }

        public Builder pace(TripPace pace) {
            this.pace = pace;
            return this;
        }

        public Builder priceRange(List<String> priceRange) {
            this.priceRange = priceRange;
            return this;
        }

        public Builder addPriceRange(String priceRange) {
            if (this.priceRange == null) {
                this.priceRange = new ArrayList<>();
            }
            this.priceRange.add(priceRange);
            return this;
        }

        public Builder includeBookingRequired(Boolean includeBookingRequired) {
            this.includeBookingRequired = includeBookingRequired;
            return this;
        }

        public UserPreferences build() {
            return new UserPreferences(this);
        }
    }

    /**
     * Enumeration for trip pace/activity level preferences.
     */
    public enum TripPace {
        @JsonProperty("relaxed")
        RELAXED("relaxed"),

        @JsonProperty("moderate")
        MODERATE("moderate"),

        @JsonProperty("packed")
        PACKED("packed");

        private final String value;

        TripPace(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }

        public static TripPace fromValue(String value) {
            for (TripPace pace : TripPace.values()) {
                if (pace.value.equals(value)) {
                    return pace;
                }
            }
            throw new IllegalArgumentException("Unknown trip pace: " + value);
        }
    }
}
