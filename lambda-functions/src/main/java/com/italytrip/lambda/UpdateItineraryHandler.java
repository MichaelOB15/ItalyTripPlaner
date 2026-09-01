package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.italytrip.lambda.validation.InputValidator;
import com.italytrip.models.DayPlan;
import com.italytrip.models.Itinerary;
import com.italytrip.models.UserPreferences;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Lambda handler for updating existing itineraries with ownership verification.
 * 
 * <p>This handler implements requirements 3.5, 4.7, 4.8, and 4.11:
 * <ul>
 *   <li>3.5: Update itinerary in DynamoDB with last_modified timestamp</li>
 *   <li>4.7: PUT /itineraries/{itinerary_id} endpoint implementation</li>
 *   <li>4.8: Update itinerary with valid data and update last_modified</li>
 *   <li>4.11: Return 404 if itinerary doesn't exist or doesn't belong to user</li>
 * </ul>
 * 
 * <p>Request validation:
 * <ul>
 *   <li>Name must be non-empty and max 200 characters</li>
 *   <li>Days array must contain exactly 3 elements</li>
 *   <li>Preferences must be valid (if provided)</li>
 * </ul>
 * 
 * <p>Processing logic:
 * <ol>
 *   <li>Extract user_id from Cognito authorizer context</li>
 *   <li>Extract itinerary_id from path parameters</li>
 *   <li>Parse and validate request body</li>
 *   <li>UpdateItem with condition checking user_id and itinerary_id</li>
 *   <li>Update last_modified timestamp</li>
 *   <li>Return 200 OK with updated itinerary</li>
 *   <li>Return 404 on condition failure (ownership verification)</li>
 * </ol>
 * 
 * <p>Response format:
 * <pre>
 * {
 *   "itinerary": {
 *     "id": "itin_1234567890_uuid",
 *     "name": "Updated Trip",
 *     "days": [...],
 *     "preferences": {...},
 *     "created_at": "2024-01-15T10:30:00",
 *     "last_modified": "2024-01-15T14:45:00"
 *   }
 * }
 * </pre>
 */
public class UpdateItineraryHandler extends BaseItineraryHandler {
    
    private static final Logger LOGGER = Logger.getLogger(UpdateItineraryHandler.class.getName());
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    
    /**
     * Default constructor using environment variables for configuration.
     */
    public UpdateItineraryHandler() {
        super();
    }
    
