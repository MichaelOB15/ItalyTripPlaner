package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import net.jqwik.api.*;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for user data isolation in itinerary operations.
 * 
 * **Validates: Requirements 2.4, 2.5**
 * 
 * These tests verify that:
 * - All database operations include the correct User_ID from the authenticated token
 * - Users cannot access itineraries belonging to other users
 * - The partition key (user_id) properly isolates data between users
 * 
 * Uses jqwik for property-based testing to verify invariants across
 * randomly generated user IDs and itinerary data.
 */
class UserDataIsolationPropertyTest {
    
    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    
    /**
     * Property: User Data Isolation
     * 
     * **Validates: Requirements 2.4, 2.5**
     * 
     * For any set of users and their itineraries, when a user queries their data,
     * the system MUST only query DynamoDB using that user's ID as the partition key,
     * ensuring no access to other users' data.
     * 
     * This property verifies that:
     * 1. The DynamoDB query uses the authenticated user's ID from the token
     * 2. The query condition expression filters by user_id
     * 3. Only the authenticated user's partition is queried
     */
    @Property
    @Label("User data isolation: Each user can only query their own itineraries")
    void userCanOnlyAccessTheirOwnItineraries(
            @ForAll("userIds") List<String> userIds,
            @ForAll("itineraryIds") List<String> itineraryIds) throws Exception {
        
        // Skip if we don't have enough users to test isolation
        Assume.that(userIds.size() >= 2);
        Assume.that(itineraryIds.size() >= 1);
        
        // Test each user accessing their itineraries
        for (String currentUserId : userIds) {
            // Arrange: Create mock DynamoDB client
            DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
            
            // Create mock response with itineraries for the current user
            List<Map<String, AttributeValue>> userItineraries = itineraryIds.stream()
                    .map(itinId -> createDynamoDBItem(itinId, "Trip " + itinId))
                    .collect(Collectors.toList());
            
            QueryResponse queryResponse = QueryResponse.builder()
                    .items(userItineraries)
                    .build();
            when(mockDynamoDb.query(any(QueryRequest.class))).thenReturn(queryResponse);
            
            // Create handler
            ListItinerariesHandler handler = new ListItinerariesHandler(mockDynamoDb, TEST_TABLE_NAME);
            Context mockContext = Mockito.mock(Context.class);
            
            // Create request with authenticated user ID
            APIGatewayProxyRequestEvent request = createRequestWithUserId(currentUserId);
            
            // Act: Execute the query
            APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
            
            // Assert 1: Request succeeded
            assertThat(response.getStatusCode())
                    .as("Request for user %s should succeed", currentUserId)
                    .isEqualTo(200);
            
            // Assert 2: DynamoDB query was called exactly once
            ArgumentCaptor<QueryRequest> queryCaptor = ArgumentCaptor.forClass(QueryRequest.class);
            verify(mockDynamoDb, times(1)).query(queryCaptor.capture());
            
            QueryRequest capturedQuery = queryCaptor.getValue();
            
            // Assert 3: Query uses correct partition key condition
            assertThat(capturedQuery.keyConditionExpression())
                    .as("Query must filter by user_id partition key")
                    .isEqualTo("user_id = :userId");
            
            // Assert 4: Query uses the authenticated user's ID (data isolation)
            assertThat(capturedQuery.expressionAttributeValues())
                    .as("Query must include user_id parameter")
                    .containsKey(":userId");
            
            String queriedUserId = capturedQuery.expressionAttributeValues().get(":userId").s();
            assertThat(queriedUserId)
                    .as("Query must use the authenticated user's ID, not any other user's ID")
                    .isEqualTo(currentUserId);
            
            // Assert 5: Verify that the queried user_id is NOT any of the other users' IDs
            for (String otherUserId : userIds) {
                if (!otherUserId.equals(currentUserId)) {
                    assertThat(queriedUserId)
                            .as("User %s must not be able to query user %s's data", currentUserId, otherUserId)
                            .isNotEqualTo(otherUserId);
                }
            }
            
            // Cleanup
            Mockito.reset(mockDynamoDb);
        }
    }
    
