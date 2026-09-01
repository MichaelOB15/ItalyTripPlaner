package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.italytrip.lambda.DatasetLoader.DatasetLoaderException;
import com.italytrip.lambda.DatasetLoader.LoadedDataset;
import com.italytrip.models.Itinerary;
import com.italytrip.models.Place;
import com.italytrip.models.UserPreferences;

import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * AWS Lambda function handler for the POST /recommendations endpoint.
 * Generates personalized 3-day itineraries based on user preferences.
 * 
 * <p>This function implements requirements 18.1-18.7:
 * <ul>
 *   <li>18.1: Provide "Generate Recommendation" action</li>
 *   <li>18.2: Prompt for preferences (cities, interests, pace)</li>
 *   <li>18.3: Generate 3-day itinerary matching preferences</li>
 *   <li>18.7: Display recommended itinerary</li>
 * </ul>
 * 
 * <p>API Contract:
 * <ul>
 *   <li>Method: POST</li>
 *   <li>Request Body: JSON with UserPreferences</li>
 *   <li>Response: JSON with Itinerary, reasoning, and alternative places</li>
 *   <li>Status Codes: 200 (success), 400 (invalid preferences), 500 (server error)</li>
 * </ul>
 * 
 * @see UserPreferences
 * @see Itinerary
 * @see RecommendationEngine
 */
