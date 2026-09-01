package com.italytrip.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for Place model and its JSON serialization/deserialization.
 */
class PlaceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void testBuilder() {
        // Given
        List<String> tags = Arrays.asList("historic", "iconic");

        // When
        Place place = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .region("Lazio")
                .neighborhood("Celio")
                .description("The most iconic structure in Rome")
                .hours("9:00-19:00")
                .durationMinutes(120)
                .priceRange("€€")
                .rating(4.8)
                .tags(tags)
                .seasonalNotes("Summer queues can be brutal")
                .bookingRequired(true)
                .build();

        // Then
        assertThat(place.getId()).isEqualTo("place_001");
        assertThat(place.getName()).isEqualTo("Colosseum");
        assertThat(place.getType()).isEqualTo(PlaceType.HISTORIC_SITE);
        assertThat(place.getCity()).isEqualTo("Rome");
        assertThat(place.getLatitude()).isEqualTo(41.8902);
        assertThat(place.getLongitude()).isEqualTo(12.4922);
        assertThat(place.getTags()).containsExactly("historic", "iconic");
        assertThat(place.getBookingRequired()).isTrue();
    }

    @Test
    void testJsonSerialization() throws Exception {
        // Given
        Place place = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(120)
                .priceRange("€€")
                .rating(4.8)
                .build();

        // When
        String json = objectMapper.writeValueAsString(place);

        // Then
        assertThat(json).contains("\"id\":\"place_001\"");
        assertThat(json).contains("\"name\":\"Colosseum\"");
        assertThat(json).contains("\"type\":\"historic_site\"");
        assertThat(json).contains("\"city\":\"Rome\"");
        assertThat(json).contains("\"latitude\":41.8902");
        assertThat(json).contains("\"longitude\":12.4922");
    }

    @Test
    void testJsonDeserialization() throws Exception {
        // Given
        String json = """
                {
                    "id": "place_001",
                    "name": "Colosseum",
                    "type": "historic_site",
                    "city": "Rome",
                    "latitude": 41.8902,
                    "longitude": 12.4922,
                    "hours": "9:00-19:00",
                    "duration_minutes": 120,
                    "price_range": "€€",
                    "rating": 4.8,
                    "tags": ["historic", "iconic"],
                    "booking_required": true
                }
                """;

        // When
        Place place = objectMapper.readValue(json, Place.class);

        // Then
        assertThat(place.getId()).isEqualTo("place_001");
        assertThat(place.getName()).isEqualTo("Colosseum");
        assertThat(place.getType()).isEqualTo(PlaceType.HISTORIC_SITE);
        assertThat(place.getCity()).isEqualTo("Rome");
        assertThat(place.getLatitude()).isEqualTo(41.8902);
        assertThat(place.getLongitude()).isEqualTo(12.4922);
        assertThat(place.getDurationMinutes()).isEqualTo(120);
        assertThat(place.getRating()).isEqualTo(4.8);
        assertThat(place.getTags()).containsExactly("historic", "iconic");
        assertThat(place.getBookingRequired()).isTrue();
    }

    @Test
    void testJsonDeserializationWithNullFields() throws Exception {
        // Given
        String json = """
                {
                    "id": "place_002",
                    "name": "Trastevere",
                    "type": "neighborhood",
                    "city": "Rome",
                    "latitude": 41.8893,
                    "longitude": 12.4706,
                    "hours": null,
                    "seasonal_notes": null
                }
                """;

        // When
        Place place = objectMapper.readValue(json, Place.class);

        // Then
        assertThat(place.getId()).isEqualTo("place_002");
        assertThat(place.getName()).isEqualTo("Trastevere");
        assertThat(place.getHours()).isNull();
        assertThat(place.getSeasonalNotes()).isNull();
        assertThat(place.getDurationMinutes()).isNull();
    }

    @Test
    void testEqualsAndHashCode() {
        // Given
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();

        Place place2 = new Place.Builder()
                .id("place_001")
                .name("Different Name")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7696)
                .longitude(11.2558)
                .build();

        Place place3 = new Place.Builder()
                .id("place_002")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();

        // Then
        assertThat(place1).isEqualTo(place2); // Same ID
        assertThat(place1).isNotEqualTo(place3); // Different ID
        assertThat(place1.hashCode()).isEqualTo(place2.hashCode());
        assertThat(place1.hashCode()).isNotEqualTo(place3.hashCode());
    }
}
