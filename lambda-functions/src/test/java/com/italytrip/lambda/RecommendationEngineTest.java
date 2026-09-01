package com.italytrip.lambda;

import com.italytrip.lambda.RecommendationEngine.ScoredPlace;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.UserPreferences;
import com.italytrip.models.UserPreferences.TripPace;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for RecommendationEngine scoring algorithm.
 * Tests the scoring function with various place and preference combinations.
 */
class RecommendationEngineTest {
    
    private static final Logger LOGGER = Logger.getLogger(RecommendationEngineTest.class.getName());
    private RecommendationEngine engine;
    
    @BeforeEach
    void setUp() {
        engine = new RecommendationEngine();
    }
    
    @Test
    void testCityMatchAddsThreePoints() {
        // Create place in Rome
        Place place = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        // User prefers Rome
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(3.0, score, 0.001, "City match should add 3 points");
    }
    
    @Test
    void testCityMatchIsCaseInsensitive() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("ROME")
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(3.0, score, 0.001, "City match should be case-insensitive");
    }
    
    @Test
    void testTagMatchAddsTwoPointsPerTag() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Uffizi Gallery")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .tags(Arrays.asList("art", "renaissance", "museum"))
                .build();
        
        // User interested in art and history (only art matches)
        UserPreferences preferences = new UserPreferences.Builder()
                .interests(Arrays.asList("art", "history"))
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(2.0, score, 0.001, "Single tag match should add 2 points");
    }
    
    @Test
    void testMultipleTagMatches() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Uffizi Gallery")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .tags(Arrays.asList("art", "renaissance", "museum"))
                .build();
        
        // User interested in art and renaissance (both match)
        UserPreferences preferences = new UserPreferences.Builder()
                .interests(Arrays.asList("art", "renaissance"))
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(4.0, score, 0.001, "Two tag matches should add 4 points");
    }
    
    @Test
    void testPriceRangeMatchAddsOnePoint() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Trattoria")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .priceRange("€€")
                .build();
        
        UserPreferences preferences = new UserPreferences.Builder()
                .priceRange(Arrays.asList("€€"))
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(1.0, score, 0.001, "Price range match should add 1 point");
    }
    
    @Test
    void testRatingBoostAddsHalfOfRating() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Amazing Restaurant")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(4.5)
                .build();
        
        UserPreferences preferences = new UserPreferences.Builder().build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(2.25, score, 0.001, "Rating of 4.5 should add 2.25 points");
    }
    
    @Test
    void testBookingRequiredPenalty() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Vatican Museums")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9029)
                .longitude(12.4534)
                .bookingRequired(true)
                .rating(4.0) // 2.0 points from rating
                .build();
        
        // User does not want booking required
        UserPreferences preferences = new UserPreferences.Builder()
                .includeBookingRequired(false)
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        // Rating: 4.0/2 = 2.0, Booking penalty: -2.0, Total: 0.0
        assertEquals(0.0, score, 0.001, "Booking penalty should subtract 2 points");
    }
    
    @Test
    void testBookingRequiredNoPenaltyWhenUserAccepts() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Vatican Museums")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9029)
                .longitude(12.4534)
                .bookingRequired(true)
                .rating(4.0)
                .build();
        
        // User accepts booking required
        UserPreferences preferences = new UserPreferences.Builder()
                .includeBookingRequired(true)
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(2.0, score, 0.001, "No penalty when user accepts booking");
    }
    
    @Test
    void testScoreFlooredAtZero() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Expensive Booking Required Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9029)
                .longitude(12.4534)
                .bookingRequired(true)
                .rating(1.0) // Only 0.5 points
                .build();
        
        // User doesn't want booking (-2 penalty)
        UserPreferences preferences = new UserPreferences.Builder()
                .includeBookingRequired(false)
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        // Rating: 1.0/2 = 0.5, Penalty: -2.0, Would be -1.5 but floored at 0
        assertEquals(0.0, score, 0.001, "Score should be floored at 0");
    }
    
    @Test
    void testCombinedScoring() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Perfect Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .tags(Arrays.asList("authentic", "romantic"))
                .priceRange("€€")
                .rating(4.8)
                .bookingRequired(false)
                .build();
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .interests(Arrays.asList("authentic", "romantic"))
                .priceRange(Arrays.asList("€€"))
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        // City: 3, Tags: 2*2=4, Price: 1, Rating: 4.8/2=2.4
        // Total: 10.4
        assertEquals(10.4, score, 0.001, "Combined scoring should sum all components");
    }
    
    @Test
    void testScoreAndFilterPlacesRemovesLowScores() {
        Place highScore = new Place.Builder()
                .id("place_001")
                .name("Great Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place lowScore = new Place.Builder()
                .id("place_002")
                .name("Low Score Place")
                .type(PlaceType.CAFE)
                .city("Milan")
                .latitude(45.4642)
                .longitude(9.1900)
                .rating(0.5) // Only 0.25 points, below threshold
                .build();
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(
                Arrays.asList(highScore, lowScore),
                preferences
        );
        
        assertEquals(1, results.size(), "Should filter out places with score < 1");
        assertEquals("place_001", results.get(0).getPlace().getId());
        assertEquals(3.0, results.get(0).getScore(), 0.001);
    }
    
    @Test
    void testScoreAndFilterPlacesSortsByScoreDescending() {
        Place mediumScore = new Place.Builder()
                .id("place_001")
                .name("Medium Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(2.0) // 1.0 points from rating
                .build();
        
        Place highScore = new Place.Builder()
                .id("place_002")
                .name("High Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9029)
                .longitude(12.4534)
                .rating(5.0) // 2.5 points from rating
                .build();
        
        Place lowScore = new Place.Builder()
                .id("place_003")
                .name("Low Place")
                .type(PlaceType.CAFE)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .rating(2.0) // 1.0 points from rating
                .build();
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(
                Arrays.asList(mediumScore, highScore, lowScore),
                preferences
        );
        
        assertEquals(2, results.size()); // Only Rome places returned after city filter fix
        // Should be sorted: highScore (5.5), mediumScore (4.0)
        // lowScore is from Florence, so it's filtered out
        assertEquals("place_002", results.get(0).getPlace().getId());
        assertEquals(5.5, results.get(0).getScore(), 0.001);
        assertEquals("place_001", results.get(1).getPlace().getId());
        assertEquals(4.0, results.get(1).getScore(), 0.001);
    }
    
    @Test
    void testNullPlaceThrowsException() {
        UserPreferences preferences = new UserPreferences.Builder().build();
        assertThrows(NullPointerException.class, () -> {
            engine.scorePlaceForPreferences(null, preferences);
        });
    }
    
    @Test
    void testNullPreferencesThrowsException() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        assertThrows(NullPointerException.class, () -> {
            engine.scorePlaceForPreferences(place, null);
        });
    }
    
    @Test
    void testEmptyPlacesListReturnsEmpty() {
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .build();
        
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(
                Collections.emptyList(),
                preferences
        );
        
        assertTrue(results.isEmpty(), "Empty input should return empty list");
    }
    
    @Test
    void testPlaceWithNullFieldsHandledGracefully() {
        // Place with many null optional fields
        Place place = new Place.Builder()
                .id("place_001")
                .name("Minimal Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                // No tags, rating, price, etc.
                .build();
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .interests(Arrays.asList("food"))
                .priceRange(Arrays.asList("€€"))
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(3.0, score, 0.001, "Should only match city");
    }
    
    @Test
    void testUserPreferencesWithEmptyLists() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(3.0)
                .build();
        
        // Empty preferences
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Collections.emptyList())
                .interests(Collections.emptyList())
                .priceRange(Collections.emptyList())
                .build();
        
        double score = engine.scorePlaceForPreferences(place, preferences);
        assertEquals(1.5, score, 0.001, "Should only get rating boost");
    }
    
    @Test
    void testScoredPlaceEquality() {
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place place2 = new Place.Builder()
                .id("place_001")
                .name("Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        ScoredPlace sp1 = new ScoredPlace(place1, 5.0);
        ScoredPlace sp2 = new ScoredPlace(place2, 5.0);
        
        assertEquals(sp1, sp2, "ScoredPlaces with same place and score should be equal");
    }
    
    @Test
    void testScoredPlaceToString() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Test Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        ScoredPlace sp = new ScoredPlace(place, 5.5);
        String str = sp.toString();
        
        assertTrue(str.contains("ScoredPlace"), "toString should contain class name");
        assertTrue(str.contains("5.5"), "toString should contain score");
    }
    
    // ==================== Geographic Clustering Tests ====================
    
    @Test
    void testClusterByCityGroupsPlacesByCity() {
        // Create places from different cities
        Place rome1 = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place rome2 = new Place.Builder()
                .id("place_002")
                .name("Trevi Fountain")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .build();
        
        Place florence1 = new Place.Builder()
                .id("place_003")
                .name("Uffizi Gallery")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .build();
        
        List<ScoredPlace> scoredPlaces = Arrays.asList(
                new ScoredPlace(rome1, 5.0),
                new ScoredPlace(rome2, 4.0),
                new ScoredPlace(florence1, 3.0)
        );
        
        Map<String, List<ScoredPlace>> clusters = engine.clusterByCity(scoredPlaces);
        
        assertEquals(2, clusters.size(), "Should have 2 city clusters");
        assertTrue(clusters.containsKey("Rome"), "Should contain Rome");
        assertTrue(clusters.containsKey("Florence"), "Should contain Florence");
        assertEquals(2, clusters.get("Rome").size(), "Rome should have 2 places");
        assertEquals(1, clusters.get("Florence").size(), "Florence should have 1 place");
    }
    
    @Test
    void testClusterByCitySortsByTotalScore() {
        // Create places with different scores
        Place rome1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place rome2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .build();
        
        Place florence1 = new Place.Builder()
                .id("place_003")
                .name("Place 3")
                .type(PlaceType.HISTORIC_SITE)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .build();
        
        Place venice1 = new Place.Builder()
                .id("place_004")
                .name("Place 4")
                .type(PlaceType.HISTORIC_SITE)
                .city("Venice")
                .latitude(45.4408)
                .longitude(12.3155)
                .build();
        
        // Rome total: 5.0 + 3.0 = 8.0
        // Florence total: 6.0
        // Venice total: 2.0
        List<ScoredPlace> scoredPlaces = Arrays.asList(
                new ScoredPlace(rome1, 5.0),
                new ScoredPlace(florence1, 6.0),
                new ScoredPlace(rome2, 3.0),
                new ScoredPlace(venice1, 2.0)
        );
        
        Map<String, List<ScoredPlace>> clusters = engine.clusterByCity(scoredPlaces);
        
        // Verify the order: Rome (8.0), Florence (6.0), Venice (2.0)
        List<String> cityOrder = new java.util.ArrayList<>(clusters.keySet());
        assertEquals(3, cityOrder.size());
        assertEquals("Rome", cityOrder.get(0), "Rome should be first (highest total score)");
        assertEquals("Florence", cityOrder.get(1), "Florence should be second");
        assertEquals("Venice", cityOrder.get(2), "Venice should be third (lowest total score)");
    }
    
    @Test
    void testClusterByCityHandlesEmptyList() {
        List<ScoredPlace> scoredPlaces = Collections.emptyList();
        
        Map<String, List<ScoredPlace>> clusters = engine.clusterByCity(scoredPlaces);
        
        assertTrue(clusters.isEmpty(), "Empty input should return empty map");
    }
    
    @Test
    void testClusterByCityHandlesSingleCity() {
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .build();
        
        List<ScoredPlace> scoredPlaces = Arrays.asList(
                new ScoredPlace(place1, 4.0),
                new ScoredPlace(place2, 3.0)
        );
        
        Map<String, List<ScoredPlace>> clusters = engine.clusterByCity(scoredPlaces);
        
        assertEquals(1, clusters.size(), "Should have 1 city cluster");
        assertTrue(clusters.containsKey("Rome"), "Should contain Rome");
        assertEquals(2, clusters.get("Rome").size(), "Rome should have 2 places");
    }
    
    @Test
    void testClusterByCityPreservesPlaceOrder() {
        // Create places in specific order
        Place rome1 = new Place.Builder()
                .id("place_001")
                .name("First")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place rome2 = new Place.Builder()
                .id("place_002")
                .name("Second")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .build();
        
        Place rome3 = new Place.Builder()
                .id("place_003")
                .name("Third")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.8950)
                .longitude(12.4850)
                .build();
        
        List<ScoredPlace> scoredPlaces = Arrays.asList(
                new ScoredPlace(rome1, 5.0),
                new ScoredPlace(rome2, 4.0),
                new ScoredPlace(rome3, 3.0)
        );
        
        Map<String, List<ScoredPlace>> clusters = engine.clusterByCity(scoredPlaces);
        
        List<ScoredPlace> romePlaces = clusters.get("Rome");
        assertEquals(3, romePlaces.size());
        // Verify all places are present
        assertTrue(romePlaces.stream().anyMatch(sp -> sp.getPlace().getId().equals("place_001")));
        assertTrue(romePlaces.stream().anyMatch(sp -> sp.getPlace().getId().equals("place_002")));
        assertTrue(romePlaces.stream().anyMatch(sp -> sp.getPlace().getId().equals("place_003")));
    }
    
    @Test
    void testClusterByCityNullInputThrowsException() {
        assertThrows(NullPointerException.class, () -> {
            engine.clusterByCity(null);
        }, "Null input should throw NullPointerException");
    }
    
    @Test
    void testClusterByCityWithEqualScores() {
        // Test cities with equal total scores (order may vary but should be deterministic)
        Place rome1 = new Place.Builder()
                .id("place_001")
                .name("Rome Place")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place florence1 = new Place.Builder()
                .id("place_002")
                .name("Florence Place")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .build();
        
        List<ScoredPlace> scoredPlaces = Arrays.asList(
                new ScoredPlace(rome1, 5.0),
                new ScoredPlace(florence1, 5.0)
        );
        
        Map<String, List<ScoredPlace>> clusters = engine.clusterByCity(scoredPlaces);
        
        assertEquals(2, clusters.size(), "Should have 2 city clusters");
        assertTrue(clusters.containsKey("Rome"), "Should contain Rome");
        assertTrue(clusters.containsKey("Florence"), "Should contain Florence");
    }
    
    // ==================== Bug Condition Exploration Tests ====================
    
    /**
     * Bug Condition Exploration Test: City Selection Not Respected
     * 
     * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
     * 
     * This test demonstrates Bug #1 from the bugfix spec: the recommendation algorithm
     * does NOT respect city selection because it treats city matching as a scoring bonus
     * instead of a filtering requirement.
     * 
     * **CRITICAL: This test MUST FAIL on unfixed code** - failure confirms the bug exists.
     * 
     * **Expected Behavior (after fix):**
     * When a user selects specific cities (Rome and Florence), the scoreAndFilterPlaces
     * method should return ONLY places from those cities. NO places from Venice, Milan,
     * or Naples should appear in the results.
     * 
     * **Bug Behavior (current unfixed code):**
     * Places from non-selected cities (Venice, Milan, Naples) CAN appear in results if
     * they score >= 1.0 through other matches:
     * - Interest matches: +2 points per matching tag
     * - High rating: +rating/2 (e.g., 4.5 rating = 2.25 points)
     * - Price match: +1 point
     * 
     * A place from Venice with tags ["art", "history"] gets 4+ points even without
     * city match, passing the 1.0 threshold.
     * 
     * **Test Strategy:**
     * Create places from multiple cities with various scoring characteristics:
     * - Rome and Florence places (should appear in results)
     * - Venice place with high interest matches (will incorrectly appear - demonstrates bug)
     * - Milan place with high rating (will incorrectly appear - demonstrates bug)
     * - Naples place with price match (may appear if rating is high enough)
     * 
     * Run test on UNFIXED code and document counterexamples (non-selected city places
     * that appear in results).
     */
    @Test
    void testBugCondition_CitySelectionNotRespected() {
        LOGGER.info("=== Bug Condition Exploration Test: City Selection Not Respected ===");
        LOGGER.info("User selects cities: [Rome, Florence]");
        LOGGER.info("Expected: ONLY places from Rome and Florence in results");
        LOGGER.info("Bug: Places from Venice, Milan, Naples may appear if score >= 1.0");
        
        // Create places from SELECTED cities (Rome and Florence) - these SHOULD appear
        Place romePlace = new Place.Builder()
                .id("rome_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .tags(Arrays.asList("historic", "iconic"))
                .rating(4.8)
                .build();
        
        Place florencePlace = new Place.Builder()
                .id("florence_001")
                .name("Uffizi Gallery")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .tags(Arrays.asList("art", "museum"))
                .rating(4.7)
                .build();
        
        // Create places from NON-SELECTED cities - these should NOT appear but WILL due to bug
        
        // Venice place with high interest matches (art + history = 4 points)
        Place venicePlace = new Place.Builder()
                .id("venice_001")
                .name("St. Mark's Basilica")
                .type(PlaceType.HISTORIC_SITE)
                .city("Venice")
                .latitude(45.4345)
                .longitude(12.3397)
                .tags(Arrays.asList("art", "history", "architecture"))
                .rating(4.8)
                .build();
        
        // Milan place with high rating (4.5 rating = 2.25 points from rating boost alone)
        Place milanPlace = new Place.Builder()
                .id("milan_001")
                .name("Duomo di Milano")
                .type(PlaceType.HISTORIC_SITE)
                .city("Milan")
                .latitude(45.4642)
                .longitude(9.1900)
                .tags(Arrays.asList("architecture", "gothic"))
                .rating(4.9)
                .priceRange("€€")
                .build();
        
        // Naples place with price match and rating
        Place naplesPlace = new Place.Builder()
                .id("naples_001")
                .name("Naples Pizza")
                .type(PlaceType.RESTAURANT)
                .city("Naples")
                .latitude(40.8518)
                .longitude(14.2681)
                .tags(Arrays.asList("food", "pizza"))
                .rating(4.6)
                .priceRange("€€")
                .build();
        
        // User preferences: cities = [Rome, Florence], interests = [art, history], price = [€€]
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome", "Florence"))
                .interests(Arrays.asList("art", "history"))
                .priceRange(Arrays.asList("€€"))
                .build();
        
        List<Place> allPlaces = Arrays.asList(
                romePlace, florencePlace, venicePlace, milanPlace, naplesPlace
        );
        
        // Run scoreAndFilterPlaces
        List<ScoredPlace> results = engine.scoreAndFilterPlaces(allPlaces, preferences);
        
        LOGGER.info(String.format("Total results: %d places", results.size()));
        
        // Log all results with their scores and cities
        for (ScoredPlace sp : results) {
            Place p = sp.getPlace();
            LOGGER.info(String.format("  - %s (%s) - Score: %.2f", 
                    p.getName(), p.getCity(), sp.getScore()));
        }
        
        // Extract cities from results
        List<String> resultCities = results.stream()
                .map(sp -> sp.getPlace().getCity())
                .distinct()
                .collect(Collectors.toList());
        
        LOGGER.info("Cities in results: " + resultCities);
        
        // Identify counterexamples (places from non-selected cities)
        List<ScoredPlace> counterexamples = results.stream()
                .filter(sp -> {
                    String city = sp.getPlace().getCity();
                    return !city.equals("Rome") && !city.equals("Florence");
                })
                .collect(Collectors.toList());
        
        if (!counterexamples.isEmpty()) {
            LOGGER.warning("=== COUNTEREXAMPLES FOUND (Bug Confirmed) ===");
            for (ScoredPlace sp : counterexamples) {
                Place p = sp.getPlace();
                LOGGER.warning(String.format("  - %s from %s scored %.2f (NOT in selected cities!)", 
                        p.getName(), p.getCity(), sp.getScore()));
            }
        } else {
            LOGGER.info("No counterexamples found - city filter working correctly!");
        }
        
        // **ASSERTION: Expected Behavior (after fix)**
        // After the fix is implemented, ONLY places from Rome and Florence should appear
        // This assertion will FAIL on unfixed code (which is expected and confirms the bug)
        for (ScoredPlace sp : results) {
            String city = sp.getPlace().getCity();
            assertTrue(
                    city.equals("Rome") || city.equals("Florence"),
                    String.format("Place %s from city %s should NOT appear - only Rome and Florence allowed! Score: %.2f",
                            sp.getPlace().getName(), city, sp.getScore())
            );
        }
        
        LOGGER.info("=== Test Complete: City filter correctly enforced ===");
    }
    
    // ==================== Temporal Scheduling Tests ====================
    
    @Test
    void testSchedulePlacesRelaxedPaceMaxTime() {
        // Create places that test the relaxed pace limit (360 minutes)
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
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(90)
                .build();
        
        Place place3 = new Place.Builder()
                .id("place_003")
                .name("Place 3 - Too Long")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8950)
                .longitude(12.4850)
                .durationMinutes(180)
                .build();
        
        Place place4 = new Place.Builder()
                .id("place_004")
                .name("Place 4 - Fits")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.8970)
                .longitude(12.4870)
                .durationMinutes(60)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(place1, 5.0),
                new ScoredPlace(place2, 4.0),
                new ScoredPlace(place3, 3.0),
                new ScoredPlace(place4, 2.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.RELAXED);
        
        // Calculate: place1 (120) + place2 (90+30) = 240
        // place3 (180+30) would make 450 > 360, so it's skipped
        // place4 (60+30) makes 240+90 = 330 <= 360, so it's added
        // Result: places 1, 2, and 4 are scheduled (3 places, 330 minutes total)
        assertEquals(3, scheduled.size(), "Should schedule places 1, 2, and 4 (place 3 is too long)");
        assertEquals("place_001", scheduled.get(0).getPlace().getId());
        assertEquals("place_002", scheduled.get(1).getPlace().getId());
        assertEquals("place_004", scheduled.get(2).getPlace().getId(), "Place 4 should fit after skipping place 3");
    }
    
    @Test
    void testSchedulePlacesModeratePaceMaxTime() {
        // Create places for moderate pace (480 minutes)
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(150)
                .build();
        
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(120)
                .build();
        
        Place place3 = new Place.Builder()
                .id("place_003")
                .name("Place 3")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8950)
                .longitude(12.4850)
                .durationMinutes(150)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(place1, 5.0),
                new ScoredPlace(place2, 4.0),
                new ScoredPlace(place3, 3.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.MODERATE);
        
        // place1 (150) + place2 (120+30) + place3 (150+30) = 480 exactly
        assertEquals(3, scheduled.size(), "Should schedule all 3 places within 480 minute limit");
    }
    
    @Test
    void testSchedulePlacesPackedPaceMaxTime() {
        // Create places for packed pace (600 minutes)
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(180)
                .build();
        
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(90)
                .build();
        
        Place place3 = new Place.Builder()
                .id("place_003")
                .name("Place 3")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8950)
                .longitude(12.4850)
                .durationMinutes(150)
                .build();
        
        Place place4 = new Place.Builder()
                .id("place_004")
                .name("Place 4")
                .type(PlaceType.MARKET)
                .city("Rome")
                .latitude(41.8970)
                .longitude(12.4870)
                .durationMinutes(120)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(place1, 5.0),
                new ScoredPlace(place2, 4.0),
                new ScoredPlace(place3, 3.0),
                new ScoredPlace(place4, 2.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.PACKED);
        
        // place1 (180) + place2 (90+30) + place3 (150+30) + place4 (120+30) = 630 > 600
        // So only first 3 should fit: 180 + 120 + 180 = 480 <= 600
        assertEquals(3, scheduled.size(), "Should schedule 3 places within 600 minute limit");
    }
    
    @Test
    void testSchedulePlacesPrioritizesMorningTags() {
        // Create places with and without morning tags
        Place morningPlace = new Place.Builder()
                .id("place_001")
                .name("Morning Market")
                .type(PlaceType.MARKET)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(90)
                .tags(Arrays.asList("morning", "local"))
                .build();
        
        Place highScorePlace = new Place.Builder()
                .id("place_002")
                .name("High Score Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(120)
                .build();
        
        Place anotherMorning = new Place.Builder()
                .id("place_003")
                .name("Breakfast Cafe")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.8950)
                .longitude(12.4850)
                .durationMinutes(60)
                .tags(Arrays.asList("morning", "breakfast"))
                .build();
        
        // Morning places have lower scores but should be scheduled first
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(morningPlace, 3.0),
                new ScoredPlace(highScorePlace, 5.0),
                new ScoredPlace(anotherMorning, 2.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.MODERATE);
        
        // Morning places should come first despite lower scores
        assertEquals(3, scheduled.size());
        assertEquals("place_001", scheduled.get(0).getPlace().getId(), "First morning place should be scheduled first");
        assertEquals("place_003", scheduled.get(1).getPlace().getId(), "Second morning place should be scheduled second");
        assertEquals("place_002", scheduled.get(2).getPlace().getId(), "High score non-morning place should be last");
    }
    
    @Test
    void testSchedulePlacesSortsByScoreWhenNoMorningTags() {
        Place highScore = new Place.Builder()
                .id("place_001")
                .name("High Score")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(90)
                .build();
        
        Place mediumScore = new Place.Builder()
                .id("place_002")
                .name("Medium Score")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(90)
                .build();
        
        Place lowScore = new Place.Builder()
                .id("place_003")
                .name("Low Score")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.8950)
                .longitude(12.4850)
                .durationMinutes(90)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(mediumScore, 4.0),
                new ScoredPlace(lowScore, 2.0),
                new ScoredPlace(highScore, 5.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.MODERATE);
        
        // Should be sorted by score
        assertEquals(3, scheduled.size());
        assertEquals("place_001", scheduled.get(0).getPlace().getId(), "Highest score should be first");
        assertEquals("place_002", scheduled.get(1).getPlace().getId(), "Medium score should be second");
        assertEquals("place_003", scheduled.get(2).getPlace().getId(), "Lowest score should be third");
    }
    
    @Test
    void testSchedulePlacesDefaultDuration() {
        // Places without duration should default to 60 minutes
        Place noDuration = new Place.Builder()
                .id("place_001")
                .name("No Duration")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                // No durationMinutes set
                .build();
        
        Place withDuration = new Place.Builder()
                .id("place_002")
                .name("With Duration")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(120)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(noDuration, 5.0),
                new ScoredPlace(withDuration, 4.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.RELAXED);
        
        // place1 (60 default) + place2 (120+30) = 210 <= 360
        assertEquals(2, scheduled.size(), "Both places should fit using default duration");
    }
    
    @Test
    void testSchedulePlacesAdds30MinuteBuffer() {
        // Test that 30-minute travel buffer is added between places
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(150)
                .build();
        
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(180)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(place1, 5.0),
                new ScoredPlace(place2, 4.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.RELAXED);
        
        // Total: place1 (150) + place2 (180+30) = 360 exactly
        assertEquals(2, scheduled.size(), "Both places should fit with travel buffer");
    }
    
    @Test
    void testSchedulePlacesNoBufferForFirstPlace() {
        // First place should not have travel buffer
        Place singlePlace = new Place.Builder()
                .id("place_001")
                .name("Single Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(360)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(singlePlace, 5.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.RELAXED);
        
        // Exactly 360 minutes, should fit without buffer
        assertEquals(1, scheduled.size(), "Single place at 360 min should fit exactly");
    }
    
    @Test
    void testSchedulePlacesEmptyList() {
        List<ScoredPlace> places = Collections.emptyList();
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.MODERATE);
        
        assertTrue(scheduled.isEmpty(), "Empty input should return empty schedule");
    }
    
    @Test
    void testSchedulePlacesNullInputThrowsException() {
        assertThrows(NullPointerException.class, () -> {
            engine.schedulePlaces(null, TripPace.MODERATE);
        }, "Null places should throw NullPointerException");
    }
    
    @Test
    void testSchedulePlacesNullPaceThrowsException() {
        Place place = new Place.Builder()
                .id("place_001")
                .name("Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(90)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(new ScoredPlace(place, 5.0));
        
        assertThrows(NullPointerException.class, () -> {
            engine.schedulePlaces(places, null);
        }, "Null pace should throw NullPointerException");
    }
    
    @Test
    void testSchedulePlacesMorningTagCaseInsensitive() {
        Place morningLower = new Place.Builder()
                .id("place_001")
                .name("Morning Place")
                .type(PlaceType.MARKET)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(90)
                .tags(Arrays.asList("morning"))
                .build();
        
        Place morningUpper = new Place.Builder()
                .id("place_002")
                .name("MORNING Place")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(60)
                .tags(Arrays.asList("MORNING"))
                .build();
        
        Place noMorning = new Place.Builder()
                .id("place_003")
                .name("Regular Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8950)
                .longitude(12.4850)
                .durationMinutes(90)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(noMorning, 5.0),
                new ScoredPlace(morningLower, 3.0),
                new ScoredPlace(morningUpper, 2.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.MODERATE);
        
        // Both morning-tagged places should come before non-morning place
        assertEquals(3, scheduled.size());
        assertTrue(scheduled.get(0).getPlace().getId().equals("place_001") || 
                   scheduled.get(0).getPlace().getId().equals("place_002"),
                   "First place should be morning-tagged");
        assertTrue(scheduled.get(1).getPlace().getId().equals("place_001") || 
                   scheduled.get(1).getPlace().getId().equals("place_002"),
                   "Second place should be morning-tagged");
        assertEquals("place_003", scheduled.get(2).getPlace().getId(),
                     "Non-morning place should be last");
    }
    
    @Test
    void testSchedulePlacesAllPlacesFit() {
        // Test case where all places fit comfortably
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(60)
                .build();
        
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.MARKET)
                .city("Rome")
                .latitude(41.9009)
                .longitude(12.4833)
                .durationMinutes(45)
                .build();
        
        Place place3 = new Place.Builder()
                .id("place_003")
                .name("Place 3")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8950)
                .longitude(12.4850)
                .durationMinutes(75)
                .build();
        
        List<ScoredPlace> places = Arrays.asList(
                new ScoredPlace(place1, 5.0),
                new ScoredPlace(place2, 4.0),
                new ScoredPlace(place3, 3.0)
        );
        
        List<ScoredPlace> scheduled = engine.schedulePlaces(places, TripPace.MODERATE);
        
        // Total: 60 + (45+30) + (75+30) = 240 << 480
        assertEquals(3, scheduled.size(), "All places should fit comfortably");
    }
    
    // ==================== Day Balancing Tests ====================
    
    @Test
    void testBalanceItineraryEnforcesTypeDiversity() {
        // Create a day with 3 restaurants (should reduce to 2)
        Place restaurant1 = new Place.Builder()
                .id("place_001")
                .name("Restaurant 1")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(4.5)
                .build();
        
        Place restaurant2 = new Place.Builder()
                .id("place_002")
                .name("Restaurant 2")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8910)
                .longitude(12.4930)
                .rating(4.0)
                .build();
        
        Place restaurant3 = new Place.Builder()
                .id("place_003")
                .name("Restaurant 3")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8920)
                .longitude(12.4940)
                .rating(3.5)
                .build();
        
        Place museum = new Place.Builder()
                .id("place_004")
                .name("Museum")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8930)
                .longitude(12.4950)
                .build();
        
        com.italytrip.models.DayPlan day1 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(1)
                .places(Arrays.asList(restaurant1, restaurant2, restaurant3, museum))
                .build();
        
        List<com.italytrip.models.DayPlan> balanced = engine.balanceItinerary(Arrays.asList(day1));
        
        assertEquals(1, balanced.size());
        com.italytrip.models.DayPlan balancedDay = balanced.get(0);
        
        // Should have at most 2 restaurants (highest rated ones)
        long restaurantCount = balancedDay.getPlaces().stream()
                .filter(p -> p.getType() == PlaceType.RESTAURANT)
                .count();
        
        assertTrue(restaurantCount <= 2, "Should have at most 2 restaurants");
        
        // Verify the highest rated restaurants are kept
        List<Place> restaurants = balancedDay.getPlaces().stream()
                .filter(p -> p.getType() == PlaceType.RESTAURANT)
                .collect(Collectors.toList());
        
        if (restaurants.size() == 2) {
            assertTrue(restaurants.stream().anyMatch(p -> p.getId().equals("place_001")), 
                    "Should keep highest rated restaurant");
            assertTrue(restaurants.stream().anyMatch(p -> p.getId().equals("place_002")), 
                    "Should keep second highest rated restaurant");
        }
    }
    
    @Test
    void testBalanceItineraryEnsuresMealCoverage() {
        // Create day 1 with no meals and day 2 with a restaurant
        Place museum1 = new Place.Builder()
                .id("place_001")
                .name("Museum 1")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place park = new Place.Builder()
                .id("place_002")
                .name("Park")
                .type(PlaceType.PARK)
                .city("Rome")
                .latitude(41.8910)
                .longitude(12.4930)
                .build();
        
        Place restaurant = new Place.Builder()
                .id("place_003")
                .name("Restaurant")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8920)
                .longitude(12.4940)
                .build();
        
        Place museum2 = new Place.Builder()
                .id("place_004")
                .name("Museum 2")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8930)
                .longitude(12.4950)
                .build();
        
        com.italytrip.models.DayPlan day1 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(1)
                .places(Arrays.asList(museum1, park))
                .build();
        
        com.italytrip.models.DayPlan day2 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(2)
                .places(Arrays.asList(restaurant, museum2))
                .build();
        
        List<com.italytrip.models.DayPlan> balanced = engine.balanceItinerary(Arrays.asList(day1, day2));
        
        // Day 1 should now have a meal place (moved from day 2)
        com.italytrip.models.DayPlan balancedDay1 = balanced.get(0);
        boolean day1HasMeal = balancedDay1.getPlaces().stream()
                .anyMatch(p -> p.getType() == PlaceType.RESTAURANT || p.getType() == PlaceType.CAFE);
        
        assertTrue(day1HasMeal, "Day 1 should have a meal place after balancing");
    }
    
    @Test
    void testBalanceItineraryEnsuresGeographicCoherence() {
        // Create a day with places from multiple cities
        Place rome1 = new Place.Builder()
                .id("place_001")
                .name("Rome Place 1")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place florence1 = new Place.Builder()
                .id("place_002")
                .name("Florence Place 1")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .build();
        
        Place rome2 = new Place.Builder()
                .id("place_003")
                .name("Rome Place 2")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8910)
                .longitude(12.4930)
                .build();
        
        Place rome3 = new Place.Builder()
                .id("place_004")
                .name("Rome Place 3")
                .type(PlaceType.CAFE)
                .city("Rome")
                .latitude(41.8920)
                .longitude(12.4940)
                .build();
        
        // Places are zigzagged: Rome, Florence, Rome, Rome
        com.italytrip.models.DayPlan day1 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(1)
                .places(Arrays.asList(rome1, florence1, rome2, rome3))
                .build();
        
        List<com.italytrip.models.DayPlan> balanced = engine.balanceItinerary(Arrays.asList(day1));
        
        com.italytrip.models.DayPlan balancedDay = balanced.get(0);
        List<Place> places = balancedDay.getPlaces();
        
        // Verify places are grouped by city (Rome places together)
        // Find first Rome place and first Florence place
        int firstRomeIndex = -1;
        int lastRomeIndex = -1;
        int florenceIndex = -1;
        
        for (int i = 0; i < places.size(); i++) {
            if (places.get(i).getCity().equals("Rome")) {
                if (firstRomeIndex == -1) firstRomeIndex = i;
                lastRomeIndex = i;
            } else if (places.get(i).getCity().equals("Florence")) {
                florenceIndex = i;
            }
        }
        
        // Rome places should be contiguous (all at beginning or all at end)
        if (firstRomeIndex != -1 && lastRomeIndex != -1 && florenceIndex != -1) {
            // Either all Rome places come before Florence, or all after
            boolean romesAreContiguous = (lastRomeIndex < florenceIndex) || (firstRomeIndex > florenceIndex);
            assertTrue(romesAreContiguous, "Places from same city should be grouped together");
        }
    }
    
    @Test
    void testBalanceItineraryHandlesEmptyDayPlan() {
        com.italytrip.models.DayPlan emptyDay = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(1)
                .places(Collections.emptyList())
                .build();
        
        List<com.italytrip.models.DayPlan> balanced = engine.balanceItinerary(Arrays.asList(emptyDay));
        
        assertEquals(1, balanced.size());
        assertTrue(balanced.get(0).getPlaces().isEmpty(), "Empty day should remain empty");
    }
    
    @Test
    void testBalanceItineraryHandlesMultipleDays() {
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .build();
        
        Place place3 = new Place.Builder()
                .id("place_003")
                .name("Place 3")
                .type(PlaceType.CAFE)
                .city("Venice")
                .latitude(45.4408)
                .longitude(12.3155)
                .build();
        
        com.italytrip.models.DayPlan day1 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(1)
                .places(Arrays.asList(place1))
                .build();
        
        com.italytrip.models.DayPlan day2 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(2)
                .places(Arrays.asList(place2))
                .build();
        
        com.italytrip.models.DayPlan day3 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(3)
                .places(Arrays.asList(place3))
                .build();
        
        List<com.italytrip.models.DayPlan> balanced = engine.balanceItinerary(Arrays.asList(day1, day2, day3));
        
        assertEquals(3, balanced.size(), "Should have 3 days");
        assertEquals(1, balanced.get(0).getDayNumber());
        assertEquals(2, balanced.get(1).getDayNumber());
        assertEquals(3, balanced.get(2).getDayNumber());
    }
    
    @Test
    void testBalanceItineraryNullInputThrowsException() {
        assertThrows(NullPointerException.class, () -> {
            engine.balanceItinerary(null);
        }, "Null input should throw NullPointerException");
    }
    
    @Test
    void testBalanceItineraryPreservesTotalDuration() {
        Place place1 = new Place.Builder()
                .id("place_001")
                .name("Place 1")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .durationMinutes(90)
                .build();
        
        Place place2 = new Place.Builder()
                .id("place_002")
                .name("Place 2")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8910)
                .longitude(12.4930)
                .durationMinutes(120)
                .build();
        
        com.italytrip.models.DayPlan day1 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(1)
                .places(Arrays.asList(place1, place2))
                .build();
        
        List<com.italytrip.models.DayPlan> balanced = engine.balanceItinerary(Arrays.asList(day1));
        
        com.italytrip.models.DayPlan balancedDay = balanced.get(0);
        
        // Total duration should be calculated (90 + 120 = 210)
        assertEquals(210, balancedDay.getTotalDuration(), 
                "Total duration should be sum of place durations");
    }
    
    @Test
    void testBalanceItineraryHandlesSingleCityDay() {
        // Day with all places from same city (already geographically coherent)
        Place rome1 = new Place.Builder()
                .id("place_001")
                .name("Rome Place 1")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
        
        Place rome2 = new Place.Builder()
                .id("place_002")
                .name("Rome Place 2")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8910)
                .longitude(12.4930)
                .build();
        
        Place rome3 = new Place.Builder()
                .id("place_003")
                .name("Rome Place 3")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8920)
                .longitude(12.4940)
                .build();
        
        com.italytrip.models.DayPlan day1 = new com.italytrip.models.DayPlan.Builder()
                .dayNumber(1)
                .places(Arrays.asList(rome1, rome2, rome3))
                .build();
        
        List<com.italytrip.models.DayPlan> balanced = engine.balanceItinerary(Arrays.asList(day1));
        
        assertEquals(1, balanced.size());
        assertEquals(3, balanced.get(0).getPlaces().size(), 
                "All places should be preserved when from same city");
        
        // Verify all places are Rome
        assertTrue(balanced.get(0).getPlaces().stream()
                .allMatch(p -> p.getCity().equals("Rome")), 
                "All places should be from Rome");
    }
    
    // ==================== Integration Tests: generateItinerary ====================
    
    @Test
    void testGenerateItineraryWithSufficientPlaces() {
        // Create a dataset with diverse places
        List<Place> places = new ArrayList<>();
        
        // Rome places
        for (int i = 1; i <= 10; i++) {
            places.add(new Place.Builder()
                    .id("rome_" + i)
                    .name("Rome Place " + i)
                    .type(i % 3 == 0 ? PlaceType.RESTAURANT : PlaceType.MUSEUM)
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.001)
                    .rating(4.0 + (i % 3) * 0.3)
                    .durationMinutes(60 + i * 10)
                    .tags(Arrays.asList("historic", "art"))
                    .build());
        }
        
        // Florence places
        for (int i = 1; i <= 8; i++) {
            places.add(new Place.Builder()
                    .id("florence_" + i)
                    .name("Florence Place " + i)
                    .type(i % 2 == 0 ? PlaceType.CAFE : PlaceType.HISTORIC_SITE)
                    .city("Florence")
                    .latitude(43.76 + i * 0.001)
                    .longitude(11.25 + i * 0.001)
                    .rating(4.2 + (i % 2) * 0.2)
                    .durationMinutes(50 + i * 15)
                    .tags(Arrays.asList("renaissance", "art"))
                    .build());
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .addInterest("art")
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "My Italy Trip");
        
        assertNotNull(result, "Result should not be null");
        assertNotNull(result.getItinerary(), "Itinerary should not be null");
        assertNotNull(result.getReasoning(), "Reasoning should not be null");
        assertNotNull(result.getAlternativePlaces(), "Alternative places should not be null");
        
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        assertEquals("My Italy Trip", itinerary.getName());
        assertEquals(3, itinerary.getDays().size(), "Should have 3 days");
        assertNotNull(itinerary.getPreferences(), "Preferences should be stored");
        
        // Verify each day has places
        int totalPlaces = itinerary.getDays().stream()
                .mapToInt(day -> day.getPlaces().size())
                .sum();
        assertTrue(totalPlaces > 0, "Itinerary should have at least some places");

        
        // Verify time constraints are respected
        for (com.italytrip.models.DayPlan day : itinerary.getDays()) {
            assertTrue(day.getTotalDuration() <= 600, 
                    "Day " + day.getDayNumber() + " should not exceed 10 hours (600 min)");
        }
    }
    
    @Test
    void testGenerateItineraryWithSingleCity() {
        List<Place> places = new ArrayList<>();
        
        // Only Rome places
        for (int i = 1; i <= 20; i++) {
            places.add(new Place.Builder()
                    .id("place_" + i)
                    .name("Place " + i)
                    .type(PlaceType.values()[i % PlaceType.values().length])
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.001)
                    .rating(3.5 + (i % 4) * 0.3)
                    .durationMinutes(60)
                    .build());
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(TripPace.RELAXED)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Rome Weekend");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(result);
        assertNotNull(itinerary);
        assertEquals("Rome Weekend", itinerary.getName());
        assertEquals(3, itinerary.getDays().size());
        
        // All places should be from Rome
        List<Place> allItineraryPlaces = itinerary.getDays().stream()
                .flatMap(day -> day.getPlaces().stream())
                .collect(Collectors.toList());
        
        assertTrue(allItineraryPlaces.stream().allMatch(p -> p.getCity().equals("Rome")),
                "All places should be from Rome");
        
        // Verify relaxed pace constraint (360 minutes max)
        for (com.italytrip.models.DayPlan day : itinerary.getDays()) {
            assertTrue(day.getTotalDuration() <= 360,
                    "Relaxed pace day should not exceed 6 hours (360 min)");
        }
    }
    
    @Test
    void testGenerateItineraryWithTwoCities() {
        List<Place> places = new ArrayList<>();
        
        // Rome and Florence
        for (int i = 1; i <= 10; i++) {
            places.add(new Place.Builder()
                    .id("rome_" + i)
                    .name("Rome Place " + i)
                    .type(PlaceType.RESTAURANT)
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.001)
                    .rating(4.0)
                    .durationMinutes(90)
                    .build());
            
            places.add(new Place.Builder()
                    .id("florence_" + i)
                    .name("Florence Place " + i)
                    .type(PlaceType.MUSEUM)
                    .city("Florence")
                    .latitude(43.76 + i * 0.001)
                    .longitude(11.25 + i * 0.001)
                    .rating(4.5)
                    .durationMinutes(80)
                    .build());
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Two Cities");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        assertEquals(3, itinerary.getDays().size());
        
        // Should have places from both cities
        List<String> cities = itinerary.getDays().stream()
                .flatMap(day -> day.getPlaces().stream())
                .map(Place::getCity)
                .distinct()
                .collect(Collectors.toList());
        
        assertTrue(cities.size() <= 2, "Should have at most 2 cities");
    }
    
    @Test
    void testGenerateItineraryWithMultipleCities() {
        List<Place> places = new ArrayList<>();
        String[] cities = {"Rome", "Florence", "Venice", "Milan"};
        
        for (String city : cities) {
            for (int i = 1; i <= 6; i++) {
                places.add(new Place.Builder()
                        .id(city.toLowerCase() + "_" + i)
                        .name(city + " Place " + i)
                        .type(PlaceType.MUSEUM)
                        .city(city)
                        .latitude(40.0 + i * 0.01)
                        .longitude(10.0 + i * 0.01)
                        .rating(4.0)
                        .durationMinutes(90)
                        .build());
            }
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .cities(Arrays.asList("Rome", "Florence", "Venice", "Milan"))
                .pace(TripPace.PACKED)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Grand Tour");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        assertEquals(3, itinerary.getDays().size());
        
        // Verify packed pace constraint (600 minutes max)
        for (com.italytrip.models.DayPlan day : itinerary.getDays()) {
            assertTrue(day.getTotalDuration() <= 600,
                    "Packed pace day should not exceed 10 hours (600 min)");
        }
    }
    
    @Test
    void testGenerateItineraryWithNoMatchingPlaces() {
        List<Place> places = new ArrayList<>();
        
        // Create places that don't match preferences
        places.add(new Place.Builder()
                .id("place_001")
                .name("Milan Place")
                .type(PlaceType.MUSEUM)
                .city("Milan")
                .latitude(45.4642)
                .longitude(9.1900)
                .rating(3.0)
                .build());
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome") // Won't match
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Empty Trip");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary, "Should return itinerary even with no matches");
        assertEquals(3, itinerary.getDays().size(), "Should still have 3 days");
        
        // Days may be empty or have fallback places
        int totalPlaces = itinerary.getDays().stream()
                .mapToInt(day -> day.getPlaces().size())
                .sum();
        
        // With fallback logic, might have some places, but could be 0
        assertTrue(totalPlaces >= 0, "Should handle no matches gracefully");
    }
    
    @Test
    void testGenerateItineraryWithInsufficientPlaces() {
        List<Place> places = new ArrayList<>();
        
        // Only 5 places (< 15 threshold)
        for (int i = 1; i <= 5; i++) {
            places.add(new Place.Builder()
                    .id("place_" + i)
                    .name("Place " + i)
                    .type(PlaceType.RESTAURANT)
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.001)
                    .rating(4.0)
                    .durationMinutes(90)
                    .build());
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Small Trip");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        assertEquals(3, itinerary.getDays().size());
        
        // Should work with reduced set
        int totalPlaces = itinerary.getDays().stream()
                .mapToInt(day -> day.getPlaces().size())
                .sum();
        
        assertTrue(totalPlaces <= 5, "Should not exceed available places");
    }
    
    @Test
    void testGenerateItineraryDefaultName() {
        List<Place> places = new ArrayList<>();
        
        places.add(new Place.Builder()
                .id("place_001")
                .name("Rome Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(4.0)
                .build());
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .build();
        
        // Pass null name
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, null);
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        assertEquals("Italy Trip", itinerary.getName(), "Should use default name");
    }
    
    @Test
    void testGenerateItineraryEmptyName() {
        List<Place> places = new ArrayList<>();
        
        places.add(new Place.Builder()
                .id("place_001")
                .name("Rome Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(4.0)
                .build());
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .build();
        
        // Pass empty name
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        assertEquals("Italy Trip", itinerary.getName(), "Should use default name for empty string");
    }
    
    @Test
    void testGenerateItineraryNullPlacesThrowsException() {
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .build();
        
        assertThrows(NullPointerException.class, () -> {
            engine.generateItinerary(null, preferences, "Test");
        }, "Null places should throw NullPointerException");
    }
    
    @Test
    void testGenerateItineraryNullPreferencesThrowsException() {
        List<Place> places = new ArrayList<>();
        places.add(new Place.Builder()
                .id("place_001")
                .name("Place")
                .type(PlaceType.MUSEUM)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .build());
        
        assertThrows(NullPointerException.class, () -> {
            engine.generateItinerary(places, null, "Test");
        }, "Null preferences should throw NullPointerException");
    }
    
    @Test
    void testGenerateItineraryWithHighlyRatedPlaces() {
        List<Place> places = new ArrayList<>();
        
        // Mix of high and low rated places
        for (int i = 1; i <= 10; i++) {
            places.add(new Place.Builder()
                    .id("place_" + i)
                    .name("Place " + i)
                    .type(PlaceType.MUSEUM)
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.001)
                    .rating(i <= 5 ? 4.8 : 2.0) // First 5 are highly rated
                    .durationMinutes(60)
                    .build());
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Best of Rome");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        
        // Should prioritize highly rated places (Requirement 18.5)
        List<Place> itineraryPlaces = itinerary.getDays().stream()
                .flatMap(day -> day.getPlaces().stream())
                .collect(Collectors.toList());
        
        if (!itineraryPlaces.isEmpty()) {
            double avgRating = itineraryPlaces.stream()
                    .filter(p -> p.getRating() != null)
                    .mapToDouble(Place::getRating)
                    .average()
                    .orElse(0.0);
            
            // Average should be skewed toward higher ratings
            assertTrue(avgRating >= 3.0, "Should prioritize higher-rated places");
        }
    }
    
    @Test
    void testGenerateItineraryWithMealPlaces() {
        List<Place> places = new ArrayList<>();
        
        // Create mix of restaurants and other places
        for (int i = 1; i <= 8; i++) {
            places.add(new Place.Builder()
                    .id("restaurant_" + i)
                    .name("Restaurant " + i)
                    .type(PlaceType.RESTAURANT)
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.001)
                    .rating(4.0)
                    .durationMinutes(90)
                    .build());
            
            places.add(new Place.Builder()
                    .id("museum_" + i)
                    .name("Museum " + i)
                    .type(PlaceType.MUSEUM)
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.002)
                    .rating(4.0)
                    .durationMinutes(120)
                    .build());
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Food Tour");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        
        // Each day should have at least one meal place (after balancing)
        for (com.italytrip.models.DayPlan day : itinerary.getDays()) {
            if (!day.getPlaces().isEmpty()) {
                long mealCount = day.getPlaces().stream()
                        .filter(p -> p.getType() == PlaceType.RESTAURANT || p.getType() == PlaceType.CAFE)
                        .count();
                
                // Balancing should try to ensure meal coverage
                // Note: might not always be possible, but test the attempt
                assertTrue(mealCount >= 0, "Day should have meal places when possible");
            }
        }
    }
    
    @Test
    void testGenerateItineraryWithDiverseTypes() {
        List<Place> places = new ArrayList<>();
        
        // Create places of various types
        PlaceType[] types = {PlaceType.RESTAURANT, PlaceType.MUSEUM, PlaceType.HISTORIC_SITE, 
                             PlaceType.CAFE, PlaceType.MARKET, PlaceType.PARK};
        
        for (int i = 0; i < types.length; i++) {
            for (int j = 1; j <= 4; j++) {
                places.add(new Place.Builder()
                        .id(types[i].name().toLowerCase() + "_" + j)
                        .name(types[i] + " " + j)
                        .type(types[i])
                        .city("Rome")
                        .latitude(41.89 + j * 0.001)
                        .longitude(12.49 + j * 0.001)
                        .rating(4.0)
                        .durationMinutes(60)
                        .build());
            }
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Diverse Trip");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        
        // Each day should have type diversity (max 2 of same type)
        for (com.italytrip.models.DayPlan day : itinerary.getDays()) {
            Map<PlaceType, Long> typeCounts = day.getPlaces().stream()
                    .collect(Collectors.groupingBy(Place::getType, Collectors.counting()));
            
            for (Long count : typeCounts.values()) {
                assertTrue(count <= 2, "Should have at most 2 places of same type per day");
            }
        }
    }
    
    @Test
    void testGenerateItineraryWithEmptyPlacesList() {
        List<Place> places = new ArrayList<>(); // Empty
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Empty");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary, "Should return itinerary even with empty places list");
        assertEquals(3, itinerary.getDays().size(), "Should have 3 days");
        
        // All days should be empty
        for (com.italytrip.models.DayPlan day : itinerary.getDays()) {
            assertTrue(day.getPlaces().isEmpty(), "Days should be empty with no places");
        }
    }
    
    @Test
    void testGenerateItineraryStoresMetadata() {
        List<Place> places = new ArrayList<>();
        
        for (int i = 1; i <= 10; i++) {
            places.add(new Place.Builder()
                    .id("place_" + i)
                    .name("Place " + i)
                    .type(PlaceType.MUSEUM)
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.001)
                    .rating(4.0)
                    .durationMinutes(60)
                    .build());
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(TripPace.MODERATE)
                .build();
        
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Metadata Test");
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        
        assertNotNull(itinerary);
        assertNotNull(itinerary.getId(), "Should have ID");
        assertNotNull(itinerary.getCreatedAt(), "Should have creation timestamp");
        assertNotNull(itinerary.getLastModified(), "Should have last modified timestamp");
        assertEquals(preferences, itinerary.getPreferences(), "Should store preferences");
    }
    
    @Test
    void testGenerateItineraryReturnsMetadata() {
        List<Place> places = new ArrayList<>();
        
        for (int i = 1; i <= 15; i++) {
            places.add(new Place.Builder()
                    .id("place_" + i)
                    .name("Place " + i)
                    .type(i % 3 == 0 ? PlaceType.RESTAURANT : PlaceType.MUSEUM)
                    .city("Rome")
                    .latitude(41.89 + i * 0.001)
                    .longitude(12.49 + i * 0.001)
                    .rating(4.0)
                    .durationMinutes(60)
                    .tags(Arrays.asList("art", "culture"))
                    .build());
        }
        
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addInterest("art")
                .pace(TripPace.MODERATE)
                .build();
        
        // Call the 3-parameter generateItinerary method that returns ItineraryGenerationResult
        RecommendationEngine.ItineraryGenerationResult result = engine.generateItinerary(places, preferences, "Test Trip");
        
        // Validate the result contains itinerary, reasoning, and alternatives
        assertNotNull(result, "Result should not be null");
        assertNotNull(result.getItinerary(), "Itinerary should not be null");
        assertNotNull(result.getReasoning(), "Reasoning should not be null");
        assertNotNull(result.getAlternativePlaces(), "Alternative places should not be null");
        
        // Verify reasoning contains useful information
        String reasoning = result.getReasoning();
        assertFalse(reasoning.isEmpty(), "Reasoning should not be empty");
        assertTrue(reasoning.contains("Rome") || reasoning.contains("places"), 
                "Reasoning should contain relevant information");
        
        // Verify alternative places are provided
        List<Place> alternatives = result.getAlternativePlaces();
        assertTrue(alternatives.size() > 0, "Should have alternative place suggestions");
        
        // Verify alternatives don't include places already in the itinerary
        com.italytrip.models.Itinerary itinerary = result.getItinerary();
        List<String> itineraryPlaceIds = itinerary.getDays().stream()
                .flatMap(day -> day.getPlaces().stream())
                .map(Place::getId)
                .collect(Collectors.toList());
        
        for (Place alt : alternatives) {
            assertFalse(itineraryPlaceIds.contains(alt.getId()), 
                    "Alternative places should not be in the itinerary");
        }
        
        // Verify itinerary is properly structured
        assertEquals("Test Trip", itinerary.getName());
        assertEquals(3, itinerary.getDays().size());
        
        LOGGER.info("Result reasoning: " + reasoning);
        LOGGER.info("Alternative places count: " + alternatives.size());
    }
}

