package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ListItinerariesHandler.
 * 
 * Tests the GET /itineraries endpoint functionality including:
 * - User ID extraction from authorizer context
 * - DynamoDB query with user_id partition key
 * - Sorting by last_modified descending
 * - Response formatting
 * - Error handling
 */
@ExtendWith(MockitoExtension.class)
class ListItinerariesHandlerTest {
    
    @Mock
    private DynamoDbClient mockDynamoDb;
    
    @Mock
    private Context mockContext;
    
    private ListItinerariesHandler handler;
    private ObjectMapper objectMapper;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    
    @BeforeEach
    void setUp() {
        handler = new ListItinerariesHandler(mockDynamoDb, "test-itineraries-table");
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }
    
    @Test
    @DisplayName("handleRequest should return empty array when user has no itineraries")
    void handleRequest_WithNoItineraries_ReturnsEmptyArray() throws Exception {
        // Arrange
        String userId = "user-123";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        QueryResponse emptyResponse = QueryResponse.builder()
                .items(new ArrayList<>())
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(emptyResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsKey("itineraries");
        
        @SuppressWarnings("unchecked")
        List<Object> itineraries = (List<Object>) body.get("itineraries");
        assertThat(itineraries).isEmpty();
        
        // Verify DynamoDB query was called with correct user_id
        ArgumentCaptor<QueryRequest> queryCaptor = ArgumentCaptor.forClass(QueryRequest.class);
        verify(mockDynamoDb).query(queryCaptor.capture());
        
        QueryRequest capturedQuery = queryCaptor.getValue();
        assertThat(capturedQuery.tableName()).isEqualTo("test-itineraries-table");
        assertThat(capturedQuery.keyConditionExpression()).isEqualTo("user_id = :userId");
        assertThat(capturedQuery.expressionAttributeValues()).containsKey(":userId");
        assertThat(capturedQuery.expressionAttributeValues().get(":userId").s()).isEqualTo(userId);
    }
    
    @Test
    @DisplayName("handleRequest should return itineraries sorted by last_modified descending")
    void handleRequest_WithMultipleItineraries_ReturnsSortedByLastModified() throws Exception {
        // Arrange
        String userId = "user-456";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        // Create 3 itineraries with different last_modified timestamps
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime yesterday = now.minusDays(1);
        LocalDateTime lastWeek = now.minusDays(7);
        
        Map<String, AttributeValue> item1 = createDynamoDBItem("itin-001", "Rome Trip", yesterday);
        Map<String, AttributeValue> item2 = createDynamoDBItem("itin-002", "Venice Trip", now); // Most recent
        Map<String, AttributeValue> item3 = createDynamoDBItem("itin-003", "Florence Trip", lastWeek);
        
        QueryResponse queryResponse = QueryResponse.builder()
                .items(item1, item2, item3)
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        List<Map<String, Object>> itineraries = body.get("itineraries");
        assertThat(itineraries).hasSize(3);
        
        // Verify sorting: most recent first
        assertThat(itineraries.get(0).get("id")).isEqualTo("itin-002"); // now
        assertThat(itineraries.get(1).get("id")).isEqualTo("itin-001"); // yesterday
        assertThat(itineraries.get(2).get("id")).isEqualTo("itin-003"); // last week
    }
    
    @Test
    @DisplayName("handleRequest should return 400 when authorizer context is missing")
    void handleRequest_WithMissingAuthorizer_Returns400() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        context.setAuthorizer(null);
        request.setRequestContext(context);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsKey("error");
        assertThat(body.get("error").toString()).contains("Missing authorizer context");
        
        // Verify DynamoDB was never called
        verify(mockDynamoDb, never()).query(any(QueryRequest.class));
    }
    
    @Test
    @DisplayName("handleRequest should return 500 when DynamoDB query fails")
    void handleRequest_WithDynamoDBError_Returns500() throws Exception {
        // Arrange
        String userId = "user-789";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        when(mockDynamoDb.query(any(QueryRequest.class)))
                .thenThrow(DynamoDbException.builder()
                        .message("Internal DynamoDB error")
                        .build());
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(500);
        
        Map<String, Object> body = objectMapper.readValue(response.getBody(), Map.class);
        assertThat(body).containsKey("error");
        assertThat(body.get("error").toString()).contains("Failed to retrieve itineraries");
    }
    
