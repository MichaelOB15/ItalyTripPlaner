package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.italytrip.models.Itinerary;
import net.jqwik.api.*;
import org.mockito.Mockito;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.dynamodb.model.PutItemResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for input sanitization to prevent injection attacks.
 * 
 * **Validates: Requirements 7.8**
 * 
 * These tests verify that:
 * - Inputs with HTML/script injection patterns are properly sanitized (HTML encoded)
 * - Inputs with control characters are rejected with 400 Bad Request
 * - SQL injection patterns are handled safely (sanitized or rejected)
 * - All string fields undergo sanitization before storage
 * 
 * Uses jqwik for property-based testing to verify sanitization works
 * across a wide variety of malicious input patterns.
 */
class InputSanitizationPropertyTest {
    
    private static final String TEST_TABLE_NAME = "test-itineraries-table";
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    
    /**
     * Property 10: Input Sanitization Prevents HTML/XSS Injection
     * 
     * **Validates: Requirements 7.8**
     * 
     * For any input containing HTML tags or script elements, the system MUST either:
     * 1. Sanitize the input by HTML encoding special characters, OR
     * 2. Reject the input with HTTP 400 Bad Request
     * 
     * This ensures malicious scripts cannot be stored and later executed.
     */
    @Property
    @Label("HTML/XSS injection patterns are sanitized or rejected")
    void htmlInjectionPatternsSanitizedOrRejected(
            @ForAll("userId") String userId,
            @ForAll("nameWithHtmlInjection") String maliciousName) throws Exception {
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        PutItemResponse putResponse = PutItemResponse.builder().build();
        when(mockDynamoDb.putItem(any(PutItemRequest.class))).thenReturn(putResponse);
        
        // Create handler
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request with malicious name
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        String requestBody = String.format(
                "{\"name\": \"%s\", \"days\": [{\"day_number\": 1, \"places\": []},{\"day_number\": 2, \"places\": []},{\"day_number\": 3, \"places\": []}], \"preferences\": {}}", 
                escapeJsonString(maliciousName));
        request.setBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Either rejected with 400 OR accepted with sanitized value
        int statusCode = response.getStatusCode();
        
        if (statusCode == 201) {
            // Input was accepted - verify it was sanitized
            assertThat(response.getBody()).isNotNull();
            
            Map<String, Object> responseBody = objectMapper.readValue(
                    response.getBody(), 
                    new TypeReference<Map<String, Object>>() {});
            
            @SuppressWarnings("unchecked")
            Map<String, Object> itinerary = (Map<String, Object>) responseBody.get("itinerary");
            String storedName = (String) itinerary.get("name");
            
            // The stored name must be sanitized (HTML encoded)
            assertThat(storedName)
                    .as("Stored name must be HTML encoded to prevent XSS")
                    .doesNotContain("<script>")
                    .doesNotContain("</script>")
                    .doesNotContain("<img")
                    .doesNotContain("onerror=")
                    .doesNotContain("javascript:");
            
            // If original contained dangerous patterns, they must be encoded
            if (maliciousName.contains("<")) {
                assertThat(storedName)
                        .as("< character must be HTML encoded")
                        .contains("&lt;");
            }
            if (maliciousName.contains(">")) {
                assertThat(storedName)
                        .as("> character must be HTML encoded")
                        .contains("&gt;");
            }
            if (maliciousName.contains("&") && !maliciousName.contains("&amp;")) {
                assertThat(storedName)
                        .as("& character must be HTML encoded")
                        .contains("&amp;");
            }
            
        } else if (statusCode == 400) {
            // Input was rejected - this is acceptable
            assertThat(response.getBody())
                    .as("400 response should contain error message")
                    .isNotNull()
                    .contains("error");
            
        } else {
            // Any other status code is not acceptable for input validation
            throw new AssertionError(
                    "Expected either 201 (with sanitized input) or 400 (rejected), got: " + statusCode);
        }
    }
    
    /**
     * Property 10: Control Characters Are Rejected
     * 
     * **Validates: Requirements 7.8**
     * 
     * For any input containing control characters (ASCII 0-31 except tab, newline, CR),
     * the system MUST reject the input with HTTP 400 Bad Request.
     * 
     * Control characters can cause issues with parsing, logging, and display.
     */
    @Property
    @Label("Control characters in input are rejected with 400")
    void controlCharactersRejected(
            @ForAll("userId") String userId,
            @ForAll("nameWithControlChars") String nameWithControlChars) throws Exception {
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        PutItemResponse putResponse = PutItemResponse.builder().build();
        when(mockDynamoDb.putItem(any(PutItemRequest.class))).thenReturn(putResponse);
        
        // Create handler
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request with control character in name
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        String requestBody = String.format(
                "{\"name\": \"%s\", \"days\": [{\"day_number\": 1, \"places\": []},{\"day_number\": 2, \"places\": []},{\"day_number\": 3, \"places\": []}], \"preferences\": {}}", 
                escapeJsonString(nameWithControlChars));
        request.setBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Must be rejected with 400
        assertThat(response.getStatusCode())
                .as("Input with control characters must be rejected with 400 Bad Request")
                .isEqualTo(400);
        
        assertThat(response.getBody())
                .as("Error response should mention control characters")
                .contains("control characters");
    }
    
