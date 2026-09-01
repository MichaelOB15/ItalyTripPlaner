package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.italytrip.lambda.DatasetLoader.DatasetLoaderException;
import com.italytrip.lambda.DatasetLoader.LoadedDataset;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;

import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * AWS Lambda function handler for the GET /places endpoint.
 * Provides querying and filtering capabilities for the places dataset.
 * Supports filtering by cities, types, and tags with pagination.
 */
public class GetPlacesFunction implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    private static final Logger LOGGER = Logger.getLogger(GetPlacesFunction.class.getName());
    
    private static final int DEFAULT_LIMIT = 100;
    private static final int DEFAULT_OFFSET = 0;
    private static final int MAX_LIMIT = 1000;
    
    private final DatasetLoader datasetLoader;
    private final ObjectMapper objectMapper;
    private final String dataBucketName;
    private final String datasetKey;
    
    /**
     * Creates GetPlacesFunction with specified dependencies.
     * 
     * @param datasetLoader The dataset loader instance
     * @param dataBucketName S3 bucket name for datasets
     * @param datasetKey S3 key for the dataset file
     */
    public GetPlacesFunction(DatasetLoader datasetLoader, String dataBucketName, String datasetKey) {
        this.datasetLoader = Objects.requireNonNull(datasetLoader, "DatasetLoader cannot be null");
        this.dataBucketName = Objects.requireNonNull(dataBucketName, "Data bucket name cannot be null");
        this.datasetKey = Objects.requireNonNull(datasetKey, "Dataset key cannot be null");
        this.objectMapper = createObjectMapper();
    }
    
    /**
     * Default constructor using environment variables.
     */
    public GetPlacesFunction() {
        this(
            new DatasetLoader(),
            System.getenv("DATA_BUCKET_NAME"),
            System.getenv("DATASET_KEY")
        );
    }
    
    /**
     * Configures Jackson ObjectMapper for JSON serialization.
     */
    private ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(SerializationFeature.INDENT_OUTPUT, false);
        mapper.configure(SerializationFeature.WRITE_NULL_MAP_VALUES, false);
        return mapper;
    }
    
    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent request, Context context) {
        LOGGER.info("Processing GET /places request");
        
        try {
            // Load dataset (uses cache if available)
            LoadedDataset dataset = datasetLoader.loadDataset(dataBucketName, datasetKey);
            List<Place> allPlaces = dataset.getValidPlaces();
            
            // Parse query parameters
            Map<String, String> queryParams = request.getQueryStringParameters();
            if (queryParams == null) {
                queryParams = Collections.emptyMap();
            }
            
            QueryParameters params = parseQueryParameters(queryParams);
            
            // Apply filters
            List<Place> filteredPlaces = applyFilters(allPlaces, params);
            
            // Apply pagination
            PaginatedResult paginatedResult = applyPagination(filteredPlaces, params.limit, params.offset);
            
            // Build response
            PlacesResponse response = new PlacesResponse(
                paginatedResult.places,
                filteredPlaces.size(),
                paginatedResult.hasMore
            );
            
            String responseBody = objectMapper.writeValueAsString(response);
            
            LOGGER.info(String.format("Returning %d places (total: %d, hasMore: %b)",
                    paginatedResult.places.size(), filteredPlaces.size(), paginatedResult.hasMore));
            
            return createResponse(200, responseBody);
            
        } catch (DatasetLoaderException e) {
            LOGGER.log(Level.SEVERE, "Failed to load dataset", e);
            return createErrorResponse(500, "Failed to load dataset: " + e.getMessage());
        } catch (InvalidQueryException e) {
            LOGGER.log(Level.WARNING, "Invalid query parameters", e);
            return createErrorResponse(400, e.getMessage());
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error processing request", e);
            return createErrorResponse(500, "Internal server error");
        }
    }
    
    /**
     * Parses and validates query parameters from the request.
     * 
     * @param queryParams Raw query parameter map
     * @return Parsed QueryParameters object
     * @throws InvalidQueryException if parameters are invalid
     */
    private QueryParameters parseQueryParameters(Map<String, String> queryParams) throws InvalidQueryException {
        QueryParameters params = new QueryParameters();
        
        // Parse cities (comma-separated)
        if (queryParams.containsKey("cities")) {
            String citiesParam = queryParams.get("cities");
            if (citiesParam != null && !citiesParam.trim().isEmpty()) {
                params.cities = Arrays.stream(citiesParam.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }
        }
        
        // Parse types (comma-separated)
        if (queryParams.containsKey("types")) {
            String typesParam = queryParams.get("types");
            if (typesParam != null && !typesParam.trim().isEmpty()) {
                try {
                    params.types = Arrays.stream(typesParam.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .map(PlaceType::fromValue)  // Use fromValue to handle JSON format
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException e) {
                    throw new InvalidQueryException("Invalid place type in 'types' parameter: " + e.getMessage());
                }
            }
        }
        
        // Parse tags (comma-separated)
        if (queryParams.containsKey("tags")) {
            String tagsParam = queryParams.get("tags");
            if (tagsParam != null && !tagsParam.trim().isEmpty()) {
                params.tags = Arrays.stream(tagsParam.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }
        }
        
        // Parse limit
        if (queryParams.containsKey("limit")) {
            try {
                params.limit = Integer.parseInt(queryParams.get("limit"));
                if (params.limit < 1) {
                    throw new InvalidQueryException("Limit must be greater than 0");
                }
                if (params.limit > MAX_LIMIT) {
                    throw new InvalidQueryException("Limit cannot exceed " + MAX_LIMIT);
                }
            } catch (NumberFormatException e) {
                throw new InvalidQueryException("Invalid limit parameter: must be an integer");
            }
        }
        
        // Parse offset
        if (queryParams.containsKey("offset")) {
            try {
                params.offset = Integer.parseInt(queryParams.get("offset"));
                if (params.offset < 0) {
                    throw new InvalidQueryException("Offset must be non-negative");
                }
            } catch (NumberFormatException e) {
                throw new InvalidQueryException("Invalid offset parameter: must be an integer");
            }
        }
        
        return params;
    }
    
    /**
     * Applies filters to the places list based on query parameters.
     * Filters are combined with AND logic across different filter types,
     * and OR logic within the same filter type.
     * 
     * @param places List of all places
     * @param params Query parameters containing filter criteria
     * @return Filtered list of places
     */
    private List<Place> applyFilters(List<Place> places, QueryParameters params) {
        return places.stream()
                .filter(place -> matchesCityFilter(place, params.cities))
                .filter(place -> matchesTypeFilter(place, params.types))
                .filter(place -> matchesTagFilter(place, params.tags))
                .collect(Collectors.toList());
    }
    
    /**
     * Checks if a place matches the city filter.
     * Returns true if no city filter is specified, or if the place's city
     * is in the filter list (OR logic).
     */
    private boolean matchesCityFilter(Place place, List<String> cities) {
        if (cities == null || cities.isEmpty()) {
            return true;
        }
        return cities.stream()
                .anyMatch(city -> city.equalsIgnoreCase(place.getCity()));
    }
    
    /**
     * Checks if a place matches the type filter.
     * Returns true if no type filter is specified, or if the place's type
     * is in the filter list (OR logic).
     */
    private boolean matchesTypeFilter(Place place, List<PlaceType> types) {
        if (types == null || types.isEmpty()) {
            return true;
        }
        return types.contains(place.getType());
    }
    
    /**
     * Checks if a place matches the tag filter.
     * Returns true if no tag filter is specified, or if the place has at least
     * one tag from the filter list (OR logic).
     */
    private boolean matchesTagFilter(Place place, List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return true;
        }
        
        List<String> placeTags = place.getTags();
        if (placeTags == null || placeTags.isEmpty()) {
            return false;
        }
        
        // Check if place has at least one matching tag (case-insensitive)
        return tags.stream()
                .anyMatch(filterTag -> 
                    placeTags.stream()
                            .anyMatch(placeTag -> placeTag.equalsIgnoreCase(filterTag))
                );
    }
    
    /**
     * Applies pagination to the filtered places list.
     * 
     * @param places Filtered places list
     * @param limit Maximum number of places to return
     * @param offset Number of places to skip
     * @return Paginated result with places and hasMore flag
     */
    private PaginatedResult applyPagination(List<Place> places, int limit, int offset) {
        int total = places.size();
        int fromIndex = Math.min(offset, total);
        int toIndex = Math.min(offset + limit, total);
        
        List<Place> paginatedPlaces = places.subList(fromIndex, toIndex);
        boolean hasMore = toIndex < total;
        
        return new PaginatedResult(paginatedPlaces, hasMore);
    }
    
    /**
     * Creates a successful API Gateway response with CORS headers.
     */
    private APIGatewayProxyResponseEvent createResponse(int statusCode, String body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "GET, OPTIONS");
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
     * Container for parsed query parameters.
     */
    private static class QueryParameters {
        List<String> cities = Collections.emptyList();
        List<PlaceType> types = Collections.emptyList();
        List<String> tags = Collections.emptyList();
        int limit = DEFAULT_LIMIT;
        int offset = DEFAULT_OFFSET;
    }
    
    /**
     * Container for paginated results.
     */
    private static class PaginatedResult {
        final List<Place> places;
        final boolean hasMore;
        
        PaginatedResult(List<Place> places, boolean hasMore) {
            this.places = places;
            this.hasMore = hasMore;
        }
    }
    
    /**
     * API response structure for GET /places.
     */
    public static class PlacesResponse {
        private List<Place> places;
        private int total;
        private boolean hasMore;
        
        // Default constructor for Jackson
        public PlacesResponse() {
        }
        
        public PlacesResponse(List<Place> places, int total, boolean hasMore) {
            this.places = places;
            this.total = total;
            this.hasMore = hasMore;
        }
        
        public List<Place> getPlaces() {
            return places;
        }
        
        public void setPlaces(List<Place> places) {
            this.places = places;
        }
        
        public int getTotal() {
            return total;
        }
        
        public void setTotal(int total) {
            this.total = total;
        }
        
        public boolean isHasMore() {
            return hasMore;
        }
        
        public void setHasMore(boolean hasMore) {
            this.hasMore = hasMore;
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
     * Exception for invalid query parameters.
     */
    private static class InvalidQueryException extends Exception {
        InvalidQueryException(String message) {
            super(message);
        }
    }
}
