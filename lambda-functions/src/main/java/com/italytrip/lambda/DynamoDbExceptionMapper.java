package com.italytrip.lambda;

import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;
import software.amazon.awssdk.services.dynamodb.model.RequestLimitExceededException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;

import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Centralized exception mapper for DynamoDB operations.
 * 
 * <p>This class implements requirement 9.7: Return appropriate HTTP error codes with
 * descriptive error messages for DynamoDB operations.
 * 
 * <p>Exception mappings:
 * <ul>
 *   <li>ConditionalCheckFailedException → 404 Not Found</li>
 *   <li>ResourceNotFoundException → 404 Not Found</li>
 *   <li>ProvisionedThroughputExceededException → 503 Service Unavailable</li>
 *   <li>RequestLimitExceededException → 503 Service Unavailable</li>
 *   <li>Other DynamoDbException → 500 Internal Server Error</li>
 * </ul>
 * 
 * <p>All error responses include user-friendly descriptive messages suitable for
 * client display while preserving technical details in server logs.
 */
public class DynamoDbExceptionMapper {
    
    private static final Logger LOGGER = Logger.getLogger(DynamoDbExceptionMapper.class.getName());
    
    /**
     * Maps a DynamoDB exception to an HTTP error response.
     * 
     * <p>This method implements requirement 9.7 by mapping specific DynamoDB exceptions
     * to appropriate HTTP status codes with descriptive, user-friendly messages.
     * 
     * <p>Exception handling logic:
     * <ul>
     *   <li>ConditionalCheckFailedException: Condition expression failed, typically means
     *       the item doesn't exist or doesn't match expected state → 404 Not Found</li>
     *   <li>ResourceNotFoundException: DynamoDB table or resource not found → 404 Not Found</li>
     *   <li>ProvisionedThroughputExceededException: Rate limit exceeded → 503 Service Unavailable</li>
     *   <li>RequestLimitExceededException: Request rate limit exceeded → 503 Service Unavailable</li>
     *   <li>Other DynamoDbException: Unexpected database errors → 500 Internal Server Error</li>
     * </ul>
     * 
     * @param exception The DynamoDB exception to map
     * @param context Additional context for the error message (e.g., "retrieving itinerary")
     * @return ErrorResponse containing HTTP status code and user-friendly message
     */
    public static ErrorResponse mapException(DynamoDbException exception, String context) {
        // Log the full exception details for debugging
        String contextMsg = context != null ? context : "unknown operation";
        LOGGER.log(Level.SEVERE, "DynamoDB error during " + contextMsg, exception);
        
        // Map ConditionalCheckFailedException to 404 (requirement 9.7)
        if (exception instanceof ConditionalCheckFailedException) {
            LOGGER.warning("Conditional check failed: " + contextMsg);
            return new ErrorResponse(
                404,
                "The requested resource was not found or you do not have permission to access it"
            );
        }
        
        // Map ResourceNotFoundException to 404 (requirement 9.7)
        if (exception instanceof ResourceNotFoundException) {
            LOGGER.warning("Resource not found: " + contextMsg);
            return new ErrorResponse(
                404,
                "The requested resource was not found"
            );
        }
        
        // Map ProvisionedThroughputExceededException to 503 (requirement 9.7)
        if (exception instanceof ProvisionedThroughputExceededException) {
            LOGGER.warning("Throughput exceeded: " + contextMsg);
            return new ErrorResponse(
                503,
                "The service is temporarily unavailable due to high demand. Please try again in a moment"
            );
        }
        
        // Map RequestLimitExceededException to 503 (requirement 9.7)
        if (exception instanceof RequestLimitExceededException) {
            LOGGER.warning("Request limit exceeded: " + contextMsg);
            return new ErrorResponse(
                503,
                "The service is temporarily unavailable due to high demand. Please try again in a moment"
            );
        }
        
        // All other DynamoDB exceptions map to 500
        LOGGER.severe("Unexpected DynamoDB error: " + exception.getClass().getName() + " - " + contextMsg);
        return new ErrorResponse(
            500,
            "An unexpected database error occurred. Please try again later"
        );
    }
    
    /**
     * Structured error response containing HTTP status code and message.
     * Used internally by the exception mapper to return both status and message.
     */
    public static class ErrorResponse {
        private final int statusCode;
        private final String message;
        
        /**
         * Constructs an error response with status code and message.
         * 
         * @param statusCode The HTTP status code (404, 503, 500, etc.)
         * @param message The user-friendly error message
         */
        public ErrorResponse(int statusCode, String message) {
            this.statusCode = statusCode;
            this.message = message;
        }
        
        /**
         * Gets the HTTP status code for this error.
         * 
         * @return The HTTP status code
         */
        public int getStatusCode() {
            return statusCode;
        }
        
        /**
         * Gets the user-friendly error message.
         * 
         * @return The error message
         */
        public String getMessage() {
            return message;
        }
    }
}
