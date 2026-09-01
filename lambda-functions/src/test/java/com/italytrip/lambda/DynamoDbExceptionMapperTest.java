package com.italytrip.lambda;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;
import software.amazon.awssdk.services.dynamodb.model.InternalServerErrorException;
import software.amazon.awssdk.services.dynamodb.model.RequestLimitExceededException;
import software.amazon.awssdk.services.dynamodb.model.ItemCollectionSizeLimitExceededException;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for DynamoDbExceptionMapper.
 * 
 * <p>Verifies requirement 9.7: Exception mapping returns appropriate HTTP error codes
 * with descriptive error messages for DynamoDB operations.
 * 
 * <p>Tests cover:
 * <ul>
 *   <li>ConditionalCheckFailedException → 404 Not Found</li>
 *   <li>ResourceNotFoundException → 404 Not Found</li>
 *   <li>ProvisionedThroughputExceededException → 503 Service Unavailable</li>
 *   <li>RequestLimitExceededException → 503 Service Unavailable</li>
 *   <li>Other DynamoDbException types → 500 Internal Server Error</li>
 *   <li>User-friendly error messages (no technical details exposed)</li>
 *   <li>Context parameter usage (logging only, not in message)</li>
 * </ul>
 */
class DynamoDbExceptionMapperTest {
    
    @Test
    @DisplayName("ConditionalCheckFailedException maps to 404 Not Found")
    void testMapConditionalCheckFailedException() {
        // Given
        ConditionalCheckFailedException exception = ConditionalCheckFailedException.builder()
                .message("The conditional request failed")
                .build();
        
        // When
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, "updating itinerary");
        
