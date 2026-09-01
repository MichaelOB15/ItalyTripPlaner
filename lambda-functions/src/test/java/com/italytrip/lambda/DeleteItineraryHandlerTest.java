package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DeleteItineraryHandler.
 * 
 * <p>Tests requirements:
 * <ul>
 *   <li>3.6: Delete itinerary from DynamoDB</li>
 *   <li>4.9: DELETE endpoint functionality</li>
 *   <li>4.10: Ownership verification before deletion</li>
 *   <li>4.11: Return 404 for non-existent or unauthorized itineraries</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
class DeleteItineraryHandlerTest {
    
    @Mock
    private DynamoDbClient mockDynamoDb;
    
    @Mock
    private Context mockContext;
    
    private DeleteItineraryHandler handler;
    private ObjectMapper objectMapper;
    
    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "test-user-123";
    private static final String TEST_ITINERARY_ID = "itin_1234567890_abc";
    
    @BeforeEach
    void setUp() {
        handler = new DeleteItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        objectMapper = new ObjectMapper();
    }
    
    @Test
    @DisplayName("Should successfully delete itinerary with valid user and itinerary ID")
    void handleRequest_WithValidRequest_ReturnsNoContent() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        
        // Mock successful delete
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenReturn(DeleteItemResponse.builder().build());
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(204);
        assertThat(response.getBody()).isEqualTo("");
        assertThat(response.getHeaders()).containsEntry("Access-Control-Allow-Origin", "*");
        
