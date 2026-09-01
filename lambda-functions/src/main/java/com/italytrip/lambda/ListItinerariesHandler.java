package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.italytrip.models.Itinerary;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Lambda handler for listing all itineraries for an authenticated user.
 * 
 * <p>Implements GET /itineraries endpoint functionality.
 * 
 * <p>This handler fulfills requirements:
 * <ul>
 *   <li>3.4: Query DynamoDB filtering by user's User_ID</li>
 *   <li>3.7: Return only itineraries belonging to the authenticated user</li>
 *   <li>4.3: Provide GET /itineraries endpoint that retrieves all user itineraries</li>
 *   <li>4.4: Return itinerary array sorted by last_modified descending</li>
 * </ul>
 * 
 * <p>Processing flow:
 * <ol>
 *   <li>Extract User_ID from Cognito authorizer context</li>
 *   <li>Query DynamoDB with user_id as partition key</li>
 *   <li>Parse all returned items into Itinerary objects</li>
 *   <li>Sort itineraries by last_modified timestamp (most recent first)</li>
 *   <li>Return JSON response with itineraries array</li>
 * </ol>
 * 
 * <p>Response format:
 * <pre>
 * {
 *   "itineraries": [
 *     { ...itinerary1... },
 *     { ...itinerary2... }
 *   ]
 * }
 * </pre>
 * 
 * @see BaseItineraryHandler
 * @see Itinerary
 */
public class ListItinerariesHandler extends BaseItineraryHandler {
    
    private static final Logger LOGGER = Logger.getLogger(ListItinerariesHandler.class.getName());
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    
    /**
     * Default constructor using environment variables for configuration.
     */
    public ListItinerariesHandler() {
        super();
    }
    
    /**
     * Constructor for dependency injection (testing).
     * 
     * @param dynamoDb DynamoDB client instance
     * @param tableName DynamoDB table name
     */
    public ListItinerariesHandler(DynamoDbClient dynamoDb, String tableName) {
        super(dynamoDb, tableName);
    }
    
