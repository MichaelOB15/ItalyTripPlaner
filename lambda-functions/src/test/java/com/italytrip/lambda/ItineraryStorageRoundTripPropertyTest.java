package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.italytrip.models.DayPlan;
import com.italytrip.models.Itinerary;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.UserPreferences;
import net.jqwik.api.*;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based test for Itinerary Storage Round-Trip.
 * 
 * **Validates: Requirements 3.2, 3.3**
 * 
 * **Property 3: Itinerary Storage Round-Trip**
 * 
 * For any valid itinerary data, creating the itinerary via POST /itineraries 
 * and then retrieving it via GET /itineraries/{id} SHALL return an itinerary 
 * object with all fields (id, name, days, preferences, created_at, last_modified) 
 * preserved.
 * 
 * This test verifies that the data stored in DynamoDB can be retrieved correctly
 * - what you save is what you get back. It tests the serialization/deserialization
 * round-trip through DynamoDB storage.
 */
class ItineraryStorageRoundTripPropertyTest {
    
    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "test-user-123";
    private ObjectMapper objectMapper;
    private Context mockContext;
    
    /**
     * Property test: For any valid itinerary data, what you save is what you get back.
     * 
     * This test generates many different valid itinerary configurations and verifies
     * that after creating an itinerary (POST) and then retrieving it (GET), all
     * fields are preserved correctly.
     */
    @Property
    @Label("Storage round-trip preserves all itinerary fields")
    void itineraryStorageRoundTrip(
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
        GetItineraryHandler getHandler = new GetItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Create request for POST /itineraries
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("name", name);
        requestBody.put("days", days);
        requestBody.put("preferences", preferences);
        
        String jsonBody = objectMapper.writeValueAsString(requestBody);
        APIGatewayProxyRequestEvent createRequest = createAuthenticatedRequest(jsonBody, null);
        
        // Execute CREATE operation
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
        
        // Execute GET operation to retrieve the itinerary
        APIGatewayProxyRequestEvent getRequest = createAuthenticatedRequest(null, itineraryId);
        APIGatewayProxyResponseEvent getResponse = getHandler.handleRequest(getRequest, mockContext);
        
        // Verify retrieve succeeded
        assertEquals(200, getResponse.getStatusCode(), 
                "Get itinerary should return 200 OK");
        
        // Parse retrieved itinerary
        Map<String, Object> getResponseBody = objectMapper.readValue(
                getResponse.getBody(), Map.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> retrievedItinerary = (Map<String, Object>) getResponseBody.get("itinerary");
        
        // PROPERTY VERIFICATION: All fields must be preserved
        
        // 1. ID is preserved
        assertEquals(itineraryId, retrievedItinerary.get("id"),
                "Itinerary ID must be preserved");
        
        // 2. Name is preserved
        assertEquals(name, retrievedItinerary.get("name"),
                "Itinerary name must be preserved");
        
        // 3. Days are preserved (verify count and basic structure)
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> retrievedDays = (List<Map<String, Object>>) retrievedItinerary.get("days");
        assertNotNull(retrievedDays, "Days field must not be null");
        assertEquals(3, retrievedDays.size(), "Must have exactly 3 days");
        
        // Verify each day's structure is preserved
        for (int i = 0; i < 3; i++) {
            Map<String, Object> retrievedDay = retrievedDays.get(i);
            DayPlan originalDay = days.get(i);
            
            assertEquals(originalDay.getDayNumber(), retrievedDay.get("dayNumber"),
                    "Day " + (i+1) + " number must be preserved");
            
            // Verify places are preserved
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> retrievedPlaces = 
                    (List<Map<String, Object>>) retrievedDay.get("places");
            if (originalDay.getPlaces() != null) {
                assertNotNull(retrievedPlaces, 
                        "Day " + (i+1) + " places must not be null if originally set");
                assertEquals(originalDay.getPlaces().size(), retrievedPlaces.size(),
                        "Day " + (i+1) + " must have same number of places");
            }
        }
        
        // 4. Preferences are preserved
        @SuppressWarnings("unchecked")
        Map<String, Object> retrievedPreferences = 
                (Map<String, Object>) retrievedItinerary.get("preferences");
        assertNotNull(retrievedPreferences, "Preferences field must not be null");
        
        if (preferences.getCities() != null && !preferences.getCities().isEmpty()) {
            @SuppressWarnings("unchecked")
            List<String> retrievedCities = (List<String>) retrievedPreferences.get("cities");
            assertNotNull(retrievedCities, "Cities must be preserved");
            assertEquals(preferences.getCities().size(), retrievedCities.size(),
                    "Number of cities must be preserved");
            assertTrue(retrievedCities.containsAll(preferences.getCities()),
                    "All cities must be preserved");
        }
        
        // 5. Timestamps are preserved (created_at and last_modified)
        assertNotNull(retrievedItinerary.get("created_at"),
                "created_at timestamp must be preserved");
        assertNotNull(retrievedItinerary.get("last_modified"),
                "last_modified timestamp must be preserved");
    }
    
    /**
     * Provides valid itinerary names for property testing.
     */
    @Provide
    Arbitrary<String> validItineraryNames() {
        return Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars(' ', '-', '\'', ',')
                .ofMinLength(1)
                .ofMaxLength(200);
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
                .map(cities -> cities.stream().distinct().collect(Collectors.toList()));
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
                .map(items -> items.stream().distinct().collect(Collectors.toList()));
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
                .map(ranges -> ranges.stream().distinct().collect(Collectors.toList()));
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
     * This simulates DynamoDB behavior for testing round-trip serialization.
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
        
        // Set up path parameters for GET requests
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
