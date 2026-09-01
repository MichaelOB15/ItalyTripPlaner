package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.italytrip.models.Itinerary;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Lambda handler for GET /itineraries/{itinerary_id} endpoint.
 * 
 * <p>This handler implements requirements 4.5, 4.6, and 4.11:
 * <ul>
 *   <li>4.5: Provide GET /itineraries/{itinerary_id} endpoint</li>
 *   <li>4.6: Verify itinerary belongs to authenticated user and return data</li>
 *   <li>4.11: Return 404 if itinerary doesn't exist or doesn't belong to user</li>
 * </ul>
 * 
 * <p>Security implementation:
 * <ul>
 *   <li>Extracts User_ID from Cognito authorizer context (not from request)</li>
 *   <li>Uses composite key query (user_id + itinerary_id) for ownership verification</li>
 *   <li>Returns 404 for both non-existent and unauthorized access (prevents information leakage)</li>
 * </ul>
 * 
 * <p>Request flow:
 * <ol>
 *   <li>Extract User_ID from authorizer context</li>
 *   <li>Extract itinerary_id from path parameters</li>
 *   <li>Query DynamoDB with composite key (user_id, itinerary_id)</li>
 *   <li>Return 404 if not found (ownership verification implicit)</li>
 *   <li>Return 200 with itinerary object if found</li>
 * </ol>
 * 
 * @see BaseItineraryHandler
 * @see Itinerary
 */
public class GetItineraryHandler extends BaseItineraryHandler {
    
    private static final Logger LOGGER = Logger.getLogger(GetItineraryHandler.class.getName());
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    
    /**
     * Default constructor using environment variables.
     */
    public GetItineraryHandler() {
        super();
    }
    
    /**
     * Constructor for testing with custom DynamoDB client and table name.
     * 
     * @param dynamoDb The DynamoDB client instance
     * @param tableName The DynamoDB table name
     */
    public GetItineraryHandler(DynamoDbClient dynamoDb, String tableName) {
        super(dynamoDb, tableName);
    }
    
