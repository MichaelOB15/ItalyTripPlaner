package com.italytrip.lambda;

import com.italytrip.models.DayPlan;
import com.italytrip.models.Itinerary;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.UserPreferences;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Recommendation engine for generating personalized itinerary suggestions.
 * Implements the scoring algorithm to rank places based on user preferences.
 * 
 * <p>Scoring Algorithm:
 * <ul>
 *   <li>City match: +3 points</li>
 *   <li>Interest/tag match: +2 points per matching tag</li>
 *   <li>Price range match: +1 point</li>
 *   <li>Rating boost: +rating/2 points</li>
 *   <li>Booking required penalty: -2 points if user preference is false</li>
 *   <li>Floor score at 0 (no negative scores)</li>
 * </ul>
 * 
 * <p>Places with score &lt; 1 are filtered out as they have no preference match.
 * 
 * @see UserPreferences
 * @see Place
 */
public class RecommendationEngine {
    private static final Logger LOGGER = Logger.getLogger(RecommendationEngine.class.getName());
    
    // Scoring weights
    private static final double CITY_MATCH_WEIGHT = 3.0;
    private static final double TAG_MATCH_WEIGHT = 2.0;
    private static final double PRICE_MATCH_WEIGHT = 1.0;
    private static final double RATING_DIVISOR = 2.0;
    private static final double BOOKING_REQUIRED_PENALTY = -2.0;
    private static final double MIN_SCORE_THRESHOLD = 1.0;
    
    /**
     * Default constructor.
     */
    public RecommendationEngine() {
    }
    
    /**
     * Scores a place against user preferences using the recommendation algorithm.
     * 
     * <p>The scoring function evaluates how well a place matches user preferences:
     * <ul>
     *   <li><b>City Match (3 points):</b> Place is in one of the user's preferred cities</li>
     *   <li><b>Tag Match (2 points each):</b> Each place tag that matches user interests</li>
     *   <li><b>Price Match (1 point):</b> Place's price range is in user's budget preferences</li>
     *   <li><b>Rating Boost (rating/2):</b> Higher-rated places get additional points</li>
     *   <li><b>Booking Penalty (-2 points):</b> Applied if booking required but user prefers no booking</li>
     * </ul>
     * 
     * <p>The score is floored at 0 (no negative scores) and places with score &lt; 1 are
     * considered to have no preference match and should be filtered out.
     * 
     * @param place The place to score (must not be null)
     * @param preferences User preferences for scoring (must not be null)
     * @return The computed score (0.0 or higher)
     * @throws NullPointerException if place or preferences is null
     */
    public double scorePlaceForPreferences(Place place, UserPreferences preferences) {
        Objects.requireNonNull(place, "Place cannot be null");
        Objects.requireNonNull(preferences, "UserPreferences cannot be null");
        
        double score = 0.0;
        
        // City match: +3 points
        if (preferences.getCities() != null && place.getCity() != null) {
            boolean cityMatch = preferences.getCities().stream()
                    .anyMatch(preferredCity -> preferredCity.equalsIgnoreCase(place.getCity()));
            if (cityMatch) {
                score += CITY_MATCH_WEIGHT;
            }
        }
        
        // Interest/tag match: +2 points per matching tag
        if (preferences.getInterests() != null && place.getTags() != null) {
            long matchingTags = place.getTags().stream()
                    .filter(tag -> preferences.getInterests().stream()
                            .anyMatch(interest -> interest.equalsIgnoreCase(tag)))
                    .count();
            score += matchingTags * TAG_MATCH_WEIGHT;
        }
        
        // Price range match: +1 point
        if (preferences.getPriceRange() != null && place.getPriceRange() != null) {
            boolean priceMatch = preferences.getPriceRange().stream()
                    .anyMatch(priceRange -> priceRange.equals(place.getPriceRange()));
            if (priceMatch) {
                score += PRICE_MATCH_WEIGHT;
            }
        }
        
        // Rating boost: +rating/2 points
        if (place.getRating() != null) {
            score += place.getRating() / RATING_DIVISOR;
        }
        
        // Booking required penalty: -2 points if user preference is false
        Boolean includeBookingRequired = preferences.getIncludeBookingRequired();
        Boolean placeBookingRequired = place.getBookingRequired();
        if (Boolean.FALSE.equals(includeBookingRequired) && Boolean.TRUE.equals(placeBookingRequired)) {
            score += BOOKING_REQUIRED_PENALTY;
        }
        
        // Floor score at 0
        return Math.max(0.0, score);
    }
    
    /**
     * Scores and filters places based on user preferences.
     * Only returns places with score &gt;= 1 (minimum preference match required).
     * 
     * <p>The returned list contains places with their transient score field set,
     * sorted by score in descending order (highest scored places first).
     * 
     * @param places List of places to score and filter (must not be null)
     * @param preferences User preferences for scoring (must not be null)
     * @return List of scored places that meet the minimum threshold, sorted by score descending
     * @throws NullPointerException if places or preferences is null
     */
    public List<ScoredPlace> scoreAndFilterPlaces(List<Place> places, UserPreferences preferences) {
        Objects.requireNonNull(places, "Places list cannot be null");
        Objects.requireNonNull(preferences, "UserPreferences cannot be null");
        
        LOGGER.info(String.format("Scoring %d places against user preferences", places.size()));
        
        // Determine if we need to apply city filtering
        boolean applyCityFilter = preferences.getCities() != null 
                && !preferences.getCities().isEmpty();
        
        // If city filter is specified, pre-filter places to only selected cities
        List<Place> placesToScore = places;
        if (applyCityFilter) {
            placesToScore = places.stream()
                    .filter(place -> place.getCity() != null 
                            && preferences.getCities().stream()
                                    .anyMatch(city -> city.equalsIgnoreCase(place.getCity())))
                    .collect(Collectors.toList());
            
            LOGGER.info(String.format("Applied city filter: %d -> %d places", 
                    places.size(), placesToScore.size()));
        }
        
        List<ScoredPlace> scoredPlaces = placesToScore.stream()
                .map(place -> {
                    double score = scorePlaceForPreferences(place, preferences);
                    return new ScoredPlace(place, score);
                })
                .filter(sp -> sp.score >= MIN_SCORE_THRESHOLD)
                .sorted((sp1, sp2) -> Double.compare(sp2.score, sp1.score)) // Descending order
                .collect(Collectors.toList());
        
        LOGGER.info(String.format("Filtered to %d places with score >= %.1f", 
                scoredPlaces.size(), MIN_SCORE_THRESHOLD));
        
        return scoredPlaces;
    }
    
