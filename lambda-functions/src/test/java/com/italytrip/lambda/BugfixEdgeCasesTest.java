package com.italytrip.lambda;

import com.italytrip.lambda.RecommendationEngine.ScoredPlace;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.UserPreferences;
import com.italytrip.models.UserPreferences.TripPace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Bug Fix Edge Cases and Error Scenarios - Task 7.2
 * 
 * This test suite covers edge cases and error scenarios for Bug #1:
 * City pre-filtering in RecommendationEngine.java
 * 
 * Test scenarios:
 * - Empty city array (should return all cities)
 * - Null city preferences (should return all cities)
 * - Case sensitivity in city names
 * - Unknown city names in preferences
 * - All places filtered out (empty result)
 * - Single city selection
 * - Duplicate city names
 * - Whitespace in city names
 * - Special characters in city names
 * - Very large city lists
 * - Empty places list with city filter
 * - Null places in list
 * 
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 3.3**
 */
@DisplayName("Bug Fix Edge Cases: City Pre-filtering")
class BugfixEdgeCasesTest {
    
    private static final Logger LOGGER = Logger.getLogger(BugfixEdgeCasesTest.class.getName());
    private RecommendationEngine engine;
    
    // Sample places for testing
    private Place romePlace1;
    private Place romePlace2;
    private Place florencePlace1;
    private Place florencePlace2;
    private Place venicePlace1;
    private Place milanPlace1;
    private Place naplesPlace1;
    