    @Test
    @DisplayName("handleRequest should handle itineraries with minimal data")
    void handleRequest_WithMinimalItineraryData_ReturnsSuccessfully() throws Exception {
        // Arrange
        String userId = "user-minimal";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        // Create item with only required fields
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("itinerary_id", AttributeValue.builder().s("itin-minimal").build());
        item.put("name", AttributeValue.builder().s("Minimal Trip").build());
        item.put("created_at", AttributeValue.builder().s(LocalDateTime.now().format(FORMATTER)).build());
        item.put("last_modified", AttributeValue.builder().s(LocalDateTime.now().format(FORMATTER)).build());
        item.put("days", AttributeValue.builder().s("[]").build());
        item.put("preferences", AttributeValue.builder().s("{}").build());
        
        QueryResponse queryResponse = QueryResponse.builder()
                .items(item)
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        List<Map<String, Object>> itineraries = body.get("itineraries");
        assertThat(itineraries).hasSize(1);
        assertThat(itineraries.get(0).get("id")).isEqualTo("itin-minimal");
        assertThat(itineraries.get(0).get("name")).isEqualTo("Minimal Trip");
    }
    
    @Test
    @DisplayName("handleRequest should include CORS headers in response")
    void handleRequest_IncludesCorsHeaders() throws Exception {
        // Arrange
        String userId = "user-cors";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        QueryResponse emptyResponse = QueryResponse.builder()
                .items(new ArrayList<>())
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(emptyResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        Map<String, String> headers = response.getHeaders();
        assertThat(headers).containsEntry("Access-Control-Allow-Origin", "*");
        assertThat(headers).containsKey("Access-Control-Allow-Methods");
        assertThat(headers).containsKey("Access-Control-Allow-Headers");
    }
    
    @Test
    @DisplayName("handleRequest should only query user's own itineraries")
    void handleRequest_QueriesOnlyUserItineraries() throws Exception {
        // Arrange
        String userId = "user-specific-123";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        QueryResponse emptyResponse = QueryResponse.builder()
                .items(new ArrayList<>())
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(emptyResponse);
        
        // Act
        handler.handleRequest(request, mockContext);
        
        // Assert - Verify that the query uses the correct user_id
        ArgumentCaptor<QueryRequest> queryCaptor = ArgumentCaptor.forClass(QueryRequest.class);
        verify(mockDynamoDb).query(queryCaptor.capture());
        
        QueryRequest capturedQuery = queryCaptor.getValue();
        assertThat(capturedQuery.expressionAttributeValues().get(":userId").s())
                .isEqualTo(userId);
    }
    
    @Test
    @DisplayName("handleRequest should handle large number of itineraries")
    void handleRequest_WithManyItineraries_HandlesCorrectly() throws Exception {
        // Arrange
        String userId = "user-many";
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        
        // Create 10 itineraries
        List<Map<String, AttributeValue>> items = new ArrayList<>();
        LocalDateTime baseTime = LocalDateTime.now();
        
        for (int i = 0; i < 10; i++) {
            LocalDateTime modifiedTime = baseTime.minusDays(i);
            items.add(createDynamoDBItem("itin-" + i, "Trip " + i, modifiedTime));
        }
        
        QueryResponse queryResponse = QueryResponse.builder()
                .items(items)
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        List<Map<String, Object>> itineraries = body.get("itineraries");
        assertThat(itineraries).hasSize(10);
        
        // Verify they are sorted by most recent first
        assertThat(itineraries.get(0).get("id")).isEqualTo("itin-0"); // Most recent
        assertThat(itineraries.get(9).get("id")).isEqualTo("itin-9"); // Oldest
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
        authorizer.put("claims", claims);
        
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        return request;
    }
    
    /**
     * Creates a mock DynamoDB item representing an itinerary.
     */
    private Map<String, AttributeValue> createDynamoDBItem(String itineraryId, String name, LocalDateTime lastModified) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        item.put("itinerary_id", AttributeValue.builder().s(itineraryId).build());
        item.put("name", AttributeValue.builder().s(name).build());
        item.put("created_at", AttributeValue.builder().s(lastModified.minusDays(1).format(FORMATTER)).build());
        item.put("last_modified", AttributeValue.builder().s(lastModified.format(FORMATTER)).build());
        
        // Simple JSON for days and preferences
        item.put("days", AttributeValue.builder().s("[]").build());
        item.put("preferences", AttributeValue.builder().s("{}").build());
        
        return item;
    }
}
