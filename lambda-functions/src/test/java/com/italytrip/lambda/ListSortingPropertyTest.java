package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import net.jqwik.api.*;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based test for itinerary list sorting.
 * 
 * **Validates: Requirements 4.4**
 * 
 * <p>This test verifies Property 8: Itinerary List Sorted by Modification Time
 * 
 * <p><strong>Property:</strong> For any user with multiple itineraries, calling 
 * GET /itineraries SHALL return the itineraries sorted by last_modified timestamp 
 * in descending order (most recently modified first).
 * 
 * <p>Test strategy:
 * <ul>
 *   <li>Generate multiple itineraries with different last_modified timestamps</li>
 *   <li>Call GET /itineraries to retrieve the list</li>
 *   <li>Verify the returned list is sorted by last_modified in descending order</li>
 *   <li>Verify the sorting is stable and consistent across different timestamp distributions</li>
 * </ul>
 */
class ListSortingPropertyTest {
    
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final String TABLE_NAME = "test-itineraries-table";
    private static final String TEST_USER_ID = "test-user-sorting";
    
    private final ObjectMapper objectMapper;
    
    ListSortingPropertyTest() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }
    
    /**
     * Property test: GET /itineraries returns list sorted by last_modified descending.
     * 
     * <p>This property generates multiple itineraries with varying last_modified 
     * timestamps and verifies that the returned list is always sorted in descending 
     * order (most recent first).
     */
    @Property
    @Label("Itineraries are sorted by last_modified timestamp in descending order")
    void listItineraries_returnsSortedByLastModifiedDescending(
            @ForAll("itinerariesWithDifferentTimestamps") List<Map<String, AttributeValue>> unsortedItineraries) 
            throws Exception {
        
        // Assume we have at least 2 itineraries to test sorting
        Assume.that(unsortedItineraries.size() >= 2);
        
        // Mock DynamoDB client to return unsorted itineraries
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        
        QueryResponse queryResponse = QueryResponse.builder()
                .items(unsortedItineraries)
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
        
        // Create handler with mocked DynamoDB
        ListItinerariesHandler handler = new ListItinerariesHandler(mockDynamoDb, TABLE_NAME);
        
        // Create request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(TEST_USER_ID);
        Context mockContext = mock(Context.class);
        
        // Execute the handler
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Verify response is successful
        assertThat(response.getStatusCode())
                .as("Response should be successful")
                .isEqualTo(200);
        
        // Parse the response
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        List<Map<String, Object>> returnedItineraries = body.get("itineraries");
        
        // Property 1: All itineraries should be returned
        assertThat(returnedItineraries)
                .as("All itineraries should be returned")
                .hasSize(unsortedItineraries.size());
        
        // Extract last_modified timestamps from returned itineraries
        List<String> returnedTimestamps = returnedItineraries.stream()
                .map(itinerary -> (String) itinerary.get("last_modified"))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        
        // Property 2: Timestamps should be in descending order (most recent first)
        assertThat(returnedTimestamps)
                .as("Timestamps should be sorted in descending order")
                .isSortedAccordingTo(Comparator.reverseOrder());
        
        // Property 3: Verify the order matches the expected sorted order
        List<String> expectedOrder = unsortedItineraries.stream()
                .map(item -> item.get("last_modified").s())
                .sorted(Comparator.reverseOrder())
                .collect(Collectors.toList());
        
        assertThat(returnedTimestamps)
                .as("Returned order should match expected descending order")
                .containsExactlyElementsOf(expectedOrder);
    }
    
    /**
     * Property test: Sorting is consistent for itineraries with identical timestamps.
     * 
     * <p>When multiple itineraries have the same last_modified timestamp, the sort
     * should be stable (not throw errors and maintain relative order).
     */
    @Property
    @Label("Sorting handles identical timestamps without errors")
    void listItineraries_handlesIdenticalTimestamps(
            @ForAll("itinerariesWithSameTimestamp") List<Map<String, AttributeValue>> itinerariesWithSameTime) 
            throws Exception {
        
        Assume.that(itinerariesWithSameTime.size() >= 2);
        
        // Mock DynamoDB client
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        
        QueryResponse queryResponse = QueryResponse.builder()
                .items(itinerariesWithSameTime)
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
        
        ListItinerariesHandler handler = new ListItinerariesHandler(mockDynamoDb, TABLE_NAME);
        Context mockContext = mock(Context.class);
        
        // Create and execute request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(TEST_USER_ID);
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Property: Should not throw error and return 200
        assertThat(response.getStatusCode())
                .as("Should handle identical timestamps without errors")
                .isEqualTo(200);
        
        // Parse response
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        List<Map<String, Object>> returnedItineraries = body.get("itineraries");
        
        // Property: All itineraries should still be returned
        assertThat(returnedItineraries)
                .as("All itineraries should be returned even with identical timestamps")
                .hasSize(itinerariesWithSameTime.size());
        
        // Verify all timestamps are the same
        String commonTimestamp = itinerariesWithSameTime.get(0).get("last_modified").s();
        List<String> returnedTimestamps = returnedItineraries.stream()
                .map(itinerary -> (String) itinerary.get("last_modified"))
                .collect(Collectors.toList());
        
        assertThat(returnedTimestamps)
                .as("All timestamps should be identical")
                .allMatch(ts -> ts.equals(commonTimestamp));
    }
    
    /**
     * Property test: Single itinerary list doesn't require sorting but still works.
     */
    @Property
    @Label("Single itinerary list is handled correctly")
    void listItineraries_handlesSingleItinerary(
            @ForAll("singleItinerary") Map<String, AttributeValue> itinerary) 
            throws Exception {
        
        // Mock DynamoDB client
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        
        QueryResponse queryResponse = QueryResponse.builder()
                .items(Collections.singletonList(itinerary))
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
        
        ListItinerariesHandler handler = new ListItinerariesHandler(mockDynamoDb, TABLE_NAME);
        Context mockContext = mock(Context.class);
        
        // Create and execute request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(TEST_USER_ID);
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Property: Should return 200 with the single itinerary
        assertThat(response.getStatusCode())
                .as("Should handle single itinerary correctly")
                .isEqualTo(200);
        
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        assertThat(body.get("itineraries"))
                .as("Should return exactly one itinerary")
                .hasSize(1);
    }
    
    /**
     * Property test: Large lists are sorted correctly.
     * 
     * <p>Verifies that sorting works correctly even with many itineraries.
     */
    @Property
    @Label("Large lists of itineraries are sorted correctly")
    void listItineraries_sortsLargeListsCorrectly(
            @ForAll("largeItineraryList") List<Map<String, AttributeValue>> largeList) 
            throws Exception {
        
        Assume.that(largeList.size() >= 10);
        
        // Mock DynamoDB client
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        
        QueryResponse queryResponse = QueryResponse.builder()
                .items(largeList)
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
        
        ListItinerariesHandler handler = new ListItinerariesHandler(mockDynamoDb, TABLE_NAME);
        Context mockContext = mock(Context.class);
        
        // Create and execute request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(TEST_USER_ID);
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Verify successful response
        assertThat(response.getStatusCode())
                .as("Should handle large lists successfully")
                .isEqualTo(200);
        
        // Parse response
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        List<Map<String, Object>> returnedItineraries = body.get("itineraries");
        
        // Verify all items returned
        assertThat(returnedItineraries)
                .as("All itineraries should be returned")
                .hasSize(largeList.size());
        
        // Extract and verify sorting
        List<String> returnedTimestamps = returnedItineraries.stream()
                .map(itinerary -> (String) itinerary.get("last_modified"))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        
        // Property: Should be sorted in descending order
        assertThat(returnedTimestamps)
                .as("Large list should be sorted in descending order")
                .isSortedAccordingTo(Comparator.reverseOrder());
    }
    
    // ========== Arbitraries (Generators) ==========
    
    /**
     * Generates a list of itineraries with different last_modified timestamps.
     * Ensures timestamps are varied to test sorting behavior.
     */
    @Provide
    Arbitrary<List<Map<String, AttributeValue>>> itinerariesWithDifferentTimestamps() {
        return Arbitraries.integers().between(2, 20)
                .flatMap(count -> {
                    // Generate distinct timestamps spread over time
                    Arbitrary<List<LocalDateTime>> timestamps = Arbitraries.integers()
                            .between(0, 365)
                            .list()
                            .ofSize(count)
                            .map(daysList -> daysList.stream()
                                    .map(days -> LocalDateTime.now().minusDays(days).minusHours(days % 24))
                                    .collect(Collectors.toList()));
                    
                    return timestamps.map(timestampList -> {
                        List<Map<String, AttributeValue>> itineraries = new ArrayList<>();
                        for (int i = 0; i < count; i++) {
                            itineraries.add(createItineraryItem(
                                    "itin-" + i,
                                    "Itinerary " + i,
                                    timestampList.get(i),
                                    timestampList.get(i).plusHours(1)
                            ));
                        }
                        return itineraries;
                    });
                });
    }
    
    /**
     * Generates a list of itineraries with the same last_modified timestamp.
     * Tests the stability of sorting when timestamps are identical.
     */
    @Provide
    Arbitrary<List<Map<String, AttributeValue>>> itinerariesWithSameTimestamp() {
        LocalDateTime sameTimestamp = LocalDateTime.now().minusDays(5);
        
        return Arbitraries.integers().between(2, 10)
                .map(count -> {
                    List<Map<String, AttributeValue>> itineraries = new ArrayList<>();
                    for (int i = 0; i < count; i++) {
                        itineraries.add(createItineraryItem(
                                "itin-same-" + i,
                                "Same Time Itinerary " + i,
                                sameTimestamp,
                                sameTimestamp
                        ));
                    }
                    return itineraries;
                });
    }
    
    /**
     * Generates a single itinerary for edge case testing.
     */
    @Provide
    Arbitrary<Map<String, AttributeValue>> singleItinerary() {
        return Arbitraries.integers().between(0, 100)
                .map(daysAgo -> {
                    LocalDateTime timestamp = LocalDateTime.now().minusDays(daysAgo);
                    return createItineraryItem(
                            "itin-single",
                            "Single Itinerary",
                            timestamp,
                            timestamp
                    );
                });
    }
    
    /**
     * Generates a large list of itineraries for performance/scale testing.
     */
    @Provide
    Arbitrary<List<Map<String, AttributeValue>>> largeItineraryList() {
        return Arbitraries.integers().between(50, 100)
                .flatMap(count -> {
                    Arbitrary<List<LocalDateTime>> timestamps = Arbitraries.integers()
                            .between(0, count * 2)
                            .list()
                            .ofSize(count)
                            .map(daysList -> daysList.stream()
                                    .map(days -> LocalDateTime.now()
                                            .minusDays(days)
                                            .minusHours(days % 24)
                                            .minusMinutes(days % 60))
                                    .collect(Collectors.toList()));
                    
                    return timestamps.map(timestampList -> {
                        List<Map<String, AttributeValue>> itineraries = new ArrayList<>();
                        for (int i = 0; i < count; i++) {
                            itineraries.add(createItineraryItem(
                                    "itin-large-" + i,
                                    "Large List Itinerary " + i,
                                    timestampList.get(i),
                                    timestampList.get(i).plusMinutes(30)
                            ));
                        }
                        return itineraries;
                    });
                });
    }
    
    // ========== Helper Methods ==========
    
    /**
     * Creates a DynamoDB itinerary item with specified timestamps.
     */
    private Map<String, AttributeValue> createItineraryItem(
            String itineraryId, 
            String name, 
            LocalDateTime createdAt, 
            LocalDateTime lastModified) {
        
        Map<String, AttributeValue> item = new HashMap<>();
        
        item.put("user_id", AttributeValue.builder().s(TEST_USER_ID).build());
        item.put("itinerary_id", AttributeValue.builder().s(itineraryId).build());
        item.put("name", AttributeValue.builder().s(name).build());
        item.put("created_at", AttributeValue.builder().s(createdAt.format(FORMATTER)).build());
        item.put("last_modified", AttributeValue.builder().s(lastModified.format(FORMATTER)).build());
        item.put("days", AttributeValue.builder().s("[]").build());
        item.put("preferences", AttributeValue.builder().s("{}").build());
        
        return item;
    }
    
    /**
     * Creates a mock API Gateway request with the specified user ID in the authorizer context.
     */
    private APIGatewayProxyRequestEvent createRequestWithUserId(String userId) {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        APIGatewayProxyRequestEvent.ProxyRequestContext context = 
                new APIGatewayProxyRequestEvent.ProxyRequestContext();
        
        Map<String, Object> authorizer = new HashMap<>();
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", userId);
        claims.put("email", "test@example.com");
        authorizer.put("claims", claims);
        
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        return request;
    }
}
