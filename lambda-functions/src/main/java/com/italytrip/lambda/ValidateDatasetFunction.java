package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.italytrip.models.Place;
import com.italytrip.models.ValidationError;
import com.italytrip.models.ValidationResult;
import com.italytrip.models.ValidationWarning;
import com.italytrip.validation.DataValidator;
import com.italytrip.validation.ValidationContext;
import com.italytrip.validation.ValidationOutcome;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AWS Lambda function handler for the POST /validate endpoint.
 * Validates user-uploaded custom datasets against the expected JSON structure.
 * Handles multipart form data, parses JSON, and applies DataValidator to each place.
 */
public class ValidateDatasetFunction implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {
    private static final Logger LOGGER = Logger.getLogger(ValidateDatasetFunction.class.getName());
    
    private final DataValidator dataValidator;
    private final ObjectMapper objectMapper;
    
    /**
     * Creates ValidateDatasetFunction with specified dependencies.
     * 
     * @param dataValidator The data validator instance
     */
    public ValidateDatasetFunction(DataValidator dataValidator) {
        this.dataValidator = Objects.requireNonNull(dataValidator, "DataValidator cannot be null");
        this.objectMapper = new ObjectMapper();
    }
    
    /**
     * Default constructor using default DataValidator.
     */
    public ValidateDatasetFunction() {
        this(new DataValidator());
    }
    
    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent request, Context context) {
        LOGGER.info("Processing POST /validate request");
        
        try {
            // Extract file content from multipart form data
            String fileContent = extractFileFromMultipart(request);
            
            if (fileContent == null || fileContent.trim().isEmpty()) {
                LOGGER.warning("No file content found in request");
                return createErrorResponse(400, "No file uploaded or file is empty");
            }
            
            // Attempt to parse JSON into list of Place objects
            List<Place> places;
            try {
                places = parseJsonDataset(fileContent);
            } catch (JsonParseException e) {
                LOGGER.log(Level.WARNING, "JSON parsing failed", e);
                return createErrorResponse(400, "Invalid JSON structure: " + e.getMessage());
            }
            
            if (places == null || places.isEmpty()) {
                LOGGER.warning("Dataset contains no places");
                ValidationResult result = new ValidationResult.Builder()
                    .isValid(false)
                    .addError(new ValidationError(null, "dataset", 
                        "Dataset is empty or does not contain a valid array of places",
                        ValidationError.Severity.CRITICAL))
                    .placeCount(0)
                    .excludedCount(0)
                    .build();
                
                String responseBody = objectMapper.writeValueAsString(result);
                return createResponse(200, responseBody);
            }
            
            // Validate each place using DataValidator
            ValidationResult result = validateDataset(places);
            
            // Generate and return response
            String responseBody = objectMapper.writeValueAsString(result);
            
            LOGGER.info(String.format("Validation complete: %d places, %d excluded, %d errors, %d warnings",
                    result.getPlaceCount(), result.getExcludedCount(), 
                    result.getErrors().size(), result.getWarnings().size()));
            
            return createResponse(200, responseBody);
            
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Unexpected error processing validation request", e);
            return createErrorResponse(500, "Internal server error: " + e.getMessage());
        }
    }
    
    /**
     * Extracts file content from multipart form data in API Gateway request.
     * Handles both base64-encoded and plain text request bodies.
     * 
     * @param request API Gateway proxy request
     * @return File content as string, or null if not found
     */
    private String extractFileFromMultipart(APIGatewayProxyRequestEvent request) {
        String body = request.getBody();
        if (body == null || body.isEmpty()) {
            LOGGER.warning("Request body is null or empty");
            return null;
        }
        
        // Decode if base64-encoded
        if (request.getIsBase64Encoded() != null && request.getIsBase64Encoded()) {
            try {
                body = new String(Base64.getDecoder().decode(body), StandardCharsets.UTF_8);
            } catch (IllegalArgumentException e) {
                LOGGER.log(Level.WARNING, "Failed to decode base64 body", e);
                return null;
            }
        }
        
        // Extract content-type header to get boundary
        Map<String, String> headers = request.getHeaders();
        if (headers == null) {
            headers = Collections.emptyMap();
        }
        
        // Find content-type header (case-insensitive)
        String contentType = null;
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase("content-type")) {
                contentType = entry.getValue();
                break;
            }
        }
        
        if (contentType == null || !contentType.toLowerCase().contains("multipart/form-data")) {
            LOGGER.warning("Content-Type is not multipart/form-data: " + contentType);
            // Attempt to parse as direct JSON (for testing purposes)
            return body;
        }
        
        // Extract boundary from content-type
        String boundary = extractBoundary(contentType);
        if (boundary == null) {
            LOGGER.warning("Could not extract boundary from Content-Type: " + contentType);
            return null;
        }
        
        // Parse multipart form data
        return parseMultipartData(body, boundary);
    }
    
    /**
     * Extracts the boundary string from Content-Type header.
     * 
     * @param contentType Content-Type header value
     * @return Boundary string, or null if not found
     */
    private String extractBoundary(String contentType) {
        Pattern pattern = Pattern.compile("boundary=([^;]+)");
        Matcher matcher = pattern.matcher(contentType);
        
        if (matcher.find()) {
            String boundary = matcher.group(1).trim();
            // Remove quotes if present
            if (boundary.startsWith("\"") && boundary.endsWith("\"")) {
                boundary = boundary.substring(1, boundary.length() - 1);
            }
            return boundary;
        }
        
        return null;
    }
    
    /**
     * Parses multipart form data and extracts file content.
     * 
     * @param body Request body containing multipart data
     * @param boundary Multipart boundary string
     * @return File content, or null if not found
     */
    private String parseMultipartData(String body, String boundary) {
        // Split by boundary
        String[] parts = body.split("--" + Pattern.quote(boundary));
        
        for (String part : parts) {
            if (part.trim().isEmpty() || part.trim().equals("--")) {
                continue;
            }
            
            // Check if this part contains file data
            // Look for Content-Disposition header with filename or name="dataset"
            if (part.contains("Content-Disposition") && 
                (part.contains("filename=") || part.contains("name=\"dataset\""))) {
                
                // Find the start of content (after headers, marked by double newline)
                int contentStart = part.indexOf("\r\n\r\n");
                if (contentStart == -1) {
                    contentStart = part.indexOf("\n\n");
                    if (contentStart != -1) {
                        contentStart += 2;
                    }
                } else {
                    contentStart += 4;
                }
                
                if (contentStart > 0 && contentStart < part.length()) {
                    String content = part.substring(contentStart).trim();
                    // Remove trailing boundary marker if present
                    if (content.endsWith("--")) {
                        content = content.substring(0, content.length() - 2).trim();
                    }
                    return content;
                }
            }
        }
        
        LOGGER.warning("Could not find file content in multipart data");
        return null;
    }
    
    /**
     * Parses JSON string into list of Place objects.
     * 
     * @param jsonContent JSON string content
     * @return List of Place objects
     * @throws JsonParseException if JSON is invalid or doesn't match expected structure
     */
    private List<Place> parseJsonDataset(String jsonContent) throws JsonParseException {
        try {
            // Parse as array of Place objects
            TypeReference<List<Place>> typeRef = new TypeReference<List<Place>>() {};
            return objectMapper.readValue(jsonContent, typeRef);
            
        } catch (com.fasterxml.jackson.core.JsonParseException e) {
            throw new JsonParseException("Malformed JSON syntax: " + e.getOriginalMessage(), e);
        } catch (com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException e) {
            throw new JsonParseException("Unrecognized field '" + e.getPropertyName() + "' in place object", e);
        } catch (com.fasterxml.jackson.databind.exc.MismatchedInputException e) {
            throw new JsonParseException("JSON structure does not match expected format (array of place objects)", e);
        } catch (IOException e) {
            throw new JsonParseException("Failed to parse JSON: " + e.getMessage(), e);
        }
    }
    
    /**
     * Validates all places in the dataset using DataValidator.
     * Collects errors, warnings, and generates validation summary.
     * 
     * @param places List of places to validate
     * @return ValidationResult with all errors, warnings, and summary
     */
    private ValidationResult validateDataset(List<Place> places) {
        ValidationResult.Builder resultBuilder = new ValidationResult.Builder();
        
        // Use validation context with all features enabled
        ValidationContext context = ValidationContext.withAllFeatures();
        
        int includedCount = 0;
        int excludedCount = 0;
        
        for (Place place : places) {
            ValidationOutcome outcome = dataValidator.validatePlace(place, context);
            
            // Add all errors from this place
            for (ValidationError error : outcome.getErrors()) {
                resultBuilder.addError(error);
            }
            
            // Add all warnings from this place
            for (ValidationWarning warning : outcome.getWarnings()) {
                resultBuilder.addWarning(warning);
            }
            
            // Count included vs excluded
            if (outcome.shouldInclude()) {
                includedCount++;
            } else {
                excludedCount++;
                
                // Log exclusion with specific missing fields
                String placeId = place.getId() != null ? place.getId() : "unknown";
                List<String> missingFields = new ArrayList<>();
                for (ValidationError error : outcome.getErrors()) {
                    missingFields.add(error.getField());
                }
                
                LOGGER.info(String.format("Excluded place %s due to missing critical fields: %s",
                        placeId, String.join(", ", missingFields)));
            }
        }
        
        resultBuilder.placeCount(places.size());
        resultBuilder.excludedCount(excludedCount);
        
        // Dataset is valid if no critical errors (excluded places are expected)
        boolean isValid = !resultBuilder.build().hasCriticalErrors();
        resultBuilder.isValid(isValid);
        
        return resultBuilder.build();
    }
    
    /**
     * Creates a successful API Gateway response with CORS headers.
     */
    private APIGatewayProxyResponseEvent createResponse(int statusCode, String body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Access-Control-Allow-Origin", "*");
        headers.put("Access-Control-Allow-Methods", "POST, OPTIONS");
        headers.put("Access-Control-Allow-Headers", "Content-Type, X-Amz-Date, Authorization, X-Api-Key");
        
        return new APIGatewayProxyResponseEvent()
                .withStatusCode(statusCode)
                .withHeaders(headers)
                .withBody(body);
    }
    
    /**
     * Creates an error response with proper formatting and CORS headers.
     */
    private APIGatewayProxyResponseEvent createErrorResponse(int statusCode, String message) {
        try {
            ErrorResponse error = new ErrorResponse(message);
            String body = objectMapper.writeValueAsString(error);
            return createResponse(statusCode, body);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Failed to serialize error response", e);
            return createResponse(statusCode, "{\"error\":\"" + message.replace("\"", "\\\"") + "\"}");
        }
    }
    
    /**
     * Error response structure.
     */
    private static class ErrorResponse {
        private final String error;
        
        ErrorResponse(String error) {
            this.error = error;
        }
        
        public String getError() {
            return error;
        }
    }
    
    /**
     * Custom exception for JSON parsing errors.
     */
    private static class JsonParseException extends Exception {
        JsonParseException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
