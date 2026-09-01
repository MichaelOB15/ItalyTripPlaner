package com.italytrip.models;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Objects;

/**
 * Represents a single place/location in the Italy Trip Planner dataset.
 * Contains both required fields (id, name, type, city, coordinates) and optional fields
 * that may be null or missing in the dataset.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Place {
    // Required fields
    @JsonProperty("id")
    private String id;

    @JsonProperty("name")
    private String name;

    @JsonProperty("type")
    private PlaceType type;

    @JsonProperty("city")
    private String city;

    @JsonProperty("latitude")
    private Double latitude;

    @JsonProperty("longitude")
    private Double longitude;

    // Optional fields
    @JsonProperty("region")
    private String region;

    @JsonProperty("neighborhood")
    private String neighborhood;

    @JsonProperty("description")
    private String description;

    @JsonProperty("hours")
    private String hours;

    @JsonProperty("duration_minutes")
    private Integer durationMinutes;

    @JsonProperty("price_range")
    private String priceRange;

    @JsonProperty("rating")
    private Double rating;

    @JsonProperty("tags")
    private List<String> tags;

    @JsonProperty("seasonal_notes")
    private String seasonalNotes;

    @JsonProperty("booking_required")
    private Boolean bookingRequired;

    // Default constructor for Jackson
    public Place() {
    }

    // Private constructor for builder
    private Place(Builder builder) {
        this.id = builder.id;
        this.name = builder.name;
        this.type = builder.type;
        this.city = builder.city;
        this.latitude = builder.latitude;
        this.longitude = builder.longitude;
        this.region = builder.region;
        this.neighborhood = builder.neighborhood;
        this.description = builder.description;
        this.hours = builder.hours;
        this.durationMinutes = builder.durationMinutes;
        this.priceRange = builder.priceRange;
        this.rating = builder.rating;
        this.tags = builder.tags;
        this.seasonalNotes = builder.seasonalNotes;
        this.bookingRequired = builder.bookingRequired;
    }

    // Getters
    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public PlaceType getType() {
        return type;
    }

    public String getCity() {
        return city;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getRegion() {
        return region;
    }

    public String getNeighborhood() {
        return neighborhood;
    }

    public String getDescription() {
        return description;
    }

    public String getHours() {
        return hours;
    }

    public Integer getDurationMinutes() {
        return durationMinutes;
    }

    public String getPriceRange() {
        return priceRange;
    }

    public Double getRating() {
        return rating;
    }

    public List<String> getTags() {
        return tags;
    }

    public String getSeasonalNotes() {
        return seasonalNotes;
    }

    public Boolean getBookingRequired() {
        return bookingRequired;
    }

    // Setters
    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setType(PlaceType type) {
        this.type = type;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public void setNeighborhood(String neighborhood) {
        this.neighborhood = neighborhood;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setHours(String hours) {
        this.hours = hours;
    }

    public void setDurationMinutes(Integer durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public void setSeasonalNotes(String seasonalNotes) {
        this.seasonalNotes = seasonalNotes;
    }

    public void setBookingRequired(Boolean bookingRequired) {
        this.bookingRequired = bookingRequired;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Place place = (Place) o;
        return Objects.equals(id, place.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Place{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", type=" + type +
                ", city='" + city + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                '}';
    }

    // Builder pattern for complex object construction
    public static class Builder {
        private String id;
        private String name;
        private PlaceType type;
        private String city;
        private Double latitude;
        private Double longitude;
        private String region;
        private String neighborhood;
        private String description;
        private String hours;
        private Integer durationMinutes;
        private String priceRange;
        private Double rating;
        private List<String> tags;
        private String seasonalNotes;
        private Boolean bookingRequired;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder type(PlaceType type) {
            this.type = type;
            return this;
        }

        public Builder city(String city) {
            this.city = city;
            return this;
        }

        public Builder latitude(Double latitude) {
            this.latitude = latitude;
            return this;
        }

        public Builder longitude(Double longitude) {
            this.longitude = longitude;
            return this;
        }

        public Builder region(String region) {
            this.region = region;
            return this;
        }

        public Builder neighborhood(String neighborhood) {
            this.neighborhood = neighborhood;
            return this;
        }

        public Builder description(String description) {
            this.description = description;
            return this;
        }

        public Builder hours(String hours) {
            this.hours = hours;
            return this;
        }

        public Builder durationMinutes(Integer durationMinutes) {
            this.durationMinutes = durationMinutes;
            return this;
        }

        public Builder priceRange(String priceRange) {
            this.priceRange = priceRange;
            return this;
        }

        public Builder rating(Double rating) {
            this.rating = rating;
            return this;
        }

        public Builder tags(List<String> tags) {
            this.tags = tags;
            return this;
        }

        public Builder seasonalNotes(String seasonalNotes) {
            this.seasonalNotes = seasonalNotes;
            return this;
        }

        public Builder bookingRequired(Boolean bookingRequired) {
            this.bookingRequired = bookingRequired;
            return this;
        }

        public Place build() {
            return new Place(this);
        }
    }
}