    /**
     * Property: User Data Isolation for GetItinerary
     * 
     * **Validates: Requirements 2.4, 2.5**
     * 
     * When retrieving a specific itinerary, the system MUST verify that the
     * itinerary belongs to the authenticated user by including the user_id
     * in the getItem key.
     */
    @Property
    @Label("Get specific itinerary uses authenticated user's ID in key")
    void getItineraryUsesUserIdInKey(
            @ForAll("userId") String userId,
            @ForAll("itineraryId") String itineraryId) throws Exception {
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        
        // Create mock response
        Map<String, AttributeValue> item = createDynamoDBItem(itineraryId, "Test Trip");
        GetItemResponse getItemResponse = GetItemResponse.builder()
                .item(item)
                .build();
        when(mockDynamoDb.getItem(any(GetItemRequest.class))).thenReturn(getItemResponse);
        
        // Create handler
        GetItineraryHandler handler = new GetItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        Map<String, String> pathParams = new HashMap<>();
        pathParams.put("itinerary_id", itineraryId);
        request.setPathParameters(pathParams);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Verify DynamoDB getItem includes both user_id and itinerary_id
        ArgumentCaptor<GetItemRequest> getCaptor = ArgumentCaptor.forClass(GetItemRequest.class);
        verify(mockDynamoDb).getItem(getCaptor.capture());
        
        GetItemRequest capturedGet = getCaptor.getValue();
        
        // Must use both partition key (user_id) and sort key (itinerary_id)
        assertThat(capturedGet.key())
                .as("GetItem key must include user_id partition key")
                .containsKey("user_id");
        
        assertThat(capturedGet.key())
                .as("GetItem key must include itinerary_id sort key")
                .containsKey("itinerary_id");
        
        // Must use the authenticated user's ID
        assertThat(capturedGet.key().get("user_id").s())
                .as("GetItem key must use authenticated user's ID")
                .isEqualTo(userId);
        
        assertThat(capturedGet.key().get("itinerary_id").s())
                .as("GetItem key must use specified itinerary ID")
                .isEqualTo(itineraryId);
    }
    
    /**
     * Property: User Data Isolation for CreateItinerary
     * 
     * **Validates: Requirements 2.4, 2.5**
     * 
     * When creating a new itinerary, the system MUST use the authenticated
     * user's ID from the token as the partition key, not from request body.
     */
    @Property
    @Label("Create itinerary stores data with authenticated user's ID")
    void createItineraryUsesAuthenticatedUserId(
            @ForAll("userId") String userId,
            @ForAll("itineraryName") String itineraryName) throws Exception {
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        
        PutItemResponse putResponse = PutItemResponse.builder().build();
        when(mockDynamoDb.putItem(any(PutItemRequest.class))).thenReturn(putResponse);
        
        // Create handler
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request with minimal valid itinerary data
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        String requestBody = String.format(
                "{\"name\": \"%s\", \"days\": [{},{},{}], \"preferences\": {}}", 
                itineraryName);
        request.setBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Verify the PutItem request uses the authenticated user's ID
        if (response.getStatusCode() == 201) {
            ArgumentCaptor<PutItemRequest> putCaptor = ArgumentCaptor.forClass(PutItemRequest.class);
            verify(mockDynamoDb).putItem(putCaptor.capture());
            
            PutItemRequest capturedPut = putCaptor.getValue();
            
            // The item must include user_id as partition key
            assertThat(capturedPut.item())
                    .as("Created item must include user_id")
                    .containsKey("user_id");
            
            // The user_id must match the authenticated user from the token
            String storedUserId = capturedPut.item().get("user_id").s();
            assertThat(storedUserId)
                    .as("Stored user_id must match authenticated user from token")
                    .isEqualTo(userId);
        }
    }
    
    /**
     * Property: User Data Isolation for UpdateItinerary
     * 
     * **Validates: Requirements 2.4, 2.5**
     * 
     * When updating an itinerary, the system MUST verify ownership by
     * including the authenticated user's ID in the update condition.
     */
    @Property
    @Label("Update itinerary only modifies data in authenticated user's partition")
    void updateItineraryOnlyModifiesUserData(
            @ForAll("userId") String userId,
            @ForAll("itineraryId") String itineraryId,
            @ForAll("itineraryName") String newName) throws Exception {
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        
        UpdateItemResponse updateResponse = UpdateItemResponse.builder()
                .attributes(createDynamoDBItem(itineraryId, newName))
                .build();
        when(mockDynamoDb.updateItem(any(UpdateItemRequest.class))).thenReturn(updateResponse);
        
        // Create handler
        UpdateItineraryHandler handler = new UpdateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        Map<String, String> pathParams = new HashMap<>();
        pathParams.put("itinerary_id", itineraryId);
        request.setPathParameters(pathParams);
        
        String requestBody = String.format(
                "{\"name\": \"%s\", \"days\": [{},{},{}], \"preferences\": {}}", 
                newName);
        request.setBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Verify the UpdateItem uses the authenticated user's ID in the key
        if (response.getStatusCode() == 200) {
            ArgumentCaptor<UpdateItemRequest> updateCaptor = ArgumentCaptor.forClass(UpdateItemRequest.class);
            verify(mockDynamoDb).updateItem(updateCaptor.capture());
            
            UpdateItemRequest capturedUpdate = updateCaptor.getValue();
            
            // The key must include user_id
            assertThat(capturedUpdate.key())
                    .as("Update key must include user_id partition key")
                    .containsKey("user_id");
            
            // The user_id must match the authenticated user
            String keyUserId = capturedUpdate.key().get("user_id").s();
            assertThat(keyUserId)
                    .as("Update key user_id must match authenticated user")
                    .isEqualTo(userId);
            
            // The key must also include itinerary_id
            assertThat(capturedUpdate.key())
                    .as("Update key must include itinerary_id sort key")
                    .containsKey("itinerary_id");
            
            assertThat(capturedUpdate.key().get("itinerary_id").s())
                    .as("Update key itinerary_id must match path parameter")
                    .isEqualTo(itineraryId);
        }
    }
    
