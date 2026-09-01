package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.italytrip.models.DayPlan;
import com.italytrip.models.Itinerary;
import com.italytrip.models.UserPreferences;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemResponse;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UpdateItineraryHandler.
 * Tests requirements 3.5, 4.7, 4.8, and 4.11.
 */
class UpdateItineraryHandlerTest {

    private DynamoDbClient mockDynamoDb;
    private UpdateItineraryHandler handler;
    private Context mockContext;
    private ObjectMapper objectMapper;

    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "test-user-123";
    private static final String TEST_ITINERARY_ID = "itin_1234567890_abc123";

    @BeforeEach
    void setUp() {
        mockDynamoDb = mock(DynamoDbClient.class);
        mockContext = mock(Context.class);
        handler = new UpdateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
    }

    /**
     * Test successful itinerary update with valid request.
     * Tests requirements 3.5, 4.7, 4.8.
     */
    @Test
    void testUpdateItinerary_Success() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        
        // Mock DynamoDB success response
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class)))
                .thenReturn(UpdateItemResponse.builder().build());

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(200, response.getStatusCode());
        assertNotNull(response.getBody());
        
        // Verify response contains updated itinerary
        Map<String, Object> responseBody = objectMapper.readValue(response.getBody(), Map.class);
        assertTrue(responseBody.containsKey("itinerary"));
        
        Map<String, Object> itinerary = (Map<String, Object>) responseBody.get("itinerary");
        assertEquals(TEST_ITINERARY_ID, itinerary.get("id"));
        assertEquals("Updated Trip Name", itinerary.get("name"));
        
        // Verify DynamoDB update was called with correct parameters
        ArgumentCaptor<UpdateItemRequest> captor = ArgumentCaptor.forClass(UpdateItemRequest.class);
        verify(mockDynamoDb, times(1)).updateItem(captor.capture());
        
        UpdateItemRequest updateRequest = captor.getValue();
        assertEquals(TEST_TABLE_NAME, updateRequest.tableName());
        
        // Verify key contains user_id and itinerary_id
        Map<String, AttributeValue> key = updateRequest.key();
        assertEquals(TEST_USER_ID, key.get("user_id").s());
        assertEquals(TEST_ITINERARY_ID, key.get("itinerary_id").s());
        
        // Verify update expression includes name, itinerary_data, and last_modified
        String updateExpr = updateRequest.updateExpression();
        assertTrue(updateExpr.contains("name"));
        assertTrue(updateExpr.contains("itinerary_data"));
        assertTrue(updateExpr.contains("last_modified"));
        
        // Verify condition expression checks for existence (requirement 4.11)
        String conditionExpr = updateRequest.conditionExpression();
        assertTrue(conditionExpr.contains("attribute_exists(user_id)"));
        assertTrue(conditionExpr.contains("attribute_exists(itinerary_id)"));
    }

    /**
     * Test update returns 404 when itinerary doesn't exist or doesn't belong to user.
     * Tests requirement 4.11.
     */
    @Test
    void testUpdateItinerary_NotFound() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        
        // Mock DynamoDB conditional check failure (requirement 4.11)
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class)))
                .thenThrow(ConditionalCheckFailedException.builder()
                        .message("The conditional request failed")
                        .build());

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(404, response.getStatusCode());
        assertTrue(response.getBody().contains("not found") || response.getBody().contains("Itinerary not found"));
    }

    /**
     * Test update with missing itinerary_id in path parameters.
     * Tests requirement 4.7.
     */
    @Test
    void testUpdateItinerary_MissingItineraryId() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        request.setPathParameters(new HashMap<>()); // Empty path parameters

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(400, response.getStatusCode());
        assertTrue(response.getBody().contains("Missing itinerary_id"));
    }

    /**
     * Test update with empty request body.
     * Tests requirement 4.8.
     */
    @Test
    void testUpdateItinerary_EmptyBody() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        request.setBody("");

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(400, response.getStatusCode());
        assertTrue(response.getBody().contains("Request body is required"));
    }

    /**
     * Test update with invalid JSON in request body.
     * Tests requirement 4.8.
     */
    @Test
    void testUpdateItinerary_InvalidJson() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        request.setBody("{invalid json}");

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(400, response.getStatusCode());
        assertTrue(response.getBody().contains("Invalid JSON"));
    }

    /**
     * Test update with missing name.
     * Tests requirement 4.8 validation.
     */
    @Test
    void testUpdateItinerary_MissingName() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        
        Map<String, Object> body = new HashMap<>();
        body.put("name", "");
        body.put("days", createValidDays());
        body.put("preferences", createValidPreferences());
        
        request.setBody(objectMapper.writeValueAsString(body));

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(400, response.getStatusCode());
        assertTrue(response.getBody().contains("Name must not be empty"));
    }

    /**
     * Test update with name exceeding max length.
     * Tests requirement 4.8 validation.
     */
    @Test
    void testUpdateItinerary_NameTooLong() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        
        String longName = "a".repeat(201); // 201 characters
        Map<String, Object> body = new HashMap<>();
        body.put("name", longName);
        body.put("days", createValidDays());
        body.put("preferences", createValidPreferences());
        
        request.setBody(objectMapper.writeValueAsString(body));

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(400, response.getStatusCode());
        assertTrue(response.getBody().contains("200 characters or less"));
    }

    /**
     * Test update with wrong number of days.
     * Tests requirement 4.8 validation.
     */
    @Test
    void testUpdateItinerary_WrongNumberOfDays() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        
        List<Map<String, Object>> twoDays = new ArrayList<>();
        twoDays.add(createDay(1));
        twoDays.add(createDay(2));
        
        Map<String, Object> body = new HashMap<>();
        body.put("name", "Trip Name");
        body.put("days", twoDays);
        body.put("preferences", createValidPreferences());
        
        request.setBody(objectMapper.writeValueAsString(body));

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(400, response.getStatusCode());
        assertTrue(response.getBody().contains("Exactly 3 days are required"));
    }

    /**
     * Test update with missing authorizer context.
     * Tests requirement 2.3.
     */
    @Test
    void testUpdateItinerary_MissingAuthorizer() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        
        // Remove authorizer context
        APIGatewayProxyRequestEvent.ProxyRequestContext context = request.getRequestContext();
        context.setAuthorizer(null);

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(401, response.getStatusCode());
        assertTrue(response.getBody().contains("Unauthorized"));
    }

    /**
     * Test update with DynamoDB error.
     * Tests error handling.
     */
    @Test
    void testUpdateItinerary_DynamoDbError() {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        
        // Mock DynamoDB error
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class)))
                .thenThrow(DynamoDbException.builder()
                        .message("Service unavailable")
                        .build());

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(500, response.getStatusCode());
        assertTrue(response.getBody().contains("Database error") || response.getBody().contains("error"));
    }

    /**
     * Test that last_modified timestamp is updated.
     * Tests requirement 3.5 and 4.8.
     */
    @Test
    void testUpdateItinerary_UpdatesLastModified() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = createValidUpdateRequest();
        
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class)))
                .thenReturn(UpdateItemResponse.builder().build());

        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // Assert
        assertEquals(200, response.getStatusCode());
        
        // Verify last_modified was included in update
        ArgumentCaptor<UpdateItemRequest> captor = ArgumentCaptor.forClass(UpdateItemRequest.class);
        verify(mockDynamoDb).updateItem(captor.capture());
        
        UpdateItemRequest updateRequest = captor.getValue();
        Map<String, AttributeValue> values = updateRequest.expressionAttributeValues();
        assertTrue(values.containsKey(":last_modified"));
        assertNotNull(values.get(":last_modified").s());
    }

    // Helper methods

    private APIGatewayProxyRequestEvent createValidUpdateRequest() {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        
        // Set path parameters with itinerary_id
        Map<String, String> pathParams = new HashMap<>();
        pathParams.put("itinerary_id", TEST_ITINERARY_ID);
        request.setPathParameters(pathParams);
        
        // Set authorizer context with user_id
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        Map<String, Object> authorizer = new HashMap<>();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", TEST_USER_ID);
        authorizer.put("claims", claims);
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        // Set request body
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("name", "Updated Trip Name");
            body.put("days", createValidDays());
            body.put("preferences", createValidPreferences());
            
            request.setBody(objectMapper.writeValueAsString(body));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        
        return request;
    }

    private List<Map<String, Object>> createValidDays() {
        List<Map<String, Object>> days = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            days.add(createDay(i));
        }
        return days;
    }

    private Map<String, Object> createDay(int dayNumber) {
        Map<String, Object> day = new HashMap<>();
        day.put("day_number", dayNumber);
        day.put("places", new ArrayList<>());
        return day;
    }

    private Map<String, Object> createValidPreferences() {
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("cities", List.of("Rome", "Florence"));
        prefs.put("pace", "moderate");
        prefs.put("price_range", List.of("€€"));
        return prefs;
    }
}