    /**
     * Handles GET /itineraries/{itinerary_id} requests.
     * 
     * <p>Implements requirements 4.5, 4.6, and 4.11 by:
     * <ul>
     *   <li>Extracting User_ID from Cognito authorizer (requirement 2.3, 2.4)</li>
     *   <li>Extracting itinerary_id from path parameters</li>
     *   <li>Querying DynamoDB with composite key for ownership verification (requirement 4.6)</li>
     *   <li>Returning 404 for non-existent or unauthorized itineraries (requirement 4.11)</li>
     *   <li>Returning 200 OK with itinerary data on success (requirement 4.6)</li>
     * </ul>
     * 
     * @param input The API Gateway request event
     * @param context The Lambda execution context
     * @return API Gateway response with status code and itinerary data or error
     */
    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, Context context) {
        LOGGER.info("GetItineraryHandler invoked");
        
        try {
            // Extract User_ID from Cognito authorizer context (requirement 2.3, 2.4)
            String userId = extractUserId(input);
            LOGGER.info("Processing request for user_id: " + userId);
            
            // Extract itinerary_id from path parameters
            String itineraryId = extractItineraryId(input);
            if (itineraryId == null || itineraryId.trim().isEmpty()) {
                LOGGER.warning("Missing itinerary_id in path parameters");
                return buildError(400, "Missing itinerary_id in path");
            }
            LOGGER.info("Retrieving itinerary_id: " + itineraryId);
            
            // Query DynamoDB with composite key (user_id, itinerary_id)
            // This inherently verifies ownership - if itinerary doesn't belong to user, query returns empty
            Itinerary itinerary = getItineraryFromDynamoDB(userId, itineraryId);
            
            // Requirement 4.11: Return 404 if not found or doesn't belong to user
            if (itinerary == null) {
                LOGGER.info("Itinerary not found or unauthorized: " + itineraryId);
                return buildError(404, "Itinerary not found");
            }
            
            // Requirement 4.6: Return 200 OK with itinerary object
            Map<String, Object> response = new HashMap<>();
            response.put("itinerary", itinerary);
            
            String responseBody = objectMapper.writeValueAsString(response);
            LOGGER.info("Successfully retrieved itinerary: " + itineraryId);
            return buildResponse(200, responseBody);
            
        } catch (IllegalArgumentException e) {
            LOGGER.log(Level.WARNING, "Invalid request", e);
            return buildError(400, e.getMessage());
        } catch (JsonProcessingException e) {
            LOGGER.log(Level.SEVERE, "Failed to serialize response", e);
            return buildError(500, "Internal server error");
        } catch (DynamoDbException e) {
            // Use centralized exception mapper (requirement 9.7)
            return handleDynamoDbException(e, "retrieving itinerary");
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error", e);
            return buildError(500, "Internal server error");
        }
    }
    
    /**
     * Extracts itinerary_id from API Gateway path parameters.
     * 
     * @param input The API Gateway request event
     * @return The itinerary_id string, or null if not present
     */
    private String extractItineraryId(APIGatewayProxyRequestEvent input) {
        Map<String, String> pathParameters = input.getPathParameters();
        if (pathParameters == null) {
            return null;
        }
        return pathParameters.get("itinerary_id");
    }
    
    /**
     * Retrieves an itinerary from DynamoDB using composite key.
     * 
     * <p>This method implements ownership verification by querying with both user_id and itinerary_id.
     * If the itinerary doesn't exist or doesn't belong to the user, the query returns empty.
     * This approach prevents information leakage - the caller cannot distinguish between
     * "doesn't exist" and "belongs to another user".
     * 
     * @param userId The authenticated user's ID (partition key)
     * @param itineraryId The itinerary ID (sort key)
     * @return The Itinerary object if found and belongs to user, null otherwise
     * @throws DynamoDbException if database operation fails
     */
    private Itinerary getItineraryFromDynamoDB(String userId, String itineraryId) {
        // Build composite key for GetItem operation
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("user_id", AttributeValue.builder().s(userId).build());
        key.put("itinerary_id", AttributeValue.builder().s(itineraryId).build());
        
        GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .build();
        
        LOGGER.fine("Querying DynamoDB with user_id=" + userId + ", itinerary_id=" + itineraryId);
        
        GetItemResponse response = dynamoDb.getItem(request);
        
        // If no item found, return null (requirement 4.11)
        if (!response.hasItem() || response.item().isEmpty()) {
            LOGGER.fine("No item found in DynamoDB");
            return null;
        }
        
        // Convert DynamoDB item to Itinerary object
        return convertItemToItinerary(response.item());
    }
    
    /**
     * Converts a DynamoDB item map to an Itinerary object.
     * 
     * <p>This method deserializes the DynamoDB AttributeValue map into a proper
     * Itinerary domain object, handling JSON parsing for complex fields like
     * days and preferences.
     * 
     * @param item The DynamoDB item as a map of AttributeValues
     * @return The deserialized Itinerary object
     * @throws RuntimeException if JSON parsing fails
     */
    private Itinerary convertItemToItinerary(Map<String, AttributeValue> item) {
        try {
            // Check if we have the itinerary_data field (new format)
            if (item.containsKey("itinerary_data")) {
                // Deserialize the complete itinerary from the itinerary_data JSON field
                String itineraryJson = item.get("itinerary_data").s();
                Itinerary itinerary = objectMapper.readValue(itineraryJson, Itinerary.class);
                LOGGER.fine("Successfully converted DynamoDB item to Itinerary from itinerary_data field");
                return itinerary;
            }
            
            // Fall back to legacy format (separate fields) for backward compatibility
            Itinerary itinerary = new Itinerary();
            
            // Set basic fields
            if (item.containsKey("itinerary_id")) {
                itinerary.setId(item.get("itinerary_id").s());
            }
            
            if (item.containsKey("name")) {
                itinerary.setName(item.get("name").s());
            }
            
            // Parse timestamps
            if (item.containsKey("created_at")) {
                String createdAtStr = item.get("created_at").s();
                itinerary.setCreatedAt(LocalDateTime.parse(createdAtStr, ISO_FORMATTER));
            }
            
            if (item.containsKey("last_modified")) {
                String lastModifiedStr = item.get("last_modified").s();
                itinerary.setLastModified(LocalDateTime.parse(lastModifiedStr, ISO_FORMATTER));
            }
            
            // Parse complex JSON fields (days, preferences)
            if (item.containsKey("days")) {
                String daysJson = item.get("days").s();
                List<?> daysList = objectMapper.readValue(daysJson, List.class);
                // Convert to proper DayPlan objects via JSON round-trip
                String daysJsonRoundTrip = objectMapper.writeValueAsString(daysList);
                List<com.italytrip.models.DayPlan> days = objectMapper.readValue(
                    daysJsonRoundTrip, 
                    objectMapper.getTypeFactory().constructCollectionType(List.class, com.italytrip.models.DayPlan.class)
                );
                itinerary.setDays(days);
            }
            
            if (item.containsKey("preferences")) {
                String preferencesJson = item.get("preferences").s();
                com.italytrip.models.UserPreferences preferences = objectMapper.readValue(
                    preferencesJson, 
                    com.italytrip.models.UserPreferences.class
                );
                itinerary.setPreferences(preferences);
            }
            
            LOGGER.fine("Successfully converted DynamoDB item to Itinerary from legacy format");
            return itinerary;
            
        } catch (JsonProcessingException e) {
            LOGGER.log(Level.SEVERE, "Failed to deserialize DynamoDB item", e);
            throw new RuntimeException("Failed to deserialize itinerary data", e);
        }
    }
}
