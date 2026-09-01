package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.italytrip.models.DayPlan;
import com.italytrip.models.UserPreferences;
import net.jqwik.api.*;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based test for Unique Itinerary ID Generation.
 * 
 * **Validates: Requirements 4.2**
 * 
 * **Property 7: Unique Itinerary ID Generation**
 * 
 * When creating multiple itineraries (even concurrently), each created itinerary
 * SHALL receive a unique itinerary_id. No two itineraries should ever have the
 * same ID, even when created simultaneously by the same or different users.
 * 
 * This test verifies that the ID generation mechanism (itin_{timestamp}_{uuid})
 * produces unique identifiers across many concurrent creation operations.
 */
class UniqueIdGenerationPropertyTest {
    
    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "test-user-123";
    private ObjectMapper objectMapper;
    private Context mockContext;
    
    /**
     * Property test: Creating multiple itineraries produces unique IDs.
     * 
     * This test generates many itinerary creation requests and verifies that
     * all resulting itinerary IDs are unique. It tests both sequential and
     * concurrent creation scenarios.
     */
    @Property(tries = 50)
    @Label("Multiple itinerary creations produce unique IDs")
    void multipleItineraryCreationsProduceUniqueIds(
            @ForAll("itineraryCount") int count
    ) throws Exception {
        // Setup
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        mockContext = Mockito.mock(Context.class);
        
        // Use a concurrent map to simulate DynamoDB and track all IDs
        Map<String, Map<String, AttributeValue>> inMemoryDb = new ConcurrentHashMap<>();
        DynamoDbClient mockDynamoDb = createMockDynamoDbClient(inMemoryDb);
        
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Create multiple itineraries
        Set<String> generatedIds = ConcurrentHashMap.newKeySet();
        List<APIGatewayProxyResponseEvent> responses = new ArrayList<>();
        
        // Create itineraries sequentially to collect all IDs
        for (int i = 0; i < count; i++) {
            // Create request with simple valid data
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("name", "Test Itinerary " + i);
            requestBody.put("days", createSimpleDayPlans());
            requestBody.put("preferences", createSimplePreferences());
            
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            APIGatewayProxyRequestEvent request = createAuthenticatedRequest(jsonBody);
            
            // Execute CREATE operation
            APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
            responses.add(response);
            
            // Verify creation succeeded
            assertEquals(201, response.getStatusCode(), 
                    "Create itinerary should return 201 Created");
            
            // Extract the generated ID
            Map<String, Object> responseBody = objectMapper.readValue(
                    response.getBody(), Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> itinerary = (Map<String, Object>) responseBody.get("itinerary");
            String itineraryId = (String) itinerary.get("id");
            
            assertNotNull(itineraryId, "Generated ID should not be null");
            assertTrue(itineraryId.startsWith("itin_"), 
                    "Generated ID should follow format itin_{timestamp}_{uuid}");
            
            generatedIds.add(itineraryId);
        }
        
        // PROPERTY VERIFICATION: All IDs must be unique
        assertEquals(count, generatedIds.size(), 
                "All " + count + " generated IDs must be unique");
        
        // Verify no duplicate IDs in the database
        assertEquals(count, inMemoryDb.size(),
                "Database should contain exactly " + count + " itineraries with unique keys");
    }
    
    /**
     * Property test: Concurrent itinerary creation produces unique IDs.
     * 
     * This test specifically targets the concurrency scenario, creating multiple
     * itineraries simultaneously using multiple threads to verify that the ID
     * generation mechanism is thread-safe and collision-free.
     */
    @Property(tries = 20)
    @Label("Concurrent itinerary creation produces unique IDs")
    void concurrentItineraryCreationProducesUniqueIds(
            @ForAll("concurrentCount") int count
    ) throws Exception {
        // Setup
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        mockContext = Mockito.mock(Context.class);
        
        // Use a concurrent map to simulate DynamoDB
        Map<String, Map<String, AttributeValue>> inMemoryDb = new ConcurrentHashMap<>();
        DynamoDbClient mockDynamoDb = createMockDynamoDbClient(inMemoryDb);
        
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        
        // Use ExecutorService to create itineraries concurrently
        ExecutorService executor = Executors.newFixedThreadPool(Math.min(count, 10));
        Set<String> generatedIds = ConcurrentHashMap.newKeySet();
        CountDownLatch latch = new CountDownLatch(count);
        
        // Submit all creation tasks simultaneously
        List<Future<String>> futures = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            final int index = i;
            Future<String> future = executor.submit(() -> {
                try {
                    // Create request with simple valid data
                    Map<String, Object> requestBody = new HashMap<>();
                    requestBody.put("name", "Concurrent Itinerary " + index);
                    requestBody.put("days", createSimpleDayPlans());
                    requestBody.put("preferences", createSimplePreferences());
                    
                    String jsonBody = objectMapper.writeValueAsString(requestBody);
                    APIGatewayProxyRequestEvent request = createAuthenticatedRequest(jsonBody);
                    
                    // Execute CREATE operation
                    APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
                    
                    // Verify creation succeeded
                    if (response.getStatusCode() != 201) {
                        throw new AssertionError("Expected 201, got " + response.getStatusCode());
                    }
                    
                    // Extract and return the generated ID
                    Map<String, Object> responseBody = objectMapper.readValue(
                            response.getBody(), Map.class);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> itinerary = (Map<String, Object>) responseBody.get("itinerary");
                    String itineraryId = (String) itinerary.get("id");
                    
                    if (itineraryId == null) {
                        throw new AssertionError("Generated ID should not be null");
                    }
                    
                    return itineraryId;
                } finally {
                    latch.countDown();
                }
            });
            futures.add(future);
        }
        
        // Wait for all tasks to complete
        latch.await(10, TimeUnit.SECONDS);
        executor.shutdown();
        executor.awaitTermination(5, TimeUnit.SECONDS);
        
        // Collect all generated IDs
        for (Future<String> future : futures) {
            String id = future.get();
            assertNotNull(id, "Generated ID should not be null");
            assertTrue(id.startsWith("itin_"), 
                    "Generated ID should follow format itin_{timestamp}_{uuid}");
            generatedIds.add(id);
        }
        
        // PROPERTY VERIFICATION: All IDs must be unique even when created concurrently
        assertEquals(count, generatedIds.size(), 
                "All " + count + " concurrently generated IDs must be unique");
        
        // Verify no duplicate IDs in the database
        assertEquals(count, inMemoryDb.size(),
                "Database should contain exactly " + count + " unique itineraries");
    }
    