    /**
     * Handles GET /itineraries requests.
     * 
     * <p>Extracts the authenticated user's ID from the Cognito authorizer context,
     * queries DynamoDB for all itineraries belonging to that user, sorts them by
     * last_modified timestamp in descending order, and returns the result.
     * 
     * @param input API Gateway request event containing authorizer context
     * @return API Gateway response with 200 status and itineraries array, or error response
     */
    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, com.amazonaws.services.lambda.runtime.Context context) {
        LOGGER.info("ListItinerariesHandler invoked");
        
        try {
            // Extract User_ID from authorizer context (requirement 2.3)
            String userId = extractUserId(input);
            LOGGER.info("Retrieved itineraries for user: " + userId);
            
            // Query DynamoDB for all itineraries belonging to this user (requirement 3.4, 3.7)
            List<Itinerary> itineraries = queryUserItineraries(userId);
            
            // Sort by last_modified descending (requirement 4.4)
            sortItinerariesByLastModified(itineraries);
            
            LOGGER.info("Retrieved " + itineraries.size() + " itineraries for user " + userId);
            
            // Build response
            ListItinerariesResponse response = new ListItinerariesResponse(itineraries);
            String responseBody = objectMapper.writeValueAsString(response);
            
            return buildResponse(200, responseBody);
            
        } catch (IllegalArgumentException e) {
            LOGGER.log(Level.WARNING, "Invalid request: " + e.getMessage(), e);
            return buildError(400, e.getMessage());
        } catch (DynamoDbException e) {
            // Use centralized exception mapper (requirement 9.7)
            return handleDynamoDbException(e, "listing itineraries");
        } catch (JsonProcessingException e) {
            LOGGER.log(Level.SEVERE, "Failed to serialize response: " + e.getMessage(), e);
            return buildError(500, "Internal server error");
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error: " + e.getMessage(), e);
            return buildError(500, "Internal server error");
        }
    }
    
    /**
     * Queries DynamoDB for all itineraries belonging to the specified user.
     * 
     * <p>Uses the user_id as partition key to retrieve all items. This naturally
     * enforces data isolation as required by requirement 3.7.
     * 
     * @param userId The user ID (Cognito sub claim) to query for
     * @return List of Itinerary objects (may be empty if no itineraries exist)
     * @throws DynamoDbException if the query fails
     */
    private List<Itinerary> queryUserItineraries(String userId) {
        LOGGER.fine("Querying DynamoDB for user_id: " + userId);
        
        // Build query request with user_id partition key
        Map<String, AttributeValue> expressionValues = new HashMap<>();
        expressionValues.put(":userId", AttributeValue.builder().s(userId).build());
        
        QueryRequest queryRequest = QueryRequest.builder()
                .tableName(tableName)
                .keyConditionExpression("user_id = :userId")
                .expressionAttributeValues(expressionValues)
                .build();
        
        // Execute query
        QueryResponse queryResponse = dynamoDb.query(queryRequest);
        
        // Parse items into Itinerary objects
        List<Itinerary> itineraries = new ArrayList<>();
        for (Map<String, AttributeValue> item : queryResponse.items()) {
            try {
                Itinerary itinerary = parseItineraryFromDynamoDB(item);
                itineraries.add(itinerary);
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "Failed to parse itinerary from DynamoDB item", e);
                // Continue processing other items
            }
        }
        
        return itineraries;
    }
    
    /**
     * Parses a DynamoDB item map into an Itinerary object.
     * 
     * @param item DynamoDB item as attribute value map
     * @return Parsed Itinerary object
     * @throws Exception if parsing fails
     */
    private Itinerary parseItineraryFromDynamoDB(Map<String, AttributeValue> item) throws Exception {
        // Check if we have the itinerary_data field (new format)
        if (item.containsKey("itinerary_data")) {
            // Deserialize the complete itinerary from the itinerary_data JSON field
            String itineraryJson = item.get("itinerary_data").s();
            Itinerary itinerary = objectMapper.readValue(itineraryJson, Itinerary.class);
            LOGGER.fine("Successfully parsed itinerary from itinerary_data field");
            return itinerary;
        }
        
        // Fall back to legacy format (separate fields) for backward compatibility
        // Extract basic fields
        String itineraryId = item.get("itinerary_id").s();
        String name = item.containsKey("name") ? item.get("name").s() : "";
        
        // Parse timestamps
        LocalDateTime createdAt = parseTimestamp(item.get("created_at"));
        LocalDateTime lastModified = parseTimestamp(item.get("last_modified"));
        
        // Parse days and preferences from JSON
        String daysJson = item.containsKey("days") ? item.get("days").s() : "[]";
        String preferencesJson = item.containsKey("preferences") ? item.get("preferences").s() : "{}";
        
        // Create Itinerary object using builder
        Itinerary.Builder builder = new Itinerary.Builder()
                .id(itineraryId)
                .name(name)
                .createdAt(createdAt)
                .lastModified(lastModified);
        
        // Parse days array
        if (!daysJson.equals("[]")) {
            try {
                List<?> daysList = objectMapper.readValue(daysJson, List.class);
                // Convert to DayPlan objects
                builder.days(objectMapper.convertValue(daysList, 
                    objectMapper.getTypeFactory().constructCollectionType(List.class, com.italytrip.models.DayPlan.class)));
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "Failed to parse days JSON: " + daysJson, e);
            }
        }
        
        // Parse preferences
        if (!preferencesJson.equals("{}")) {
            try {
                com.italytrip.models.UserPreferences preferences = 
                    objectMapper.readValue(preferencesJson, com.italytrip.models.UserPreferences.class);
                builder.preferences(preferences);
            } catch (Exception e) {
                LOGGER.log(Level.WARNING, "Failed to parse preferences JSON: " + preferencesJson, e);
            }
        }
        
        LOGGER.fine("Successfully parsed itinerary from legacy format");
        return builder.build();
    }
    
    /**
     * Parses a timestamp from DynamoDB AttributeValue.
     * 
     * @param value AttributeValue containing timestamp string
     * @return Parsed LocalDateTime, or current time if parsing fails
     */
    private LocalDateTime parseTimestamp(AttributeValue value) {
        if (value == null || value.s() == null) {
            return LocalDateTime.now();
        }
        
        try {
            return LocalDateTime.parse(value.s(), FORMATTER);
        } catch (DateTimeParseException e) {
            LOGGER.log(Level.WARNING, "Failed to parse timestamp: " + value.s(), e);
            return LocalDateTime.now();
        }
    }
    
    /**
     * Sorts itineraries by last_modified timestamp in descending order (most recent first).
     * 
     * <p>This fulfills requirement 4.4: sort by last_modified descending.
     * 
     * @param itineraries List of itineraries to sort (modified in place)
     */
    private void sortItinerariesByLastModified(List<Itinerary> itineraries) {
        itineraries.sort(Comparator.comparing(Itinerary::getLastModified, 
            Comparator.nullsLast(Comparator.reverseOrder())));
    }
    
    /**
     * Response wrapper for list itineraries endpoint.
     */
    private static class ListItinerariesResponse {
        private final List<Itinerary> itineraries;
        
        public ListItinerariesResponse(List<Itinerary> itineraries) {
            this.itineraries = itineraries;
        }
        
        public List<Itinerary> getItineraries() {
            return itineraries;
        }
    }
}
