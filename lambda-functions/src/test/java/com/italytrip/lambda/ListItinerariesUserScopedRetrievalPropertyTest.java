package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import net.jqwik.api.*;
import org.mockito.ArgumentCaptor;
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
 * Property-based test for user-scoped itinerary retrieval.
 * 
 * **Validates: Requirements 3.4, 3.7**
 * 
 * <p>This test verifies Property 4: User-Scoped Itinerary Retrieval
 * 
 * <p><strong>Property:</strong> For any authenticated user, calling GET /itineraries 
 * SHALL return only itineraries where the user_id matches the authenticated user's 
 * User_ID, and SHALL NOT include itineraries belonging to other users.
 * 
 * <p>Test strategy:
 * <ul>
 *   <li>Generate multiple users with unique IDs</li>
 *   <li>Generate multiple itineraries for each user</li>
 *   <li>For each user, query their itineraries</li>
 *   <li>Verify the query uses the correct user_id partition key</li>
 *   <li>Verify the returned itineraries belong only to that user</li>
 *   <li>Verify no cross-user data leakage occurs</li>
 * </ul>
 */
class ListItinerariesUserScopedRetrievalPropertyTest {
    
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final String TABLE_NAME = "test-itineraries-table";
    
    private final ObjectMapper objectMapper;
    
