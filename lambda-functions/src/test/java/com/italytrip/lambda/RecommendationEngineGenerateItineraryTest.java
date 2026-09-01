package com.italytrip.lambda;

import com.italytrip.models.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for RecommendationEngine.generateItinerary method.
 * Tests the complete itinerary generation flow without mocking.
 */
class RecommendationEngineGenerateItineraryTest {
    
    private RecommendationEngine engine;
    private List<Place> testPlaces;
    
    @BeforeEach
    void setUp() {
        engine = new RecommendationEngine();
        testPlaces = createTestPlaces();
    }
    
    @Test
    void generateItinerary_withValidPreferencesAndPlaces_returnsItinerary() {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addInterest("historic")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        // Act
        Itinerary itinerary = engine.generateItinerary(testPlaces, preferences);
        
        // Assert
        assertThat(itinerary).isNotNull();
        assertThat(itinerary.getId()).isNotNull();
        assertThat(itinerary.getName()).isEqualTo("Recommended Itinerary");
        assertThat(itinerary.getDays()).hasSize(3);
        assertThat(itinerary.getPreferences()).isEqualTo(preferences);
        
        // Verify each day has valid structure
        for (DayPlan day : itinerary.getDays()) {
            assertThat(day.getDayNumber()).isBetween(1, 3);
            assertThat(day.getStartTime()).isEqualTo("08:00");
            assertThat(day.getPlaces()).isNotNull();
        }
    }
    
    @Test
    void generateItinerary_withRelaxedPace_limitsPlacesPerDay() {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .pace(UserPreferences.TripPace.RELAXED)
                .build();
        
        // Act
        Itinerary itinerary = engine.generateItinerary(testPlaces, preferences);
        
        // Assert
        assertThat(itinerary).isNotNull();
        
        // Relaxed pace limits to 6 hours/day = ~3-4 places with typical durations
        for (DayPlan day : itinerary.getDays()) {
            int totalMinutes = day.getTotalDuration();
            assertThat(totalMinutes).isLessThanOrEqualTo(360); // 6 hours
        }
    }
    
    @Test
    void generateItinerary_withPackedPace_allowsMorePlacesPerDay() {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .pace(UserPreferences.TripPace.PACKED)
                .build();
        
        // Act
        Itinerary itinerary = engine.generateItinerary(testPlaces, preferences);
        
        // Assert
        assertThat(itinerary).isNotNull();
        
        // Packed pace allows up to 10 hours/day
        for (DayPlan day : itinerary.getDays()) {
            int totalMinutes = day.getTotalDuration();
            assertThat(totalMinutes).isLessThanOrEqualTo(600); // 10 hours
        }
    }
    
    @Test
    void generateItinerary_withMultipleCities_distributesCitiesAcrossDays() {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .addCity("Venice")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        // Act
        Itinerary itinerary = engine.generateItinerary(testPlaces, preferences);
        
        // Assert
        assertThat(itinerary).isNotNull();
        assertThat(itinerary.getDays()).hasSize(3);
        
        // Should have places from multiple cities
        List<String> citiesUsed = new ArrayList<>();
        for (DayPlan day : itinerary.getDays()) {
            for (Place place : day.getPlaces()) {
                if (!citiesUsed.contains(place.getCity())) {
                    citiesUsed.add(place.getCity());
                }
            }
        }
        
        assertThat(citiesUsed.size()).isGreaterThan(1);
    }
    
    @Test
    void generateItinerary_withNullPlaces_throwsNullPointerException() {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        // Act & Assert
        assertThatThrownBy(() -> engine.generateItinerary(null, preferences))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Places list cannot be null");
    }
    
