package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.ValidationError;
import com.italytrip.models.ValidationResult;
import com.italytrip.models.ValidationWarning;
import com.italytrip.validation.DataValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ValidateDatasetFunction.
 */
class ValidateDatasetFunctionTest {
    
    private ValidateDatasetFunction function;
    private ObjectMapper objectMapper;
    
    @Mock
    private Context mockContext;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        function = new ValidateDatasetFunction();
        objectMapper = new ObjectMapper();
    }
    
    @Test
    void handleRequest_withValidDataset_returnsSuccessfulValidation() throws Exception {
        // Arrange
        String jsonDataset = createValidJsonDataset();
        APIGatewayProxyRequestEvent request = createMultipartRequest(jsonDataset);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        assertThat(response.getHeaders()).containsEntry("Content-Type", "application/json");
        assertThat(response.getHeaders()).containsKey("Access-Control-Allow-Origin");
        
        ValidationResult result = objectMapper.readValue(response.getBody(), ValidationResult.class);
        assertThat(result.isValid()).isTrue();
        assertThat(result.getPlaceCount()).isEqualTo(2);
        assertThat(result.getExcludedCount()).isEqualTo(0);
    }
    
    @Test
    void handleRequest_withMissingCriticalFields_excludesPlaces() throws Exception {
        // Arrange
        String jsonDataset = createDatasetWithMissingCriticalFields();
        APIGatewayProxyRequestEvent request = createMultipartRequest(jsonDataset);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        ValidationResult result = objectMapper.readValue(response.getBody(), ValidationResult.class);
        assertThat(result.isValid()).isFalse();
        assertThat(result.getPlaceCount()).isEqualTo(2);
        assertThat(result.getExcludedCount()).isEqualTo(1);
        assertThat(result.getErrors()).isNotEmpty();
        assertThat(result.getErrors().get(0).getSeverity()).isEqualTo(ValidationError.Severity.CRITICAL);
    }
    
    @Test
    void handleRequest_withMissingOptionalFields_generatesWarnings() throws Exception {
        // Arrange
        String jsonDataset = createDatasetWithMissingOptionalFields();
        APIGatewayProxyRequestEvent request = createMultipartRequest(jsonDataset);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        ValidationResult result = objectMapper.readValue(response.getBody(), ValidationResult.class);
        assertThat(result.isValid()).isTrue();
        assertThat(result.getPlaceCount()).isEqualTo(1);
        assertThat(result.getExcludedCount()).isEqualTo(0);
        assertThat(result.getWarnings()).isNotEmpty();
        
        // Should have warnings for missing latitude/longitude (for map feature)
        List<ValidationWarning> warnings = result.getWarnings();
        assertThat(warnings).anyMatch(w -> w.getField().equals("latitude"));
        assertThat(warnings).anyMatch(w -> w.getField().equals("longitude"));
    }
    
    @Test
    void handleRequest_withInvalidJson_returns400Error() throws Exception {
        // Arrange
        String invalidJson = "{ this is not valid json }";
        APIGatewayProxyRequestEvent request = createMultipartRequest(invalidJson);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Invalid JSON structure");
    }
    
    @Test
    void handleRequest_withEmptyDataset_returnsValidationError() throws Exception {
        // Arrange
        String emptyDataset = "[]";
        APIGatewayProxyRequestEvent request = createMultipartRequest(emptyDataset);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        ValidationResult result = objectMapper.readValue(response.getBody(), ValidationResult.class);
        assertThat(result.isValid()).isFalse();
        assertThat(result.getPlaceCount()).isEqualTo(0);
        assertThat(result.getErrors()).isNotEmpty();
        assertThat(result.getErrors().get(0).getMessage()).contains("empty");
    }
    
    @Test
    void handleRequest_withNoFileContent_returns400Error() throws Exception {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setBody("");
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("No file uploaded");
    }
    
    @Test
    void handleRequest_withDirectJsonBody_parsesAndValidates() throws Exception {
        // Arrange - Direct JSON without multipart wrapper
        String jsonDataset = createValidJsonDataset();
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setBody(jsonDataset);
        
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        request.setHeaders(headers);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        ValidationResult result = objectMapper.readValue(response.getBody(), ValidationResult.class);
        assertThat(result.isValid()).isTrue();
    }
    
    @Test
    void handleRequest_withMultiplePlaces_validatesAll() throws Exception {
        // Arrange
        String jsonDataset = createDatasetWithMultiplePlaces();
        APIGatewayProxyRequestEvent request = createMultipartRequest(jsonDataset);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        ValidationResult result = objectMapper.readValue(response.getBody(), ValidationResult.class);
        assertThat(result.getPlaceCount()).isEqualTo(5);
        
        // Count should include both included and excluded
        int totalValidated = result.getPlaceCount();
        assertThat(totalValidated).isEqualTo(5);
    }
    
    @Test
    void handleRequest_withInvalidPlaceType_returns400Error() throws Exception {
        // Arrange
        String jsonWithInvalidType = "[{" +
            "\"id\": \"place_001\"," +
            "\"name\": \"Test Place\"," +
            "\"type\": \"invalid_type\"," +
            "\"city\": \"Rome\"," +
            "\"latitude\": 41.9028," +
            "\"longitude\": 12.4964" +
            "}]";
        
        APIGatewayProxyRequestEvent request = createMultipartRequest(jsonWithInvalidType);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Invalid JSON structure");
    }
    
    @Test
    void handleRequest_logsExclusionsWithMissingFields() throws Exception {
        // Arrange
        String jsonDataset = "[{" +
            "\"id\": \"place_001\"," +
            "\"type\": \"restaurant\"," +
            "\"city\": \"Rome\"," +
            "\"latitude\": 41.9028," +
            "\"longitude\": 12.4964" +
            "}]";
        
        APIGatewayProxyRequestEvent request = createMultipartRequest(jsonDataset);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        ValidationResult result = objectMapper.readValue(response.getBody(), ValidationResult.class);
        assertThat(result.getExcludedCount()).isEqualTo(1);
        assertThat(result.getErrors()).anyMatch(e -> e.getField().equals("name"));
    }
    
    @Test
    void validationResult_hasCorrectErrorAndWarningCounts() throws Exception {
        // Arrange
        String jsonDataset = createDatasetWithMixedIssues();
        APIGatewayProxyRequestEvent request = createMultipartRequest(jsonDataset);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        ValidationResult result = objectMapper.readValue(response.getBody(), ValidationResult.class);
        assertThat(result.getErrors().size()).isGreaterThan(0);
        assertThat(result.getWarnings().size()).isGreaterThan(0);
    }
    
    // Helper methods
    
    private APIGatewayProxyRequestEvent createMultipartRequest(String fileContent) {
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        
        String boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
        String body = String.format(
            "--%s\r\n" +
            "Content-Disposition: form-data; name=\"dataset\"; filename=\"dataset.json\"\r\n" +
            "Content-Type: application/json\r\n\r\n" +
            "%s\r\n" +
            "--%s--",
            boundary, fileContent, boundary
        );
        
        request.setBody(body);
        
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "multipart/form-data; boundary=" + boundary);
        request.setHeaders(headers);
        
        return request;
    }
    
    private String createValidJsonDataset() {
        return "[" +
            "{" +
            "\"id\": \"place_001\"," +
            "\"name\": \"Colosseum\"," +
            "\"type\": \"historic_site\"," +
            "\"city\": \"Rome\"," +
            "\"latitude\": 41.8902," +
            "\"longitude\": 12.4922," +
            "\"description\": \"Ancient amphitheater\"," +
            "\"rating\": 4.8," +
            "\"price_range\": \"€€\"" +
            "}," +
            "{" +
            "\"id\": \"place_002\"," +
            "\"name\": \"Trevi Fountain\"," +
            "\"type\": \"historic_site\"," +
            "\"city\": \"Rome\"," +
            "\"latitude\": 41.9009," +
            "\"longitude\": 12.4833," +
            "\"description\": \"Baroque fountain\"," +
            "\"rating\": 4.7," +
            "\"price_range\": \"€\"" +
            "}" +
            "]";
    }
    
    private String createDatasetWithMissingCriticalFields() {
        return "[" +
            "{" +
            "\"id\": \"place_001\"," +
            "\"name\": \"Valid Place\"," +
            "\"type\": \"restaurant\"," +
            "\"city\": \"Rome\"," +
            "\"latitude\": 41.9028," +
            "\"longitude\": 12.4964" +
            "}," +
            "{" +
            "\"id\": \"place_002\"," +
            "\"type\": \"museum\"," +
            "\"latitude\": 41.9028," +
            "\"longitude\": 12.4964" +
            "}" +
            "]";
    }
    
    private String createDatasetWithMissingOptionalFields() {
        return "[{" +
            "\"id\": \"place_001\"," +
            "\"name\": \"Minimal Place\"," +
            "\"type\": \"cafe\"," +
            "\"city\": \"Rome\"" +
            "}]";
    }
    
    private String createDatasetWithMultiplePlaces() {
        StringBuilder json = new StringBuilder("[");
        for (int i = 1; i <= 5; i++) {
            if (i > 1) json.append(",");
            json.append("{")
                .append("\"id\": \"place_00").append(i).append("\",")
                .append("\"name\": \"Place ").append(i).append("\",")
                .append("\"type\": \"restaurant\",")
                .append("\"city\": \"Rome\",")
                .append("\"latitude\": 41.90").append(i).append(",")
                .append("\"longitude\": 12.49").append(i)
                .append("}");
        }
        json.append("]");
        return json.toString();
    }
    
    private String createDatasetWithMixedIssues() {
        return "[" +
            "{" +
            "\"id\": \"place_001\"," +
            "\"name\": \"Valid Place\"," +
            "\"type\": \"restaurant\"," +
            "\"city\": \"Rome\"," +
            "\"latitude\": 41.9028," +
            "\"longitude\": 12.4964" +
            "}," +
            "{" +
            "\"id\": \"place_002\"," +
            "\"name\": \"Place Without Coordinates\"," +
            "\"type\": \"museum\"," +
            "\"city\": \"Florence\"" +
            "}," +
            "{" +
            "\"id\": \"place_003\"," +
            "\"type\": \"cafe\"," +
            "\"city\": \"Venice\"," +
            "\"latitude\": 45.4408," +
            "\"longitude\": 12.3155" +
            "}" +
            "]";
    }
}
