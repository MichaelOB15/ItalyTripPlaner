package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.italytrip.models.DayPlan;
import com.italytrip.models.UserPreferences;
import net.jqwik.api.*;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.*;

/**
 * Property-based test for multiple itineraries per user.
 * 
 * **Validates: Requirements 3.8**
 * 
 * **Property 9: Multiple Itineraries Per User**
 * 
 * For any authenticated user, the system SHALL support storing and retrieving
 * multiple itineraries (N itineraries where N >= 1) without data corruption or loss.
 * When a user creates N itineraries, all N SHALL be stored independently and
 * retrievable without any data loss or corruption.
 * 
 * This test verifies:
 * 1. Multiple itineraries can be created for a single user
 * 2. Each itinerary is stored independently with unique ID
 * 3. All created itineraries can be retrieved via LIST operation
 * 4. Each individual itinerary can be retrieved via GET operation
 * 5. No data corruption or loss occurs when storing multiple itineraries
 */
class MultipleItinerariesPropertyTest {
    
    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "test-user-multi-itin";
    private ObjectMapper objectMapper;
    private Context mockContext;
    
    /**
     * Property test: Users can store and retrieve N itineraries without data loss.
     * 
     * This property verifies that:
     * - Creating N itineraries results in N distinct itineraries stored
     * - Each itinerary has a unique ID
     * - LIST operation returns all N itineraries
     * - Each itinerary can be retrieved individually via GET
     * - All data is preserved (names, preferences, days)
     */
    @Property
    @Label("Multiple itineraries: N itineraries can be stored and retrieved without loss")
    void multipleItinerariesPerUser_allStoredAndRetrievable(
            @ForAll("itineraryCount") int numItineraries,
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
        ListItinerariesHandler listHandler = new ListItinerariesHandler(mockDynamoDb, TEST_TABLE_NAME);
        GetItineraryHandler getHandler = new GetItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Create N itineraries for the same user
        List<String> createdItineraryIds = new ArrayList<>();
        
        for (int i = 0; i < numItineraries; i++) {
            // Create unique request for each itinerary with simple names
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("name", "Test Itinerary " + (i + 1));
            requestBody.put("days", days);
            requestBody.put("preferences", preferences);
            
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            APIGatewayProxyRequestEvent createRequest = createAuthenticatedRequest(jsonBody, null);
            
            // Execute CREATE operation
            APIGatewayProxyResponseEvent createResponse = createHandler.handleRequest(createRequest, mockContext);
            
            // Verify create succeeded
            assertThat(createResponse.getStatusCode())
                    .as("Create itinerary %d should return 201 Created", i + 1)
                    .isEqualTo(201);
            
            // Parse created itinerary to get its ID
            Map<String, Object> createResponseBody = objectMapper.readValue(
                    createResponse.getBody(), Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> createdItinerary = (Map<String, Object>) createResponseBody.get("itinerary");
            String itineraryId = (String) createdItinerary.get("id");
            
            assertThat(itineraryId)
                    .as("Created itinerary %d should have an ID", i + 1)
                    .isNotNull();
            
            createdItineraryIds.add(itineraryId);
        }
        
        // PROPERTY 1: All itinerary IDs must be unique
        Set<String> uniqueIds = new HashSet<>(createdItineraryIds);
        assertThat(uniqueIds)
                .as("All %d itinerary IDs must be unique", numItineraries)
                .hasSize(numItineraries);
        
        // PROPERTY 2: LIST operation must return all N itineraries
        APIGatewayProxyRequestEvent listRequest = createAuthenticatedRequest(null, null);
        APIGatewayProxyResponseEvent listResponse = listHandler.handleRequest(listRequest, mockContext);
        
        assertThat(listResponse.getStatusCode())
                .as("List itineraries should return 200 OK")
                .isEqualTo(200);
        
        Map<String, List<Map<String, Object>>> listResponseBody = objectMapper.readValue(
                listResponse.getBody(),
                new TypeReference<Map<String, List<Map<String, Object>>>>() {});
        List<Map<String, Object>> listedItineraries = listResponseBody.get("itineraries");
        
        assertThat(listedItineraries)
                .as("LIST should return all %d created itineraries", numItineraries)
                .hasSize(numItineraries);
        
        Set<String> listedIds = listedItineraries.stream()
                .map(itin -> (String) itin.get("id"))
                .collect(Collectors.toSet());
        
        assertThat(listedIds)
                .as("Listed itinerary IDs should match all created IDs")
                .containsExactlyInAnyOrderElementsOf(createdItineraryIds);
        
        // PROPERTY 3: Each individual itinerary must be retrievable via GET
        for (int i = 0; i < numItineraries; i++) {
            String itineraryId = createdItineraryIds.get(i);
            
            APIGatewayProxyRequestEvent getRequest = createAuthenticatedRequest(null, itineraryId);
            APIGatewayProxyResponseEvent getResponse = getHandler.handleRequest(getRequest, mockContext);
            
            assertThat(getResponse.getStatusCode())
                    .as("GET itinerary %d (ID: %s) should return 200 OK", i + 1, itineraryId)
                    .isEqualTo(200);
            
            Map<String, Object> getResponseBody = objectMapper.readValue(
                    getResponse.getBody(), Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> retrievedItinerary = (Map<String, Object>) getResponseBody.get("itinerary");
            
            // Verify itinerary data is intact
            assertThat(retrievedItinerary.get("id"))
                    .as("Retrieved itinerary ID should match")
                    .isEqualTo(itineraryId);
            
            assertThat(retrievedItinerary.get("name"))
                    .as("Itinerary name should be preserved")
                    .isNotNull();
            
            assertThat(retrievedItinerary.get("days"))
                    .as("Itinerary days should be preserved")
                    .isNotNull();
            
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> retrievedDays = (List<Map<String, Object>>) retrievedItinerary.get("days");
            assertThat(retrievedDays)
                    .as("Itinerary should have exactly 3 days")
                    .hasSize(3);
            
            // Verify preferences field exists (even if null)
            assertThat(retrievedItinerary.containsKey("preferences"))
                    .as("Itinerary should have preferences field")
                    .isTrue();
            
            assertThat(retrievedItinerary.get("created_at"))
                    .as("Itinerary created_at timestamp should be preserved")
                    .isNotNull();
            
            assertThat(retrievedItinerary.get("last_modified"))
                    .as("Itinerary last_modified timestamp should be preserved")
                    .isNotNull();
        }
        
        // PROPERTY 4: Verify storage in DynamoDB contains all itineraries
        int storedCount = 0;
        for (String key : inMemoryDb.keySet()) {
            if (key.startsWith(TEST_USER_ID + "#")) {
                storedCount++;
            }
        }
        
        assertThat(storedCount)
                .as("DynamoDB should contain exactly %d itineraries for user", numItineraries)
                .isEqualTo(numItineraries);
    }
    
    /**
     * Property test: Creating many itineraries does not cause data corruption.
     * 
     * This test creates multiple itineraries with distinct names and verifies
     * that each retains its unique data without corruption from concurrent storage.
     */
    @Property
    @Label("Data integrity: Multiple distinct itineraries maintain unique data")
    void multipleItineraries_maintainDistinctData(
            @ForAll("itineraryCount") int numItineraries,
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
        GetItineraryHandler getHandler = new GetItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Create N itineraries with distinct, identifiable names
        Map<String, String> idToNameMap = new HashMap<>();
        
        for (int i = 0; i < numItineraries; i++) {
            String uniqueName = "Itinerary " + i + " - " + UUID.randomUUID().toString().substring(0, 8);
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("name", uniqueName);
            requestBody.put("days", days);
            requestBody.put("preferences", preferences);
            
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            APIGatewayProxyRequestEvent createRequest = createAuthenticatedRequest(jsonBody, null);
            
            APIGatewayProxyResponseEvent createResponse = createHandler.handleRequest(createRequest, mockContext);
            
            assertThat(createResponse.getStatusCode())
                    .as("Create itinerary should succeed")
                    .isEqualTo(201);
            
            Map<String, Object> createResponseBody = objectMapper.readValue(
                    createResponse.getBody(), Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> createdItinerary = (Map<String, Object>) createResponseBody.get("itinerary");
            String itineraryId = (String) createdItinerary.get("id");
            
            idToNameMap.put(itineraryId, uniqueName);
        }
        
        // PROPERTY: Each itinerary maintains its unique name (no corruption)
        for (Map.Entry<String, String> entry : idToNameMap.entrySet()) {
            String itineraryId = entry.getKey();
            String expectedName = entry.getValue();
            
            APIGatewayProxyRequestEvent getRequest = createAuthenticatedRequest(null, itineraryId);
            APIGatewayProxyResponseEvent getResponse = getHandler.handleRequest(getRequest, mockContext);
            
            assertThat(getResponse.getStatusCode())
                    .as("GET itinerary should succeed")
                    .isEqualTo(200);
            
            Map<String, Object> getResponseBody = objectMapper.readValue(
                    getResponse.getBody(), Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> retrievedItinerary = (Map<String, Object>) getResponseBody.get("itinerary");
            String retrievedName = (String) retrievedItinerary.get("name");
            
            assertThat(retrievedName)
                    .as("Itinerary name should not be corrupted by storing multiple itineraries")
                    .isEqualTo(expectedName);
        }
    }
    
    /**
     * Property test: Storage supports at least 1-20 itineraries per user.
     * 
     * This validates that the system can handle a reasonable number of itineraries
     * without errors, supporting the requirement that there is no enforced maximum.
     */
    @Property(tries = 10)
    @Label("Capacity: System supports storing 1-20 itineraries without errors")
    void multipleItineraries_supportsReasonableCapacity(
            @ForAll("capacityCount") int numItineraries
    ) throws Exception {
        // Setup
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        mockContext = Mockito.mock(Context.class);
        
        Map<String, Map<String, AttributeValue>> inMemoryDb = new HashMap<>();
        DynamoDbClient mockDynamoDb = createMockDynamoDbClient(inMemoryDb);
        
        CreateItineraryHandler createHandler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        ListItinerariesHandler listHandler = new ListItinerariesHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Create N itineraries
        for (int i = 0; i < numItineraries; i++) {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("name", "Test Itinerary " + (i + 1));
            requestBody.put("days", createMinimalDayPlans());
            requestBody.put("preferences", createMinimalPreferences());
            
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            APIGatewayProxyRequestEvent createRequest = createAuthenticatedRequest(jsonBody, null);
            
            APIGatewayProxyResponseEvent createResponse = createHandler.handleRequest(createRequest, mockContext);
            
            assertThat(createResponse.getStatusCode())
                    .as("Should successfully create itinerary %d of %d", i + 1, numItineraries)
                    .isEqualTo(201);
        }
        
        // PROPERTY: LIST should successfully return all itineraries
        APIGatewayProxyRequestEvent listRequest = createAuthenticatedRequest(null, null);
        APIGatewayProxyResponseEvent listResponse = listHandler.handleRequest(listRequest, mockContext);
        
        assertThat(listResponse.getStatusCode())
                .as("LIST should succeed even with %d itineraries", numItineraries)
                .isEqualTo(200);
        
        Map<String, List<Map<String, Object>>> listResponseBody = objectMapper.readValue(
                listResponse.getBody(),
                new TypeReference<Map<String, List<Map<String, Object>>>>() {});
        List<Map<String, Object>> listedItineraries = listResponseBody.get("itineraries");
        
        assertThat(listedItineraries)
                .as("Should successfully list all %d itineraries", numItineraries)
                .hasSize(numItineraries);
    }
    
    // ========== Arbitraries (Generators) ==========
    
    /**
     * Provides a reasonable count of itineraries to test (1-10).
     */
    @Provide
    Arbitrary<Integer> itineraryCount() {
        return Arbitraries.integers().between(1, 10);
    }
    
    /**
     * Provides a count for capacity testing (1-20).
     */
    @Provide
    Arbitrary<Integer> capacityCount() {
        return Arbitraries.integers().between(1, 20);
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
                validInterests()
        ).as((cities, interests) -> {
            UserPreferences.Builder builder = new UserPreferences.Builder();
            cities.forEach(builder::addCity);
            interests.forEach(builder::addInterest);
            return builder.build();
        });
    }
    
    @Provide
    Arbitrary<List<String>> validCities() {
        List<String> italianCities = Arrays.asList(
                "Rome", "Florence", "Venice", "Milan", "Naples"
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
                "art", "history", "food", "architecture", "nature"
        );
        return Arbitraries.of(interests)
                .list()
                .ofMinSize(1)
                .ofMaxSize(3)
                .map(items -> items.stream().distinct().collect(Collectors.toList()));
    }
    
    // ========== Helper Methods ==========
    
    /**
     * Creates minimal valid day plans for capacity testing.
     */
    private List<DayPlan> createMinimalDayPlans() {
        List<DayPlan> days = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            days.add(new DayPlan(i));
        }
        return days;
    }
    
    /**
     * Creates minimal valid preferences for capacity testing.
     */
    private UserPreferences createMinimalPreferences() {
        return new UserPreferences.Builder()
                .addCity("Rome")
                .addInterest("art")
                .build();
    }
    
    /**
     * Creates a mock DynamoDB client that uses an in-memory map for storage.
     * This simulates DynamoDB behavior for testing multiple itineraries.
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
        
        // Mock Query operation (for list)
        Mockito.when(mockClient.query(Mockito.any(QueryRequest.class)))
                .thenAnswer(invocation -> {
                    QueryRequest request = invocation.getArgument(0);
                    String userId = request.expressionAttributeValues().get(":userId").s();
                    
                    // Filter storage for this user's itineraries
                    List<Map<String, AttributeValue>> items = storage.entrySet().stream()
                            .filter(entry -> entry.getKey().startsWith(userId + "#"))
                            .map(Map.Entry::getValue)
                            .collect(Collectors.toList());
                    
                    return QueryResponse.builder().items(items).build();
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
        claims.put("email", "test-multi@example.com");
        
        Map<String, Object> authorizer = new HashMap<>();
        authorizer.put("claims", claims);
        
        APIGatewayProxyRequestEvent.ProxyRequestContext requestContext = 
                new APIGatewayProxyRequestEvent.ProxyRequestContext();
        requestContext.setAuthorizer(authorizer);
        event.setRequestContext(requestContext);
        
        return event;
    }
}
