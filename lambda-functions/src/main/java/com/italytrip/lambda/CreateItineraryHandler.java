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
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Lambda handler for creating new itineraries for authenticated users.
 * 
 * <p>This handler implements requirements 3.3, 4.1, and 4.2:
 * <ul>
 *   <li>3.3: Store itinerary in DynamoDB with user_id</li>
 *   <li>4.1: POST /itineraries endpoint implementation</li>
 *   <li>4.2: Generate unique itinerary_id and store in DynamoDB</li>
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
 *   <li>Parse and validate request body</li>
 *   <li>Generate unique itinerary_id: itin_{timestamp}_{uuid}</li>
 *   <li>Set created_at and last_modified timestamps</li>
 *   <li>Store in DynamoDB with user_id as partition key</li>
 *   <li>Return 201 Created with itinerary object</li>
 * </ol>
 * 
 * <p>Response format:
 * <pre>
 * {
 *   "itinerary": {
 *     "id": "itin_1234567890_uuid",
 *     "name": "My Trip",
 *     "days": [...],
 *     "preferences": {...},
 *     "created_at": "2024-01-15T10:30:00",
 *     "last_modified": "2024-01-15T10:30:00"
 *   }
 * }
 * </pre>
 */
public class CreateItineraryHandler extends BaseItineraryHandler {
    
    private static final Logger LOGGER = Logger.getLogger(CreateItineraryHandler.class.getName());
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    
    /**
     * Default constructor using environment variables for configuration.
     */
    public CreateItineraryHandler() {
        super();
    }
    
    /**
     * Constructor for testing with custom DynamoDB client and table name.
     * 
     * @param dynamoDb The DynamoDB client instance
     * @param tableName The DynamoDB table name
     */
    public CreateItineraryHandler(DynamoDbClient dynamoDb, String tableName) {
        super(dynamoDb, tableName);
    }
    
    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, com.amazonaws.services.lambda.runtime.Context context) {
        LOGGER.info("CreateItineraryHandler invoked");
        
        try {
            // Extract user_id from Cognito authorizer context (requirement 2.3, 2.4)
            String userId = extractUserId(input);
            LOGGER.info("Processing create itinerary request for user: " + userId);
            
            // Parse request body
            String requestBody = input.getBody();
            if (requestBody == null || requestBody.trim().isEmpty()) {
                LOGGER.warning("Empty request body");
                return buildError(400, "Request body is required");
            }
            
            CreateItineraryRequest request;
            try {
                request = objectMapper.readValue(requestBody, CreateItineraryRequest.class);
            } catch (JsonProcessingException e) {
                LOGGER.log(Level.WARNING, "Failed to parse request body", e);
                return buildError(400, "Invalid JSON in request body: " + e.getMessage());
            }
            
            // Validate and sanitize request (requirement 7.8, 4.2)
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
            
            // Generate unique itinerary_id (requirement 4.2)
            String itineraryId = generateItineraryId();
            LOGGER.info("Generated itinerary ID: " + itineraryId);
            
            // Set timestamps
            LocalDateTime now = LocalDateTime.now();
            String timestamp = now.format(ISO_FORMATTER);
            
            // Create itinerary object with sanitized name
            Itinerary itinerary = new Itinerary.Builder()
                    .id(itineraryId)
                    .name(sanitizedName)
                    .days(request.getDays())
                    .preferences(request.getPreferences())
                    .createdAt(now)
                    .lastModified(now)
                    .build();
            
            // Store in DynamoDB (requirement 3.3, 4.2)
            storeItinerary(userId, itinerary);
            LOGGER.info("Successfully stored itinerary: " + itineraryId);
            
            // Build response
            CreateItineraryResponse response = new CreateItineraryResponse(itinerary);
            String responseBody = objectMapper.writeValueAsString(response);
            
            return buildResponse(201, responseBody);
            
        } catch (IllegalArgumentException e) {
            LOGGER.log(Level.SEVERE, "Authorization error", e);
            return buildError(401, "Unauthorized: " + e.getMessage());
        } catch (DynamoDbException e) {
            // Use centralized exception mapper (requirement 9.7)
            return handleDynamoDbException(e, "creating itinerary");
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error", e);
            return buildError(500, "Internal server error: " + e.getMessage());
        }
    }
    
    /**
     * Generates a unique itinerary ID using format: itin_{timestamp}_{uuid}.
     * 
     * @return Unique itinerary ID
     */
    private String generateItineraryId() {
        long timestamp = Instant.now().getEpochSecond();
        String uuid = UUID.randomUUID().toString().substring(0, 8);
        return String.format("itin_%d_%s", timestamp, uuid);
    }
    
    /**
     * Stores the itinerary in DynamoDB with the user_id as partition key.
     * 
     * @param userId The user's ID (Cognito sub claim)
     * @param itinerary The itinerary to store
     * @throws DynamoDbException if the database operation fails
     */
    private void storeItinerary(String userId, Itinerary itinerary) throws DynamoDbException {
        try {
            // Convert itinerary to JSON string for storage
            String itineraryJson = objectMapper.writeValueAsString(itinerary);
            
            // Convert timestamps to ISO format strings
            String createdAt = itinerary.getCreatedAt().format(ISO_FORMATTER);
            String lastModified = itinerary.getLastModified().format(ISO_FORMATTER);
            
            // Build DynamoDB item
            Map<String, AttributeValue> item = new HashMap<>();
            item.put("user_id", AttributeValue.builder().s(userId).build());
            item.put("itinerary_id", AttributeValue.builder().s(itinerary.getId()).build());
            item.put("name", AttributeValue.builder().s(itinerary.getName()).build());
            item.put("itinerary_data", AttributeValue.builder().s(itineraryJson).build());
            item.put("created_at", AttributeValue.builder().s(createdAt).build());
            item.put("last_modified", AttributeValue.builder().s(lastModified).build());
            
            // Put item in DynamoDB
            PutItemRequest putRequest = PutItemRequest.builder()
                    .tableName(tableName)
                    .item(item)
                    .build();
            
            dynamoDb.putItem(putRequest);
            
            LOGGER.info("Successfully stored itinerary in DynamoDB: " + itinerary.getId());
            
        } catch (JsonProcessingException e) {
            LOGGER.log(Level.SEVERE, "Failed to serialize itinerary to JSON", e);
            throw new RuntimeException("Failed to serialize itinerary", e);
        }
    }
    
    /**
     * Request model for creating an itinerary.
     */
    public static class CreateItineraryRequest {
        private String name;
        private List<DayPlan> days;
        private UserPreferences preferences;
        
        public CreateItineraryRequest() {}
        
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
     * Response model for create itinerary endpoint.
     */
    public static class CreateItineraryResponse {
        private final Itinerary itinerary;
        
        public CreateItineraryResponse(Itinerary itinerary) {
            this.itinerary = itinerary;
        }
        
        public Itinerary getItinerary() {
            return itinerary;
        }
    }
}