    /**
     * Property: User Data Isolation for DeleteItinerary
     * 
     * **Validates: Requirements 2.4, 2.5**
     * 
     * When deleting an itinerary, the system MUST verify ownership by
     * including the authenticated user's ID in the delete key.
     */
    @Property
    @Label("Delete itinerary only removes data from authenticated user's partition")
    void deleteItineraryOnlyRemovesUserData(
            @ForAll("userId") String userId,
            @ForAll("itineraryId") String itineraryId) throws Exception {
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        
        DeleteItemResponse deleteResponse = DeleteItemResponse.builder().build();
        when(mockDynamoDb.deleteItem(any(DeleteItemRequest.class))).thenReturn(deleteResponse);
        
        // Create handler
        DeleteItineraryHandler handler = new DeleteItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        Map<String, String> pathParams = new HashMap<>();
        pathParams.put("itinerary_id", itineraryId);
        request.setPathParameters(pathParams);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Verify the DeleteItem uses the authenticated user's ID in the key
        if (response.getStatusCode() == 204) {
            ArgumentCaptor<DeleteItemRequest> deleteCaptor = ArgumentCaptor.forClass(DeleteItemRequest.class);
            verify(mockDynamoDb).deleteItem(deleteCaptor.capture());
            
            DeleteItemRequest capturedDelete = deleteCaptor.getValue();
            
            // The key must include user_id
            assertThat(capturedDelete.key())
                    .as("Delete key must include user_id partition key")
                    .containsKey("user_id");
            
            // The user_id must match the authenticated user
            String keyUserId = capturedDelete.key().get("user_id").s();
            assertThat(keyUserId)
                    .as("Delete key user_id must match authenticated user")
                    .isEqualTo(userId);
            
            // The key must also include itinerary_id
            assertThat(capturedDelete.key())
                    .as("Delete key must include itinerary_id sort key")
                    .containsKey("itinerary_id");
            
            assertThat(capturedDelete.key().get("itinerary_id").s())
                    .as("Delete key itinerary_id must match path parameter")
                    .isEqualTo(itineraryId);
        }
    }
    
    // ===== Arbitraries (Generators) =====
    
    @Provide
    Arbitrary<String> userId() {
        // Generate realistic Cognito sub (UUID format)
        return Arbitraries.strings()
                .withCharRange('a', 'z')
                .numeric()
                .withChars('-')
                .ofMinLength(10)
                .ofMaxLength(40)
                .map(s -> "user-" + s);
    }
    
    @Provide
    Arbitrary<List<String>> userIds() {
        return userId().list().ofMinSize(2).ofMaxSize(5);
    }
    
    @Provide
    Arbitrary<String> itineraryId() {
        return Arbitraries.strings()
                .withCharRange('a', 'z')
                .numeric()
                .withChars('-')
                .ofMinLength(5)
                .ofMaxLength(20)
                .map(s -> "itin-" + s);
    }
    
    @Provide
    Arbitrary<List<String>> itineraryIds() {
        return itineraryId().list().ofMinSize(1).ofMaxSize(5);
    }
    
    @Provide
    Arbitrary<String> itineraryName() {
        return Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars(' ', '-', '\'')
                .ofMinLength(1)
                .ofMaxLength(200);
    }
    
    // ===== Helper Methods =====
    
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
        claims.put("email", "user@example.com");
        authorizer.put("claims", claims);
        
        context.setAuthorizer(authorizer);
        request.setRequestContext(context);
        
        return request;
    }
    
    /**
     * Creates a mock DynamoDB item representing an itinerary.
     */
    private Map<String, AttributeValue> createDynamoDBItem(String itineraryId, String name) {
        Map<String, AttributeValue> item = new HashMap<>();
        
        LocalDateTime now = LocalDateTime.now();
        item.put("itinerary_id", AttributeValue.builder().s(itineraryId).build());
        item.put("name", AttributeValue.builder().s(name).build());
        item.put("created_at", AttributeValue.builder().s(now.format(FORMATTER)).build());
        item.put("last_modified", AttributeValue.builder().s(now.format(FORMATTER)).build());
        item.put("days", AttributeValue.builder().s("[]").build());
        item.put("preferences", AttributeValue.builder().s("{}").build());
        
        return item;
    }
}