    /**
     * Provides a count of itineraries to create for sequential testing.
     */
    @Provide
    Arbitrary<Integer> itineraryCount() {
        return Arbitraries.integers().between(10, 50);
    }
    
    /**
     * Provides a count of itineraries to create for concurrent testing.
     */
    @Provide
    Arbitrary<Integer> concurrentCount() {
        return Arbitraries.integers().between(5, 20);
    }
    
    /**
     * Creates simple valid day plans for testing.
     */
    private List<DayPlan> createSimpleDayPlans() {
        List<DayPlan> days = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            days.add(new DayPlan(i));
        }
        return days;
    }
    
    /**
     * Creates simple valid preferences for testing.
     */
    private UserPreferences createSimplePreferences() {
        return new UserPreferences.Builder()
                .addCity("Rome")
                .addInterest("art")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
    }
    
    /**
     * Creates a mock DynamoDB client that uses an in-memory concurrent map for storage.
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
                    
                    // Store in concurrent map (thread-safe)
                    storage.put(key, new HashMap<>(request.item()));
                    
                    return PutItemResponse.builder().build();
                });
        
        return mockClient;
    }
    
    /**
     * Creates an authenticated API Gateway request event with proper authorizer context.
     */
    private APIGatewayProxyRequestEvent createAuthenticatedRequest(String body) {
        APIGatewayProxyRequestEvent event = new APIGatewayProxyRequestEvent();
        event.setBody(body);
        
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
