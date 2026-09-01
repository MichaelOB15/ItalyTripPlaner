package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for BaseItineraryHandler.
 * Tests User_ID extraction, response building, and error handling.
 */
@ExtendWith(MockitoExtension.class)
class BaseItineraryHandlerTest {
    
    @Mock
    private DynamoDbClient mockDynamoDb;
    
    @Mock
    private Context mockContext;
    
    private TestableHandler handler;
    private ObjectMapper objectMapper;
    
    /**
     * Testable implementation of BaseItineraryHandler for testing.
     */
    private static class TestableHandler extends BaseItineraryHandler {
        public TestableHandler(DynamoDbClient dynamoDb, String tableName) {
            super(dynamoDb, tableName);
        }
        
        @Override
        public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input, Context context) {
            // Simple test implementation
            try {
                String userId = extractUserId(input);
                Map<String, String> responseBody = Map.of("userId", userId);
                String json = objectMapper.writeValueAsString(responseBody);
                return buildResponse(200, json);
            } catch (Exception e) {
                return buildError(401, e.getMessage());
            }
        }
    }
    
    @BeforeEach
    void setUp() {
        handler = new TestableHandler(mockDynamoDb, "test-table");
        objectMapper = new ObjectMapper();
    }
    
    @Test
    @DisplayName("extractUserId should return user ID from authorizer claims")
    void extractUserId_WithValidClaims_ReturnsUserId() {
        // Arrange
        String expectedUserId = "user-123-456";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(expectedUserId);
        
        // Act
        String actualUserId = handler.extractUserId(request);
        
        // Assert
        assertThat(actualUserId).isEqualTo(expectedUserId);
    }
    
    @Test
    @DisplayName("extractUserId should throw IllegalArgumentException when authorizer is missing")
    void extractUserId_WithMissingAuthorizer_ThrowsException() {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        context.setAuthorizer(null);
        request.setRequestContext(context);
        
        // Act & Assert
        assertThatThrownBy(() -> handler.extractUserId(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Missing authorizer context");
    }
    
    @Test
    @DisplayName("extractUserId should throw IllegalArgumentException when claims are missing")
    void extractUserId_WithMissingClaims_ThrowsException() {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        Map<String, Object> authorizer = new HashMap<>();
        // No claims in authorizer
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        // Act & Assert
        assertThatThrownBy(() -> handler.extractUserId(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Missing claims in authorizer context");
    }
    
    @Test
    @DisplayName("extractUserId should throw IllegalArgumentException when sub claim is missing")
    void extractUserId_WithMissingSubClaim_ThrowsException() {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        Map<String, Object> authorizer = new HashMap<>();
        Map<String, Object> claims = new HashMap<>();
        // No 'sub' claim
        claims.put("email", "user@example.com");
        authorizer.put("claims", claims);
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        // Act & Assert
        assertThatThrownBy(() -> handler.extractUserId(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Missing or empty user ID in claims");
    }
    
    @Test
    @DisplayName("extractUserId should throw IllegalArgumentException when sub claim is empty")
    void extractUserId_WithEmptySubClaim_ThrowsException() {
        // Arrange
        APIGatewayProxyRequestEvent request = createRequestWithUserId("  ");
        
        // Act & Assert
        assertThatThrownBy(() -> handler.extractUserId(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Missing or empty user ID in claims");
    }
    
    @Test
    @DisplayName("buildResponse should return response with correct status code and body")
    void buildResponse_WithValidInputs_ReturnsCorrectResponse() {
        // Arrange
        int statusCode = 200;
        String body = "{\"message\":\"Success\"}";
        
        // Act
        APIGatewayProxyResponseEvent response = handler.buildResponse(statusCode, body);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(statusCode);
        assertThat(response.getBody()).isEqualTo(body);
        assertThat(response.getHeaders()).isNotNull();
    }
    
    @Test
    @DisplayName("buildResponse should include CORS headers")
    void buildResponse_IncludesCorsHeaders() {
        // Arrange
        String body = "{\"data\":\"test\"}";
        
        // Act
        APIGatewayProxyResponseEvent response = handler.buildResponse(200, body);
        
        // Assert
        Map<String, String> headers = response.getHeaders();
        assertThat(headers).containsEntry("Content-Type", "application/json");
        assertThat(headers).containsEntry("Access-Control-Allow-Origin", "*");
        assertThat(headers).containsKey("Access-Control-Allow-Methods");
        assertThat(headers).containsKey("Access-Control-Allow-Headers");
        assertThat(headers.get("Access-Control-Allow-Headers")).contains("Authorization");
    }
    
    @Test
    @DisplayName("buildError should return error response with correct status code")
    void buildError_WithValidInputs_ReturnsErrorResponse() throws Exception {
        // Arrange
        int statusCode = 400;
        String errorMessage = "Invalid input";
        
        // Act
        APIGatewayProxyResponseEvent response = handler.buildError(statusCode, errorMessage);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(statusCode);
        
        // Parse response body
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsEntry("error", errorMessage);
    }
    
    @Test
    @DisplayName("buildError should include CORS headers")
    void buildError_IncludesCorsHeaders() {
        // Act
        APIGatewayProxyResponseEvent response = handler.buildError(500, "Server error");
        
        // Assert
        Map<String, String> headers = response.getHeaders();
        assertThat(headers).containsEntry("Access-Control-Allow-Origin", "*");
        assertThat(headers).containsKey("Access-Control-Allow-Methods");
    }
    
    @Test
    @DisplayName("buildError should handle special characters in error message")
    void buildError_WithSpecialCharacters_EscapesCorrectly() throws Exception {
        // Arrange
        String errorMessage = "Error with \"quotes\" and \n newlines";
        
        // Act
        APIGatewayProxyResponseEvent response = handler.buildError(400, errorMessage);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        // Response should be valid JSON
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsKey("error");
    }
    
    @Test
    @DisplayName("handleRequest integration test with valid user ID")
    void handleRequest_WithValidUserId_ReturnsSuccess() throws Exception {
        // Arrange
        String userId = "test-user-123";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsEntry("userId", userId);
    }
    
    @Test
    @DisplayName("handleRequest integration test with missing authorizer")
    void handleRequest_WithMissingAuthorizer_ReturnsUnauthorized() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        context.setAuthorizer(null);
        request.setRequestContext(context);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(401);
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsKey("error");
    }
    
    // Helper methods
    
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
        claims.put("email_verified", true);
        authorizer.put("claims", claims);
        
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        return request;
    }
}
