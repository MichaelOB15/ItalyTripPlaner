package com.italytrip.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for DayPlan model.
 */
class DayPlanTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void testDefaultConstructor() {
        // When
        DayPlan dayPlan = new DayPlan();

        // Then
        assertThat(dayPlan.getPlaces()).isEmpty();
        assertThat(dayPlan.getStartTime()).isEqualTo("08:00");
        assertThat(dayPlan.getTotalDuration()).isEqualTo(0);
    }

    @Test
    void testConstructorWithDayNumber() {
        // When
        DayPlan dayPlan = new DayPlan(2);

        // Then
        assertThat(dayPlan.getDayNumber()).isEqualTo(2);
        assertThat(dayPlan.getPlaces()).isEmpty();
    }

    @Test
    void testBuilder() {
        // Given
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(120)
                .build();

        // When
        DayPlan dayPlan = new DayPlan.Builder()
                .dayNumber(1)
                .places(Arrays.asList(place1))
                .startTime("09:00")
                .build();

        // Then
        assertThat(dayPlan.getDayNumber()).isEqualTo(1);
        assertThat(dayPlan.getPlaces()).hasSize(1);
        assertThat(dayPlan.getStartTime()).isEqualTo("09:00");
        assertThat(dayPlan.getTotalDuration()).isEqualTo(120);
    }

    @Test
    void testAddPlace() {
        // Given
        DayPlan dayPlan = new DayPlan(1);
        Place place = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(120)
                .build();

        // When
        dayPlan.addPlace(place);

        // Then
        assertThat(dayPlan.getPlaces()).hasSize(1);
        assertThat(dayPlan.getTotalDuration()).isEqualTo(120);
    }

    @Test
    void testAddPlaceWithDefaultDuration() {
        // Given
        DayPlan dayPlan = new DayPlan(1);
        Place place = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                // No duration specified
                .build();

        // When
        dayPlan.addPlace(place);

        // Then
        assertThat(dayPlan.getTotalDuration()).isEqualTo(60); // Default duration
    }

    @Test
    void testRemovePlace() {
        // Given
        DayPlan dayPlan = new DayPlan(1);
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(120)
                .build();
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Forum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8925)
                .longitude(12.4853)
                .durationMinutes(90)
                .build();

        dayPlan.addPlace(place1);
        dayPlan.addPlace(place2);
        assertThat(dayPlan.getTotalDuration()).isEqualTo(210);

        // When
        dayPlan.removePlace(place1);

        // Then
        assertThat(dayPlan.getPlaces()).hasSize(1);
        assertThat(dayPlan.getTotalDuration()).isEqualTo(90);
    }

    @Test
    void testTotalDurationCalculation() {
        // Given
        DayPlan dayPlan = new DayPlan(1);
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(120)
                .build();
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8925)
                .longitude(12.4853)
                .durationMinutes(90)
                .build();
        Place place3 = new Place.Builder()
                .id("place_003")
                .name("Place 3")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.8900)
                .longitude(12.4850)
                // No duration - should use default 60
                .build();

        // When
        dayPlan.addPlace(place1);
        dayPlan.addPlace(place2);
        dayPlan.addPlace(place3);

        // Then
        assertThat(dayPlan.getTotalDuration()).isEqualTo(270); // 120 + 90 + 60
    }

    @Test
    void testJsonSerialization() throws Exception {
        // Given
        DayPlan dayPlan = new DayPlan.Builder()
                .dayNumber(1)
                .startTime("09:00")
                .build();

        // When
        String json = objectMapper.writeValueAsString(dayPlan);

        // Then
        assertThat(json).contains("\"day_number\":1");
        assertThat(json).contains("\"start_time\":\"09:00\"");
        assertThat(json).contains("\"places\":");
        assertThat(json).contains("\"total_duration\":");
    }

    @Test
    void testJsonDeserialization() throws Exception {
        // Given
        String json = """
                {
                    "day_number": 2,
                    "places": [],
                    "total_duration": 0,
                    "start_time": "10:00"
                }
                """;

        // When
        DayPlan dayPlan = objectMapper.readValue(json, DayPlan.class);

        // Then
        assertThat(dayPlan.getDayNumber()).isEqualTo(2);
        assertThat(dayPlan.getStartTime()).isEqualTo("10:00");
        assertThat(dayPlan.getPlaces()).isEmpty();
        assertThat(dayPlan.getTotalDuration()).isEqualTo(0);
    }
}
