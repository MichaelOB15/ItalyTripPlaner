package com.italytrip.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for Itinerary model.
 */
class ItineraryTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    void testDefaultConstructor() {
        // When
        Itinerary itinerary = new Itinerary();

        // Then
        assertThat(itinerary.getId()).isNotNull();
        assertThat(itinerary.getDays()).hasSize(3);
        assertThat(itinerary.getCreatedAt()).isNotNull();
        assertThat(itinerary.getLastModified()).isNotNull();
    }

    @Test
    void testBuilder() {
        // Given
        DayPlan day1 = new DayPlan(1);
        DayPlan day2 = new DayPlan(2);
        DayPlan day3 = new DayPlan(3);
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();

        // When
        Itinerary itinerary = new Itinerary.Builder()
                .id("test-id")
                .name("My Rome Trip")
                .days(Arrays.asList(day1, day2, day3))
                .preferences(preferences)
                .build();

        // Then
        assertThat(itinerary.getId()).isEqualTo("test-id");
        assertThat(itinerary.getName()).isEqualTo("My Rome Trip");
        assertThat(itinerary.getDays()).hasSize(3);
        assertThat(itinerary.getPreferences()).isEqualTo(preferences);
    }

    @Test
    void testGetDayPlan() {
        // Given
        Itinerary itinerary = new Itinerary();

        // When
        DayPlan day1 = itinerary.getDayPlan(1);
        DayPlan day2 = itinerary.getDayPlan(2);
        DayPlan day3 = itinerary.getDayPlan(3);

        // Then
        assertThat(day1.getDayNumber()).isEqualTo(1);
        assertThat(day2.getDayNumber()).isEqualTo(2);
        assertThat(day3.getDayNumber()).isEqualTo(3);
    }

    @Test
    void testGetDayPlanInvalidNumber() {
        // Given
        Itinerary itinerary = new Itinerary();

        // Then
        assertThatThrownBy(() -> itinerary.getDayPlan(0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Day number must be 1, 2, or 3");

        assertThatThrownBy(() -> itinerary.getDayPlan(4))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Day number must be 1, 2, or 3");
    }

    @Test
    void testUpdateLastModified() throws InterruptedException {
        // Given
        Itinerary itinerary = new Itinerary();
        LocalDateTime originalModified = itinerary.getLastModified();

        // Wait a bit to ensure time difference
        Thread.sleep(10);

        // When
        itinerary.setName("Updated Name");

        // Then
        assertThat(itinerary.getLastModified()).isAfter(originalModified);
    }

    @Test
    void testJsonSerialization() throws Exception {
        // Given
        Itinerary itinerary = new Itinerary.Builder()
                .name("Rome Adventure")
                .build();

        // When
        String json = objectMapper.writeValueAsString(itinerary);

        // Then
        assertThat(json).contains("\"name\":\"Rome Adventure\"");
        assertThat(json).contains("\"days\":");
        assertThat(json).contains("\"id\":");
    }

    @Test
    void testJsonDeserialization() throws Exception {
        // Given
        String json = """
                {
                    "id": "test-id",
                    "name": "Rome Adventure",
                    "days": [
                        {"day_number": 1, "places": [], "total_duration": 0, "start_time": "08:00"},
                        {"day_number": 2, "places": [], "total_duration": 0, "start_time": "08:00"},
                        {"day_number": 3, "places": [], "total_duration": 0, "start_time": "08:00"}
                    ],
                    "created_at": "2024-08-29T10:00:00",
                    "last_modified": "2024-08-29T10:00:00"
                }
                """;

        // When
        Itinerary itinerary = objectMapper.readValue(json, Itinerary.class);

        // Then
        assertThat(itinerary.getId()).isEqualTo("test-id");
        assertThat(itinerary.getName()).isEqualTo("Rome Adventure");
        assertThat(itinerary.getDays()).hasSize(3);
    }

    @Test
    void testEqualsAndHashCode() {
        // Given
        Itinerary itinerary1 = new Itinerary.Builder()
                .id("id1")
                .name("Trip 1")
                .build();

        Itinerary itinerary2 = new Itinerary.Builder()
                .id("id1")
                .name("Trip 2")
                .build();

        Itinerary itinerary3 = new Itinerary.Builder()
                .id("id2")
                .name("Trip 1")
                .build();

        // Then
        assertThat(itinerary1).isEqualTo(itinerary2); // Same ID
        assertThat(itinerary1).isNotEqualTo(itinerary3); // Different ID
        assertThat(itinerary1.hashCode()).isEqualTo(itinerary2.hashCode());
    }
}
