package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.italytrip.models.DayPlan;
import com.italytrip.models.Itinerary;
import com.italytrip.models.UserPreferences;
import net.jqwik.api.*;
import net.jqwik.api.constraints.AlphaChars;
import net.jqwik.api.constraints.StringLength;
import org.mockito.Mock;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for ownership verification in itinerary handlers.
 * 
 * <p><b>Validates: Requirements 2.6, 4.6, 4.10</b></p>
 * 
 * <p>This test suite verifies the critical security property that users can only
 * access, update, and delete their own itineraries. It tests three handler operations:
 * <ul>
 *   <li>GET /itineraries/{itinerary_id} - GetItineraryHandler</li>
 *   <li>PUT /itineraries/{itinerary_id} - UpdateItineraryHandler</li>
 *   <li>DELETE /itineraries/{itinerary_id} - DeleteItineraryHandler</li>
 * </ul>
 * 
 * <p>The property being tested: For any two distinct users (userA and userB),
 * when userA attempts to access userB's itinerary using a valid itinerary_id
 * that belongs to userB, the system SHALL return a 404 or 403 error and SHALL NOT
 * return the itinerary data or perform any modifications.
 * 
 * <p>Requirements coverage:
 * <ul>
 *   <li>2.6: When an authenticated request attempts to access another user's itinerary,
 *       THE Itinerary_Service SHALL return HTTP 403 Forbidden error</li>
 *   <li>4.6: Verify the itinerary belongs to the authenticated user and return the itinerary data</li>
 *   <li>4.10: Verify the itinerary belongs to the authenticated user before deletion</li>
 * </ul>
 */
class OwnershipVerificationPropertyTest {

    private static final String TABLE_NAME = "test-itineraries-table";
    private static final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private Context mockContext;

    /**
     * Property 2: Ownership Verification on Access
     * 
     * <p><b>Validates: Requirements 2.6, 4.6, 4.10</b></p>
     * 
     * <p>Property: For all distinct user IDs (userA, userB) and any valid itinerary ID
     * belonging to userB, when userA attempts to GET that itinerary, the system SHALL
     * return HTTP 404 and SHALL NOT leak any itinerary data.
     * 
     * <p>This property ensures users cannot access other users' itineraries, protecting
     * data privacy and preventing unauthorized information disclosure.
     */
    @Property
    @Label("Users cannot access other users' itineraries via GET")
    void userCannotGetAnotherUsersItinerary(
            @ForAll @AlphaChars @StringLength(min = 10, max = 50) String ownerUserId,
            @ForAll @AlphaChars @StringLength(min = 10, max = 50) String attackerUserId,
            @ForAll @AlphaChars @StringLength(min = 10, max = 30) String itineraryId
    ) {
        Assume.that(!ownerUserId.equals(attackerUserId));

        // Setup mock DynamoDB client that returns empty for attacker but has data for owner
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);

        // When attacker queries (different user_id), return empty result
        GetItemResponse emptyResponse = GetItemResponse.builder()
                .item(Collections.emptyMap())
                .build();

        when(mockDynamoDb.getItem(any(GetItemRequest.class)))
                .thenAnswer(invocation -> {
                    GetItemRequest request = invocation.getArgument(0);
                    String requestUserId = request.key().get("user_id").s();
                    
                    // Only return data if the requesting user matches the owner
                    if (requestUserId.equals(ownerUserId)) {
                        return GetItemResponse.builder()
                                .item(createMockItineraryItem(itineraryId, "Test Itinerary"))
                                .build();
                    }
                    return emptyResponse;
                });

        // Create handler with mock client
        GetItineraryHandler handler = new GetItineraryHandler(mockDynamoDb, TABLE_NAME);

        // Create request from attacker trying to access owner's itinerary
        APIGatewayProxyRequestEvent request = createGetItineraryRequest(attackerUserId, itineraryId);

        // Execute the request
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // ASSERT: Attacker gets 404, no data leaked (Requirement 2.6, 4.6)
        assertThat(response.getStatusCode())
                .as("Accessing another user's itinerary should return 404")
                .isEqualTo(404);