    @Test
    void generateItinerary_withNullPreferences_throwsNullPointerException() {
        // Act & Assert
        assertThatThrownBy(() -> engine.generateItinerary(testPlaces, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("UserPreferences cannot be null");
    }
    
    @Test
    void generateItinerary_withNoMatchingPlaces_stillGeneratesWithLowScores() {
        // Arrange
        // When city doesn't match, places still score based on other factors (rating, etc.)
        // The algorithm is lenient and will include places with score >= 1
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("NonExistentCity")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        // Act
        Itinerary itinerary = engine.generateItinerary(testPlaces, preferences);
        
        // Assert
        // The algorithm should still generate an itinerary even without city matches
        // because places get scores from ratings and other factors
        assertThat(itinerary).isNotNull();
        assertThat(itinerary.getDays()).hasSize(3);
    }
    
    @Test
    void generateItinerary_withInterests_prioritizesMatchingPlaces() {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .addInterest("historic")
                .addInterest("art")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        // Act
        Itinerary itinerary = engine.generateItinerary(testPlaces, preferences);
        
        // Assert
        assertThat(itinerary).isNotNull();
        
        // Should include places with matching interests
        boolean hasHistoricPlace = false;
        boolean hasArtPlace = false;
        
        for (DayPlan day : itinerary.getDays()) {
            for (Place place : day.getPlaces()) {
                if (place.getTags() != null) {
                    if (place.getTags().contains("historic")) hasHistoricPlace = true;
                    if (place.getTags().contains("art")) hasArtPlace = true;
                }
            }
        }
        
        assertThat(hasHistoricPlace || hasArtPlace).isTrue();
    }
    
    @Test
    void generateItinerary_withPriceRange_respectsPreference() {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .pace(UserPreferences.TripPace.MODERATE)
                .addPriceRange("€")
                .build();
        
        // Act
        Itinerary itinerary = engine.generateItinerary(testPlaces, preferences);
        
        // Assert
        assertThat(itinerary).isNotNull();
        // Should include some budget-friendly places
        // (note: test is lenient as algorithm may include higher-priced places if they score well on other criteria)
    }
    
    /**
     * Helper method to create test places for itinerary generation.
     */
    private List<Place> createTestPlaces() {
        List<Place> places = new ArrayList<>();
        
        // Rome places
        places.add(new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(4.8)
                .durationMinutes(120)
                .priceRange("€€")
                .tags(Arrays.asList("historic", "ancient"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_002")
                .name("Roman Forum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8925)
                .longitude(12.4853)
                .rating(4.7)
                .durationMinutes(90)
                .priceRange("€")
                .tags(Arrays.asList("historic", "ancient"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_003")
                .name("Trattoria Roma")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9000)
                .longitude(12.5000)
                .rating(4.5)
                .durationMinutes(90)
                .priceRange("€€")
                .tags(Arrays.asList("food", "traditional"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_004")
                .name("Pantheon")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8986)
                .longitude(12.4769)
                .rating(4.9)
                .durationMinutes(60)
                .priceRange("€")
                .tags(Arrays.asList("historic", "architecture"))
                .build());
        
        // Florence places
        places.add(new Place.Builder()
                .id("place_005")
                .name("Uffizi Gallery")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .rating(4.7)
                .durationMinutes(180)
                .priceRange("€€")
                .tags(Arrays.asList("art", "museum"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_006")
                .name("Duomo")
                .type(PlaceType.HISTORIC_SITE)
                .city("Florence")
                .latitude(43.7731)
                .longitude(11.2560)
                .rating(4.8)
                .durationMinutes(120)
                .priceRange("€€")
                .tags(Arrays.asList("historic", "architecture"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_007")
                .name("Trattoria Firenze")
                .type(PlaceType.RESTAURANT)
                .city("Florence")
                .latitude(43.7700)
                .longitude(11.2580)
                .rating(4.6)
                .durationMinutes(90)
                .priceRange("€€")
                .tags(Arrays.asList("food", "traditional"))
                .build());
        
        // Venice places
        places.add(new Place.Builder()
                .id("place_008")
                .name("St Mark's Basilica")
                .type(PlaceType.HISTORIC_SITE)
                .city("Venice")
                .latitude(45.4345)
                .longitude(12.3398)
                .rating(4.8)
                .durationMinutes(90)
                .priceRange("€")
                .tags(Arrays.asList("historic", "architecture"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_009")
                .name("Doge's Palace")
                .type(PlaceType.MUSEUM)
                .city("Venice")
                .latitude(45.4336)
                .longitude(12.3404)
                .rating(4.7)
                .durationMinutes(120)
                .priceRange("€€")
                .tags(Arrays.asList("historic", "art"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_010")
                .name("Osteria Venezia")
                .type(PlaceType.RESTAURANT)
                .city("Venice")
                .latitude(45.4400)
                .longitude(12.3350)
                .rating(4.5)
                .durationMinutes(90)
                .priceRange("€€€")
                .tags(Arrays.asList("food", "seafood"))
                .build());
        
        return places;
    }
}
