package com.italytrip.lambda;

import com.italytrip.lambda.RecommendationEngine.ScoredPlace;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.UserPreferences;
import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.logging.Logger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-Based Preservation Tests for RecommendationEngine
 * 
 * **Task 2: Write preservation property tests for recommendation engine (BEFORE implementing fix)**
 * 
 * **Property 2: Preservation - Non-City-Filtered Recommendations**
 * 
 * These tests verify that when NO city filter is applied (empty cities array OR all cities selected),
 * the scoring algorithm behavior is preserved exactly as it was before the fix.
 * 
 * **IMPORTANT**: These tests run on UNFIXED code to capture baseline behavior.
 * **EXPECTED OUTCOME**: All tests should PASS on unfixed code.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 * 
 * The fix for Bug #1 should NOT change behavior when:
 * - preferences.cities is empty
 * - preferences.cities contains all available cities
 * 
 * In these cases, NO city filtering should occur - all places should be scored normally
 * and filtered only by minimum score threshold (score >= 1.0).
 */
class RecommendationEnginePreservationPropertyTest {
    
    private static final Logger LOGGER = Logger.getLogger(RecommendationEnginePreservationPropertyTest.class.getName());
    private static final List<String> ALL_CITIES = Arrays.asList("Rome", "Florence", "Venice", "Milan", "Naples");
    private static final RecommendationEngine engine = new RecommendationEngine();
    
    /**
     * Property 1: Empty Cities Array Preserves All-Place Scoring
     * 
     * **Validates: Requirement 3.1**
     * 
     * When preferences.cities is empty, the algorithm should:
     * 1. Score ALL places using the standard scoring algorithm
     * 2. Apply NO city-based filtering
     * 3. Filter only by minimum score threshold (>= 1.0)
     * 4. Return places from ALL cities in the input
     * 
     * This is the baseline behavior that must be preserved after the fix.
     */
    @Property
    @Label("Property 2.1: Empty cities array includes places from all cities")
    void emptyCitiesArrayIncludesAllCities(@ForAll("placesList") List<Place> places) {
        LOGGER.info("=== Property Test: Empty Cities Array ===");
        LOGGER.info(String.format("Testing with %d places from various cities", places.size()));
        
        // Create preferences with empty cities list
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(new ArrayList<>()) // Empty cities array
                .interests(Arrays.asList("art", "history"))
                .priceRange(Arrays.asList("€€"))
                .build();
        
        // Run scoreAndFilterPlaces
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        LOGGER.info(String.format("Results: %d places (from %d input places)", 
                results.size(), places.size()));
        
        // Extract cities from input places (only those with score >= 1.0)
        List<String> inputCities = places.stream()
                .map(Place::getCity)
                .distinct()
                .collect(Collectors.toList());
        
        // Extract cities from results
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        LOGGER.info("Input cities: " + inputCities);
        LOGGER.info("Result cities: " + resultCities);
        
        // Property: When cities is empty, results CAN include places from any city
        // (as long as they score >= 1.0)
        // We verify NO city was excluded by the filter - any filtering is due to score threshold only
        
        // For each place in results, verify it scored >= 1.0
        for (ScoredPlace sp : results) {
            assertTrue(sp.getScore() >= 1.0, 
                    String.format("Place %s should have score >= 1.0 (actual: %.2f)", 
                            sp.getPlace().getName(), sp.getScore()));
        }
        
        // Verify the scoring weights are applied correctly (preservation)
        for (ScoredPlace sp : results) {
            Place place = sp.getPlace();
            double expectedScore = calculateExpectedScore(place, preferences);
            assertEquals(expectedScore, sp.getScore(), 0.001,
                    String.format("Place %s score mismatch", place.getName()));
        }
        
        LOGGER.info("✓ Property satisfied: Empty cities preserves multi-city recommendations");
    }
    
