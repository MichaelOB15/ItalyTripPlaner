package com.italytrip.models;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Represents a complete 3-day travel itinerary.
 * Contains exactly 3 DayPlan objects and metadata about creation and preferences.
 */
public class Itinerary {
    @JsonProperty("id")
    private String id;

    @JsonProperty("name")
    private String name;

    @JsonProperty("days")
    private List<DayPlan> days;

    @JsonProperty("preferences")
    private UserPreferences preferences;

    @JsonProperty("created_at")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonProperty("last_modified")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime lastModified;

    // Default constructor for Jackson
    public Itinerary() {
        this.id = UUID.randomUUID().toString();
        this.days = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            this.days.add(new DayPlan(i));
        }
        this.createdAt = LocalDateTime.now();
        this.lastModified = LocalDateTime.now();
    }

    // Private constructor for builder
    private Itinerary(Builder builder) {
        this.id = builder.id != null ? builder.id : UUID.randomUUID().toString();
        this.name = builder.name;
        this.days = builder.days != null ? new ArrayList<>(builder.days) : new ArrayList<>();
        this.preferences = builder.preferences;
        this.createdAt = builder.createdAt != null ? builder.createdAt : LocalDateTime.now();
        this.lastModified = builder.lastModified != null ? builder.lastModified : LocalDateTime.now();

        // Ensure exactly 3 days
        while (this.days.size() < 3) {
            this.days.add(new DayPlan(this.days.size() + 1));
        }
    }

    // Getters
    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public List<DayPlan> getDays() {
        return days;
    }

    public UserPreferences getPreferences() {
        return preferences;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getLastModified() {
        return lastModified;
    }

    // Setters
    public void setId(String id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
        updateLastModified();
    }

    public void setDays(List<DayPlan> days) {
        this.days = days;
        updateLastModified();
    }

    public void setPreferences(UserPreferences preferences) {
        this.preferences = preferences;
        updateLastModified();
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setLastModified(LocalDateTime lastModified) {
        this.lastModified = lastModified;
    }

    // Helper methods
    /**
     * Updates the last modified timestamp to the current time.
     */
    public void updateLastModified() {
        this.lastModified = LocalDateTime.now();
    }

    /**
     * Gets a specific day plan by day number (1, 2, or 3).
     */
    public DayPlan getDayPlan(int dayNumber) {
        if (dayNumber < 1 || dayNumber > 3) {
            throw new IllegalArgumentException("Day number must be 1, 2, or 3");
        }
        return days.get(dayNumber - 1);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Itinerary itinerary = (Itinerary) o;
        return Objects.equals(id, itinerary.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Itinerary{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", days=" + days.size() +
                ", createdAt=" + createdAt +
                ", lastModified=" + lastModified +
                '}';
    }

    // Builder pattern
    public static class Builder {
        private String id;
        private String name;
        private List<DayPlan> days;
        private UserPreferences preferences;
        private LocalDateTime createdAt;
        private LocalDateTime lastModified;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder days(List<DayPlan> days) {
            this.days = days;
            return this;
        }

        public Builder preferences(UserPreferences preferences) {
            this.preferences = preferences;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder lastModified(LocalDateTime lastModified) {
            this.lastModified = lastModified;
            return this;
        }

        public Itinerary build() {
            return new Itinerary(this);
        }
    }
}
