package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.DeleteItemRequest;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Lambda handler for DELETE /itineraries/{itinerary_id} endpoint.
 * 
 * <p>Deletes an existing itinerary with ownership verification to ensure users
 * can only delete their own itineraries.
 * 
 * <p>This handler implements requirements:
 * <ul>
 *   <li>3.6: Delete itinerary from DynamoDB when requested by authenticated user</li>
 *   <li>4.9: Provide DELETE endpoint for itinerary removal</li>
 *   <li>4.10: Verify itinerary belongs to authenticated user before deletion</li>
 *   <li>4.11: Return 404 if itinerary doesn't exist or doesn't belong to user</li>
 * </ul>
 * 
 * <p>Security mechanism:
 * <ul>
 *   <li>Uses conditional delete to enforce ownership</li>
 *   <li>Condition checks both user_id (partition key) and itinerary_id (sort key)</li>
 *   <li>If condition fails, returns 404 (not found) for security - doesn't reveal existence</li>
 * </ul>
 * 
 * <p>Response codes:
 * <ul>
 *   <li>204 No Content: Successfully deleted</li>
 *   <li>400 Bad Request: Missing itinerary_id path parameter</li>
 *   <li>401 Unauthorized: Missing or invalid authentication token (handled by API Gateway)</li>
 *   <li>404 Not Found: Itinerary doesn't exist or doesn't belong to user</li>
 *   <li>500 Internal Server Error: Unexpected server errors</li>
 * </ul>
 * 
 * @see BaseItineraryHandler
 */
public class DeleteItineraryHandler extends BaseItineraryHandler {
    
    private static final Logger LOGGER = Logger.getLogger(DeleteItineraryHandler.class.getName());
    
    /**
     * Constructs a DeleteItineraryHandler with the specified DynamoDB client and table name.
     * 
     * @param dynamoDb The DynamoDB client instance for database operations
     * @param tableName The DynamoDB table name for itinerary storage
     */
    public DeleteItineraryHandler(DynamoDbClient dynamoDb, String tableName) {
        super(dynamoDb, tableName);
    }
    
    /**
     * Default constructor that creates a DynamoDB client and reads table name from environment.
     */
    public DeleteItineraryHandler() {
        super();
    }
    
    /**
     * Handles the DELETE request to remove an itinerary.
     * 
     * <p>Processing steps:
     * <ol>
     *   <li>Extract User_ID from API Gateway Cognito authorizer context</li>
     *   <li>Extract itinerary_id from path parameters</li>
     *   <li>Execute conditional DeleteItem with both user_id and itinerary_id</li>
     *   <li>Return 204 No Content on successful deletion</li>
     *   <li>Return 404 if condition fails (not found or unauthorized)</li>
     * </ol>
     * 
     * @param input The API Gateway request event containing path parameters and authorizer context
     * @param context The Lambda execution context
     * @return APIGatewayProxyResponseEvent with status 204 on success, 404 on not found, or error response
     */
    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, Context context) {
        try {
            LOGGER.info("Processing DELETE itinerary request");
            
            // Extract User_ID from authorizer context (requirement 2.3, 2.4)
            String userId;
            try {
                userId = extractUserId(input);
                LOGGER.fine("Extracted user ID: " + userId);
            } catch (IllegalArgumentException e) {
                LOGGER.log(Level.SEVERE, "Failed to extract user ID", e);
                return buildError(401, "Unauthorized: " + e.getMessage());
            }
            
            // Extract itinerary_id from path parameters
            Map<String, String> pathParameters = input.getPathParameters();
            if (pathParameters == null || !pathParameters.containsKey("itinerary_id")) {
                LOGGER.warning("Missing itinerary_id path parameter");
                return buildError(400, "Missing itinerary_id path parameter");
            }
            
            String itineraryId = pathParameters.get("itinerary_id");
            if (itineraryId == null || itineraryId.trim().isEmpty()) {
                LOGGER.warning("Empty itinerary_id path parameter");
                return buildError(400, "Invalid itinerary_id path parameter");
            }
            
            LOGGER.info("Deleting itinerary: " + itineraryId + " for user: " + userId);
            
            // Delete itinerary with conditional check (requirement 3.6, 4.10, 4.11)
            deleteItinerary(userId, itineraryId);
            
            LOGGER.info("Successfully deleted itinerary: " + itineraryId);
            
            // Return 204 No Content (requirement 4.9)
            return buildResponse(204, "");
            
        } catch (ConditionalCheckFailedException e) {
            // Condition failed - itinerary doesn't exist or doesn't belong to user
            // Return 404 for security (don't reveal existence)
            LOGGER.info("Conditional check failed - itinerary not found or unauthorized: " + e.getMessage());
            return buildError(404, "Itinerary not found");
            
        } catch (DynamoDbException e) {
            // Use centralized exception mapper (requirement 9.7)
            return handleDynamoDbException(e, "deleting itinerary");
            
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error during delete operation", e);
            return buildError(500, "Internal server error");
        }
    }
    
    /**
     * Deletes an itinerary from DynamoDB with ownership verification.
     * 
     * <p>Uses a conditional delete that verifies both the partition key (user_id) and
     * sort key (itinerary_id) match. This ensures:
     * <ul>
     *   <li>The itinerary exists</li>
     *   <li>The itinerary belongs to the authenticated user</li>
     * </ul>
     * 
     * <p>If the condition fails (item doesn't exist or belongs to different user),
     * DynamoDB throws ConditionalCheckFailedException which is caught and returned as 404.
     * 
     * @param userId The authenticated user's ID (from Cognito sub claim)
     * @param itineraryId The itinerary ID to delete
     * @throws ConditionalCheckFailedException If the itinerary doesn't exist or doesn't belong to the user
     * @throws DynamoDbException If DynamoDB operation fails
     */
    private void deleteItinerary(String userId, String itineraryId) {
        // Build key for the item to delete
        Map<String, AttributeValue> key = new HashMap<>();
        key.put("user_id", AttributeValue.builder().s(userId).build());
        key.put("itinerary_id", AttributeValue.builder().s(itineraryId).build());
        
        // Build condition expression to verify ownership
        // This ensures the item exists AND belongs to the user
        String conditionExpression = "attribute_exists(user_id) AND attribute_exists(itinerary_id)";
        
        // Create delete request with condition
        DeleteItemRequest deleteRequest = DeleteItemRequest.builder()
                .tableName(tableName)
                .key(key)
                .conditionExpression(conditionExpression)
                .build();
        
        // Execute delete
        dynamoDb.deleteItem(deleteRequest);
        
        LOGGER.fine("DynamoDB delete completed for itinerary: " + itineraryId);
    }
}