    /**
     * Constructor for testing with custom DynamoDB client and table name.
     * 
     * @param dynamoDb The DynamoDB client instance
     * @param tableName The DynamoDB table name
     */
    public UpdateItineraryHandler(DynamoDbClient dynamoDb, String tableName) {
        super(dynamoDb, tableName);
    }
    
    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, com.amazonaws.services.lambda.runtime.Context context) {
        LOGGER.info("UpdateItineraryHandler invoked");
        
        try {
            // Extract user_id from Cognito authorizer context (requirement 2.3, 2.4)
            String userId = extractUserId(input);
            LOGGER.info("Processing update itinerary request for user: " + userId);
            
            // Extract itinerary_id from path parameters (requirement 4.7)
            Map<String, String> pathParameters = input.getPathParameters();
            if (pathParameters == null || !pathParameters.containsKey("itinerary_id")) {
                LOGGER.warning("Missing itinerary_id in path parameters");
                return buildError(400, "Missing itinerary_id in path");
            }
            
            String itineraryId = pathParameters.get("itinerary_id");
            LOGGER.info("Updating itinerary: " + itineraryId);
            
            // Parse request body
            String requestBody = input.getBody();
            if (requestBody == null || requestBody.trim().isEmpty()) {
                LOGGER.warning("Empty request body");
                return buildError(400, "Request body is required");
            }
            
            UpdateItineraryRequest request;
            try {
                request = objectMapper.readValue(requestBody, UpdateItineraryRequest.class);
            } catch (JsonProcessingException e) {
                LOGGER.log(Level.WARNING, "Failed to parse request body", e);
                return buildError(400, "Invalid JSON in request body: " + e.getMessage());
            }
            
            // Validate and sanitize request (requirement 7.8, 4.8)
            List<String> validationErrors = InputValidator.validateItineraryRequest(
                    request.getName(),
                    request.getDays(),
                    request.getPreferences()
            );
            
            if (!validationErrors.isEmpty()) {
                LOGGER.warning("Request validation failed: " + String.join("; ", validationErrors));
                String errorMessage = validationErrors.size() == 1 
                        ? validationErrors.get(0)
                        : "Multiple validation errors: " + String.join("; ", validationErrors);
                return buildError(400, errorMessage);
            }
            
            // Sanitize the name (HTML encoding, control character rejection already done in validation)
            InputValidator.ValidationResult<String> sanitizedNameResult = InputValidator.validateName(request.getName());
            String sanitizedName = sanitizedNameResult.getValue();
            
            // Update last_modified timestamp (requirement 3.5, 4.8)
            LocalDateTime now = LocalDateTime.now();
            String lastModified = now.format(ISO_FORMATTER);
            
            // Update itinerary in DynamoDB with ownership verification (requirement 3.5, 4.8, 4.11)
            Itinerary updatedItinerary = updateItinerary(userId, itineraryId, sanitizedName, request.getDays(), request.getPreferences(), now);
            LOGGER.info("Successfully updated itinerary: " + itineraryId);
            
            // Build response
            UpdateItineraryResponse response = new UpdateItineraryResponse(updatedItinerary);
            String responseBody = objectMapper.writeValueAsString(response);
            
            return buildResponse(200, responseBody);
            
        } catch (IllegalArgumentException e) {
            LOGGER.log(Level.SEVERE, "Authorization error", e);
            return buildError(401, "Unauthorized: " + e.getMessage());
        } catch (DynamoDbException e) {
            // Use centralized exception mapper (requirement 9.7)
            return handleDynamoDbException(e, "updating itinerary");
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error", e);
            return buildError(500, "Internal server error: " + e.getMessage());
        }
    }
    
    /**
     * Updates the itinerary in DynamoDB with ownership verification.
     * Uses conditional update to ensure the itinerary belongs to the user.
     * 
     * @param userId The user's ID (Cognito sub claim)
     * @param itineraryId The itinerary ID to update
     * @param sanitizedName The sanitized name (HTML encoded, no control chars)
     * @param days The days array
     * @param preferences The user preferences
     * @param lastModified The new last_modified timestamp
     * @return The updated itinerary object
     * @throws DynamoDbException if the database operation fails
     * @throws ConditionalCheckFailedException if the itinerary doesn't exist or doesn't belong to user
     */
    private Itinerary updateItinerary(String userId, String itineraryId, String sanitizedName, 
            List<DayPlan> days, UserPreferences preferences, LocalDateTime lastModified) 
            throws DynamoDbException {
        try {
            // Build updated itinerary object with sanitized name
            Itinerary updatedItinerary = new Itinerary.Builder()
                    .id(itineraryId)
                    .name(sanitizedName)
                    .days(days)
                    .preferences(preferences)
                    .lastModified(lastModified)
                    .build();
            
            // Convert itinerary to JSON string for storage
            String itineraryJson = objectMapper.writeValueAsString(updatedItinerary);
            String lastModifiedStr = lastModified.format(ISO_FORMATTER);
            
            // Build DynamoDB update request with condition checking user_id and itinerary_id (requirement 4.11)
            Map<String, AttributeValue> key = new HashMap<>();
            key.put("user_id", AttributeValue.builder().s(userId).build());
            key.put("itinerary_id", AttributeValue.builder().s(itineraryId).build());
            
            Map<String, AttributeValue> expressionAttributeValues = new HashMap<>();
            expressionAttributeValues.put(":name", AttributeValue.builder().s(sanitizedName).build());
            expressionAttributeValues.put(":itinerary_data", AttributeValue.builder().s(itineraryJson).build());
            expressionAttributeValues.put(":last_modified", AttributeValue.builder().s(lastModifiedStr).build());
            
            // Update item with condition: item must exist with this user_id and itinerary_id
            UpdateItemRequest updateRequest = UpdateItemRequest.builder()
                    .tableName(tableName)
                    .key(key)
                    .updateExpression("SET #name = :name, itinerary_data = :itinerary_data, last_modified = :last_modified")
                    .conditionExpression("attribute_exists(user_id) AND attribute_exists(itinerary_id)")
                    .expressionAttributeNames(Map.of("#name", "name"))
                    .expressionAttributeValues(expressionAttributeValues)
                    .build();
            
            dynamoDb.updateItem(updateRequest);
            
            LOGGER.info("Successfully updated itinerary in DynamoDB: " + itineraryId);
            
            return updatedItinerary;
            
        } catch (JsonProcessingException e) {
            LOGGER.log(Level.SEVERE, "Failed to serialize itinerary to JSON", e);
            throw new RuntimeException("Failed to serialize itinerary", e);
        }
    }
    
    /**
     * Request model for updating an itinerary.
     * Same structure as CreateItineraryRequest.
     */
    public static class UpdateItineraryRequest {
        private String name;
        private List<DayPlan> days;
        private UserPreferences preferences;
        
        public UpdateItineraryRequest() {}
        
        public String getName() {
            return name;
        }
        
        public void setName(String name) {
            this.name = name;
        }
        
        public List<DayPlan> getDays() {
            return days;
        }
        
        public void setDays(List<DayPlan> days) {
            this.days = days;
        }
        
        public UserPreferences getPreferences() {
            return preferences;
        }
        
        public void setPreferences(UserPreferences preferences) {
            this.preferences = preferences;
        }
    }
    
    /**
     * Response model for update itinerary endpoint.
     */
    public static class UpdateItineraryResponse {
        private final Itinerary itinerary;
        
        public UpdateItineraryResponse(Itinerary itinerary) {
            this.itinerary = itinerary;
        }
        
        public Itinerary getItinerary() {
            return itinerary;
        }
    }
}