        // Then
        assertEquals(404, response.getStatusCode(), 
            "ConditionalCheckFailedException should map to 404");
        assertTrue(response.getMessage().contains("not found") || response.getMessage().contains("permission"),
            "Error message should mention 'not found' or 'permission'");
    }
    
    @Test
    @DisplayName("ResourceNotFoundException maps to 404 Not Found")
    void testMapResourceNotFoundException() {
        // Given
        ResourceNotFoundException exception = ResourceNotFoundException.builder()
                .message("Requested resource not found")
                .build();
        
        // When
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, "retrieving itinerary");
        
        // Then
        assertEquals(404, response.getStatusCode(), 
            "ResourceNotFoundException should map to 404");
        assertTrue(response.getMessage().contains("not found"),
            "Error message should mention 'not found'");
    }
    
    @Test
    @DisplayName("ProvisionedThroughputExceededException maps to 503 Service Unavailable")
    void testMapProvisionedThroughputExceededException() {
        // Given
        ProvisionedThroughputExceededException exception = 
            ProvisionedThroughputExceededException.builder()
                .message("Rate limit exceeded")
                .build();
        
        // When
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, "creating itinerary");
        
        // Then
        assertEquals(503, response.getStatusCode(), 
            "ProvisionedThroughputExceededException should map to 503");
        assertTrue(response.getMessage().contains("unavailable") || 
                   response.getMessage().contains("try again"),
            "Error message should mention service unavailable or retry");
    }
    
    @Test
    @DisplayName("RequestLimitExceededException maps to 503 Service Unavailable")
    void testMapRequestLimitExceededException() {
        // Given
        RequestLimitExceededException exception = 
            RequestLimitExceededException.builder()
                .message("Request rate limit exceeded")
                .build();
        
        // When
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, "listing itineraries");
        
        // Then
        assertEquals(503, response.getStatusCode(), 
            "RequestLimitExceededException should map to 503");
        assertTrue(response.getMessage().contains("unavailable") || 
                   response.getMessage().contains("try again"),
            "Error message should indicate temporary unavailability");
    }
    
    @Test
    @DisplayName("InternalServerErrorException maps to 500 Internal Server Error")
    void testMapInternalServerErrorException() {
        // Given
        InternalServerErrorException exception = 
            InternalServerErrorException.builder()
                .message("Internal error occurred in DynamoDB")
                .build();
        
        // When
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, "querying items");
        
        // Then
        assertEquals(500, response.getStatusCode(), 
            "InternalServerErrorException should map to 500");
        assertTrue(response.getMessage().contains("database") || 
                   response.getMessage().contains("error"),
            "Error message should indicate database error");
    }
    
    @Test
    @DisplayName("ItemCollectionSizeLimitExceededException maps to 500 Internal Server Error")
    void testMapItemCollectionSizeLimitExceededException() {
        // Given
        ItemCollectionSizeLimitExceededException exception = 
            ItemCollectionSizeLimitExceededException.builder()
                .message("Item collection size limit exceeded")
                .build();
        
        // When
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, "creating itinerary");
        
        // Then
        assertEquals(500, response.getStatusCode(), 
            "ItemCollectionSizeLimitExceededException should map to 500");
        assertTrue(response.getMessage().contains("database") || 
                   response.getMessage().contains("error"),
            "Error message should indicate database error");
    }
    
    @Test
    @DisplayName("Generic DynamoDbException maps to 500 Internal Server Error")
    void testMapGenericDynamoDbException() {
        // Given
        DynamoDbException exception = (DynamoDbException) DynamoDbException.builder()
                .message("Unknown DynamoDB error")
                .build();
        
        // When
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, "querying itineraries");
        
        // Then
        assertEquals(500, response.getStatusCode(), 
            "Generic DynamoDbException should map to 500");
        assertTrue(response.getMessage().contains("database") || 
                   response.getMessage().contains("error"),
            "Error message should mention database or error");
    }
    
    @Test
    @DisplayName("Error messages are user-friendly and hide technical details")
    void testErrorResponseHasUserFriendlyMessages() {
        // Test that all exception types produce user-friendly (not technical) messages
        
        ConditionalCheckFailedException conditionalException = 
            ConditionalCheckFailedException.builder().build();
        DynamoDbExceptionMapper.ErrorResponse response1 = 
            DynamoDbExceptionMapper.mapException(conditionalException, "test");
        assertFalse(response1.getMessage().contains("DynamoDB"),
            "Error messages should not expose DynamoDB implementation details");
        assertFalse(response1.getMessage().contains("ConditionalCheck"),
            "Error messages should not expose technical exception names");
        
        ProvisionedThroughputExceededException throughputException = 
            ProvisionedThroughputExceededException.builder().build();
        DynamoDbExceptionMapper.ErrorResponse response2 = 
            DynamoDbExceptionMapper.mapException(throughputException, "test");
        assertFalse(response2.getMessage().contains("DynamoDB"),
            "Error messages should not expose DynamoDB implementation details");
        assertFalse(response2.getMessage().contains("ProvisionedThroughput"),
            "Error messages should not expose technical exception names");
    }
    
    @Test
    @DisplayName("Context parameter is for logging only, not included in user-facing message")
    void testContextParameterNotInMessage() {
        // The context parameter is for logging, not for the user-facing message
        ConditionalCheckFailedException exception = ConditionalCheckFailedException.builder().build();
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, "internal operation XYZ");
        
        assertFalse(response.getMessage().contains("internal operation XYZ"),
            "Context should be used for logging, not included in user-facing message");
    }
    
    @ParameterizedTest
    @MethodSource("provideExceptionScenarios")
    @DisplayName("All DynamoDB exceptions produce non-null, non-empty error messages")
    void testAllExceptionsProduceValidMessages(DynamoDbException exception, String context) {
        // When
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, context);
        
        // Then
        assertNotNull(response, "ErrorResponse should not be null");
        assertNotNull(response.getMessage(), "Error message should not be null");
        assertFalse(response.getMessage().trim().isEmpty(), 
            "Error message should not be empty");
        assertTrue(response.getStatusCode() >= 400 && response.getStatusCode() < 600,
            "Status code should be a valid HTTP error code (4xx or 5xx)");
    }
    
    @Test
    @DisplayName("Multiple exceptions with different contexts produce consistent status codes")
    void testConsistentStatusCodesAcrossContexts() {
        // ConditionalCheckFailedException always maps to 404 regardless of context
        ConditionalCheckFailedException exception = ConditionalCheckFailedException.builder().build();
        
        DynamoDbExceptionMapper.ErrorResponse response1 = 
            DynamoDbExceptionMapper.mapException(exception, "creating");
        DynamoDbExceptionMapper.ErrorResponse response2 = 
            DynamoDbExceptionMapper.mapException(exception, "updating");
        DynamoDbExceptionMapper.ErrorResponse response3 = 
            DynamoDbExceptionMapper.mapException(exception, "deleting");
        
        assertEquals(404, response1.getStatusCode());
        assertEquals(404, response2.getStatusCode());
        assertEquals(404, response3.getStatusCode());
        assertEquals(response1.getStatusCode(), response2.getStatusCode(),
            "Same exception type should produce same status code regardless of context");
        assertEquals(response2.getStatusCode(), response3.getStatusCode(),
            "Same exception type should produce same status code regardless of context");
    }
    
    @Test
    @DisplayName("Error messages contain actionable information for users")
    void testErrorMessagesContainActionableInfo() {
        // 404 errors should indicate resource not found or lack of permission
        ConditionalCheckFailedException notFoundException = 
            ConditionalCheckFailedException.builder().build();
        DynamoDbExceptionMapper.ErrorResponse notFoundResponse = 
            DynamoDbExceptionMapper.mapException(notFoundException, "test");
        assertTrue(
            notFoundResponse.getMessage().toLowerCase().contains("not found") ||
            notFoundResponse.getMessage().toLowerCase().contains("permission"),
            "404 errors should inform user about missing resource or permission issue"
        );
        
        // 503 errors should indicate temporary nature and suggest retry
        ProvisionedThroughputExceededException throttleException = 
            ProvisionedThroughputExceededException.builder().build();
        DynamoDbExceptionMapper.ErrorResponse throttleResponse = 
            DynamoDbExceptionMapper.mapException(throttleException, "test");
        assertTrue(
            throttleResponse.getMessage().toLowerCase().contains("unavailable") ||
            throttleResponse.getMessage().toLowerCase().contains("try again") ||
            throttleResponse.getMessage().toLowerCase().contains("moment"),
            "503 errors should indicate temporary nature and suggest retry"
        );
    }
    
    @Test
    @DisplayName("Null context parameter is handled gracefully")
    void testNullContextHandling() {
        // Given
        ConditionalCheckFailedException exception = ConditionalCheckFailedException.builder().build();
        
        // When - passing null context should not throw exception
        DynamoDbExceptionMapper.ErrorResponse response = 
            DynamoDbExceptionMapper.mapException(exception, null);
        
        // Then
        assertNotNull(response, "Should handle null context gracefully");
        assertEquals(404, response.getStatusCode());
        assertNotNull(response.getMessage());
    }
    
    /**
     * Provides test data for parameterized exception testing.
     * Each argument is a tuple of (DynamoDbException, context string).
     */
    private static Stream<Arguments> provideExceptionScenarios() {
        return Stream.of(
            Arguments.of(
                ConditionalCheckFailedException.builder().message("test").build(),
                "updating itinerary"
            ),
            Arguments.of(
                ResourceNotFoundException.builder().message("test").build(),
                "retrieving itinerary"
            ),
            Arguments.of(
                ProvisionedThroughputExceededException.builder().message("test").build(),
                "creating itinerary"
            ),
            Arguments.of(
                RequestLimitExceededException.builder().message("test").build(),
                "listing itineraries"
            ),
            Arguments.of(
                InternalServerErrorException.builder().message("test").build(),
                "deleting itinerary"
            ),
            Arguments.of(
                (DynamoDbException) DynamoDbException.builder().message("test").build(),
                "generic operation"
            )
        );
    }
}