        assertThat(response.getBody())
                .as("Response body should not contain itinerary data")
                .doesNotContain("Test Itinerary")
                .contains("not found");
    }

    /**
     * Property: Users cannot update other users' itineraries
     * 
     * <p><b>Validates: Requirements 2.6, 4.11</b></p>
     * 
     * <p>Property: For all distinct user IDs (userA, userB) and any valid itinerary ID
     * belonging to userB, when userA attempts to UPDATE that itinerary, the system SHALL
     * return HTTP 404 and SHALL NOT modify the itinerary.
     */
    @Property
    @Label("Users cannot update other users' itineraries")
    void userCannotUpdateAnotherUsersItinerary(
            @ForAll @AlphaChars @StringLength(min = 10, max = 50) String ownerUserId,
            @ForAll @AlphaChars @StringLength(min = 10, max = 50) String attackerUserId,
            @ForAll @AlphaChars @StringLength(min = 10, max = 30) String itineraryId,
            @ForAll @StringLength(min = 5, max = 50) String maliciousName
    ) {
        Assume.that(!ownerUserId.equals(attackerUserId));

        // Setup mock DynamoDB client
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);

        // Mock updateItem to throw ConditionalCheckFailedException when wrong user
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class)))
                .thenAnswer(invocation -> {
                    UpdateItemRequest request = invocation.getArgument(0);
                    String requestUserId = request.key().get("user_id").s();
                    
                    // Only allow update if requesting user matches owner
                    if (!requestUserId.equals(ownerUserId)) {
                        throw ConditionalCheckFailedException.builder()
                                .message("The conditional request failed")
                                .build();
                    }
                    return UpdateItemResponse.builder().build();
                });

        // Create handler with mock client
        UpdateItineraryHandler handler = new UpdateItineraryHandler(mockDynamoDb, TABLE_NAME);

        // Create update request from attacker
        APIGatewayProxyRequestEvent request = createUpdateItineraryRequest(
                attackerUserId, itineraryId, maliciousName);

        // Execute the request
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // ASSERT: Attacker gets 404, update denied (Requirement 2.6, 4.11)
        assertThat(response.getStatusCode())
                .as("Updating another user's itinerary should return 404")
                .isEqualTo(404);

        // Verify updateItem was called but failed the condition check
        verify(mockDynamoDb).updateItem(any(UpdateItemRequest.class));
    }

    /**
     * Property: Users cannot delete other users' itineraries
     * 
     * <p><b>Validates: Requirements 2.6, 4.10, 4.11</b></p>
     * 
     * <p>Property: For all distinct user IDs (userA, userB) and any valid itinerary ID
     * belonging to userB, when userA attempts to DELETE that itinerary, the system SHALL
     * return HTTP 404 and SHALL NOT delete the itinerary.
     */
    @Property
    @Label("Users cannot delete other users' itineraries")
    void userCannotDeleteAnotherUsersItinerary(
            @ForAll @AlphaChars @StringLength(min = 10, max = 50) String ownerUserId,
            @ForAll @AlphaChars @StringLength(min = 10, max = 50) String attackerUserId,
            @ForAll @AlphaChars @StringLength(min = 10, max = 30) String itineraryId
    ) {
        Assume.that(!ownerUserId.equals(attackerUserId));

        // Setup mock DynamoDB client
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);

        // Mock deleteItem to throw ConditionalCheckFailedException when wrong user
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class)))
                .thenAnswer(invocation -> {
                    DeleteItemRequest request = invocation.getArgument(0);
                    String requestUserId = request.key().get("user_id").s();
                    
                    // Only allow delete if requesting user matches owner
                    if (!requestUserId.equals(ownerUserId)) {
                        throw ConditionalCheckFailedException.builder()
                                .message("The conditional request failed")
                                .build();
                    }
                    return DeleteItemResponse.builder().build();
                });

        // Create handler with mock client
        DeleteItineraryHandler handler = new DeleteItineraryHandler(mockDynamoDb, TABLE_NAME);

        // Create delete request from attacker
        APIGatewayProxyRequestEvent request = createDeleteItineraryRequest(attackerUserId, itineraryId);

        // Execute the request
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);

        // ASSERT: Attacker gets 404, delete denied (Requirement 2.6, 4.10, 4.11)
        assertThat(response.getStatusCode())
                .as("Deleting another user's itinerary should return 404")
                .isEqualTo(404);

        // Verify deleteItem was called but failed the condition check
        verify(mockDynamoDb).deleteItem(any(DeleteItemRequest.class));
    }

    // ==================== Helper Methods ====================

    /**
     * Creates a mock API Gateway request event for GET /itineraries/{itinerary_id}
     */
    private APIGatewayProxyRequestEvent createGetItineraryRequest(String userId, String itineraryId) {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();

        // Set up path parameters
        Map<String, String> pathParameters = new HashMap<>();
        pathParameters.put("itinerary_id", itineraryId);
        request.setPathParameters(pathParameters);

        // Set up authorizer context with user_id from Cognito
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", userId);

        Map<String, Object> authorizer = new HashMap<>();
        authorizer.put("claims", claims);

        APIGatewayProxyRequestEvent.ProxyRequestContext requestContext = 
                new APIGatewayProxyRequestEvent.ProxyRequestContext();
        requestContext.setAuthorizer(authorizer);
        request.setRequestContext(requestContext);

        return request;
    }

    /**
     * Creates a mock API Gateway request event for PUT /itineraries/{itinerary_id}
     */
    private APIGatewayProxyRequestEvent createUpdateItineraryRequest(
            String userId, String itineraryId, String newName) {
        APIGatewayProxyRequestEvent request = createGetItineraryRequest(userId, itineraryId);

        // Create update request body
        Map<String, Object> updateData = new HashMap<>();
        updateData.put("name", newName);
        updateData.put("days", createMockDays());
        updateData.put("preferences", createMockPreferences());

        try {
            String body = objectMapper.writeValueAsString(updateData);
            request.setBody(body);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize update body", e);
        }

        return request;
    }

    /**
     * Creates a mock API Gateway request event for DELETE /itineraries/{itinerary_id}
     */
    private APIGatewayProxyRequestEvent createDeleteItineraryRequest(String userId, String itineraryId) {
        return createGetItineraryRequest(userId, itineraryId);
    }

    /**
     * Creates a mock DynamoDB item representing an itinerary
     */
    private Map<String, AttributeValue> createMockItineraryItem(String itineraryId, String name) {
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("itinerary_id", AttributeValue.builder().s(itineraryId).build());
        item.put("name", AttributeValue.builder().s(name).build());
        item.put("created_at", AttributeValue.builder().s("2024-01-15T10:00:00").build());
        item.put("last_modified", AttributeValue.builder().s("2024-01-15T10:00:00").build());

        try {
            // Serialize days and preferences as JSON strings
            String daysJson = objectMapper.writeValueAsString(createMockDays());
            String prefsJson = objectMapper.writeValueAsString(createMockPreferences());

            item.put("days", AttributeValue.builder().s(daysJson).build());
            item.put("preferences", AttributeValue.builder().s(prefsJson).build());
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize mock data", e);
        }

        return item;
    }

    /**
     * Creates mock days data for testing
     */
    private List<Map<String, Object>> createMockDays() {
        List<Map<String, Object>> days = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            Map<String, Object> day = new HashMap<>();
            day.put("dayNumber", i);
            day.put("places", new ArrayList<>());
            days.add(day);
        }
        return days;
    }

    /**
     * Creates mock preferences data for testing
     */
    private Map<String, Object> createMockPreferences() {
        Map<String, Object> prefs = new HashMap<>();
        prefs.put("pace", "moderate");
        prefs.put("cities", Arrays.asList("Rome", "Florence"));
        return prefs;
    }
}
