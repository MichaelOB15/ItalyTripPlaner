package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.italytrip.models.DayPlan;
import com.italytrip.models.Itinerary;
import com.italytrip.models.UserPreferences;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GetItineraryHandler.
 * 
 * Tests requirements 4.5, 4.6, and 4.11:
 * - GET /itineraries/{itinerary_id} endpoint functionality
 * - Ownership verification (user can only access their own itineraries)
 * - 404 response for non-existent or unauthorized itineraries
 */
@ExtendWith(MockitoExtension.class)
class GetItineraryHandlerTest {
    
    private static final String TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "user-123-456";
    private static final String TEST_ITINERARY_ID = "itin_1234567890_abc";
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    
    @Mock
    private DynamoDbClient mockDynamoDb;
    
    @Mock
    private Context mockContext;
    
    private GetItineraryHandler handler;
    private ObjectMapper objectMapper;
    
    @BeforeEach
    void setUp() {
        handler = new GetItineraryHandler(mockDynamoDb, TABLE_NAME);
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules(); // Register JavaTimeModule
    }
    
    @Test
    @DisplayName("Should return 200 OK with itinerary when found - Requirement 4.6")
    void handleRequest_WithValidItinerary_Returns200() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        Map<String, AttributeValue> mockItem = createMockDynamoDBItem();
        
        GetItemResponse mockResponse = GetItemResponse.builder()
                .item(mockItem)
                .build();
        
        when(mockDynamoDb.getItem(any(GetItemRequest.class))).thenReturn(mockResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        
        // Verify response contains itinerary
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsKey("itinerary");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> itinerary = (Map<String, Object>) body.get("itinerary");
        assertThat(itinerary.get("id")).isEqualTo(TEST_ITINERARY_ID);
        assertThat(itinerary.get("name")).isEqualTo("Test Trip to Italy");
        
        // Verify CORS headers
        assertThat(response.getHeaders()).containsEntry("Access-Control-Allow-Origin", "*");
    }
    
    @Test
    @DisplayName("Should query DynamoDB with correct composite key - Requirements 2.4, 4.6")
    void handleRequest_QueriesWithCorrectKey() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        
        GetItemResponse mockResponse = GetItemResponse.builder()
                .item(Collections.emptyMap()) // Empty response (not found)
                .build();
        
        when(mockDynamoDb.getItem(any(GetItemRequest.class))).thenReturn(mockResponse);
        
        // Act
        handler.handleRequest(request, mockContext);
        
        // Assert - Capture the GetItemRequest to verify correct key structure
        ArgumentCaptor<GetItemRequest> requestCaptor = ArgumentCaptor.forClass(GetItemRequest.class);
        verify(mockDynamoDb).getItem(requestCaptor.capture());
        
        GetItemRequest capturedRequest = requestCaptor.getValue();
        assertThat(capturedRequest.tableName()).isEqualTo(TABLE_NAME);
        