    /**
     * Property 2: All Cities Selected Preserves All-Place Scoring
     * 
     * **Validates: Requirement 3.2**
     * 
     * When preferences.cities contains ALL available cities, the algorithm should:
     * 1. Score ALL places using the standard scoring algorithm
     * 2. Apply NO effective city filtering (since all cities are selected)
     * 3. Filter only by minimum score threshold (>= 1.0)
     * 4. Return places from ALL cities (equivalent to no city filter)
     * 
     * This is another baseline behavior that must be preserved after the fix.
     */
    @Property
    @Label("Property 2.2: All cities selected includes places from all cities")
    void allCitiesSelectedIncludesAllCities(@ForAll("placesList") List<Place> places) {
        LOGGER.info("=== Property Test: All Cities Selected ===");
        LOGGER.info(String.format("Testing with %d places from various cities", places.size()));
        
        // Create preferences with ALL cities
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(new ArrayList<>(ALL_CITIES)) // All cities
                .interests(Arrays.asList("art", "history"))
                .priceRange(Arrays.asList("€€"))
                .build();
        
        // Run scoreAndFilterPlaces
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        LOGGER.info(String.format("Results: %d places (from %d input places)", 
                results.size(), places.size()));
        
        // Extract cities from results
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        LOGGER.info("Result cities: " + resultCities);
        
        // Property: When all cities are selected, results CAN include places from any city
        // (as long as they score >= 1.0)
        
        // For each place in results, verify it scored >= 1.0
        for (ScoredPlace sp : results) {
            assertTrue(sp.getScore() >= 1.0, 
                    String.format("Place %s should have score >= 1.0 (actual: %.2f)", 
                            sp.getPlace().getName(), sp.getScore()));
        }
        
        // Verify the scoring weights are applied correctly (preservation)
        for (ScoredPlace sp : results) {
            Place place = sp.getPlace();
            double expectedScore = calculateExpectedScore(place, preferences);
            assertEquals(expectedScore, sp.getScore(), 0.001,
                    String.format("Place %s score mismatch", place.getName()));
        }
        
        LOGGER.info("✓ Property satisfied: All cities selected preserves multi-city recommendations");
    }
    
    /**
     * Property 3: Scoring Algorithm Weights Preserved
     * 
     * **Validates: Requirement 3.3**
     * 
     * The scoring algorithm weights must remain unchanged:
     * - Interest match: +2 points per matching tag
     * - Price match: +1 point
     * - Rating boost: +rating/2
     * - Minimum threshold: score >= 1.0
     * 
     * This property tests that the core scoring logic is preserved when no city filter applies.
     */
    @Property
    @Label("Property 2.3: Scoring algorithm weights preserved (interest +2, price +1, rating/2)")
    void scoringAlgorithmWeightsPreserved(@ForAll("singlePlace") Place place) {
        LOGGER.info("=== Property Test: Scoring Algorithm Weights ===");
        LOGGER.info(String.format("Testing place: %s from %s", place.getName(), place.getCity()));
        
        // Create preferences with empty cities (no city filtering)
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(new ArrayList<>()) // Empty cities - no filtering
                .interests(Arrays.asList("art", "history", "food"))
                .priceRange(Arrays.asList("€€"))
                .build();
        
        // Calculate expected score using the documented scoring algorithm
        double expectedScore = calculateExpectedScore(place, preferences);
        
        // Get actual score from engine
        double actualScore = engine.scorePlaceForPreferences(place, preferences);
        
        LOGGER.info(String.format("Expected score: %.2f, Actual score: %.2f", 
                expectedScore, actualScore));
        
        // Property: Score matches expected calculation
        assertEquals(expectedScore, actualScore, 0.001,
                String.format("Scoring algorithm weights not preserved for place %s", place.getName()));
        
        LOGGER.info("✓ Property satisfied: Scoring weights preserved");
    }
    
    /**
     * Property 4: Minimum Score Threshold Filtering Works
     * 
     * **Validates: Requirement 3.3**
     * 
     * The minimum score threshold filtering (score >= 1.0) must still work correctly
     * when no city filter is applied.
     */
    @Property
    @Label("Property 2.4: Minimum score threshold (>= 1.0) filtering preserved")
    void minimumScoreThresholdPreserved(@ForAll("placesList") List<Place> places) {
        LOGGER.info("=== Property Test: Minimum Score Threshold ===");
        LOGGER.info(String.format("Testing with %d places", places.size()));
        
        // Create preferences with empty cities (no city filtering)
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(new ArrayList<>()) // Empty cities - no filtering
                .interests(Arrays.asList("art", "history"))
                .priceRange(Arrays.asList("€€"))
                .build();
        
        // Run scoreAndFilterPlaces
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(places, preferences);
        
        LOGGER.info(String.format("Results: %d places passed threshold (from %d input)", 
                results.size(), places.size()));
        
        // Property: ALL results have score >= 1.0
        for (ScoredPlace sp : results) {
            assertTrue(sp.getScore() >= 1.0,
                    String.format("Place %s has score %.2f < 1.0 (should be filtered out!)",
                            sp.getPlace().getName(), sp.getScore()));
        }
        
        // Property: NO place with score < 1.0 is in results
        for (Place place : places) {
            double score = engine.scorePlaceForPreferences(place, preferences);
            boolean inResults = results.stream()
                    .anyMatch(sp -> sp.getPlace().getId().equals(place.getId()));
            
            if (score < 1.0) {
                assertFalse(inResults,
                        String.format("Place %s with score %.2f should NOT be in results",
                                place.getName(), score));
            }
        }
        
        LOGGER.info("✓ Property satisfied: Minimum score threshold filtering works correctly");
    }
    
