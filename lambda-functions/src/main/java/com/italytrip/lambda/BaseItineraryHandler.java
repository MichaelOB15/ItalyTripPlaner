package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Base handler class providing common functionality for all itinerary Lambda handlers.
 * 
 * <p>This class implements requirements 2.3 and 2.4:
 * <ul>
 *   <li>2.3: Extract User_ID from JWT token claims for database operations</li>
 *   <li>2.4: Use User_ID from validated token to scope all database operations</li>
 * </ul>
 * 
 * <p>Key responsibilities:
 * <ul>
 *   <li>Extract User_ID from API Gateway Cognito authorizer context</li>
 *   <li>Build standardized JSON responses with CORS headers</li>
 *   <li>Build error responses with consistent formatting</li>
 *   <li>Provide shared DynamoDB client instance</li>
 *   <li>Provide shared ObjectMapper for JSON serialization</li>
 * </ul>
 * 
 * <p>All Lambda handlers for itinerary CRUD operations should extend this class
 * to ensure consistent authentication, authorization, and response formatting.
 * 
 * @see APIGatewayProxyRequestEvent
 * @see APIGatewayProxyResponseEvent
 */
public abstract class BaseItineraryHandler implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    
    private static final Logger LOGGER = Logger.getLogger(BaseItineraryHandler.class.getName());
    
    protected final DynamoDbClient dynamoDb;
    protected final ObjectMapper objectMapper;
    protected final String tableName;
    
    /**
     * Constructs a BaseItineraryHandler with the specified DynamoDB client and table name.
     * 
     * @param dynamoDb The DynamoDB client instance for database operations
     * @param tableName The DynamoDB table name for itinerary storage
     */
    protected BaseItineraryHandler(DynamoDbClient dynamoDb, String tableName) {
        this.dynamoDb = dynamoDb;
        this.tableName = tableName;
        this.objectMapper = createObjectMapper();
    }
    
    /**
     * Default constructor that creates a DynamoDB client and reads table name from environment.
     * Uses the TABLE_NAME environment variable set by CDK infrastructure.
     */
    protected BaseItineraryHandler() {
        this(
            DynamoDbClient.builder().build(),
            System.getenv("TABLE_NAME")
        );
    }
    
    /**
     * Creates and configures an ObjectMapper for JSON serialization.
     * Registers JavaTimeModule for LocalDateTime support and configures date formatting.
     * 
     * @return Configured ObjectMapper instance
     */
    private ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        mapper.configure(SerializationFeature.INDENT_OUTPUT, false);
        return mapper;
    }
    
    /**
     * Extracts the User_ID (Cognito 'sub' claim) from the API Gateway authorizer context.
     * 
     * <p>This method implements requirement 2.3: Extract User_ID from JWT token claims.
     * The API Gateway Cognito authorizer validates the JWT and passes the claims in the
     * request context. This method safely extracts the 'sub' claim which uniquely
     * identifies the authenticated user.
     * 
     * <p>Implementation details:
     * <ul>
     *   <li>Reads from request.getRequestContext().getAuthorizer().getClaims()</li>
     *   <li>Returns the 'sub' claim value as the User_ID</li>
     *   <li>Throws IllegalArgumentException if claims or 'sub' are missing</li>
     * </ul>
     * 
     * @param input The API Gateway request event containing authorizer context
     * @return The User_ID (Cognito sub claim) of the authenticated user
     * @throws IllegalArgumentException if the authorizer context or 'sub' claim is missing
     */
    protected String extractUserId(APIGatewayProxyRequestEvent input) {
        try {
            Map<String, Object> authorizer = input.getRequestContext().getAuthorizer();
            
            if (authorizer == null) {
                LOGGER.severe("Authorizer context is missing from request");
                throw new IllegalArgumentException("Missing authorizer context");
            }
            
            @SuppressWarnings("unchecked")
            Map<String, Object> claims = (Map<String, Object>) authorizer.get("claims");
            
            if (claims == null) {
                LOGGER.severe("Claims are missing from authorizer context");
                throw new IllegalArgumentException("Missing claims in authorizer context");
            }
            
            String userId = (String) claims.get("sub");
            
            if (userId == null || userId.trim().isEmpty()) {
                LOGGER.severe("User ID (sub claim) is missing or empty");
                throw new IllegalArgumentException("Missing or empty user ID in claims");
            }
            
            LOGGER.fine("Extracted user ID: " + userId);
            return userId;
            
        } catch (ClassCastException e) {
            LOGGER.log(Level.SEVERE, "Invalid authorizer context structure", e);
            throw new IllegalArgumentException("Invalid authorizer context structure", e);
        }
    }
    
    /**
     * Builds a successful API Gateway response with JSON body and CORS headers.
     * 
     * <p>CORS headers allow cross-origin requests from localhost and CloudFront:
     * <ul>
     *   <li>Access-Control-Allow-Origin: * (allows all origins)</li>
     *   <li>Access-Control-Allow-Methods: All HTTP methods</li>
     *   <li>Access-Control-Allow-Headers: Standard headers including Authorization</li>
     *   <li>Access-Control-Allow-Credentials: true (required for Authorization header)</li>
     * </ul>
     * 
     * @param statusCode The HTTP status code (e.g., 200, 201)
     * @param body The JSON response body as a string
     * @return APIGatewayProxyResponseEvent with the specified status code, body, and headers
     */
    protected APIGatewayProxyResponseEvent buildResponse(int statusCode, String body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        headers.put("Access-Control-Allow-Headers", "Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token");
        headers.put("Access-Control-Allow-Credentials", "true");
        
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(statusCode)
                .withHeaders(headers)
                .withBody(body);
    }
    
    /**
     * Builds an error response with standardized error format and CORS headers.
     * 
     * <p>Error responses follow the format:
     * <pre>
     * {
     *   "error": "Error message description"
     * }
     * </pre>
     * 
     * <p>Common status codes:
     * <ul>
     *   <li>400: Bad Request (invalid input, validation errors)</li>
     *   <li>401: Unauthorized (missing or invalid authentication)</li>
     *   <li>403: Forbidden (insufficient permissions)</li>
     *   <li>404: Not Found (resource doesn't exist or unauthorized access)</li>
     *   <li>500: Internal Server Error (unexpected server errors)</li>
     * </ul>
     * 
     * @param statusCode The HTTP error status code
     * @param message The error message to return to the client
     * @return APIGatewayProxyResponseEvent with error response
     */
    protected APIGatewayProxyResponseEvent buildError(int statusCode, String message) {
        try {
            ErrorResponse error = new ErrorResponse(message);
            String body = objectMapper.writeValueAsString(error);
            return buildResponse(statusCode, body);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to serialize error response", e);
            // Fallback to plain JSON if ObjectMapper fails
            String fallbackBody = String.format("{\"error\":\"%s\"}", escapeJson(message));
            return buildResponse(statusCode, fallbackBody);
        }
    }
    
    /**
     * Handles DynamoDB exceptions and returns appropriate error responses.
     * 
     * <p>This method implements requirement 9.7 by using the DynamoDbExceptionMapper
     * to convert DynamoDB-specific exceptions into HTTP error responses with
     * appropriate status codes and user-friendly messages.
     * 
     * <p>Exception mappings:
     * <ul>
     *   <li>ConditionalCheckFailedException → 404 Not Found</li>
     *   <li>ResourceNotFoundException → 404 Not Found</li>
     *   <li>ProvisionedThroughputExceededException → 503 Service Unavailable</li>
     *   <li>Other DynamoDbException → 500 Internal Server Error</li>
     * </ul>
     * 
     * @param exception The DynamoDB exception to handle
     * @param context Contextual description of the operation (e.g., "retrieving itinerary")
     * @return APIGatewayProxyResponseEvent with appropriate status code and error message
     */
    protected APIGatewayProxyResponseEvent handleDynamoDbException(
            software.amazon.awssdk.services.dynamodb.model.DynamoDbException exception, 
            String context) {
        DynamoDbExceptionMapper.ErrorResponse errorResponse = 
            DynamoDbExceptionMapper.mapException(exception, context);
        return buildError(errorResponse.getStatusCode(), errorResponse.getMessage());
    }
    
    /**
     * Escapes special characters in a string for JSON output.
     * Used as a fallback when ObjectMapper serialization fails.
     * 
     * @param str The string to escape
     * @return JSON-safe string
     */
    private String escapeJson(String str) {
        if (str == null) {
            return "";
        }
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
    
    /**
     * Standard error response structure for consistent error formatting.
     */
    protected static class ErrorResponse {
        private final String error;
        
        public ErrorResponse(String error) {
            this.error = error;
        }
        
        public String getError() {
            return error;
        }
    }
}