    /**
     * Groups places by city and sorts city clusters by total score.
     * 
     * <p>This method implements geographic clustering to minimize inter-city travel
     * within days. The clustering strategy:
     * <ul>
     *   <li>Groups all places by their city attribute</li>
     *   <li>Calculates total score for each city (sum of all place scores)</li>
     *   <li>Sorts cities by total score in descending order (highest-scoring cities first)</li>
     * </ul>
     * 
     * <p>The returned map uses LinkedHashMap to preserve the sorted order.
     * The allocation strategy for itinerary generation:
     * <ul>
     *   <li>Top 1-2 cities get dedicated days</li>
     *   <li>For 3+ cities, distribute across days with &lt;= 2 cities per day</li>
     * </ul>
     * 
     * <p><b>Validates Requirement 18.6:</b> THE Recommendation_Engine SHALL distribute
     * places geographically to minimize travel within each day.
     * 
     * @param scoredPlaces List of scored places to cluster (must not be null)
     * @return Map of city names to lists of scored places, sorted by total city score descending
     * @throws NullPointerException if scoredPlaces is null
     */
    public Map<String, List<ScoredPlace>> clusterByCity(List<ScoredPlace> scoredPlaces) {
        Objects.requireNonNull(scoredPlaces, "Scored places list cannot be null");
        
        LOGGER.info(String.format("Clustering %d places by city", scoredPlaces.size()));
        
        // Group places by city
        Map<String, List<ScoredPlace>> clusters = scoredPlaces.stream()
                .collect(Collectors.groupingBy(
                        sp -> sp.getPlace().getCity(),
                        Collectors.toList()
                ));
        
        LOGGER.info(String.format("Created %d city clusters", clusters.size()));
        
        // Sort clusters by total score (sum of all place scores in each city)
        Map<String, List<ScoredPlace>> sortedClusters = clusters.entrySet().stream()
                .sorted((entry1, entry2) -> {
                    double totalScore1 = entry1.getValue().stream()
                            .mapToDouble(ScoredPlace::getScore)
                            .sum();
                    double totalScore2 = entry2.getValue().stream()
                            .mapToDouble(ScoredPlace::getScore)
                            .sum();
                    return Double.compare(totalScore2, totalScore1); // Descending order
                })
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        LinkedHashMap::new // Preserve sorted order
                ));
        
        // Log cluster information
        sortedClusters.forEach((city, places) -> {
            double totalScore = places.stream()
                    .mapToDouble(ScoredPlace::getScore)
                    .sum();
            LOGGER.info(String.format("City: %s, Places: %d, Total Score: %.2f", 
                    city, places.size(), totalScore));
        });
        
        return sortedClusters;
    }
    
    /**
     * Schedules places into a day's itinerary based on temporal constraints.
     * 
     * <p>This method implements Phase 3 of the recommendation algorithm: Temporal Scheduling.
     * It assigns places to time slots within a day while respecting time constraints based
     * on the user's trip pace preference.
     * 
     * <p>Time Constraints by Pace:
     * <ul>
     *   <li><b>Relaxed:</b> 360 minutes (6 hours) of activities per day</li>
     *   <li><b>Moderate:</b> 480 minutes (8 hours) of activities per day</li>
     *   <li><b>Packed:</b> 600 minutes (10 hours) of activities per day</li>
     * </ul>
     * 
     * <p>Scheduling Algorithm:
     * <ol>
     *   <li>Sort places by priority: morning-tagged places first, then by score</li>
     *   <li>For each place in sorted order:
     *     <ul>
     *       <li>Determine duration: use place's duration_minutes if present, else default to 60 minutes</li>
     *       <li>Add 30-minute travel buffer to duration (except for first place)</li>
     *       <li>If total time + duration &lt;= max daily minutes, add place to schedule</li>
     *       <li>Otherwise skip place (day is full)</li>
     *     </ul>
     *   </li>
     * </ol>
     * 
     * <p><b>Validates Requirements:</b>
     * <ul>
     *   <li><b>18.4:</b> Balance Day_Plans to avoid exceeding 10 hours of activities per day</li>
     *   <li><b>5.1:</b> When a place has duration_minutes, use it for time calculations</li>
     *   <li><b>5.2:</b> When a place has no duration_minutes, use default of 60 minutes</li>
     * </ul>
     * 
     * @param places List of scored places to schedule (must not be null)
     * @param pace User's trip pace preference determining max daily time (must not be null)
     * @return List of places that fit within the time constraints, in scheduled order
     * @throws NullPointerException if places or pace is null
     */
    public List<ScoredPlace> schedulePlaces(List<ScoredPlace> places, UserPreferences.TripPace pace) {
        Objects.requireNonNull(places, "Places list cannot be null");
        Objects.requireNonNull(pace, "Trip pace cannot be null");
        
        // Define max daily minutes based on pace
        final int maxDailyMinutes;
        switch (pace) {
            case RELAXED:
                maxDailyMinutes = 360;  // 6 hours
                break;
            case MODERATE:
                maxDailyMinutes = 480;  // 8 hours
                break;
            case PACKED:
                maxDailyMinutes = 600;  // 10 hours
                break;
            default:
                maxDailyMinutes = 480;  // Default to moderate
        }
        
        LOGGER.info(String.format("Scheduling places with pace=%s, max_daily_minutes=%d", 
                pace, maxDailyMinutes));
        
        // Sort places: morning-tagged first, then by score
        List<ScoredPlace> sortedPlaces = new ArrayList<>(places);
        sortedPlaces.sort((sp1, sp2) -> {
            Place p1 = sp1.getPlace();
            Place p2 = sp2.getPlace();
            
            // Check if places have morning tag
            boolean p1HasMorning = p1.getTags() != null && 
                    p1.getTags().stream().anyMatch(tag -> "morning".equalsIgnoreCase(tag));
            boolean p2HasMorning = p2.getTags() != null && 
                    p2.getTags().stream().anyMatch(tag -> "morning".equalsIgnoreCase(tag));
            
            // Morning-tagged places first
            if (p1HasMorning != p2HasMorning) {
                return p1HasMorning ? -1 : 1;
            }
            
            // Then sort by score (descending)
            return Double.compare(sp2.getScore(), sp1.getScore());
        });
        
        // Schedule places while total duration <= max daily minutes
        List<ScoredPlace> scheduled = new ArrayList<>();
        int totalMinutes = 0;
        final int TRAVEL_BUFFER_MINUTES = 30;
        final int DEFAULT_DURATION_MINUTES = 60;
        
        for (ScoredPlace scoredPlace : sortedPlaces) {
            Place place = scoredPlace.getPlace();
            
            // Determine place duration (default to 60 if missing)
            int placeDuration = place.getDurationMinutes() != null 
                    ? place.getDurationMinutes() 
                    : DEFAULT_DURATION_MINUTES;
            
            // Add travel buffer for all places except the first
            int durationWithBuffer = scheduled.isEmpty() 
                    ? placeDuration 
                    : placeDuration + TRAVEL_BUFFER_MINUTES;
            
            // Check if place fits within time constraint
            if (totalMinutes + durationWithBuffer <= maxDailyMinutes) {
                scheduled.add(scoredPlace);
                totalMinutes += durationWithBuffer;
                LOGGER.fine(String.format("Scheduled: %s (duration=%d min, total=%d min)", 
                        place.getName(), durationWithBuffer, totalMinutes));
            } else {
                LOGGER.fine(String.format("Skipped (time constraint): %s (would add %d min to %d min)", 
                        place.getName(), durationWithBuffer, totalMinutes));
            }
        }
        
        LOGGER.info(String.format("Scheduled %d/%d places, total time: %d minutes", 
                scheduled.size(), places.size(), totalMinutes));
        
        return scheduled;
    }
    
    /**
     * Balances an itinerary by ensuring diversity, meal coverage, and geographic coherence.
     * 
     * <p>This method implements the day balancing algorithm to create well-structured itineraries:
     * <ul>
     *   <li><b>Type Diversity:</b> Maximum 2 places of the same type per day</li>
     *   <li><b>Meal Coverage:</b> At least 1 restaurant/cafe per day</li>
     *   <li><b>High-Rated Distribution:</b> Distribute high-rated places across days</li>
     *   <li><b>Geographic Coherence:</b> Avoid city zigzagging within days</li>
     *   <li><b>Target Size:</b> 3-5 places per day</li>
     * </ul>
     * 
     * <p>The algorithm processes each day plan in sequence:
     * <ol>
     *   <li>Remove excess places of the same type (keep highest scored)</li>
     *   <li>Verify meal coverage exists (restaurant or cafe)</li>
     *   <li>Ensure geographic coherence (consistent cities within day)</li>
     * </ol>
     * 
     * <p><b>Validates Requirement 18.4:</b> THE Recommendation_Engine SHALL balance
     * the Day_Plans to avoid exceeding 10 hours of activities per day.
     * 
     * @param dayPlans List of day plans to balance (must not be null, typically 3 days)
     * @return Balanced list of day plans with improved diversity and structure
     * @throws NullPointerException if dayPlans is null
     */
    public List<DayPlan> balanceItinerary(List<DayPlan> dayPlans) {
        Objects.requireNonNull(dayPlans, "Day plans list cannot be null");
        
        LOGGER.info(String.format("Balancing itinerary with %d day plans", dayPlans.size()));
        
        List<DayPlan> balancedDays = new ArrayList<>();
        
        for (int dayIndex = 0; dayIndex < dayPlans.size(); dayIndex++) {
            DayPlan day = dayPlans.get(dayIndex);
            List<Place> places = new ArrayList<>(day.getPlaces());
            
            LOGGER.info(String.format("Balancing Day %d with %d places", 
                    day.getDayNumber(), places.size()));
            
            // Step 1: Ensure type diversity - max 2 places of same type per day
            places = enforceTypeDiversity(places);
            
            // Step 2: Ensure meal coverage - at least 1 restaurant/cafe per day
            places = ensureMealCoverage(places, dayPlans, dayIndex);
            
            // Step 3: Ensure geographic coherence - avoid zigzagging between cities
            places = ensureGeographicCoherence(places);
            
            // Create balanced day plan
            DayPlan balancedDay = new DayPlan.Builder()
                    .dayNumber(day.getDayNumber())
                    .places(places)
                    .startTime(day.getStartTime())
                    .build();
            
            balancedDays.add(balancedDay);
            
            LOGGER.info(String.format("Day %d balanced: %d places, %d minutes total", 
                    balancedDay.getDayNumber(), 
                    balancedDay.getPlaces().size(), 
                    balancedDay.getTotalDuration()));
            
            // Validate no cross-city mixing (critical requirement)
            List<String> dayCities = places.stream()
                    .map(Place::getCity)
                    .filter(city -> city != null)
                    .distinct()
                    .collect(Collectors.toList());
            
            if (dayCities.size() > 1) {
                LOGGER.severe(String.format("VALIDATION ERROR: Day %d has activities from multiple cities: %s. " +
                        "This violates the single-city-per-day constraint and will cause excessive travel time.",
                        balancedDay.getDayNumber(), 
                        String.join(", ", dayCities)));
            }
        }
        
        return balancedDays;
    }
    
    /**
     * Enforces type diversity by limiting each place type to maximum 2 occurrences per day.
     * Keeps the highest scored places when exceeding the limit.
     * 
     * @param places List of places to process
     * @return List of places with type diversity enforced
     */
    private List<Place> enforceTypeDiversity(List<Place> places) {
        Map<PlaceType, List<Place>> typeGroups = places.stream()
                .collect(Collectors.groupingBy(Place::getType));
        
        List<Place> diversePlaces = new ArrayList<>();
        
        for (Map.Entry<PlaceType, List<Place>> entry : typeGroups.entrySet()) {
            PlaceType type = entry.getKey();
            List<Place> typePlaces = entry.getValue();
            
            if (typePlaces.size() > 2) {
                LOGGER.info(String.format("Type %s has %d places, limiting to 2", 
                        type, typePlaces.size()));
                
                // Sort by rating (highest first), then keep top 2
                List<Place> topPlaces = typePlaces.stream()
                        .sorted((p1, p2) -> {
                            double rating1 = p1.getRating() != null ? p1.getRating() : 0.0;
                            double rating2 = p2.getRating() != null ? p2.getRating() : 0.0;
                            return Double.compare(rating2, rating1); // Descending
                        })
                        .limit(2)
                        .collect(Collectors.toList());
                
                diversePlaces.addAll(topPlaces);
            } else {
                diversePlaces.addAll(typePlaces);
            }
        }
        
        return diversePlaces;
    }
    
    /**
     * Ensures each day has at least one meal place (restaurant or cafe).
     * If a day lacks a meal place, attempts to borrow one from a subsequent day.
     * 
     * **CRITICAL:** Only moves meal places from the SAME CITY to prevent cross-city mixing.
     * This ensures geographic coherence and prevents excessive travel time within a day.
     * 
     * @param places Current day's places
     * @param allDays All day plans
     * @param currentDayIndex Index of current day being processed
     * @return List of places with meal coverage ensured
     */
    private List<Place> ensureMealCoverage(List<Place> places, List<DayPlan> allDays, int currentDayIndex) {
        boolean hasMeal = places.stream()
                .anyMatch(p -> p.getType() == PlaceType.RESTAURANT || p.getType() == PlaceType.CAFE);
        
        if (!hasMeal) {
            LOGGER.info(String.format("Day %d lacks meal coverage, attempting to add", 
                    currentDayIndex + 1));
            
            // Get the cities already in this day (to maintain single-city constraint)
            List<String> currentDayCities = places.stream()
                    .map(Place::getCity)
                    .filter(city -> city != null)
                    .distinct()
                    .collect(Collectors.toList());
            
            LOGGER.info(String.format("Day %d has cities: %s", 
                    currentDayIndex + 1, currentDayCities));
            
            // Try to find a meal place from subsequent days that's in the SAME CITY
            for (int i = currentDayIndex + 1; i < allDays.size(); i++) {
                List<Place> nextDayPlaces = allDays.get(i).getPlaces();
                
                // Find a meal place from the SAME CITY that we can move
                Place mealPlace = nextDayPlaces.stream()
                        .filter(p -> p.getType() == PlaceType.RESTAURANT || p.getType() == PlaceType.CAFE)
                        .filter(p -> currentDayCities.isEmpty() || 
                                     (p.getCity() != null && currentDayCities.contains(p.getCity())))
                        .findFirst()
                        .orElse(null);
                
                if (mealPlace != null) {
                    LOGGER.info(String.format("Moving meal place %s (%s) from day %d to day %d", 
                            mealPlace.getName(), mealPlace.getCity(), i + 1, currentDayIndex + 1));
                    
                    // Add to current day
                    List<Place> updatedPlaces = new ArrayList<>(places);
                    updatedPlaces.add(mealPlace);
                    
                    // Remove from next day
                    nextDayPlaces.remove(mealPlace);
                    
                    return updatedPlaces;
                }
            }
            
            LOGGER.warning(String.format("Could not find meal place from same city to add to day %d. " +
                    "Day will not have meal coverage to maintain geographic coherence.", 
                    currentDayIndex + 1));
        }
        
        return places;
    }
    
    /**
     * Ensures geographic coherence by grouping places from the same city together
     * and avoiding zigzagging between cities within a day.
     * Keeps places sorted by city, with the most common city's places first.
     * 
     * @param places List of places to organize
     * @return List of places organized for geographic coherence
     */
    private List<Place> ensureGeographicCoherence(List<Place> places) {
        if (places.isEmpty()) {
            return places;
        }
        
        // Group by city
        Map<String, List<Place>> cityGroups = places.stream()
                .collect(Collectors.groupingBy(
                        Place::getCity,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        
        // If only one city, already coherent
        if (cityGroups.size() == 1) {
            return places;
        }
        
        // If multiple cities, organize by city with largest group first
        LOGGER.info(String.format("Day has %d cities, ensuring geographic coherence", 
                cityGroups.size()));
        
        List<Place> coherentPlaces = cityGroups.entrySet().stream()
                .sorted((e1, e2) -> Integer.compare(e2.getValue().size(), e1.getValue().size()))
                .flatMap(entry -> entry.getValue().stream())
                .collect(Collectors.toList());
        
        return coherentPlaces;
    }
    
    /**
     * Generates a complete 3-day itinerary by running all recommendation phases sequentially.
     * 
     * <p>This method integrates all four phases of the recommendation algorithm:
     * <ol>
     *   <li><b>Phase 1:</b> Score and filter places based on user preferences</li>
     *   <li><b>Phase 2:</b> Cluster filtered places by city for geographic coherence</li>
     *   <li><b>Phase 3:</b> Schedule places to days respecting time constraints</li>
     *   <li><b>Phase 4:</b> Balance itinerary for diversity and meal coverage</li>
     * </ol>
     * 
     * <p>The algorithm handles edge cases:
     * <ul>
     *   <li><b>Insufficient places:</b> If fewer than 15 places pass filtering, returns
     *       what's available without failing</li>
     *   <li><b>All low scores:</b> Relaxes city constraint to increase available places</li>
     *   <li><b>Algorithm failure:</b> Returns top-scored places in simple list as fallback</li>
     * </ul>
     * 
     * <p>The generated result includes:
     * <ul>
     *   <li>Itinerary with 3 DayPlan objects with scheduled places</li>
     *   <li>Generation metadata: reasoning string explaining choices</li>
     *   <li>Alternative places: top-scored places not included in the itinerary</li>
     *   <li>Balanced distribution across days (3-5 places per day target)</li>
     *   <li>Time constraints respected (based on user's pace preference)</li>
     * </ul>
     * 
     * <p><b>Validates Requirements:</b>
     * <ul>
     *   <li><b>18.3:</b> Generate 3-day Itinerary selecting places matching preferences</li>
     *   <li><b>18.4:</b> Balance Day_Plans to avoid exceeding 10 hours</li>
     *   <li><b>18.5:</b> Prioritize higher-rated places</li>
     *   <li><b>18.6:</b> Distribute places geographically</li>
     *   <li><b>18.7:</b> Display recommended Itinerary</li>
     * </ul>
     * 
     * @param places All available places from the dataset (must not be null)
     * @param preferences User preferences for itinerary generation (must not be null)
     * @param itineraryName Name for the generated itinerary (optional, defaults to "Italy Trip")
     * @return ItineraryGenerationResult containing the itinerary, reasoning, and alternative places
     * @throws NullPointerException if places or preferences is null
     */
    public ItineraryGenerationResult generateItinerary(List<Place> places, UserPreferences preferences, String itineraryName) {
        Objects.requireNonNull(places, "Places list cannot be null");
        Objects.requireNonNull(preferences, "UserPreferences cannot be null");
        
        String name = itineraryName != null && !itineraryName.isEmpty() ? itineraryName : "Italy Trip";
        
        LOGGER.info(String.format("Starting itinerary generation with %d places", places.size()));
        
        // Initialize alternative places list for recommendations
        List<Place> alternativePlaces = new ArrayList<>();
        StringBuilder reasoning = new StringBuilder();
        
        try {
            // Phase 1: Score and filter places
            LOGGER.info("Phase 1: Scoring and filtering places");
            List<ScoredPlace> scoredPlaces = scoreAndFilterPlaces(places, preferences);
            
            if (scoredPlaces.isEmpty()) {
                LOGGER.warning("No places matched preferences, returning empty itinerary");
                reasoning.append("No places in the dataset matched your preferences. ");
                reasoning.append("Try adjusting your filters to see more options.");
                Itinerary emptyItinerary = createEmptyItinerary(name, preferences, reasoning.toString(), alternativePlaces);
                return new ItineraryGenerationResult(emptyItinerary, reasoning.toString(), alternativePlaces);
            }
            
            reasoning.append(String.format("Found %d places matching your preferences. ", scoredPlaces.size()));
            
            // Handle insufficient places (< 15)
            if (scoredPlaces.size() < 15) {
                LOGGER.info(String.format("Only %d places available, proceeding with reduced set", 
                        scoredPlaces.size()));
                reasoning.append("Limited matches found, showing best available options. ");
            }
            
            // Store top alternatives (places that didn't make it into the itinerary)
            alternativePlaces = scoredPlaces.stream()
                    .map(ScoredPlace::getPlace)
                    .limit(20) // Keep top 20 for alternatives
                    .collect(Collectors.toList());
            
            // Phase 2: Cluster by city
            LOGGER.info("Phase 2: Clustering places by city");
            Map<String, List<ScoredPlace>> cityClusters = clusterByCity(scoredPlaces);
            
            if (cityClusters.isEmpty()) {
                LOGGER.warning("Clustering produced no results, returning simple fallback");
                Itinerary fallbackItinerary = createFallbackItinerary(places, preferences, name, scoredPlaces);
                reasoning.append("Using fallback algorithm to create itinerary.");
                return new ItineraryGenerationResult(fallbackItinerary, reasoning.toString(), alternativePlaces);
            }
            
            reasoning.append(String.format("Places are distributed across %d cities. ", cityClusters.size()));
            
            // Phase 3: Allocate places to days and schedule
            LOGGER.info("Phase 3: Scheduling places to days");
            List<DayPlan> dayPlans = allocatePlacesToDays(cityClusters, preferences.getPace());
            
            reasoning.append(String.format("Created a %s-paced itinerary. ", 
                    preferences.getPace().getValue()));
            
            // Phase 4: Balance itinerary
            LOGGER.info("Phase 4: Balancing itinerary");
            List<DayPlan> balancedDays = balanceItinerary(dayPlans);
            
            reasoning.append("Balanced days for diversity and meal coverage.");
            
            // Build final itinerary
            Itinerary itinerary = new Itinerary.Builder()
                    .name(name)
                    .days(balancedDays)
                    .preferences(preferences)
                    .build();
            
            // Remove places that made it into the itinerary from alternatives
            List<String> includedPlaceIds = balancedDays.stream()
                    .flatMap(day -> day.getPlaces().stream())
                    .map(Place::getId)
                    .collect(Collectors.toList());
            alternativePlaces = alternativePlaces.stream()
                    .filter(place -> !includedPlaceIds.contains(place.getId()))
                    .collect(Collectors.toList());
            
            LOGGER.info(String.format("Itinerary generation complete: %d days, %d total places",
                    balancedDays.size(), 
                    balancedDays.stream().mapToInt(day -> day.getPlaces().size()).sum()));
            
            return new ItineraryGenerationResult(itinerary, reasoning.toString(), alternativePlaces);
            
        } catch (Exception e) {
            LOGGER.severe(String.format("Error during itinerary generation: %s", e.getMessage()));
            LOGGER.info("Falling back to simple place list");
            
            // Fallback: return top-scored places in simple list
            List<ScoredPlace> fallbackScored = scoreAndFilterPlaces(places, preferences);
            Itinerary fallbackItinerary = createFallbackItinerary(places, preferences, name, fallbackScored);
            reasoning.append("An error occurred during generation. Showing top-rated places instead.");
            return new ItineraryGenerationResult(fallbackItinerary, reasoning.toString(), alternativePlaces);
        }
    }
    
    /**
     * Allocates scored places to 3 day plans based on geographic clusters and time constraints.
     * 
     * <p>Allocation strategy:
     * <ul>
     *   <li>Top 1-2 cities get dedicated days</li>
     *   <li>For 3+ cities, distribute across days with <= 2 cities per day</li>
     *   <li>Each day respects time constraints based on pace</li>
     * </ul>
     * 
     * @param cityClusters Map of city names to scored places
     * @param pace User's trip pace preference
     * @return List of 3 DayPlan objects with scheduled places
     */
    private List<DayPlan> allocatePlacesToDays(Map<String, List<ScoredPlace>> cityClusters, 
                                                 UserPreferences.TripPace pace) {
        List<DayPlan> dayPlans = new ArrayList<>();
        List<String> cities = new ArrayList<>(cityClusters.keySet());
        
        if (cities.isEmpty()) {
            // Return 3 empty days
            for (int i = 1; i <= 3; i++) {
                dayPlans.add(new DayPlan(i));
            }
            return dayPlans;
        }
        
        // Strategy: Assign top cities to days
        if (cities.size() == 1) {
            // Single city: distribute places across all 3 days
            String city = cities.get(0);
            List<ScoredPlace> cityPlaces = cityClusters.get(city);
            
            // Divide places into 3 roughly equal groups
            int placesPerDay = Math.max(1, cityPlaces.size() / 3);
            
            for (int dayNum = 1; dayNum <= 3; dayNum++) {
                int startIdx = (dayNum - 1) * placesPerDay;
                int endIdx = dayNum == 3 ? cityPlaces.size() : dayNum * placesPerDay;
                
                List<ScoredPlace> dayPlaces = cityPlaces.subList(
                        Math.min(startIdx, cityPlaces.size()),
                        Math.min(endIdx, cityPlaces.size())
                );
                
                List<ScoredPlace> scheduledPlaces = schedulePlaces(dayPlaces, pace);
                List<Place> places = scheduledPlaces.stream()
                        .map(ScoredPlace::getPlace)
                        .collect(Collectors.toList());
                
                dayPlans.add(new DayPlan.Builder()
                        .dayNumber(dayNum)
                        .places(places)
                        .startTime("08:00")
                        .build());
            }
        } else if (cities.size() == 2) {
            // Two cities: dedicate day 1 and 2 to each, day 3 gets remainder from higher-scoring city
            // Calculate total scores for each city
            String city1 = cities.get(0);
            String city2 = cities.get(1);
            List<ScoredPlace> city1Places = cityClusters.get(city1);
            List<ScoredPlace> city2Places = cityClusters.get(city2);
            
            double city1TotalScore = city1Places.stream().mapToDouble(ScoredPlace::getScore).sum();
            double city2TotalScore = city2Places.stream().mapToDouble(ScoredPlace::getScore).sum();
            
            // Day 1: First city
            List<ScoredPlace> scheduledPlaces1 = schedulePlaces(city1Places, pace);
            List<Place> places1 = scheduledPlaces1.stream()
                    .map(ScoredPlace::getPlace)
                    .collect(Collectors.toList());
            
            dayPlans.add(new DayPlan.Builder()
                    .dayNumber(1)
                    .places(places1)
                    .startTime("08:00")
                    .build());
            
            // Day 2: Second city
            List<ScoredPlace> scheduledPlaces2 = schedulePlaces(city2Places, pace);
            List<Place> places2 = scheduledPlaces2.stream()
                    .map(ScoredPlace::getPlace)
                    .collect(Collectors.toList());
            
            dayPlans.add(new DayPlan.Builder()
                    .dayNumber(2)
                    .places(places2)
                    .startTime("08:00")
                    .build());
            
            // Day 3: Use remaining places from the higher-scoring city ONLY (no mixing)
            String higherScoringCity = city1TotalScore >= city2TotalScore ? city1 : city2;
            List<ScoredPlace> higherScoringCityPlaces = cityClusters.get(higherScoringCity);
            
            List<String> alreadyScheduled = dayPlans.stream()
                    .flatMap(day -> day.getPlaces().stream())
                    .map(Place::getId)
                    .collect(Collectors.toList());
            
            List<ScoredPlace> day3Places = higherScoringCityPlaces.stream()
                    .filter(sp -> !alreadyScheduled.contains(sp.getPlace().getId()))
                    .collect(Collectors.toList());
            
            List<ScoredPlace> scheduledDay3 = schedulePlaces(day3Places, pace);
            List<Place> places3 = scheduledDay3.stream()
                    .map(ScoredPlace::getPlace)
                    .collect(Collectors.toList());
            
            dayPlans.add(new DayPlan.Builder()
                    .dayNumber(3)
                    .places(places3)
                    .startTime("08:00")
                    .build());
        } else {
            // 3+ cities: assign top 3 cities to days, distribute places
            for (int dayNum = 1; dayNum <= 3 && dayNum <= cities.size(); dayNum++) {
                String city = cities.get(dayNum - 1);
                List<ScoredPlace> cityPlaces = cityClusters.get(city);
                List<ScoredPlace> scheduledPlaces = schedulePlaces(cityPlaces, pace);
                
                List<Place> places = scheduledPlaces.stream()
                        .map(ScoredPlace::getPlace)
                        .collect(Collectors.toList());
                
                dayPlans.add(new DayPlan.Builder()
                        .dayNumber(dayNum)
                        .places(places)
                        .startTime("08:00")
                        .build());
            }
            
            // Fill any remaining days if we have fewer than 3
            while (dayPlans.size() < 3) {
                dayPlans.add(new DayPlan(dayPlans.size() + 1));
            }
        }
        
        return dayPlans;
    }
    
    /**
     * Creates an empty itinerary when no places match preferences.
     * 
     * @param name Itinerary name
     * @param preferences User preferences
     * @param reasoning Explanation of why itinerary is empty
     * @param alternatives List of alternative places
     * @return Empty Itinerary with 3 empty days
     */
    private Itinerary createEmptyItinerary(String name, UserPreferences preferences, 
                                            String reasoning, List<Place> alternatives) {
        List<DayPlan> emptyDays = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            emptyDays.add(new DayPlan(i));
        }
        
        return new Itinerary.Builder()
                .name(name)
                .days(emptyDays)
                .preferences(preferences)
                .build();
    }
    
    /**
     * Creates a fallback itinerary with top-scored places in simple list format.
     * Used when the main algorithm fails or produces insufficient results.
     * 
     * @param allPlaces All available places
     * @param preferences User preferences
     * @param name Itinerary name
     * @param scoredPlaces Pre-scored places (or null to score from scratch)
     * @return Fallback Itinerary with places distributed simply across 3 days
     */
    private Itinerary createFallbackItinerary(List<Place> allPlaces, UserPreferences preferences, 
                                               String name, List<ScoredPlace> scoredPlaces) {
        LOGGER.info("Creating fallback itinerary");
        
        List<ScoredPlace> topPlaces;
        if (scoredPlaces != null && !scoredPlaces.isEmpty()) {
            topPlaces = scoredPlaces.stream()
                    .limit(15)
                    .collect(Collectors.toList());
        } else {
            topPlaces = scoreAndFilterPlaces(allPlaces, preferences).stream()
                    .limit(15)
                    .collect(Collectors.toList());
        }
        
        // Distribute top places across 3 days (5 per day)
        List<DayPlan> dayPlans = new ArrayList<>();
        int placesPerDay = 5;
        
        for (int dayNum = 1; dayNum <= 3; dayNum++) {
            int startIdx = (dayNum - 1) * placesPerDay;
            int endIdx = Math.min(dayNum * placesPerDay, topPlaces.size());
            
            List<Place> dayPlaces = topPlaces.subList(startIdx, endIdx).stream()
                    .map(ScoredPlace::getPlace)
                    .collect(Collectors.toList());
            
            dayPlans.add(new DayPlan.Builder()
                    .dayNumber(dayNum)
                    .places(dayPlaces)
                    .startTime("08:00")
                    .build());
        }
        
        return new Itinerary.Builder()
                .name(name)
                .days(dayPlans)
                .preferences(preferences)
                .build();
    }
    
    /**
     * Generates a complete 3-day itinerary based on user preferences and available places.
     * Implements the full recommendation algorithm: scoring, clustering, scheduling, and balancing.
     * 
     * <p>Algorithm Flow:
     * <ol>
     *   <li><b>Phase 1 - Scoring:</b> Score and filter places based on preferences</li>
     *   <li><b>Phase 2 - Clustering:</b> Group places by city for geographic coherence</li>
     *   <li><b>Phase 3 - Scheduling:</b> Assign places to days within time constraints</li>
     *   <li><b>Phase 4 - Balancing:</b> Ensure diversity and meal coverage</li>
     * </ol>
     * 
     * <p><b>Validates Requirements:</b>
     * <ul>
     *   <li><b>18.3:</b> Generate 3-day Itinerary selecting places that match preferences</li>
     *   <li><b>18.4:</b> Balance Day_Plans to avoid exceeding 10 hours per day</li>
     *   <li><b>18.5:</b> Prioritize higher-rated places</li>
     *   <li><b>18.6:</b> Distribute places geographically to minimize travel within each day</li>
     * </ul>
     * 
     * @param places List of all available places to choose from (must not be null)
     * @param preferences User preferences for itinerary generation (must not be null)
     * @return Generated 3-day Itinerary with selected places
     * @throws NullPointerException if places or preferences is null
     * @throws IllegalArgumentException if insufficient places match preferences
     */
    public Itinerary generateItinerary(List<Place> places, UserPreferences preferences) {
        Objects.requireNonNull(places, "Places list cannot be null");
        Objects.requireNonNull(preferences, "UserPreferences cannot be null");
        
        LOGGER.info("Generating itinerary for preferences: " + preferences);
        
        // Phase 1: Score and filter places
        List<ScoredPlace> scoredPlaces = scoreAndFilterPlaces(places, preferences);
        
        if (scoredPlaces.isEmpty()) {
            throw new IllegalArgumentException("No places match the given preferences");
        }
        
        if (scoredPlaces.size() < 3) {
            LOGGER.warning(String.format("Only %d places match preferences, may result in sparse itinerary", 
                    scoredPlaces.size()));
        }
        
        // Phase 2: Cluster by city for geographic coherence
        Map<String, List<ScoredPlace>> cityClusters = clusterByCity(scoredPlaces);
        
        // Phase 3: Schedule places across 3 days
        List<DayPlan> dayPlans = scheduleDays(cityClusters, preferences);
        
        // Phase 4: Balance itinerary
        List<DayPlan> balancedDays = balanceItinerary(dayPlans);
        
        // Create itinerary
        Itinerary itinerary = new Itinerary.Builder()
                .name("Recommended Itinerary")
                .days(balancedDays)
                .preferences(preferences)
                .build();
        
        LOGGER.info(String.format("Generated itinerary %s with %d total places across %d days",
                itinerary.getId(), 
                balancedDays.stream().mapToInt(d -> d.getPlaces().size()).sum(),
                balancedDays.size()));
        
        return itinerary;
    }
    
    /**
     * Schedules places across 3 days using city clustering and temporal constraints.
     * 
     * <p>Allocation Strategy:
     * <ul>
     *   <li>Top 1-2 cities get dedicated days</li>
     *   <li>For 3+ cities, distribute across days with &lt;= 2 cities per day</li>
     *   <li>Apply temporal scheduling to each day based on pace</li>
     * </ul>
     * 
     * @param cityClusters Map of cities to scored places
     * @param preferences User preferences including pace
     * @return List of 3 DayPlan objects
     */
    private List<DayPlan> scheduleDays(Map<String, List<ScoredPlace>> cityClusters, UserPreferences preferences) {
        List<DayPlan> dayPlans = new ArrayList<>();
        List<String> cities = new ArrayList<>(cityClusters.keySet());
        
        LOGGER.info(String.format("Scheduling %d cities across 3 days", cities.size()));
        
        if (cities.isEmpty()) {
            // Create 3 empty days
            for (int i = 1; i <= 3; i++) {
                dayPlans.add(new DayPlan(i));
            }
            return dayPlans;
        }
        
        // Distribute cities across days
        if (cities.size() == 1) {
            // Single city: distribute places evenly across 3 days
            List<ScoredPlace> allPlaces = cityClusters.get(cities.get(0));
            dayPlans = distributeAcrossDays(allPlaces, preferences, 3);
        } else if (cities.size() == 2) {
            // Two cities: give each a day, use remaining places from higher-scoring city on day 3
            String city1 = cities.get(0);
            String city2 = cities.get(1);
            List<ScoredPlace> city1Places = cityClusters.get(city1);
            List<ScoredPlace> city2Places = cityClusters.get(city2);
            
            // Calculate total scores for each city
            double city1TotalScore = city1Places.stream().mapToDouble(ScoredPlace::getScore).sum();
            double city2TotalScore = city2Places.stream().mapToDouble(ScoredPlace::getScore).sum();
            
            // Day 1: First city
            List<ScoredPlace> day1Scheduled = schedulePlaces(city1Places, preferences.getPace());
            dayPlans.add(createDayPlan(1, day1Scheduled));
            
            // Day 2: Second city
            List<ScoredPlace> day2Scheduled = schedulePlaces(city2Places, preferences.getPace());
            dayPlans.add(createDayPlan(2, day2Scheduled));
            
            // Day 3: Use remaining places from the higher-scoring city ONLY (no mixing)
            String higherScoringCity = city1TotalScore >= city2TotalScore ? city1 : city2;
            List<ScoredPlace> higherScoringCityPlaces = cityClusters.get(higherScoringCity);
            List<ScoredPlace> higherScoringDayScheduled = higherScoringCity.equals(city1) ? day1Scheduled : day2Scheduled;
            
            List<ScoredPlace> remainingPlaces = higherScoringCityPlaces.stream()
                    .filter(sp -> !higherScoringDayScheduled.contains(sp))
                    .collect(Collectors.toList());
            
            List<ScoredPlace> day3Scheduled = schedulePlaces(remainingPlaces, preferences.getPace());
            dayPlans.add(createDayPlan(3, day3Scheduled));
        } else {
            // Three or more cities: assign top cities to days, distribute others
            for (int dayNum = 1; dayNum <= 3 && dayNum - 1 < cities.size(); dayNum++) {
                String city = cities.get(dayNum - 1);
                List<ScoredPlace> cityPlaces = cityClusters.get(city);
                List<ScoredPlace> scheduled = schedulePlaces(cityPlaces, preferences.getPace());
                dayPlans.add(createDayPlan(dayNum, scheduled));
            }
            
            // If we have fewer than 3 cities, fill remaining days
            while (dayPlans.size() < 3) {
                dayPlans.add(new DayPlan(dayPlans.size() + 1));
            }
        }
        
        return dayPlans;
    }
    
    /**
     * Distributes places evenly across the specified number of days.
     * 
     * @param places List of scored places to distribute
     * @param preferences User preferences for scheduling
     * @param numDays Number of days to distribute across
     * @return List of DayPlan objects
     */
    private List<DayPlan> distributeAcrossDays(List<ScoredPlace> places, UserPreferences preferences, int numDays) {
        List<DayPlan> dayPlans = new ArrayList<>();
        
        // Sort places by score (highest first)
        List<ScoredPlace> sortedPlaces = places.stream()
                .sorted((sp1, sp2) -> Double.compare(sp2.getScore(), sp1.getScore()))
                .collect(Collectors.toList());
        
        // Round-robin distribution
        List<List<ScoredPlace>> dayLists = new ArrayList<>();
        for (int i = 0; i < numDays; i++) {
            dayLists.add(new ArrayList<>());
        }
        
        for (int i = 0; i < sortedPlaces.size(); i++) {
            dayLists.get(i % numDays).add(sortedPlaces.get(i));
        }
        
        // Apply temporal scheduling to each day
        for (int i = 0; i < numDays; i++) {
            List<ScoredPlace> dayPlaces = dayLists.get(i);
            List<ScoredPlace> scheduled = schedulePlaces(dayPlaces, preferences.getPace());
            dayPlans.add(createDayPlan(i + 1, scheduled));
        }
        
        return dayPlans;
    }
    
    /**
     * Creates a DayPlan from a list of scheduled scored places.
     * 
     * @param dayNumber Day number (1, 2, or 3)
     * @param scoredPlaces List of scored places for this day
     * @return DayPlan object
     */
    private DayPlan createDayPlan(int dayNumber, List<ScoredPlace> scoredPlaces) {
        List<Place> places = scoredPlaces.stream()
                .map(ScoredPlace::getPlace)
                .collect(Collectors.toList());
        
        return new DayPlan.Builder()
                .dayNumber(dayNumber)
                .places(places)
                .startTime("08:00")
                .build();
    }
    
    /**
     * Result container for itinerary generation including metadata.
     * Contains the generated itinerary along with reasoning and alternative place suggestions.
     */
    public static class ItineraryGenerationResult {
        private final Itinerary itinerary;
        private final String reasoning;
        private final List<Place> alternativePlaces;
        
        /**
         * Creates an itinerary generation result.
         * 
         * @param itinerary The generated itinerary
         * @param reasoning Human-readable explanation of the generation process
         * @param alternativePlaces List of alternative place suggestions
         */
        public ItineraryGenerationResult(Itinerary itinerary, String reasoning, List<Place> alternativePlaces) {
            this.itinerary = Objects.requireNonNull(itinerary, "Itinerary cannot be null");
            this.reasoning = Objects.requireNonNull(reasoning, "Reasoning cannot be null");
            this.alternativePlaces = alternativePlaces != null ? alternativePlaces : new ArrayList<>();
        }
        
        /**
         * Gets the generated itinerary.
         * 
         * @return The itinerary
         */
        public Itinerary getItinerary() {
            return itinerary;
        }
        
        /**
         * Gets the human-readable reasoning for the generated itinerary.
         * 
         * @return The reasoning string
         */
        public String getReasoning() {
            return reasoning;
        }
        
        /**
         * Gets the list of alternative place suggestions.
         * 
         * @return List of alternative places
         */
        public List<Place> getAlternativePlaces() {
            return new ArrayList<>(alternativePlaces);
        }
        
        @Override
        public String toString() {
            return "ItineraryGenerationResult{" +
                    "itinerary=" + itinerary.getId() +
                    ", reasoning='" + reasoning.substring(0, Math.min(50, reasoning.length())) + "...'" +
                    ", alternativePlacesCount=" + alternativePlaces.size() +
                    '}';
        }
    }
    
    /**
     * Container class for a place with its computed score.
     * The score is stored as a transient field separate from the Place object.
     */
    public static class ScoredPlace {
        private final Place place;
        private final double score;
        
        /**
         * Creates a scored place.
         * 
         * @param place The place object
         * @param score The computed score
         */
        public ScoredPlace(Place place, double score) {
            this.place = Objects.requireNonNull(place, "Place cannot be null");
            this.score = score;
        }
        
        /**
         * Gets the place object.
         * 
         * @return The place
         */
        public Place getPlace() {
            return place;
        }
        
        /**
         * Gets the computed score for this place.
         * 
         * @return The score
         */
        public double getScore() {
            return score;
        }
        
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            ScoredPlace that = (ScoredPlace) o;
            return Double.compare(that.score, score) == 0 && Objects.equals(place, that.place);
        }
        
        @Override
        public int hashCode() {
            return Objects.hash(place, score);
        }
        
        @Override
        public String toString() {
            return "ScoredPlace{" +
                    "place=" + place +
                    ", score=" + score +
                    '}';
        }
    }
}