        // Verify DynamoDB delete was called
        verify(mockDynamoDb, times(1)).deleteItem(any(DeleteItemRequest.class));
    }
    
    @Test
    @DisplayName("Should include correct key attributes in delete request")
    void handleRequest_VerifyDeleteRequestKeys() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        ArgumentCaptor<DeleteItemRequest> captor = ArgumentCaptor.forClass(DeleteItemRequest.class);
        
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenReturn(DeleteItemResponse.builder().build());
        
        // Act
        handler.handleRequest(request, mockContext);
        
        // Assert
        verify(mockDynamoDb).deleteItem(captor.capture());
        DeleteItemRequest deleteRequest = captor.getValue();
        
        assertThat(deleteRequest.tableName()).isEqualTo(TEST_TABLE_NAME);
        assertThat(deleteRequest.key()).containsKey("user_id");
        assertThat(deleteRequest.key()).containsKey("itinerary_id");
        assertThat(deleteRequest.key().get("user_id").s()).isEqualTo(TEST_USER_ID);
        assertThat(deleteRequest.key().get("itinerary_id").s()).isEqualTo(TEST_ITINERARY_ID);
    }
    
    @Test
    @DisplayName("Should include condition expression to verify ownership")
    void handleRequest_VerifyConditionExpression() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        ArgumentCaptor<DeleteItemRequest> captor = ArgumentCaptor.forClass(DeleteItemRequest.class);
        
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenReturn(DeleteItemResponse.builder().build());
        
        // Act
        handler.handleRequest(request, mockContext);
        
        // Assert
        verify(mockDynamoDb).deleteItem(captor.capture());
        DeleteItemRequest deleteRequest = captor.getValue();
        
        assertThat(deleteRequest.conditionExpression()).isNotNull();
        assertThat(deleteRequest.conditionExpression()).contains("attribute_exists");
        assertThat(deleteRequest.conditionExpression()).contains("user_id");
        assertThat(deleteRequest.conditionExpression()).contains("itinerary_id");
    }
    
    @Test
    @DisplayName("Should return 404 when itinerary does not exist")
    void handleRequest_WhenItineraryDoesNotExist_Returns404() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        
        // Mock conditional check failure (itinerary doesn't exist)
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenThrow(ConditionalCheckFailedException.builder()
                        .message("Condition check failed")
                        .build());
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(404);
        
        // Verify error message
        String body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body).contains("not found");
    }
    
    @Test
    @DisplayName("Should return 404 when itinerary belongs to different user")
    void handleRequest_WhenUnauthorizedAccess_Returns404() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        
        // Mock conditional check failure (wrong user)
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenThrow(ConditionalCheckFailedException.builder()
                        .message("Ownership verification failed")
                        .build());
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(404);
        
        // Verify response doesn't reveal whether item exists (security)
        String body = response.getBody();
        assertThat(body).contains("not found");
        assertThat(body).doesNotContain("unauthorized");
    }
    
    @Test
    @DisplayName("Should return 400 when itinerary_id path parameter is missing")
    void handleRequest_WhenItineraryIdMissing_Returns400() {
        // Arrange
        APIGatewayProxyRequestEvent request = createRequestWithUserId(TEST_USER_ID);
        // No path parameters
        request.setPathParameters(null);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        String body = response.getBody();
        assertThat(body).contains("Missing itinerary_id");
        
        // Verify DynamoDB was not called
        verify(mockDynamoDb, never()).deleteItem(any(DeleteItemRequest.class));
    }
    
    @Test
    @DisplayName("Should return 400 when itinerary_id is empty")
    void handleRequest_WhenItineraryIdEmpty_Returns400() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, "  ");
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        String body = response.getBody();
        assertThat(body).contains("Invalid itinerary_id");
        
        // Verify DynamoDB was not called
        verify(mockDynamoDb, never()).deleteItem(any(DeleteItemRequest.class));
    }
    
    @Test
    @DisplayName("Should return 401 when user ID cannot be extracted")
    void handleRequest_WhenUserIdMissing_Returns401() {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        context.setAuthorizer(null); // No authorizer
        request.setRequestContext(context);
        
        Map<String, String> pathParams = new HashMap<>();
        pathParams.put("itinerary_id", TEST_ITINERARY_ID);
        request.setPathParameters(pathParams);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(401);
        String body = response.getBody();
        assertThat(body).contains("Unauthorized");
        
        // Verify DynamoDB was not called
        verify(mockDynamoDb, never()).deleteItem(any(DeleteItemRequest.class));
    }
    
    @Test
    @DisplayName("Should return 500 when DynamoDB throws unexpected exception")
    void handleRequest_WhenDynamoDbError_Returns500() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        
        // Mock DynamoDB error
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenThrow(DynamoDbException.builder()
                        .message("Internal DynamoDB error")
                        .build());
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(500);
        String body = response.getBody();
        assertThat(body).contains("Internal server error");
    }
    
    @Test
    @DisplayName("Should return 500 when unexpected exception occurs")
    void handleRequest_WhenUnexpectedException_Returns500() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        
        // Mock unexpected error
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenThrow(new RuntimeException("Unexpected error"));
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(500);
        String body = response.getBody();
        assertThat(body).contains("Internal server error");
    }
    
    @Test
    @DisplayName("Should handle special characters in itinerary ID")
    void handleRequest_WithSpecialCharactersInItineraryId_ProcessesCorrectly() {
        // Arrange
        String itineraryIdWithSpecialChars = "itin_1234567890_abc-def_xyz";
        APIGatewayProxyRequestEvent request = createValidDeleteRequest(TEST_USER_ID, itineraryIdWithSpecialChars);
        
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenReturn(DeleteItemResponse.builder().build());
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(204);
        
        // Verify correct itinerary ID was used
        ArgumentCaptor<DeleteItemRequest> captor = ArgumentCaptor.forClass(DeleteItemRequest.class);
        verify(mockDynamoDb).deleteItem(captor.capture());
        assertThat(captor.getValue().key().get("itinerary_id").s()).isEqualTo(itineraryIdWithSpecialChars);
    }
    
    @Test
    @DisplayName("Should include CORS headers in all responses")
    void handleRequest_AllResponses_IncludeCorsHeaders() {
        // Test success case
        APIGatewayProxyRequestEvent successRequest = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenReturn(DeleteItemResponse.builder().build());
        
        APIGatewayProxyResponseEvent successResponse = handler.handleRequest(successRequest, mockContext);
        assertThat(successResponse.getHeaders()).containsEntry("Access-Control-Allow-Origin", "*");
        
        // Test error case
        APIGatewayProxyRequestEvent errorRequest = createValidDeleteRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenThrow(ConditionalCheckFailedException.builder().build());
        
        APIGatewayProxyResponseEvent errorResponse = handler.handleRequest(errorRequest, mockContext);
        assertThat(errorResponse.getHeaders()).containsEntry("Access-Control-Allow-Origin", "*");
    }
    
    // Helper methods
    
    /**
     * Creates a valid DELETE request with user ID and itinerary ID.
     */
    private APIGatewayProxyRequestEvent createValidDeleteRequest(String userId, String itineraryId) {
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        Map<String, String> pathParams = new HashMap<>();
        pathParams.put("itinerary_id", itineraryId);
        request.setPathParameters(pathParams);
        
        return request;
    }
    
    /**
     * Creates a mock API Gateway request with the specified user ID in the authorizer context.
     */
    private APIGatewayProxyRequestEvent createRequestWithUserId(String userId) {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        
        Map<String, Object> authorizer = new HashMap<>();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", userId);
        claims.put("email", "user@example.com");
        authorizer.put("claims", claims);
        
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        return request;
    }
}