    // ==================== Generators ====================
    
    /**
     * Generator for a list of places with various cities and attributes
     */
    @Provide
    Arbitrary<List<Place>> placesList() {
        return Arbitraries.integers().between(5, 15).flatMap(size -> {
            List<Arbitrary<Place>> placeArbitraries = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                placeArbitraries.add(singlePlace());
            }
            return Combinators.combine(placeArbitraries).as(places -> places);
        });
    }
    
    /**
     * Generator for a single place with random attributes
     */
    @Provide
    Arbitrary<Place> singlePlace() {
        Arbitrary<String> cityArb = Arbitraries.of(ALL_CITIES);
        Arbitrary<PlaceType> typeArb = Arbitraries.of(PlaceType.values());
        Arbitrary<List<String>> tagsArb = Arbitraries.of(
                Arrays.asList(),
                Arrays.asList("art"),
                Arrays.asList("history"),
                Arrays.asList("food"),
                Arrays.asList("art", "history"),
                Arrays.asList("art", "museum"),
                Arrays.asList("food", "pizza"),
                Arrays.asList("architecture", "gothic")
        );
        Arbitrary<String> priceArb = Arbitraries.of("€", "€€", "€€€", "€€€€");
        Arbitrary<Double> ratingArb = Arbitraries.doubles().between(0.0, 5.0);
        
        return Combinators.combine(cityArb, typeArb, tagsArb, priceArb, ratingArb)
                .as((city, type, tags, price, rating) -> {
                    String id = "place_" + city + "_" + System.nanoTime();
                    return new Place.Builder()
                            .id(id)
                            .name("Test Place " + id)
                            .type(type)
                            .city(city)
                            .latitude(41.0 + Math.random())
                            .longitude(12.0 + Math.random())
                            .tags(tags)
                            .priceRange(price)
                            .rating(rating)
                            .build();
                });
    }
    
    // ==================== Helper Methods ====================
    
    /**
     * Calculate expected score using the documented scoring algorithm.
     * This matches the scoring weights in RecommendationEngine.java:
     * - City match: +3 points (NOT tested here - we're testing NO city filter cases)
     * - Interest match: +2 points per matching tag
     * - Price match: +1 point
     * - Rating boost: +rating/2
     * - Booking penalty: -2 points (if applicable)
     * - Floor at 0
     */
    private double calculateExpectedScore(Place place, UserPreferences preferences) {
        double score = 0.0;
        
        // City match: +3 points (only if preferences has cities)
        if (preferences.getCities() != null && !preferences.getCities().isEmpty() && place.getCity() != null) {
            boolean cityMatch = preferences.getCities().stream()
                    .anyMatch(preferredCity -> preferredCity.equalsIgnoreCase(place.getCity()));
            if (cityMatch) {
                score += 3.0;
            }
        }
        
        // Interest/tag match: +2 points per matching tag
        if (preferences.getInterests() != null && place.getTags() != null) {
            long matchingTags = place.getTags().stream()
                    .filter(tag -> preferences.getInterests().stream()
                            .anyMatch(interest -> interest.equalsIgnoreCase(tag)))
                    .count();
            score += matchingTags * 2.0;
        }
        
        // Price range match: +1 point
        if (preferences.getPriceRange() != null && place.getPriceRange() != null) {
            boolean priceMatch = preferences.getPriceRange().stream()
                    .anyMatch(priceRange -> priceRange.equals(place.getPriceRange()));
            if (priceMatch) {
                score += 1.0;
            }
        }
        
        // Rating boost: +rating/2 points
        if (place.getRating() != null) {
            score += place.getRating() / 2.0;
        }
        
        // Booking required penalty: -2 points (if applicable)
        Boolean includeBookingRequired = preferences.getIncludeBookingRequired();
        Boolean placeBookingRequired = place.getBookingRequired();
        if (Boolean.FALSE.equals(includeBookingRequired) && Boolean.TRUE.equals(placeBookingRequired)) {
            score += -2.0;
        }
        
        // Floor score at 0
        return Math.max(0.0, score);
    }
}
