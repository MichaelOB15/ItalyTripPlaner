package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.italytrip.models.DayPlan;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.UserPreferences;
import net.jqwik.api.*;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based test for Delete Then Retrieve verification.
 * 
 * **Validates: Requirements 3.6**
 * 
 * **Property 6: Delete Then Retrieve Returns Not Found**
 * 
 * For any valid itinerary that exists, after deleting it via 
 * DELETE /itineraries/{id}, attempting to retrieve it via 
 * GET /itineraries/{id} SHALL return HTTP 404 Not Found.
 * 
 * This test verifies that deletion correctly removes itineraries from 
 * DynamoDB and that subsequent retrieval operations properly recognize 
 * the itinerary no longer exists.
 */
class DeleteVerificationPropertyTest {
    
    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "test-user-123";
    private ObjectMapper objectMapper;
    private Context mockContext;
    
    /**
     * Property test: After deleting an itinerary, attempting to retrieve it returns 404.
     * 
     * This test generates many different valid itineraries, creates them, deletes them,
     * and verifies that subsequent GET requests return 404 Not Found.
     */
    @Property
    @Label("Delete then retrieve returns 404 Not Found")
    void deleteItineraryThenRetrieveReturns404(
            @ForAll("validItineraryNames") String name,
            @ForAll("validDayPlans") List<DayPlan> days,
            @ForAll("validPreferences") UserPreferences preferences
    ) throws Exception {
        // Setup
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        mockContext = Mockito.mock(Context.class);
        
        // Use a real in-memory map to simulate DynamoDB behavior
        Map<String, Map<String, AttributeValue>> inMemoryDb = new HashMap<>();
        DynamoDbClient mockDynamoDb = createMockDynamoDbClient(inMemoryDb);
        
        CreateItineraryHandler createHandler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        DeleteItineraryHandler deleteHandler = new DeleteItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        GetItineraryHandler getHandler = new GetItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Step 1: Create an itinerary
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("name", name);
        requestBody.put("days", days);
        requestBody.put("preferences", preferences);
        
        String jsonBody = objectMapper.writeValueAsString(requestBody);
        APIGatewayProxyRequestEvent createRequest = createAuthenticatedRequest(jsonBody, null);
        
        APIGatewayProxyResponseEvent createResponse = createHandler.handleRequest(createRequest, mockContext);
        
        // Verify create succeeded
        assertEquals(201, createResponse.getStatusCode(), 
                "Create itinerary should return 201 Created");
        
        // Parse created itinerary to get its ID
        Map<String, Object> createResponseBody = objectMapper.readValue(
                createResponse.getBody(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> createdItinerary = (Map<String, Object>) createResponseBody.get("itinerary");
        String itineraryId = (String) createdItinerary.get("id");
        
        assertNotNull(itineraryId, "Created itinerary should have an ID");
        
        // Step 2: Verify the itinerary exists (sanity check)
        APIGatewayProxyRequestEvent getRequestBefore = createAuthenticatedRequest(null, itineraryId);
        APIGatewayProxyResponseEvent getResponseBefore = getHandler.handleRequest(getRequestBefore, mockContext);
        
        assertEquals(200, getResponseBefore.getStatusCode(),
                "Get itinerary should return 200 OK before deletion");
        
        // Step 3: Delete the itinerary
        APIGatewayProxyRequestEvent deleteRequest = createAuthenticatedRequest(null, itineraryId);
        APIGatewayProxyResponseEvent deleteResponse = deleteHandler.handleRequest(deleteRequest, mockContext);
        
        // Verify delete succeeded
        assertEquals(204, deleteResponse.getStatusCode(),
                "Delete itinerary should return 204 No Content");
        
        // Step 4: Attempt to retrieve the deleted itinerary
        APIGatewayProxyRequestEvent getRequestAfter = createAuthenticatedRequest(null, itineraryId);
        APIGatewayProxyResponseEvent getResponseAfter = getHandler.handleRequest(getRequestAfter, mockContext);
        
        // PROPERTY VERIFICATION: GET after DELETE must return 404
        assertEquals(404, getResponseAfter.getStatusCode(),
                "Get itinerary should return 404 Not Found after deletion");
        
        // Verify the error response contains appropriate message
        String errorBody = getResponseAfter.getBody();
        assertNotNull(errorBody, "Error response should have a body");
        assertTrue(errorBody.contains("not found") || errorBody.contains("Not Found"),
                "Error message should indicate itinerary was not found");
        
        // Verify the itinerary was actually removed from storage
        String storageKey = TEST_USER_ID + "#" + itineraryId;
        assertFalse(inMemoryDb.containsKey(storageKey),
                "Itinerary should be removed from storage after deletion");
    }
    
    /**
     * Property test: Multiple deletes of the same itinerary all return appropriate status.
     * 
     * This test verifies that attempting to delete an already-deleted itinerary
     * returns 404 (idempotent behavior for DELETE operations).
     */
    @Property
    @Label("Multiple deletes return 404 for already deleted itinerary")
    void multipleDeletesReturnNotFound(
            @ForAll("validItineraryNames") String name,
            @ForAll("validDayPlans") List<DayPlan> days,
            @ForAll("validPreferences") UserPreferences preferences
    ) throws Exception {
        // Setup
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        mockContext = Mockito.mock(Context.class);
        
        Map<String, Map<String, AttributeValue>> inMemoryDb = new HashMap<>();
        DynamoDbClient mockDynamoDb = createMockDynamoDbClient(inMemoryDb);
        
        CreateItineraryHandler createHandler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        DeleteItineraryHandler deleteHandler = new DeleteItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Create an itinerary
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("name", name);
        requestBody.put("days", days);
        requestBody.put("preferences", preferences);
        
        String jsonBody = objectMapper.writeValueAsString(requestBody);
        APIGatewayProxyRequestEvent createRequest = createAuthenticatedRequest(jsonBody, null);
        
        APIGatewayProxyResponseEvent createResponse = createHandler.handleRequest(createRequest, mockContext);
        assertEquals(201, createResponse.getStatusCode());
        
        Map<String, Object> createResponseBody = objectMapper.readValue(
                createResponse.getBody(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> createdItinerary = (Map<String, Object>) createResponseBody.get("itinerary");
        String itineraryId = (String) createdItinerary.get("id");
        
        // First delete - should succeed
        APIGatewayProxyRequestEvent deleteRequest1 = createAuthenticatedRequest(null, itineraryId);
        APIGatewayProxyResponseEvent deleteResponse1 = deleteHandler.handleRequest(deleteRequest1, mockContext);
        
        assertEquals(204, deleteResponse1.getStatusCode(),
                "First delete should return 204 No Content");
        
        // Second delete - should return 404 (already deleted)
        APIGatewayProxyRequestEvent deleteRequest2 = createAuthenticatedRequest(null, itineraryId);
        APIGatewayProxyResponseEvent deleteResponse2 = deleteHandler.handleRequest(deleteRequest2, mockContext);
        
        // PROPERTY VERIFICATION: Second delete must return 404
        assertEquals(404, deleteResponse2.getStatusCode(),
                "Second delete should return 404 Not Found (itinerary already deleted)");
    }
    
    /**
     * Property test: Delete does not affect other itineraries for the same user.
     * 
     * This test verifies that deleting one itinerary does not accidentally
     * delete or affect other itineraries belonging to the same user.
     */
    @Property
    @Label("Delete only affects the targeted itinerary")
    void deleteDoesNotAffectOtherItineraries(
            @ForAll("validItineraryNames") String name1,
            @ForAll("validItineraryNames") String name2,
            @ForAll("validDayPlans") List<DayPlan> days,
            @ForAll("validPreferences") UserPreferences preferences
    ) throws Exception {
        // Only run if names are different
        Assume.that(!name1.equals(name2));
        
        // Setup
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        mockContext = Mockito.mock(Context.class);
        
        Map<String, Map<String, AttributeValue>> inMemoryDb = new HashMap<>();
        DynamoDbClient mockDynamoDb = createMockDynamoDbClient(inMemoryDb);
        
        CreateItineraryHandler createHandler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        DeleteItineraryHandler deleteHandler = new DeleteItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        GetItineraryHandler getHandler = new GetItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Create first itinerary
        Map<String, Object> requestBody1 = new HashMap<>();
        requestBody1.put("name", name1);
        requestBody1.put("days", days);
        requestBody1.put("preferences", preferences);
        
        String jsonBody1 = objectMapper.writeValueAsString(requestBody1);
        APIGatewayProxyRequestEvent createRequest1 = createAuthenticatedRequest(jsonBody1, null);
        APIGatewayProxyResponseEvent createResponse1 = createHandler.handleRequest(createRequest1, mockContext);
        
        Map<String, Object> createResponseBody1 = objectMapper.readValue(
                createResponse1.getBody(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> createdItinerary1 = (Map<String, Object>) createResponseBody1.get("itinerary");
        String itineraryId1 = (String) createdItinerary1.get("id");
        
        // Create second itinerary
        Map<String, Object> requestBody2 = new HashMap<>();
        requestBody2.put("name", name2);
        requestBody2.put("days", days);
        requestBody2.put("preferences", preferences);
        
        String jsonBody2 = objectMapper.writeValueAsString(requestBody2);
        APIGatewayProxyRequestEvent createRequest2 = createAuthenticatedRequest(jsonBody2, null);
        APIGatewayProxyResponseEvent createResponse2 = createHandler.handleRequest(createRequest2, mockContext);
        
        Map<String, Object> createResponseBody2 = objectMapper.readValue(
                createResponse2.getBody(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> createdItinerary2 = (Map<String, Object>) createResponseBody2.get("itinerary");
        String itineraryId2 = (String) createdItinerary2.get("id");
        
        // Delete first itinerary only
        APIGatewayProxyRequestEvent deleteRequest = createAuthenticatedRequest(null, itineraryId1);
        APIGatewayProxyResponseEvent deleteResponse = deleteHandler.handleRequest(deleteRequest, mockContext);
        
        assertEquals(204, deleteResponse.getStatusCode(),
                "Delete first itinerary should succeed");
        
        // PROPERTY VERIFICATION: Second itinerary should still exist
        APIGatewayProxyRequestEvent getRequest = createAuthenticatedRequest(null, itineraryId2);
        APIGatewayProxyResponseEvent getResponse = getHandler.handleRequest(getRequest, mockContext);
        
        assertEquals(200, getResponse.getStatusCode(),
                "Second itinerary should still be retrievable after deleting first itinerary");
        
        Map<String, Object> getResponseBody = objectMapper.readValue(
                getResponse.getBody(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> retrievedItinerary = (Map<String, Object>) getResponseBody.get("itinerary");
        
        assertEquals(itineraryId2, retrievedItinerary.get("id"),
                "Retrieved itinerary should be the second one");
        assertEquals(name2, retrievedItinerary.get("name"),
                "Second itinerary should have correct name");
    }
    
    /**
     * Provides valid itinerary names for property testing.
     * Names must not have leading/trailing whitespace (validation requirement).
     */
    @Provide
    Arbitrary<String> validItineraryNames() {
        return Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars(' ', '-', ',')
                .ofMinLength(1)
                .ofMaxLength(180)
                .map(String::trim)
                .filter(s -> !s.isEmpty()); // Ensure not empty after trimming
    }
    
    /**
     * Provides valid day plans (exactly 3 days).
     */
    @Provide
    Arbitrary<List<DayPlan>> validDayPlans() {
        return Arbitraries.of(1, 2, 3)
                .list()
                .ofSize(3)
                .map(dayNumbers -> {
                    List<DayPlan> days = new ArrayList<>();
                    for (int i = 0; i < 3; i++) {
                        DayPlan day = new DayPlan(i + 1);
                        // Optionally add some places
                        if (Math.random() > 0.5) {
                            List<Place> places = generateRandomPlaces();
                            day.setPlaces(places);
                        }
                        days.add(day);
                    }
                    return days;
                });
    }
    
    /**
     * Provides valid user preferences for property testing.
     */
    @Provide
    Arbitrary<UserPreferences> validPreferences() {
        return Combinators.combine(
                validCities(),
                validInterests(),
                validTripPace(),
                validPriceRange()
        ).as((cities, interests, pace, priceRange) -> {
            UserPreferences.Builder builder = new UserPreferences.Builder();
            cities.forEach(builder::addCity);
            interests.forEach(builder::addInterest);
            if (pace != null) {
                builder.pace(pace);
            }
            if (priceRange != null) {
                builder.priceRange(priceRange);
            }
            return builder.build();
        });
    }
    
    @Provide
    Arbitrary<List<String>> validCities() {
        List<String> italianCities = Arrays.asList(
                "Rome", "Florence", "Venice", "Milan", "Naples", 
                "Cinque Terre", "Amalfi Coast", "Tuscany"
        );
        return Arbitraries.of(italianCities)
                .list()
                .ofMinSize(1)
                .ofMaxSize(3)
                .map(cities -> cities.stream().distinct().collect(java.util.stream.Collectors.toList()));
    }
    
    @Provide
    Arbitrary<List<String>> validInterests() {
        List<String> interests = Arrays.asList(
                "art", "history", "food", "architecture", "nature", 
                "beaches", "museums", "shopping", "nightlife"
        );
        return Arbitraries.of(interests)
                .list()
                .ofMinSize(1)
                .ofMaxSize(5)
                .map(items -> items.stream().distinct().collect(java.util.stream.Collectors.toList()));
    }
    
    @Provide
    Arbitrary<UserPreferences.TripPace> validTripPace() {
        return Arbitraries.of(
                UserPreferences.TripPace.RELAXED,
                UserPreferences.TripPace.MODERATE,
                UserPreferences.TripPace.PACKED
        );
    }
    
    @Provide
    Arbitrary<List<String>> validPriceRange() {
        List<String> priceRanges = Arrays.asList("€", "€€", "€€€");
        return Arbitraries.of(priceRanges)
                .list()
                .ofMinSize(1)
                .ofMaxSize(3)
                .map(ranges -> ranges.stream().distinct().collect(java.util.stream.Collectors.toList()));
    }
    
    /**
     * Helper method to generate random places for day plans.
     */
    private List<Place> generateRandomPlaces() {
        List<Place> places = new ArrayList<>();
        int numPlaces = (int) (Math.random() * 3) + 1; // 1-3 places
        
        for (int i = 0; i < numPlaces; i++) {
            Place place = new Place();
            place.setId("place-" + i);
            place.setName("Test Place " + i);
            place.setCity("Rome");
            place.setType(PlaceType.MUSEUM);
            place.setLatitude(41.9 + Math.random() * 0.1);
            place.setLongitude(12.5 + Math.random() * 0.1);
            places.add(place);
        }
        
        return places;
    }
    
    /**
     * Creates a mock DynamoDB client that uses an in-memory map for storage.
     * This simulates DynamoDB behavior for testing delete operations.
     */
    private DynamoDbClient createMockDynamoDbClient(Map<String, Map<String, AttributeValue>> storage) {
        DynamoDbClient mockClient = Mockito.mock(DynamoDbClient.class);
        
        // Mock PutItem operation
        Mockito.when(mockClient.putItem(Mockito.any(PutItemRequest.class)))
                .thenAnswer(invocation -> {
                    PutItemRequest request = invocation.getArgument(0);
                    String userId = request.item().get("user_id").s();
                    String itineraryId = request.item().get("itinerary_id").s();
                    String key = userId + "#" + itineraryId;
                    storage.put(key, new HashMap<>(request.item()));
                    return PutItemResponse.builder().build();
                });
        
        // Mock GetItem operation
        Mockito.when(mockClient.getItem(Mockito.any(GetItemRequest.class)))
                .thenAnswer(invocation -> {
                    GetItemRequest request = invocation.getArgument(0);
                    String userId = request.key().get("user_id").s();
                    String itineraryId = request.key().get("itinerary_id").s();
                    String key = userId + "#" + itineraryId;
                    
                    Map<String, AttributeValue> item = storage.get(key);
                    if (item == null) {
                        return GetItemResponse.builder().build();
                    }
                    return GetItemResponse.builder().item(item).build();
                });
        
        // Mock DeleteItem operation
        Mockito.when(mockClient.deleteItem(Mockito.any(DeleteItemRequest.class)))
                .thenAnswer(invocation -> {
                    DeleteItemRequest request = invocation.getArgument(0);
                    String userId = request.key().get("user_id").s();
                    String itineraryId = request.key().get("itinerary_id").s();
                    String key = userId + "#" + itineraryId;
                    
                    // Check if item exists (for condition expression)
                    if (!storage.containsKey(key)) {
                        throw ConditionalCheckFailedException.builder()
                                .message("Condition check failed")
                                .build();
                    }
                    
                    // Delete the item
                    storage.remove(key);
                    return DeleteItemResponse.builder().build();
                });
        
        return mockClient;
    }
    
    /**
     * Creates an authenticated API Gateway request event with proper authorizer context.
     */
    private APIGatewayProxyRequestEvent createAuthenticatedRequest(String body, String itineraryId) {
        APIGatewayProxyRequestEvent event = new APIGatewayProxyRequestEvent();
        
        if (body != null) {
            event.setBody(body);
        }
        
        // Set up path parameters for GET/DELETE requests
        if (itineraryId != null) {
            Map<String, String> pathParams = new HashMap<>();
            pathParams.put("itinerary_id", itineraryId);
            event.setPathParameters(pathParams);
        }
        
        // Set up authorizer context with user claims
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", TEST_USER_ID);
        claims.put("email", "test@example.com");
        
        Map<String, Object> authorizer = new HashMap<>();
        authorizer.put("claims", claims);
        
        APIGatewayProxyRequestEvent.ProxyRequestContext requestContext = 
                new APIGatewayProxyRequestEvent.ProxyRequestContext();
        requestContext.setAuthorizer(authorizer);
        event.setRequestContext(requestContext);
        
        return event;
    }
}
