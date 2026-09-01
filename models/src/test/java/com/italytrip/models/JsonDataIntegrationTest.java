package com.italytrip.models;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test to verify models work with real dataset JSON.
 */
class JsonDataIntegrationTest {

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    void testDeserializeItalyDataset() throws IOException {
        // Given - path to the actual data file
        String dataPath = "../../initial_documents/file_italy.json";
        File dataFile = new File(getClass().getResource("/").getPath() + dataPath);
        
        // If file doesn't exist in test resources, try from project root
        if (!dataFile.exists()) {
            String projectRoot = System.getProperty("user.dir");
            if (projectRoot.endsWith("models")) {
                projectRoot = projectRoot.substring(0, projectRoot.lastIndexOf("models"));
            }
            dataFile = new File(projectRoot + "initial_documents/file_italy.json");
        }
        
        // Skip test if file not found (won't fail build)
        if (!dataFile.exists()) {
            System.out.println("Skipping integration test - data file not found at: " + dataFile.getAbsolutePath());
            return;
        }

        // When
        Place[] places = objectMapper.readValue(dataFile, Place[].class);

        // Then
        assertThat(places).isNotEmpty();
        
        // Verify first place (Colosseum)
        Place colosseum = places[0];
        assertThat(colosseum.getId()).isEqualTo("place_001");
        assertThat(colosseum.getName()).isEqualTo("Colosseum");
        assertThat(colosseum.getType()).isEqualTo(PlaceType.HISTORIC_SITE);
        assertThat(colosseum.getCity()).isEqualTo("Rome");
        assertThat(colosseum.getLatitude()).isEqualTo(41.8902);
        assertThat(colosseum.getLongitude()).isEqualTo(12.4922);
        assertThat(colosseum.getDurationMinutes()).isEqualTo(120);
        assertThat(colosseum.getRating()).isEqualTo(4.8);
        assertThat(colosseum.getBookingRequired()).isTrue();
        assertThat(colosseum.getTags()).contains("iconic", "historic");
        
        // Verify a place with null fields (Trastevere)
        Place trastevere = places[1];
        assertThat(trastevere.getId()).isEqualTo("place_002");
        assertThat(trastevere.getName()).isEqualTo("Trastevere Neighborhood");
        assertThat(trastevere.getHours()).isNull();
        assertThat(trastevere.getSeasonalNotes()).isNull();
        
        // Verify various place types are parsed correctly
        List<PlaceType> types = Arrays.stream(places)
                .map(Place::getType)
                .distinct()
                .toList();
        assertThat(types).contains(
                PlaceType.HISTORIC_SITE,
                PlaceType.RESTAURANT,
                PlaceType.MUSEUM,
                PlaceType.NEIGHBORHOOD,
                PlaceType.MARKET,
                PlaceType.CAFE
        );
        
        // Verify all places have required fields
        for (Place place : places) {
            assertThat(place.getId()).isNotNull();
            assertThat(place.getName()).isNotNull();
            assertThat(place.getType()).isNotNull();
            assertThat(place.getCity()).isNotNull();
            assertThat(place.getLatitude()).isNotNull();
            assertThat(place.getLongitude()).isNotNull();
        }
        
        System.out.println("Successfully parsed " + places.length + " places from dataset");
    }

    @Test
    void testSerializeItinerary() throws IOException {
        // Given - create an itinerary with some places
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(120)
                .rating(4.8)
                .build();

        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Trastevere")
                .type(PlaceType.NEIGHBORHOOD)
                .city("Rome")
                .latitude(41.8893)
                .longitude(12.4706)
                .durationMinutes(180)
                .rating(4.7)
                .build();

        DayPlan day1 = new DayPlan(1);
        day1.addPlace(place1);
        day1.addPlace(place2);

        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addInterest("historic")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();

        Itinerary itinerary = new Itinerary.Builder()
                .name("My Rome Trip")
                .days(Arrays.asList(day1, new DayPlan(2), new DayPlan(3)))
                .preferences(preferences)
                .build();

        // When
        String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(itinerary);

        // Then
        assertThat(json).isNotEmpty();
        assertThat(json).contains("\"name\" : \"My Rome Trip\"");
        assertThat(json).contains("\"day_number\" : 1");
        assertThat(json).contains("\"Colosseum\"");
        assertThat(json).contains("\"Trastevere\"");
        
        // Verify it can be deserialized back
        Itinerary deserialized = objectMapper.readValue(json, Itinerary.class);
        assertThat(deserialized.getName()).isEqualTo("My Rome Trip");
        assertThat(deserialized.getDays()).hasSize(3);
        assertThat(deserialized.getDayPlan(1).getPlaces()).hasSize(2);
        assertThat(deserialized.getDayPlan(1).getTotalDuration()).isEqualTo(300);
        
        System.out.println("Successfully serialized and deserialized itinerary");
    }
}