public class GetRecommendationsFunction implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    private static final Logger LOGGER = Logger.getLogger(GetRecommendationsFunction.class.getName());
    
    private final DatasetLoader datasetLoader;
    private final RecommendationEngine recommendationEngine;
    private final ObjectMapper objectMapper;
    private final String dataBucketName;
    private final String datasetKey;
    
    /**
     * Creates GetRecommendationsFunction with specified dependencies.
     * 
     * @param datasetLoader The dataset loader instance
     * @param recommendationEngine The recommendation engine instance
     * @param dataBucketName S3 bucket name for datasets
     * @param datasetKey S3 key for the dataset file
     */
    public GetRecommendationsFunction(DatasetLoader datasetLoader, 
                                     RecommendationEngine recommendationEngine,
                                     String dataBucketName, 
                                     String datasetKey) {
        this.datasetLoader = Objects.requireNonNull(datasetLoader, "DatasetLoader cannot be null");
        this.recommendationEngine = Objects.requireNonNull(recommendationEngine, "RecommendationEngine cannot be null");
        this.dataBucketName = Objects.requireNonNull(dataBucketName, "Data bucket name cannot be null");
        this.datasetKey = Objects.requireNonNull(datasetKey, "Dataset key cannot be null");
        this.objectMapper = createObjectMapper();
    }
    
    /**
     * Default constructor using environment variables.
     */
    public GetRecommendationsFunction() {
        this(
            new DatasetLoader(),
            new RecommendationEngine(),
            System.getenv("DATA_BUCKET_NAME"),
            System.getenv("DATASET_KEY")
        );
    }
    
    /**
     * Configures Jackson ObjectMapper for JSON serialization.
     * Includes JavaTimeModule for LocalDateTime support.
     */
    private ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        mapper.configure(SerializationFeature.INDENT_OUTPUT, false);
        return mapper;
    }
    
    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent request, Context context) {
        LOGGER.info("Processing POST /recommendations request");
        
        try {
            // Parse request body
            String requestBody = request.getBody();
            if (requestBody == null || requestBody.trim().isEmpty()) {
                return createErrorResponse(400, "Request body is required");
            }
            
            RecommendationsRequest recommendationsRequest = parseRequestBody(requestBody);
            UserPreferences preferences = recommendationsRequest.getPreferences();
            
            // Validate preferences
            validatePreferences(preferences);
            
            // Load dataset
            LoadedDataset dataset = datasetLoader.loadDataset(dataBucketName, datasetKey);
            List<Place> allPlaces = dataset.getValidPlaces();
            
            if (allPlaces.isEmpty()) {
                return createErrorResponse(500, "No valid places available in dataset");
            }
            
            LOGGER.info(String.format("Generating itinerary from %d places with preferences: %s",
                    allPlaces.size(), preferences));
            
            // Generate itinerary
            Itinerary itinerary = recommendationEngine.generateItinerary(allPlaces, preferences);
            
            // Generate reasoning
            String reasoning = generateReasoning(itinerary, preferences);
            
            // Get alternative places (top-scored places not included in itinerary)
            List<Place> alternativePlaces = getAlternativePlaces(allPlaces, preferences, itinerary);
            
            // Build response
            RecommendationsResponse response = new RecommendationsResponse(
                    itinerary,
                    reasoning,
                    alternativePlaces
            );
            
            String responseBody = objectMapper.writeValueAsString(response);
            
            LOGGER.info(String.format("Successfully generated itinerary %s with %d places",
                    itinerary.getId(), 
                    itinerary.getDays().stream().mapToInt(d -> d.getPlaces().size()).sum()));
            
            return createResponse(200, responseBody);
            
        } catch (InvalidPreferencesException e) {
            LOGGER.log(Level.WARNING, "Invalid preferences", e);
            return createErrorResponse(400, e.getMessage());
        } catch (IllegalArgumentException e) {
            LOGGER.log(Level.WARNING, "Insufficient matching places", e);
            return createErrorResponse(400, "Insufficient places match your preferences. Try relaxing your criteria.");
        } catch (DatasetLoaderException e) {
            LOGGER.log(Level.SEVERE, "Failed to load dataset", e);
            return createErrorResponse(500, "Failed to load dataset: " + e.getMessage());
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error processing request", e);
            return createErrorResponse(500, "Internal server error");
        }
    }
    
    /**
     * Parses the JSON request body into a RecommendationsRequest object.
     * 
     * @param requestBody JSON string containing request
     * @return Parsed RecommendationsRequest
     * @throws InvalidPreferencesException if JSON is malformed
     */
    private RecommendationsRequest parseRequestBody(String requestBody) throws InvalidPreferencesException {
        try {
            return objectMapper.readValue(requestBody, RecommendationsRequest.class);
        } catch (Exception e) {
            throw new InvalidPreferencesException("Invalid JSON in request body: " + e.getMessage());
        }
    }
    
    /**
     * Validates user preferences for completeness and validity.
     * 
     * @param preferences User preferences to validate
     * @throws InvalidPreferencesException if preferences are invalid
     */
    private void validatePreferences(UserPreferences preferences) throws InvalidPreferencesException {
        if (preferences == null) {
            throw new InvalidPreferencesException("Preferences are required");
        }
        
        // Validate cities
        if (preferences.getCities() == null || preferences.getCities().isEmpty()) {
            throw new InvalidPreferencesException("At least one city must be specified");
        }
        
        if (preferences.getCities().size() > 3) {
            throw new InvalidPreferencesException("Maximum 3 cities allowed");
        }
        
        // Validate interests
        if (preferences.getInterests() != null && preferences.getInterests().size() > 5) {
            throw new InvalidPreferencesException("Maximum 5 interests allowed");
        }
        
        // Validate pace
        if (preferences.getPace() == null) {
            throw new InvalidPreferencesException("Trip pace must be specified (relaxed, moderate, or packed)");
        }
        
        // Price range and includeBookingRequired are optional, no validation needed
    }
    
    /**
     * Generates human-readable reasoning for the itinerary recommendations.
     * Explains the algorithm's choices based on preferences.
     * 
     * @param itinerary Generated itinerary
     * @param preferences User preferences used
     * @return Human-readable explanation
     */
    private String generateReasoning(Itinerary itinerary, UserPreferences preferences) {
        StringBuilder reasoning = new StringBuilder();
        
        reasoning.append("This 3-day itinerary was personalized based on your preferences. ");
        
        // Cities
        if (preferences.getCities() != null && !preferences.getCities().isEmpty()) {
            reasoning.append("Focusing on your preferred cities: ")
                    .append(String.join(", ", preferences.getCities()))
                    .append(". ");
        }
        
        // Interests
        if (preferences.getInterests() != null && !preferences.getInterests().isEmpty()) {
            reasoning.append("Selected places match your interests in ")
                    .append(String.join(", ", preferences.getInterests()))
                    .append(". ");
        }
        
        // Pace
        String paceDescription = getPaceDescription(preferences.getPace());
        reasoning.append("The itinerary follows a ")
                .append(paceDescription)
                .append(" pace. ");
        
        // Price range
        if (preferences.getPriceRange() != null && !preferences.getPriceRange().isEmpty()) {
            reasoning.append("Places were selected to match your budget preferences (")
                    .append(String.join(", ", preferences.getPriceRange()))
                    .append("). ");
        }
        
        // Summary stats
        int totalPlaces = itinerary.getDays().stream()
                .mapToInt(d -> d.getPlaces().size())
                .sum();
        
        reasoning.append(String.format("The itinerary includes %d carefully selected places across 3 days, ", totalPlaces))
                .append("balanced for geographic coherence and activity diversity.");
        
        return reasoning.toString();
    }
    
    /**
     * Gets human-readable description for trip pace.
     */
    private String getPaceDescription(UserPreferences.TripPace pace) {
        switch (pace) {
            case RELAXED:
                return "relaxed (6 hours/day)";
            case MODERATE:
                return "moderate (8 hours/day)";
            case PACKED:
                return "packed (10 hours/day)";
            default:
                return "moderate";
        }
    }
    
    /**
     * Gets alternative place suggestions - high-scoring places not included in the itinerary.
     * Returns up to 10 alternative places sorted by score.
     * 
     * @param allPlaces All available places
     * @param preferences User preferences
     * @param itinerary Generated itinerary
     * @return List of alternative places
     */
    private List<Place> getAlternativePlaces(List<Place> allPlaces, UserPreferences preferences, Itinerary itinerary) {
        // Get place IDs in the itinerary
        Set<String> includedPlaceIds = itinerary.getDays().stream()
                .flatMap(day -> day.getPlaces().stream())
                .map(Place::getId)
                .collect(Collectors.toSet());
        
        // Score all places and filter out those in the itinerary
        List<RecommendationEngine.ScoredPlace> scoredPlaces = recommendationEngine
                .scoreAndFilterPlaces(allPlaces, preferences);
        
        List<Place> alternatives = scoredPlaces.stream()
                .filter(sp -> !includedPlaceIds.contains(sp.getPlace().getId()))
                .map(RecommendationEngine.ScoredPlace::getPlace)
                .limit(10)
                .collect(Collectors.toList());
        
        LOGGER.info(String.format("Found %d alternative places", alternatives.size()));
        
        return alternatives;
    }
    
    /**
     * Creates a successful API Gateway response with CORS headers.
     */
    private APIGatewayProxyResponseEvent createResponse(int statusCode, String body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "POST, OPTIONS");
        headers.put("Access-Control-Allow-Headers", "Content-Type, X-Amz-Date, Authorization, X-Api-Key");
        
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(statusCode)
                .withHeaders(headers)
                .withBody(body);
    }
    
    /**
     * Creates an error response with proper formatting and CORS headers.
     */
    private APIGatewayProxyResponseEvent createErrorResponse(int statusCode, String message) {
        try {
            ErrorResponse error = new ErrorResponse(message);
            String body = objectMapper.writeValueAsString(error);
            return createResponse(statusCode, body);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to serialize error response", e);
            return createResponse(statusCode, "{\"error\":\"" + message + "\"}");
        }
    }
    
    /**
     * Request structure for POST /recommendations.
     */
    public static class RecommendationsRequest {
        private UserPreferences preferences;
        private Itinerary existingItinerary; // For future replan functionality
        
        // Default constructor for Jackson
        public RecommendationsRequest() {
        }
        
        public RecommendationsRequest(UserPreferences preferences) {
            this.preferences = preferences;
        }
        
        public UserPreferences getPreferences() {
            return preferences;
        }
        
        public void setPreferences(UserPreferences preferences) {
            this.preferences = preferences;
        }
        
        public Itinerary getExistingItinerary() {
            return existingItinerary;
        }
        
        public void setExistingItinerary(Itinerary existingItinerary) {
            this.existingItinerary = existingItinerary;
        }
    }
    
    /**
     * Response structure for POST /recommendations.
     */
    public static class RecommendationsResponse {
        private Itinerary itinerary;
        private String reasoning;
        private List<Place> alternativePlaces;
        
        // Default constructor for Jackson
        public RecommendationsResponse() {
        }
        
        public RecommendationsResponse(Itinerary itinerary, String reasoning, List<Place> alternativePlaces) {
            this.itinerary = itinerary;
            this.reasoning = reasoning;
            this.alternativePlaces = alternativePlaces;
        }
        
        public Itinerary getItinerary() {
            return itinerary;
        }
        
        public void setItinerary(Itinerary itinerary) {
            this.itinerary = itinerary;
        }
        
        public String getReasoning() {
            return reasoning;
        }
        
        public void setReasoning(String reasoning) {
            this.reasoning = reasoning;
        }
        
        public List<Place> getAlternativePlaces() {
            return alternativePlaces;
        }
        
        public void setAlternativePlaces(List<Place> alternativePlaces) {
            this.alternativePlaces = alternativePlaces;
        }
    }
    
    /**
     * Error response structure.
     */
    private static class ErrorResponse {
        private final String error;
        
        ErrorResponse(String error) {
            this.error = error;
        }
        
        public String getError() {
            return error;
        }
    }
    
    /**
     * Exception for invalid user preferences.
     */
    private static class InvalidPreferencesException extends Exception {
        InvalidPreferencesException(String message) {
            super(message);
        }
    }
}
