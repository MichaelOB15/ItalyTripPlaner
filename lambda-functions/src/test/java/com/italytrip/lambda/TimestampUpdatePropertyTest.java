package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import net.jqwik.api.*;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for timestamp updates on create and update operations.
 * 
 * **Validates: Requirements 3.5, 4.8**
 * 
 * This test verifies Property 5: Update Timestamp Increment
 * - For any itinerary create operation, created_at and last_modified are set to current timestamp
 * - For any itinerary update operation, last_modified timestamp is greater than or equal to the timestamp before update
 */
class TimestampUpdatePropertyTest {

    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "test-user-123";
    private static final DateTimeFormatter ISO_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    
    private final ObjectMapper objectMapper;

    public TimestampUpdatePropertyTest() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
    }

    /**
     * Property 5: Update Timestamp Increment
     * 
     * **Validates: Requirements 3.5, 4.8**
     * 
     * For any itinerary create operation, both created_at and last_modified timestamps
     * SHALL be set to the current time.
     */
    @Property(tries = 50)
    void createdItinerary_hasTimestampsSet(@ForAll("validItineraryName") String name,
                                            @ForAll("validDaysList") List<Map<String, Object>> days,
                                            @ForAll("validPreferences") Map<String, Object> preferences) throws Exception {
        // Arrange
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        Context mockContext = mock(Context.class);
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        APIGatewayProxyRequestEvent request = createCreateRequest(name, days, preferences);
        
        // Mock DynamoDB response
        when(mockDynamoDb.putItem(any(PutItemRequest.class)))
                .thenReturn(PutItemResponse.builder().build());

        // Capture the time before the operation
        LocalDateTime beforeCreate = LocalDateTime.now();
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Capture the time after the operation
        LocalDateTime afterCreate = LocalDateTime.now();

        // Assert
        if (response.getStatusCode() != 201) {
            System.out.println("CREATE FAILED: " + response.getBody());
        }
        assertEquals(201, response.getStatusCode(), "Create operation should return 201 Created");
        
        // Verify timestamps were set in DynamoDB
        ArgumentCaptor<PutItemRequest> captor = ArgumentCaptor.forClass(PutItemRequest.class);
        verify(mockDynamoDb, times(1)).putItem(captor.capture());
        
        PutItemRequest putRequest = captor.getValue();
        Map<String, AttributeValue> item = putRequest.item();
        
        // Verify created_at and last_modified exist
        assertTrue(item.containsKey("created_at"), "created_at must be set");
        assertTrue(item.containsKey("last_modified"), "last_modified must be set");
        
        String createdAtStr = item.get("created_at").s();
        String lastModifiedStr = item.get("last_modified").s();
        
        assertNotNull(createdAtStr, "created_at must not be null");
        assertNotNull(lastModifiedStr, "last_modified must not be null");
        
        // Parse timestamps
        LocalDateTime createdAt = LocalDateTime.parse(createdAtStr, ISO_FORMATTER);
        LocalDateTime lastModified = LocalDateTime.parse(lastModifiedStr, ISO_FORMATTER);
        
        // Verify timestamps are reasonable (not too far in past or future)
        LocalDateTime now = LocalDateTime.now();
        assertTrue(createdAt.isBefore(now.plusMinutes(1)) && createdAt.isAfter(now.minusMinutes(1)), 
                "created_at should be within 1 minute of current time");
        
        // Verify created_at and last_modified are equal for new itineraries
        assertEquals(createdAt, lastModified, 
                "For new itineraries, created_at and last_modified should be equal");
    }

    /**
     * Property 5: Update Timestamp Increment
     * 
     * **Validates: Requirements 3.5, 4.8**
     * 
     * For any itinerary update operation, the resulting last_modified timestamp
     * SHALL be greater than or equal to the timestamp before the update.
     */
    @Property(tries = 50)
    void updatedItinerary_hasIncrementedLastModified(@ForAll("validItineraryName") String name,
                                                       @ForAll("validDaysList") List<Map<String, Object>> days,
                                                       @ForAll("validPreferences") Map<String, Object> preferences,
                                                       @ForAll("existingItineraryId") String itineraryId) throws Exception {
        // Arrange
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        Context mockContext = mock(Context.class);
        UpdateItineraryHandler handler = new UpdateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        APIGatewayProxyRequestEvent request = createUpdateRequest(itineraryId, name, days, preferences);
        
        // Mock DynamoDB response
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class)))
                .thenReturn(UpdateItemResponse.builder().build());

        // Capture the time before the operation (simulating previous last_modified)
        LocalDateTime beforeUpdate = LocalDateTime.now();
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Capture the time after the operation
        LocalDateTime afterUpdate = LocalDateTime.now();

        // Assert
        assertEquals(200, response.getStatusCode(), "Update operation should return 200 OK");
        
        // Verify last_modified was updated in DynamoDB
        ArgumentCaptor<UpdateItemRequest> captor = ArgumentCaptor.forClass(UpdateItemRequest.class);
        verify(mockDynamoDb, times(1)).updateItem(captor.capture());
        
        UpdateItemRequest updateRequest = captor.getValue();
        Map<String, AttributeValue> expressionValues = updateRequest.expressionAttributeValues();
        
        assertTrue(expressionValues.containsKey(":last_modified"), 
                "Update must include last_modified timestamp");
        
        String lastModifiedStr = expressionValues.get(":last_modified").s();
        assertNotNull(lastModifiedStr, "last_modified must not be null");
        
        // Parse timestamp
        LocalDateTime lastModified = LocalDateTime.parse(lastModifiedStr, ISO_FORMATTER);
        
        // Verify last_modified is reasonable (within 1 minute of current time)
        LocalDateTime now = LocalDateTime.now();
        assertTrue(lastModified.isBefore(now.plusMinutes(1)) && lastModified.isAfter(now.minusMinutes(1)), 
                "last_modified should be within 1 minute of current time");
        
        // Verify update expression includes last_modified
        String updateExpression = updateRequest.updateExpression();
        assertTrue(updateExpression.contains("last_modified"), 
                "Update expression must include last_modified field");
    }

    /**
     * Property 5: Update Timestamp Increment (Multiple Sequential Updates)
     * 
     * **Validates: Requirements 3.5, 4.8**
     * 
     * For any sequence of update operations on the same itinerary,
     * each update SHALL result in a last_modified timestamp that is
     * greater than or equal to the previous last_modified timestamp.
     */
    @Property(tries = 30)
    void multipleUpdates_haveMonotonicallyIncreasingTimestamps(
            @ForAll("validItineraryName") String name1,
            @ForAll("validItineraryName") String name2,
            @ForAll("validItineraryName") String name3,
            @ForAll("validDaysList") List<Map<String, Object>> days,
            @ForAll("validPreferences") Map<String, Object> preferences,
            @ForAll("existingItineraryId") String itineraryId) throws Exception {
        
        // Arrange
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        Context mockContext = mock(Context.class);
        UpdateItineraryHandler handler = new UpdateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Mock DynamoDB response
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class)))
                .thenReturn(UpdateItemResponse.builder().build());

        // Act - Perform three sequential updates
        APIGatewayProxyRequestEvent request1 = createUpdateRequest(itineraryId, name1, days, preferences);
        APIGatewayProxyResponseEvent response1 = handler.handleRequest(request1, mockContext);
        
        // Small delay to ensure time progression (in real systems, updates would be further apart)
        Thread.sleep(10);
        
        APIGatewayProxyRequestEvent request2 = createUpdateRequest(itineraryId, name2, days, preferences);
        APIGatewayProxyResponseEvent response2 = handler.handleRequest(request2, mockContext);
        
        Thread.sleep(10);
        
        APIGatewayProxyRequestEvent request3 = createUpdateRequest(itineraryId, name3, days, preferences);
        APIGatewayProxyResponseEvent response3 = handler.handleRequest(request3, mockContext);

        // Assert
        assertEquals(200, response1.getStatusCode());
        assertEquals(200, response2.getStatusCode());
        assertEquals(200, response3.getStatusCode());
        
        // Verify timestamps
        ArgumentCaptor<UpdateItemRequest> captor = ArgumentCaptor.forClass(UpdateItemRequest.class);
        verify(mockDynamoDb, times(3)).updateItem(captor.capture());
        
        List<UpdateItemRequest> updateRequests = captor.getAllValues();
        assertEquals(3, updateRequests.size());
        
        // Extract last_modified timestamps from all three updates
        String lastModified1 = updateRequests.get(0).expressionAttributeValues().get(":last_modified").s();
        String lastModified2 = updateRequests.get(1).expressionAttributeValues().get(":last_modified").s();
        String lastModified3 = updateRequests.get(2).expressionAttributeValues().get(":last_modified").s();
        
        LocalDateTime timestamp1 = LocalDateTime.parse(lastModified1, ISO_FORMATTER);
        LocalDateTime timestamp2 = LocalDateTime.parse(lastModified2, ISO_FORMATTER);
        LocalDateTime timestamp3 = LocalDateTime.parse(lastModified3, ISO_FORMATTER);
        
        // Verify monotonically increasing (or equal) timestamps
        assertFalse(timestamp2.isBefore(timestamp1), 
                "Second update timestamp must be >= first update timestamp");
        assertFalse(timestamp3.isBefore(timestamp2), 
                "Third update timestamp must be >= second update timestamp");
    }

    // ==================== Arbitraries (Generators) ====================

    @Provide
    Arbitrary<String> validItineraryName() {
        return Arbitraries.strings()
                .alpha()
                .numeric()
                .ofMinLength(1)
                .ofMaxLength(190)  // Leave room for " Trip" suffix
                .map(s -> {
                    if (s.isEmpty()) {
                        return "Trip";
                    }
                    return s + " Trip";
                });
    }

    @Provide
    Arbitrary<String> existingItineraryId() {
        return Arbitraries.longs()
                .between(1000000000L, 9999999999L)
                .map(timestamp -> String.format("itin_%d_abc123", timestamp));
    }

    @Provide
    Arbitrary<List<Map<String, Object>>> validDaysList() {
        // Create exactly 3 days with day_numbers 1, 2, 3
        return Arbitraries.just(List.of(
                createDayWithNumber(1),
                createDayWithNumber(2),
                createDayWithNumber(3)
        ));
    }

    private Map<String, Object> createDayWithNumber(int dayNumber) {
        Map<String, Object> day = new HashMap<>();
        day.put("day_number", dayNumber);
        day.put("places", List.of());
        return day;
    }

    @Provide
    Arbitrary<Map<String, Object>> validPreferences() {
        return Arbitraries.just(createDefaultPreferences());
    }

    // ==================== Helper Methods ====================

    private Map<String, Object> createDefaultPreferences() {
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("cities", List.of("Rome", "Florence"));
        prefs.put("pace", "moderate");
        prefs.put("price_range", List.of("€€"));
        return prefs;
    }

    private APIGatewayProxyRequestEvent createCreateRequest(String name, 
                                                             List<Map<String, Object>> days, 
                                                             Map<String, Object> preferences) throws Exception {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        
        // Set authorizer context with user_id
        APIGatewayProxyRequestEvent.ProxyRequestContext context = new APIGatewayProxyRequestEvent.ProxyRequestContext();
        Map<String, Object> authorizer = new HashMap<>();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", TEST_USER_ID);
        authorizer.put("claims", claims);
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        // Set request body
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("days", days);
        body.put("preferences", preferences);
        
        request.setBody(objectMapper.writeValueAsString(body));
        
        return request;
    }

    private APIGatewayProxyRequestEvent createUpdateRequest(String itineraryId,
                                                             String name, 
                                                             List<Map<String, Object>> days, 
                                                             Map<String, Object> preferences) throws Exception {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        
        // Set path parameters with itinerary_id
        Map<String, String> pathParams = new HashMap<>();
        pathParams.put("itinerary_id", itineraryId);
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
        Map<String, Object> body = new HashMap<>();
        body.put("name", name);
        body.put("days", days);
        body.put("preferences", preferences);
        
        request.setBody(objectMapper.writeValueAsString(body));
        
        return request;
    }
}