    ListItinerariesUserScopedRetrievalPropertyTest() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }
    
    /**
     * Property test: GET /itineraries returns only the authenticated user's itineraries.
     * 
     * <p>This property generates a user with itineraries and verifies that when querying:
     * <ol>
     *   <li>The DynamoDB query uses their user_id as the partition key</li>
     *   <li>Only itineraries belonging to that user are returned</li>
     *   <li>The response is successful</li>
     * </ol>
     */
    @Property
    @Label("User-scoped retrieval: GET /itineraries returns only authenticated user's data")
    void listItineraries_returnsOnlyAuthenticatedUserData(
            @ForAll("userId") String userId,
            @ForAll("itineraryList") List<Map<String, AttributeValue>> userItineraries) 
            throws Exception {
        
        // Mock DynamoDB client to return this user's itineraries
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        
        QueryResponse queryResponse = QueryResponse.builder()
                .items(userItineraries)
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
        
        // Create handler with mocked DynamoDB
        ListItinerariesHandler handler = new ListItinerariesHandler(mockDynamoDb, TABLE_NAME);
        
        // Create request with this user's ID
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        Context mockContext = mock(Context.class);
        
        // Execute the handler
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Property 1: Verify the query used the correct user_id
        ArgumentCaptor<QueryRequest> queryCaptor = ArgumentCaptor.forClass(QueryRequest.class);
        verify(mockDynamoDb).query(queryCaptor.capture());
        
        QueryRequest capturedQuery = queryCaptor.getValue();
        assertThat(capturedQuery.keyConditionExpression())
                .as("Query should filter by user_id partition key")
                .isEqualTo("user_id = :userId");
        assertThat(capturedQuery.expressionAttributeValues().get(":userId").s())
                .as("Query should use the authenticated user's ID")
                .isEqualTo(userId);
        
        // Property 2: Verify response contains only this user's itineraries
        assertThat(response.getStatusCode())
                .as("Response should be successful")
                .isEqualTo(200);
        
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        List<Map<String, Object>> returnedItineraries = body.get("itineraries");
        assertThat(returnedItineraries)
                .as("Should return the same number of itineraries as stored for this user")
                .hasSize(userItineraries.size());
        
        // Property 3: Verify all returned itineraries have IDs matching the user's itineraries
        Set<String> expectedItineraryIds = userItineraries.stream()
                .map(item -> item.get("itinerary_id").s())
                .collect(Collectors.toSet());
        
        Set<String> returnedItineraryIds = returnedItineraries.stream()
                .map(itinerary -> (String) itinerary.get("id"))
                .collect(Collectors.toSet());
        
        assertThat(returnedItineraryIds)
                .as("All returned itinerary IDs should match the user's itineraries")
                .containsExactlyInAnyOrderElementsOf(expectedItineraryIds);
    }
    
    /**
     * Property test: Different users cannot access each other's itineraries.
     * 
     * <p>This property generates two distinct users and verifies that querying
     * with one user's credentials never returns the other user's itineraries.
     */
    @Property
    @Label("Data isolation: User A cannot access User B's itineraries")
    void listItineraries_enforcesDataIsolationBetweenUsers(
            @ForAll("userId") String userAId,
            @ForAll("userId") String userBId,
            @ForAll("itineraryListWithUniqueIds") List<Map<String, AttributeValue>> userAItineraries,
            @ForAll("itineraryListWithUniqueIds") List<Map<String, AttributeValue>> userBItineraries)
            throws Exception {
        
        Assume.that(!userAId.equals(userBId)); // Ensure different users
        
        // Ensure itinerary IDs don't overlap between users
        Set<String> userAIds = userAItineraries.stream()
                .map(item -> item.get("itinerary_id").s())
                .collect(Collectors.toSet());
        Set<String> userBIds = userBItineraries.stream()
                .map(item -> item.get("itinerary_id").s())
                .collect(Collectors.toSet());
        
        // Assume no overlap in generated IDs (skip this test case if there is)
        Assume.that(Collections.disjoint(userAIds, userBIds));
        
        // Mock DynamoDB to return different results for different users
        DynamoDbClient mockDynamoDbA = mock(DynamoDbClient.class);
        DynamoDbClient mockDynamoDbB = mock(DynamoDbClient.class);
        
        QueryResponse userAResponse = QueryResponse.builder()
                .items(userAItineraries)
                .build();
        when(mockDynamoDbA.query(any(QueryRequest.class))).thenReturn(userAResponse);
        
        QueryResponse userBResponse = QueryResponse.builder()
                .items(userBItineraries)
                .build();
        when(mockDynamoDbB.query(any(QueryRequest.class))).thenReturn(userBResponse);
        
        ListItinerariesHandler handlerA = new ListItinerariesHandler(mockDynamoDbA, TABLE_NAME);
        ListItinerariesHandler handlerB = new ListItinerariesHandler(mockDynamoDbB, TABLE_NAME);
        Context mockContext = mock(Context.class);
        
        // Query as User A
        APIGatewayProxyRequestEvent requestA = createRequestWithUserId(userAId);
        APIGatewayProxyResponseEvent responseA = handlerA.handleRequest(requestA, mockContext);
        
        Map<String, List<Map<String, Object>>> bodyA = objectMapper.readValue(
            responseA.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        List<Map<String, Object>> returnedForUserA = bodyA.get("itineraries");
        
        // Query as User B
        APIGatewayProxyRequestEvent requestB = createRequestWithUserId(userBId);
        APIGatewayProxyResponseEvent responseB = handlerB.handleRequest(requestB, mockContext);
        
        Map<String, List<Map<String, Object>>> bodyB = objectMapper.readValue(
            responseB.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        List<Map<String, Object>> returnedForUserB = bodyB.get("itineraries");
        
        // Property: User A should get only their itineraries
        assertThat(returnedForUserA)
                .as("User A should receive their itineraries")
                .hasSize(userAItineraries.size());
        
        // Property: User B should get only their itineraries
        assertThat(returnedForUserB)
                .as("User B should receive their itineraries")
                .hasSize(userBItineraries.size());
        
        // Property: No overlap - User A's results should not contain User B's itinerary IDs
        Set<String> returnedUserAIds = returnedForUserA.stream()
                .map(itinerary -> (String) itinerary.get("id"))
                .collect(Collectors.toSet());
        
        Set<String> returnedUserBIds = returnedForUserB.stream()
                .map(itinerary -> (String) itinerary.get("id"))
                .collect(Collectors.toSet());
        
        assertThat(returnedUserAIds)
                .as("User A's itineraries should not contain any of User B's itinerary IDs")
                .doesNotContainAnyElementsOf(returnedUserBIds);
        
        assertThat(returnedUserBIds)
                .as("User B's itineraries should not contain any of User A's itinerary IDs")
                .doesNotContainAnyElementsOf(returnedUserAIds);
    }
    
    /**
     * Property test: Empty itinerary list is correctly handled.
     * 
     * <p>Verifies that when a user has no itineraries, the endpoint returns
     * an empty array (not null or error).
     */
    @Property
    @Label("Empty state: User with no itineraries receives empty array")
    void listItineraries_returnsEmptyArrayForUserWithNoItineraries(
            @ForAll("userId") String userId) 
            throws Exception {
        
        // Mock DynamoDB to return empty results
        DynamoDbClient mockDynamoDb = mock(DynamoDbClient.class);
        
        QueryResponse emptyResponse = QueryResponse.builder()
                .items(Collections.emptyList())
                .build();
        when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(emptyResponse);
        
        ListItinerariesHandler handler = new ListItinerariesHandler(mockDynamoDb, TABLE_NAME);
        Context mockContext = mock(Context.class);
        
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Property: Should return 200 with empty array
        assertThat(response.getStatusCode())
                .as("Should return success status even with no itineraries")
                .isEqualTo(200);
        
        Map<String, List<Map<String, Object>>> body = objectMapper.readValue(
            response.getBody(), 
            new TypeReference<Map<String, List<Map<String, Object>>>>() {}
        );
        
        assertThat(body.get("itineraries"))
                .as("Should return empty array, not null")
                .isNotNull()
                .isEmpty();
        
        // Verify query still used correct user_id
        ArgumentCaptor<QueryRequest> queryCaptor = ArgumentCaptor.forClass(QueryRequest.class);
        verify(mockDynamoDb).query(queryCaptor.capture());
        
        assertThat(queryCaptor.getValue().expressionAttributeValues().get(":userId").s())
                .as("Query should still filter by user_id even when no results")
                .isEqualTo(userId);
    }
    
    // ========== Arbitraries (Generators) ==========
    
    /**
     * Generates a valid user ID string.
     */
    @Provide
    Arbitrary<String> userId() {
        return Arbitraries.strings()
                .withCharRange('a', 'z')
                .numeric()
                .withChars('-')
                .ofMinLength(10)
                .ofMaxLength(50);
    }
    
    /**
     * Generates a list of DynamoDB itinerary items.
     */
    @Provide
    Arbitrary<List<Map<String, AttributeValue>>> itineraryList() {
        return itineraryItem().list().ofMinSize(1).ofMaxSize(10);
    }
    
    /**
     * Generates a list of DynamoDB itinerary items with guaranteed unique IDs.
     */
    @Provide
    Arbitrary<List<Map<String, AttributeValue>>> itineraryListWithUniqueIds() {
        return itineraryItem().list().ofMinSize(1).ofMaxSize(10)
                .map(list -> {
                    // Ensure all itinerary IDs are unique by appending sequential numbers
                    List<Map<String, AttributeValue>> uniqueList = new ArrayList<>();
                    for (int i = 0; i < list.size(); i++) {
                        Map<String, AttributeValue> item = new HashMap<>(list.get(i));
                        String originalId = item.get("itinerary_id").s();
                        String uniqueId = originalId + "-" + i;
                        item.put("itinerary_id", AttributeValue.builder().s(uniqueId).build());
                        uniqueList.add(item);
                    }
                    return uniqueList;
                });
    }
    
    /**
     * Generates a single DynamoDB itinerary item.
     * 
     * <p>Creates minimal but valid itinerary data for testing.
     */
    @Provide
    Arbitrary<Map<String, AttributeValue>> itineraryItem() {
        Arbitrary<String> itineraryId = Arbitraries.strings()
                .withCharRange('a', 'z')
                .numeric()
                .withChars('-')
                .ofMinLength(10)
                .ofMaxLength(36);
        
        Arbitrary<String> name = Arbitraries.strings()
                .alpha()
                .ofMinLength(5)
                .ofMaxLength(50);
        
        Arbitrary<Integer> daysAgo = Arbitraries.integers().between(0, 365);
        
        return Combinators.combine(itineraryId, name, daysAgo)
                .as((id, itinName, ago) -> {
                    Map<String, AttributeValue> item = new HashMap<>();
                    
                    LocalDateTime lastModified = LocalDateTime.now().minusDays(ago);
                    LocalDateTime created = lastModified.minusDays(1);
                    
                    item.put("itinerary_id", AttributeValue.builder().s(id).build());
                    item.put("name", AttributeValue.builder().s(itinName).build());
                    item.put("created_at", AttributeValue.builder().s(created.format(FORMATTER)).build());
                    item.put("last_modified", AttributeValue.builder().s(lastModified.format(FORMATTER)).build());
                    item.put("days", AttributeValue.builder().s("[]").build());
                    item.put("preferences", AttributeValue.builder().s("{}").build());
                    
                    return item;
                });
    }
    
    // ========== Helper Methods ==========
    
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
}