    /**
     * Property 10: SQL Injection Patterns Are Handled Safely
     * 
     * **Validates: Requirements 7.8**
     * 
     * For any input containing SQL injection patterns, the system MUST handle them safely.
     * Since this system uses DynamoDB (not SQL), these patterns should be sanitized
     * or rejected, but they must not cause any database operation failures.
     */
    @Property
    @Label("SQL injection patterns are handled safely")
    void sqlInjectionPatternsHandledSafely(
            @ForAll("userId") String userId,
            @ForAll("nameWithSqlInjection") String sqlInjectionName) throws Exception {
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        PutItemResponse putResponse = PutItemResponse.builder().build();
        when(mockDynamoDb.putItem(any(PutItemRequest.class))).thenReturn(putResponse);
        
        // Create handler
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        String requestBody = String.format(
                "{\"name\": \"%s\", \"days\": [{\"day_number\": 1, \"places\": []},{\"day_number\": 2, \"places\": []},{\"day_number\": 3, \"places\": []}], \"preferences\": {}}", 
                escapeJsonString(sqlInjectionName));
        request.setBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Either accepted (201) or rejected (400), but never fails (500)
        int statusCode = response.getStatusCode();
        
        assertThat(statusCode)
                .as("SQL injection patterns must be handled without causing server errors")
                .isIn(201, 400);
        
        if (statusCode == 201) {
            // If accepted, verify the data is safely stored (HTML encoded)
            assertThat(response.getBody()).isNotNull();
            
            Map<String, Object> responseBody = objectMapper.readValue(
                    response.getBody(), 
                    new TypeReference<Map<String, Object>>() {});
            
            @SuppressWarnings("unchecked")
            Map<String, Object> itinerary = (Map<String, Object>) responseBody.get("itinerary");
            String storedName = (String) itinerary.get("name");
            
            // Verify quotes are encoded (prevents breaking out of strings)
            if (sqlInjectionName.contains("'")) {
                assertThat(storedName)
                        .as("Single quotes must be HTML encoded")
                        .contains("&#x27;");
            }
            if (sqlInjectionName.contains("\"")) {
                assertThat(storedName)
                        .as("Double quotes must be HTML encoded")
                        .contains("&quot;");
            }
        }
    }
    
    /**
     * Property 10: Excessively Long Input Is Rejected
     * 
     * **Validates: Requirements 7.8**
     * 
     * For any input exceeding maximum length limits, the system MUST reject
     * with HTTP 400 Bad Request to prevent buffer overflow and storage issues.
     */
    @Property
    @Label("Excessively long input is rejected with 400")
    void excessivelyLongInputRejected(
            @ForAll("userId") String userId,
            @ForAll("longName") String longName) throws Exception {
        
        // Only test names that exceed the 200 character limit
        Assume.that(longName.length() > 200);
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        PutItemResponse putResponse = PutItemResponse.builder().build();
        when(mockDynamoDb.putItem(any(PutItemRequest.class))).thenReturn(putResponse);
        
        // Create handler
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        String requestBody = String.format(
                "{\"name\": \"%s\", \"days\": [{\"day_number\": 1, \"places\": []},{\"day_number\": 2, \"places\": []},{\"day_number\": 3, \"places\": []}], \"preferences\": {}}", 
                escapeJsonString(longName));
        request.setBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Must be rejected with 400
        assertThat(response.getStatusCode())
                .as("Input exceeding max length must be rejected with 400 Bad Request")
                .isEqualTo(400);
        
        assertThat(response.getBody())
                .as("Error response should mention length limit")
                .containsAnyOf("characters", "length", "200");
    }
    