        Map<String, AttributeValue> key = capturedRequest.key();
        assertThat(key).containsKey("user_id");
        assertThat(key).containsKey("itinerary_id");
        assertThat(key.get("user_id").s()).isEqualTo(TEST_USER_ID);
        assertThat(key.get("itinerary_id").s()).isEqualTo(TEST_ITINERARY_ID);
    }
    
    @Test
    @DisplayName("Should return 404 when itinerary not found - Requirement 4.11")
    void handleRequest_WithNonExistentItinerary_Returns404() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        
        GetItemResponse mockResponse = GetItemResponse.builder()
                .item(Collections.emptyMap()) // No item found
                .build();
        
        when(mockDynamoDb.getItem(any(GetItemRequest.class))).thenReturn(mockResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(404);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsEntry("error", "Itinerary not found");
    }
    
    @Test
    @DisplayName("Should return 404 when itinerary belongs to different user - Requirement 4.11")
    void handleRequest_WithUnauthorizedAccess_Returns404() throws Exception {
        // Arrange
        // User attempts to access another user's itinerary
        // The composite key query will return no results, preventing unauthorized access
        APIGatewayProxyRequestEvent request = createValidRequest(TEST_USER_ID, "other_user_itinerary");
        
        GetItemResponse mockResponse = GetItemResponse.builder()
                .item(Collections.emptyMap()) // Query returns nothing (wrong user)
                .build();
        
        when(mockDynamoDb.getItem(any(GetItemRequest.class))).thenReturn(mockResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(404);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsEntry("error", "Itinerary not found");
    }
    
    @Test
    @DisplayName("Should return 400 when itinerary_id missing from path - Requirement 4.5")
    void handleRequest_WithMissingItineraryId_Returns400() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidRequest(TEST_USER_ID, null);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body.get("error").toString()).contains("itinerary_id");
    }
    
    @Test
    @DisplayName("Should return 400 when itinerary_id is empty")
    void handleRequest_WithEmptyItineraryId_Returns400() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidRequest(TEST_USER_ID, "  ");
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
    }
    
    @Test
    @DisplayName("Should return 400 when authorizer context missing - Requirement 2.4")
    void handleRequest_WithMissingAuthorizer_Returns400() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        context.setAuthorizer(null);
        request.setRequestContext(context);
        
        Map<String, String> pathParams = new HashMap<>();
        pathParams.put("itinerary_id", TEST_ITINERARY_ID);
        request.setPathParameters(pathParams);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body.get("error").toString()).contains("authorizer");
    }
    
    @Test
    @DisplayName("Should return 500 when DynamoDB throws exception")
    void handleRequest_WithDynamoDbException_Returns500() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        
        when(mockDynamoDb.getItem(any(GetItemRequest.class)))
                .thenThrow(DynamoDbException.builder()
                        .message("Database connection error")
                        .build());
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(500);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsKey("error");
    }
    
    @Test
    @DisplayName("Should correctly deserialize complex itinerary with days and preferences")
    void handleRequest_WithComplexItinerary_DeserializesCorrectly() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidRequest(TEST_USER_ID, TEST_ITINERARY_ID);
        Map<String, AttributeValue> mockItem = createMockDynamoDBItem();
        
        GetItemResponse mockResponse = GetItemResponse.builder()
                .item(mockItem)
                .build();
        
        when(mockDynamoDb.getItem(any(GetItemRequest.class))).thenReturn(mockResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> itinerary = (Map<String, Object>) body.get("itinerary");
        
        // Verify days array exists and has 3 elements
        assertThat(itinerary).containsKey("days");
        @SuppressWarnings("unchecked")
        List<Object> days = (List<Object>) itinerary.get("days");
        assertThat(days).hasSize(3);
        
        // Verify preferences exist
        assertThat(itinerary).containsKey("preferences");
        
        // Verify timestamps - using snake_case as per JSON property annotations
        assertThat(itinerary).containsKey("created_at");
        assertThat(itinerary).containsKey("last_modified");
    }
    
    @Test
    @DisplayName("Should extract user_id from Cognito authorizer context - Requirement 2.3")
    void handleRequest_ExtractsUserIdFromAuthorizerContext() {
        // Arrange
        String expectedUserId = "cognito-user-xyz";
        APIGatewayProxyRequestEvent request = createValidRequest(expectedUserId, TEST_ITINERARY_ID);
        
        GetItemResponse mockResponse = GetItemResponse.builder()
                .item(Collections.emptyMap())
                .build();
        
        when(mockDynamoDb.getItem(any(GetItemRequest.class))).thenReturn(mockResponse);
        
        // Act
        handler.handleRequest(request, mockContext);
        
        // Assert - Verify DynamoDB was queried with correct user_id from authorizer
        ArgumentCaptor<GetItemRequest> requestCaptor = ArgumentCaptor.forClass(GetItemRequest.class);
        verify(mockDynamoDb).getItem(requestCaptor.capture());
        
        GetItemRequest capturedRequest = requestCaptor.getValue();
        assertThat(capturedRequest.key().get("user_id").s()).isEqualTo(expectedUserId);
    }
    
    // Helper methods
    
    /**
     * Creates a valid API Gateway request with user ID in authorizer context
     * and itinerary_id in path parameters.
     */
    private APIGatewayProxyRequestEvent createValidRequest(String userId, String itineraryId) {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        
        // Set up authorizer context with Cognito claims
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        Map<String, Object> authorizer = new HashMap<>();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", userId);
        claims.put("email", "user@example.com");
        authorizer.put("claims", claims);
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        // Set up path parameters
        if (itineraryId != null) {
            Map<String, String> pathParams = new HashMap<>();
            pathParams.put("itinerary_id", itineraryId);
            request.setPathParameters(pathParams);
        }
        
        return request;
    }
    
    /**
     * Creates a mock DynamoDB item representing an itinerary.
     */
    private Map<String, AttributeValue> createMockDynamoDBItem() {
        Map<String, AttributeValue> item = new HashMap<>();
        
        // Basic fields
        item.put("user_id", AttributeValue.builder().s(TEST_USER_ID).build());
        item.put("itinerary_id", AttributeValue.builder().s(TEST_ITINERARY_ID).build());
        item.put("name", AttributeValue.builder().s("Test Trip to Italy").build());
        
        // Timestamps
        LocalDateTime now = LocalDateTime.now();
        item.put("created_at", AttributeValue.builder().s(now.format(ISO_FORMATTER)).build());
        item.put("last_modified", AttributeValue.builder().s(now.format(ISO_FORMATTER)).build());
        
        // Days (JSON string) - using snake_case to match DayPlan model annotations
        String daysJson = "[" +
                "{\"day_number\":1,\"places\":[],\"total_duration\":0,\"start_time\":\"08:00\"}," +
                "{\"day_number\":2,\"places\":[],\"total_duration\":0,\"start_time\":\"08:00\"}," +
                "{\"day_number\":3,\"places\":[],\"total_duration\":0,\"start_time\":\"08:00\"}" +
                "]";
        item.put("days", AttributeValue.builder().s(daysJson).build());
        
        // Preferences (JSON string) - using lowercase enum values and correct field names
        String preferencesJson = "{\"cities\":[\"Rome\",\"Florence\"],\"pace\":\"moderate\",\"price_range\":[\"$$\"]}";
        item.put("preferences", AttributeValue.builder().s(preferencesJson).build());
        
        return item;
    }
}