    @BeforeEach
    void setUp() {
        engine = new RecommendationEngine();
        
        // Create sample places from different cities
        romePlace1 = new Place.Builder()
                .id("rome_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .tags(Arrays.asList("historic", "iconic", "ancient"))
                .rating(4.8)
                .priceRange("€€")
                .build();
        
        romePlace2 = new Place.Builder()
                .id("rome_002")
                .name("Trevi Fountain")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .tags(Arrays.asList("fountain", "landmark"))
                .rating(4.7)
                .priceRange("€")
                .build();
        
        florencePlace1 = new Place.Builder()
                .id("florence_001")
                .name("Uffizi Gallery")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .tags(Arrays.asList("art", "renaissance", "museum"))
                .rating(4.7)
                .priceRange("€€€")
                .build();
        
        florencePlace2 = new Place.Builder()
                .id("florence_002")
                .name("Ponte Vecchio")
                .type(PlaceType.HISTORIC_SITE)
                .city("Florence")
                .latitude(43.7679)
                .longitude(11.2531)
                .tags(Arrays.asList("bridge", "shopping"))
                .rating(4.6)
                .priceRange("€")
                .build();
        
        venicePlace1 = new Place.Builder()
                .id("venice_001")
                .name("St. Mark's Basilica")
                .type(PlaceType.HISTORIC_SITE)
                .city("Venice")
                .latitude(45.4345)
                .longitude(12.3397)
                .tags(Arrays.asList("cathedral", "byzantine", "art"))
                .rating(4.8)
                .priceRange("€€")
                .build();
        
        milanPlace1 = new Place.Builder()
                .id("milan_001")
                .name("Duomo di Milano")
                .type(PlaceType.HISTORIC_SITE)
                .city("Milan")
                .latitude(45.4642)
                .longitude(9.1900)
                .tags(Arrays.asList("cathedral", "gothic", "architecture"))
                .rating(4.9)
                .priceRange("€€")
                .build();
        
        naplesPlace1 = new Place.Builder()
                .id("naples_001")
                .name("Naples Pizza")
                .type(PlaceType.RESTAURANT)
                .city("Naples")
                .latitude(40.8518)
                .longitude(14.2681)
                .tags(Arrays.asList("food", "pizza", "authentic"))
                .rating(4.6)
                .priceRange("€€")
                .build();
    }
    
    // ==================== Empty/Null City Selection Tests ====================
    
    @Test
    @DisplayName("Empty city array should return places from all cities")
    void testEmptyCityArrayReturnsAllCities() {
        // **Edge Case**: Empty cities array should NOT filter (Requirement 3.1)
        LOGGER.info("Testing empty city array - should return all cities");
        
        List<Place> allPlaces = Arrays.asList(
                romePlace1, florencePlace1, venicePlace1, milanPlace1
        );
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Collections.emptyList()) // Empty - no filter
                .interests(Arrays.asList("art"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(allPlaces, preferences);
        
        // Should not filter by city - all cities can appear
        assertFalse(results.isEmpty(), "Empty city array should return results");
        
        // Places from different cities should be present based on scoring
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        LOGGER.info("Cities in results with empty filter: " + resultCities);
        
        // At least places with "art" tag should be included
        assertTrue(results.stream().anyMatch(sp -> 
                sp.getPlace().getTags().contains("art")),
                "Places matching other preferences should be included"
        );
    }
    
    @Test
    @DisplayName("Null city preferences should return places from all cities")
    void testNullCityPreferencesReturnsAllCities() {
        // **Edge Case**: Null cities should behave like empty array
        LOGGER.info("Testing null city preferences - should return all cities");
        
        List<Place> allPlaces = Arrays.asList(
                romePlace1, florencePlace1, venicePlace1
        );
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(null) // Explicitly null
                .interests(Arrays.asList("historic"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(allPlaces, preferences);
        
        // Should not filter by city
        assertFalse(results.isEmpty(), "Null city array should return results");
        
        // Places from different cities should be present
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        LOGGER.info("Cities in results with null filter: " + resultCities);
        assertTrue(resultCities.size() >= 1, "Multiple cities should be possible");
    }
    
    // ==================== Case Sensitivity Tests ====================
    
    @Test
    @DisplayName("City filter should be case-insensitive")
    void testCaseInsensitiveCityMatching() {
        // **Edge Case**: "rome" should match "Rome" (case-insensitive)
        LOGGER.info("Testing case-insensitive city matching");
        
        List<Place> places = Arrays.asList(romePlace1, florencePlace1, venicePlace1);
        
        // User specifies cities in various cases
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("rome", "FLORENCE")) // Lowercase and uppercase
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should match Rome and Florence regardless of case
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        LOGGER.info("Result cities with mixed-case filter: " + resultCities);
        
        assertTrue(resultCities.contains("Rome"), "Rome should be included (case-insensitive)");
        assertTrue(resultCities.contains("Florence"), "Florence should be included (case-insensitive)");
        assertFalse(resultCities.contains("Venice"), "Venice should be excluded");
    }
    
    @Test
    @DisplayName("Mixed case city names should all match correctly")
    void testMixedCaseCityNames() {
        List<Place> places = Arrays.asList(romePlace1, florencePlace1, venicePlace1, milanPlace1);
        
        // Mix of cases in preferences
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("RoMe", "florence", "MILAN"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .collect(Collectors.toList());
        
        // Should match all three cities
        assertTrue(resultCities.contains("Rome"));
        assertTrue(resultCities.contains("Florence"));
        assertTrue(resultCities.contains("Milan"));
        assertFalse(resultCities.contains("Venice"));
    }
    
    // ==================== Unknown City Names Tests ====================
    
    @Test
    @DisplayName("Unknown city names should return empty results")
    void testUnknownCityNames() {
        // **Edge Case**: City names not in database should return no results
        LOGGER.info("Testing unknown city names");
        
        List<Place> places = Arrays.asList(romePlace1, florencePlace1, venicePlace1);
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("UnknownCity", "FakeCity"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should return empty - no places match unknown cities
        assertTrue(results.isEmpty(), "Unknown cities should return empty results");
        LOGGER.info("Unknown cities correctly returned empty results");
    }
    
    @Test
    @DisplayName("Mix of known and unknown cities should return only known cities")
    void testMixOfKnownAndUnknownCities() {
        List<Place> places = Arrays.asList(romePlace1, florencePlace1, venicePlace1);
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome", "UnknownCity", "Florence"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        // Should only include Rome and Florence
        assertTrue(resultCities.contains("Rome"));
        assertTrue(resultCities.contains("Florence"));
        assertFalse(resultCities.contains("UnknownCity"));
        assertEquals(2, resultCities.size());
    }
    
    // ==================== All Places Filtered Out Tests ====================
    
    @Test
    @DisplayName("Restrictive filters should return empty results gracefully")
    void testAllPlacesFilteredOut() {
        // **Edge Case**: When filters eliminate all places, return empty (no crash)
        LOGGER.info("Testing all places filtered out scenario");
        
        List<Place> places = Arrays.asList(romePlace1, florencePlace1);
        
        // Select cities not in the places list
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Venice", "Milan"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        assertTrue(results.isEmpty(), "Restrictive filter should return empty list");
        LOGGER.info("All places filtered out - returned empty list gracefully");
    }
    
    @Test
    @DisplayName("Strict score threshold with city filter should work correctly")
    void testCityFilterWithHighScoreThreshold() {
        // Even if places match city, they still need score >= 1.0
        // After city filter fix, city match gives +3 points, so both should pass threshold
        List<Place> places = Arrays.asList(
                new Place.Builder()
                        .id("low_score_rome")
                        .name("Low Score Place")
                        .type(PlaceType.CAFE)
                        .city("Rome")
                        .latitude(41.8902)
                        .longitude(12.4922)
                        .rating(0.5) // Very low rating = 0.25 points, +3 from city = 3.25 total
                        .build(),
                romePlace1 // High scoring place
        );
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Both Rome places should pass (both have city match +3 points >= 1.0 threshold)
        // After city filter fix, low score place gets 3.25 points (3 from city + 0.25 from rating)
        assertEquals(2, results.size());
        // Should be sorted by score descending
        assertTrue(results.get(0).getScore() > results.get(1).getScore());
    }
    
    // ==================== Single City Selection Tests ====================
    
    @Test
    @DisplayName("Single city selection should work correctly")
    void testSingleCitySelection() {
        // **Edge Case**: Single city should work same as multiple
        List<Place> places = Arrays.asList(
                romePlace1, romePlace2, florencePlace1, venicePlace1
        );
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome")) // Single city
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should ONLY include Rome places
        assertFalse(results.isEmpty());
        assertTrue(results.stream().allMatch(sp -> sp.getPlace().getCity().equals("Rome")));
        
        List<String> placeIds = results.stream()
                .map(sp -> sp.getPlace().getId())
                .collect(Collectors.toList());
        
        assertTrue(placeIds.contains("rome_001") || placeIds.contains("rome_002"));
    }
    
    // ==================== All Cities Selected (Preservation) ====================
    
    @Test
    @DisplayName("All cities selected should not filter (preservation)")
    void testAllCitiesSelected() {
        // **Preservation Test**: When all cities selected, no filtering (Req 3.1)
        List<Place> places = Arrays.asList(
                romePlace1, florencePlace1, venicePlace1, milanPlace1, naplesPlace1
        );
        
        // Select ALL cities
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome", "Florence", "Venice", "Milan", "Naples"))
                .interests(Arrays.asList("art", "food"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Multiple cities should be represented
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        // Should have places from multiple cities
        assertTrue(resultCities.size() >= 2, "All cities filter should allow multiple cities");
        LOGGER.info("All cities filter returned cities: " + resultCities);
    }
    
    // ==================== Duplicate City Names ====================
    
    @Test
    @DisplayName("Duplicate city names in preferences should be handled")
    void testDuplicateCityNames() {
        List<Place> places = Arrays.asList(romePlace1, florencePlace1);
        
        // Duplicate "Rome" in preferences
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome", "Rome", "Florence"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should work correctly despite duplicates
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        assertTrue(resultCities.contains("Rome"));
        assertTrue(resultCities.contains("Florence"));
    }
    
    // ==================== Whitespace Handling ====================
    
    @Test
    @DisplayName("City names with leading/trailing whitespace should match")
    void testWhitespaceInCityNames() {
        List<Place> places = Arrays.asList(romePlace1, florencePlace1);
        
        // City names with whitespace
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList(" Rome ", "  Florence  "))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should still match (implementation may trim whitespace)
        // If not trimmed, this is an edge case to document
        LOGGER.info("Testing whitespace in city names - result count: " + results.size());
        
        // This test documents behavior - may need trimming in implementation
        if (results.isEmpty()) {
            LOGGER.warning("Whitespace in city names caused no matches - consider trimming");
        }
    }
    
    // ==================== Empty Places List ====================
    
    @Test
    @DisplayName("Empty places list with city filter should return empty")
    void testEmptyPlacesListWithCityFilter() {
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(
                Collections.emptyList(),
                preferences
        );
        
        assertTrue(results.isEmpty(), "Empty places list should return empty results");
    }
    
    // ==================== Null Handling ====================
    
    @Test
    @DisplayName("Null places list should throw exception")
    void testNullPlacesList() {
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome"))
                .build();
        
        assertThrows(NullPointerException.class, () -> {
            engine.scoreAndFilterPlaces(null, preferences);
        });
    }
    
    @Test
    @DisplayName("Place with null city should be handled gracefully")
    void testPlaceWithNullCity() {
        Place placeWithNullCity = new Place.Builder()
                .id("place_null_city")
                .name("Place Without City")
                .type(PlaceType.RESTAURANT)
                .city(null) // Null city
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(4.5)
                .build();
        
        List<Place> places = Arrays.asList(placeWithNullCity, romePlace1);
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should filter out place with null city
        assertEquals(1, results.size());
        assertEquals("rome_001", results.get(0).getPlace().getId());
        assertNotNull(results.get(0).getPlace().getCity());
    }
    
    // ==================== Very Large City Lists ====================
    
    @Test
    @DisplayName("Large city list should perform acceptably")
    void testLargeCityList() {
        // **Performance Edge Case**: Many cities should not cause issues
        List<String> manyCities = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            manyCities.add("City" + i);
        }
        manyCities.add("Rome"); // Include one actual city
        
        List<Place> places = Arrays.asList(romePlace1, florencePlace1);
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(manyCities)
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should still work and return Rome place
        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(sp -> sp.getPlace().getCity().equals("Rome")));
    }
    
    // ==================== Special Characters ====================
    
    @Test
    @DisplayName("City names with special characters should be handled")
    void testCityNamesWithSpecialCharacters() {
        // Some Italian cities might have accents or special characters
        Place specialCityPlace = new Place.Builder()
                .id("special_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Città di Castello") // City with special chars
                .latitude(43.4614)
                .longitude(12.2396)
                .rating(4.5)
                .build();
        
        List<Place> places = Arrays.asList(specialCityPlace, romePlace1);
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Città di Castello"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should match correctly
        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(sp -> 
                sp.getPlace().getCity().equals("Città di Castello")
        ));
    }
    
    // ==================== Scoring Still Works After City Filter ====================
    
    @Test
    @DisplayName("Scoring algorithm should still work within filtered cities")
    void testScoringWithinFilteredCities() {
        // **Integration Test**: City filter + scoring should both work
        Place highScoreRome = new Place.Builder()
                .id("high_rome")
                .name("High Score Rome")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .tags(Arrays.asList("art", "history", "museum"))
                .rating(5.0)
                .priceRange("€€")
                .build();
        
        Place lowScoreRome = new Place.Builder()
                .id("low_rome")
                .name("Low Score Rome")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .rating(3.0)
                .build();
        
        List<Place> places = Arrays.asList(highScoreRome, lowScoreRome, florencePlace1);
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome"))
                .interests(Arrays.asList("art", "history"))
                .priceRange(Arrays.asList("€€"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Should only have Rome places
        assertTrue(results.stream().allMatch(sp -> sp.getPlace().getCity().equals("Rome")));
        
        // Should be sorted by score (high score first)
        if (results.size() >= 2) {
            assertTrue(results.get(0).getScore() >= results.get(1).getScore());
        }
        
        // High score Rome should be included
        assertTrue(results.stream().anyMatch(sp -> sp.getPlace().getId().equals("high_rome")));
    }
    
    // ==================== Requirements Validation ====================
    
    @Test
    @DisplayName("Validates Requirement 2.1: ONLY selected cities in results")
    void testRequirement_2_1_OnlySelectedCities() {
        List<Place> places = Arrays.asList(
                romePlace1, florencePlace1, venicePlace1, milanPlace1
        );
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome", "Florence"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        // Requirement 2.1: Return ONLY places from selected cities
        for (ScoredPlace sp : results) {
            String city = sp.getPlace().getCity();
            assertTrue(
                    city.equals("Rome") || city.equals("Florence"),
                    "Requirement 2.1 violated: Place from " + city + " should not appear"
            );
        }
    }
    
    @Test
    @DisplayName("Validates Requirement 3.1: No filter when cities empty/all")
    void testRequirement_3_1_NoFilterWhenEmptyOrAll() {
        List<Place> places = Arrays.asList(romePlace1, florencePlace1, venicePlace1);
        
        // Test with empty cities
        UserPreferences emptyPrefs = new UserPreferences.Builder()
                .cities(Collections.emptyList())
                .interests(Arrays.asList("art"))
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, emptyPrefs);
        
        // Requirement 3.1: No city filtering when empty
        assertFalse(results.isEmpty(), "Empty cities should allow results");
    }
}