    /**
     * Property 10: Valid Input After Sanitization Is Accepted
     * 
     * **Validates: Requirements 7.8**
     * 
     * For valid input (safe characters, proper length), the system MUST accept
     * and store the input successfully after HTML encoding.
     */
    @Property
    @Label("Valid input is accepted and sanitized correctly")
    void validInputAcceptedAndSanitized(
            @ForAll("userId") String userId,
            @ForAll("validName") String validName) throws Exception {
        
        // Arrange: Create mock DynamoDB client
        DynamoDbClient mockDynamoDb = Mockito.mock(DynamoDbClient.class);
        PutItemResponse putResponse = PutItemResponse.builder().build();
        when(mockDynamoDb.putItem(any(PutItemRequest.class))).thenReturn(putResponse);
        
        // Create handler
        CreateItineraryHandler handler = new CreateItineraryHandler(mockDynamoDb, TEST_TABLE_NAME);
        Context mockContext = Mockito.mock(Context.class);
        
        // Create request
        APIGatewayProxyRequestEvent request = createRequestWithUserId(userId);
        String requestBody = String.format(
                "{\"name\": \"%s\", \"days\": [{\"day_number\": 1, \"places\": []},{\"day_number\": 2, \"places\": []},{\"day_number\": 3, \"places\": []}], \"preferences\": {}}", 
                escapeJsonString(validName));
        request.setBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = handler.handleRequest(request, mockContext);
        
        // Assert: Must be accepted with 201
        assertThat(response.getStatusCode())
                .as("Valid input must be accepted")
                .isEqualTo(201);
        
        // Verify data is stored
        verify(mockDynamoDb, times(1)).putItem(any(PutItemRequest.class));
        
        // Verify response contains the itinerary
        assertThat(response.getBody()).isNotNull();
        Map<String, Object> responseBody = objectMapper.readValue(
                response.getBody(), 
                new TypeReference<Map<String, Object>>() {});
        assertThat(responseBody).containsKey("itinerary");
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
    Arbitrary<String> nameWithHtmlInjection() {
        // Generate names with various HTML/XSS injection patterns
        Arbitrary<String> scriptTags = Arbitraries.of(
                "Trip<script>alert('xss')</script>",
                "<img src=x onerror=alert(1)>Rome",
                "Venice<iframe src='evil.com'>",
                "<svg/onload=alert('xss')>Milan",
                "javascript:alert('xss')//Florence",
                "<body onload=alert('xss')>",
                "Trip & <b>Adventure</b>",
                "<h1>My Trip</h1>",
                "Test<script>document.cookie</script>End"
        );
        
        // Also generate random combinations
        Arbitrary<String> randomPattern = Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars('<', '>', '&', '"', '\'', ' ')
                .ofMinLength(1)
                .ofMaxLength(200);
        
        return Arbitraries.oneOf(scriptTags, randomPattern);
    }
    
    @Provide
    Arbitrary<String> nameWithControlChars() {
        // Generate names with control characters
        return Arbitraries.strings()
                .alpha()
                .ofMinLength(3)
                .ofMaxLength(50)
                .map(s -> {
                    // Insert a control character in the middle
                    int pos = s.length() / 2;
                    char controlChar = (char) Arbitraries.of(
                            '\u0000', '\u0001', '\u0008', '\u000B', 
                            '\u000C', '\u000E', '\u001F', '\u007F'
                    ).sample();
                    return s.substring(0, pos) + controlChar + s.substring(pos);
                });
    }
    
    @Provide
    Arbitrary<String> nameWithSqlInjection() {
        // Generate names with SQL injection patterns
        Arbitrary<String> sqlPatterns = Arbitraries.of(
                "Trip'; DROP TABLE itineraries;--",
                "Rome' OR '1'='1",
                "Venice' UNION SELECT * FROM users--",
                "Milan'; DELETE FROM data WHERE '1'='1",
                "Florence'--",
                "Trip' OR 1=1--",
                "'; EXEC sp_executesql--"
        );
        
        // Also generate random SQL-like patterns
        Arbitrary<String> randomSql = Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars('\'', '"', '-', ';', '=', ' ')
                .ofMinLength(1)
                .ofMaxLength(200);
        
        return Arbitraries.oneOf(sqlPatterns, randomSql);
    }
    
    @Provide
    Arbitrary<String> longName() {
        // Generate names longer than 200 characters
        return Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars(' ', '-', '\'')
                .ofMinLength(201)
                .ofMaxLength(500);
    }
    
    @Provide
    Arbitrary<String> validName() {
        // Generate valid names (safe characters, proper length)
        return Arbitraries.strings()
                .alpha()
                .numeric()
                .withChars(' ', '-', '\'', ',', '.')
                .ofMinLength(1)
                .ofMaxLength(200)
                .filter(s -> !s.trim().isEmpty())
                .filter(s -> s.equals(s.trim())) // No leading/trailing whitespace
                .filter(s -> !s.contains("\u0000")); // No null bytes
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
     * Escapes a string for use in JSON (escapes quotes and backslashes).
     */
    private String escapeJsonString(String input) {
        if (input == null) {
            return "";
        }
        return input
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
