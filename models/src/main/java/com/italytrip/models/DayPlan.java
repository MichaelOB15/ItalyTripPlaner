package com.italytrip.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Represents a single day's plan within a 3-day itinerary.
 * Contains an ordered list of places, total duration, and timing metadata.
 */
public class DayPlan {
    @JsonProperty("day_number")
    private Integer dayNumber;

    @JsonProperty("places")
    private List<Place> places;

    @JsonProperty("total_duration")
    private Integer totalDuration;

    @JsonProperty("start_time")
    private String startTime;

    // Default constructor for Jackson
    public DayPlan() {
        this.places = new ArrayList<>();
        this.startTime = "08:00";
        this.totalDuration = 0;
    }

    // Constructor with day number
    public DayPlan(Integer dayNumber) {
        this.dayNumber = dayNumber;
        this.places = new ArrayList<>();
        this.startTime = "08:00";
        this.totalDuration = 0;
    }

    // Private constructor for builder
    private DayPlan(Builder builder) {
        this.dayNumber = builder.dayNumber;
        this.places = builder.places != null ? new ArrayList<>(builder.places) : new ArrayList<>();
        this.totalDuration = builder.totalDuration;
        this.startTime = builder.startTime;
    }

    // Getters
    public Integer getDayNumber() {
        return dayNumber;
    }

    public List<Place> getPlaces() {
        return places;
    }

    public Integer getTotalDuration() {
        return totalDuration;
    }

    public String getStartTime() {
        return startTime;
    }

    // Setters
    public void setDayNumber(Integer dayNumber) {
        this.dayNumber = dayNumber;
    }

    public void setPlaces(List<Place> places) {
        this.places = places;
        recalculateTotalDuration();
    }

    public void setTotalDuration(Integer totalDuration) {
        this.totalDuration = totalDuration;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    // Helper methods
    /**
     * Adds a place to the day plan and recalculates total duration.
     */
    public void addPlace(Place place) {
        this.places.add(place);
        recalculateTotalDuration();
    }

    /**
     * Removes a place from the day plan and recalculates total duration.
     */
    public void removePlace(Place place) {
        this.places.remove(place);
        recalculateTotalDuration();
    }

    /**
     * Recalculates the total duration based on all places in the day.
     * Uses 60 minutes as default if a place has no duration.
     */
    private void recalculateTotalDuration() {
        this.totalDuration = places.stream()
                .mapToInt(place -> place.getDurationMinutes() != null ? place.getDurationMinutes() : 60)
                .sum();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DayPlan dayPlan = (DayPlan) o;
        return Objects.equals(dayNumber, dayPlan.dayNumber) &&
                Objects.equals(places, dayPlan.places);
    }

    @Override
    public int hashCode() {
        return Objects.hash(dayNumber, places);
    }

    @Override
    public String toString() {
        return "DayPlan{" +
                "dayNumber=" + dayNumber +
                ", places=" + places.size() +
                ", totalDuration=" + totalDuration +
                ", startTime='" + startTime + '\'' +
                '}';
    }

    // Builder pattern
    public static class Builder {
        private Integer dayNumber;
        private List<Place> places;
        private Integer totalDuration;
        private String startTime = "08:00";

        public Builder dayNumber(Integer dayNumber) {
            this.dayNumber = dayNumber;
            return this;
        }

        public Builder places(List<Place> places) {
            this.places = places;
            return this;
        }

        public Builder totalDuration(Integer totalDuration) {
            this.totalDuration = totalDuration;
            return this;
        }

        public Builder startTime(String startTime) {
            this.startTime = startTime;
            return this;
        }

        public DayPlan build() {
            DayPlan dayPlan = new DayPlan(this);
            if (dayPlan.totalDuration == null) {
                dayPlan.recalculateTotalDuration();
            }
            return dayPlan;
        }
    }
}
