package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.italytrip.lambda.DatasetLoader.DatasetLoaderException;
import com.italytrip.lambda.DatasetLoader.LoadedDataset;
import com.italytrip.lambda.GetRecommendationsFunction.RecommendationsResponse;
import com.italytrip.models.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * Unit tests for GetRecommendationsFunction.
 * Tests request handling, validation, itinerary generation, and error handling.
 */
@ExtendWith(MockitoExtension.class)
class GetRecommendationsFunctionTest {
    
    @Mock
    private DatasetLoader mockDatasetLoader;
    
    @Mock
    private RecommendationEngine mockRecommendationEngine;
    
    @Mock
    private Context mockContext;
    
    @Mock
    private LoadedDataset mockLoadedDataset;
    
    private GetRecommendationsFunction function;
    private ObjectMapper objectMapper;
    private List<Place> testPlaces;
    
    @BeforeEach
    void setUp() {
        function = new GetRecommendationsFunction(
                mockDatasetLoader,
                mockRecommendationEngine,
                "test-bucket",
                "test-key"
        );
        
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        
        // Create test places
        testPlaces = createTestPlaces();
    }
    
    @Test
    void handleRequest_withValidPreferences_returnsSuccess() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addInterest("historic")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        Itinerary expectedItinerary = createTestItinerary();
        
        when(mockDatasetLoader.loadDataset(anyString(), anyString()))
                .thenReturn(mockLoadedDataset);
        when(mockLoadedDataset.getValidPlaces()).thenReturn(testPlaces);
        when(mockRecommendationEngine.generateItinerary(anyList(), any(UserPreferences.class)))
                .thenReturn(expectedItinerary);
        when(mockRecommendationEngine.scoreAndFilterPlaces(anyList(), any(UserPreferences.class)))
                .thenReturn(new ArrayList<>());
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        assertThat(response.getHeaders()).containsKey("Content-Type");
        assertThat(response.getHeaders().get("Content-Type")).isEqualTo("application/json");
        assertThat(response.getHeaders()).containsKey("Access-Control-Allow-Origin");
        
        RecommendationsResponse responseBody = objectMapper.readValue(
                response.getBody(), RecommendationsResponse.class);
        assertThat(responseBody.getItinerary()).isNotNull();
        assertThat(responseBody.getReasoning()).isNotEmpty();
        assertThat(responseBody.getAlternativePlaces()).isNotNull();
    }
    
    @Test
    void handleRequest_withMissingBody_returnsBadRequest() {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(null);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Request body is required");
    }
    
    @Test
    void handleRequest_withEmptyBody_returnsBadRequest() {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody("");
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Request body is required");
    }
    
    @Test
    void handleRequest_withInvalidJson_returnsBadRequest() {
        // Arrange
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody("{ invalid json }");
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Invalid JSON");
    }
    
    @Test
    void handleRequest_withMissingCities_returnsBadRequest() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("At least one city must be specified");
    }
    
    @Test
    void handleRequest_withTooManyCities_returnsBadRequest() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .addCity("Venice")
                .addCity("Milan")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Maximum 3 cities allowed");
    }
    
    @Test
    void handleRequest_withTooManyInterests_returnsBadRequest() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addInterest("historic")
                .addInterest("art")
                .addInterest("food")
                .addInterest("nature")
                .addInterest("wine")
                .addInterest("coastal")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Maximum 5 interests allowed");
    }
    
    @Test
    void handleRequest_withMissingPace_returnsBadRequest() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences();
        preferences.setCities(Arrays.asList("Rome"));
        preferences.setPace(null);
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Trip pace must be specified");
    }
    
    @Test
    void handleRequest_withDatasetLoaderException_returnsServerError() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        when(mockDatasetLoader.loadDataset(anyString(), anyString()))
                .thenThrow(new DatasetLoaderException("S3 error"));
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(500);
        assertThat(response.getBody()).contains("Failed to load dataset");
    }
    
    @Test
    void handleRequest_withEmptyDataset_returnsServerError() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        when(mockDatasetLoader.loadDataset(anyString(), anyString()))
                .thenReturn(mockLoadedDataset);
        when(mockLoadedDataset.getValidPlaces()).thenReturn(new ArrayList<>());
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(500);
        assertThat(response.getBody()).contains("No valid places available");
    }
    
    @Test
    void handleRequest_withInsufficientMatchingPlaces_returnsBadRequest() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .pace(UserPreferences.TripPace.MODERATE)
                .build();
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        when(mockDatasetLoader.loadDataset(anyString(), anyString()))
                .thenReturn(mockLoadedDataset);
        when(mockLoadedDataset.getValidPlaces()).thenReturn(testPlaces);
        when(mockRecommendationEngine.generateItinerary(anyList(), any(UserPreferences.class)))
                .thenThrow(new IllegalArgumentException("No places match"));
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Insufficient places match your preferences");
    }
    
    @Test
    void handleRequest_withAllPreferences_includesReasoningDetails() throws Exception {
        // Arrange
        UserPreferences preferences = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .addInterest("historic")
                .addInterest("art")
                .pace(UserPreferences.TripPace.PACKED)
                .addPriceRange("€€")
                .includeBookingRequired(false)
                .build();
        
        String requestBody = objectMapper.writeValueAsString(
                new GetRecommendationsFunction.RecommendationsRequest(preferences)
        );
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent()
                .withBody(requestBody);
        
        Itinerary expectedItinerary = createTestItinerary();
        
        when(mockDatasetLoader.loadDataset(anyString(), anyString()))
                .thenReturn(mockLoadedDataset);
        when(mockLoadedDataset.getValidPlaces()).thenReturn(testPlaces);
        when(mockRecommendationEngine.generateItinerary(anyList(), any(UserPreferences.class)))
                .thenReturn(expectedItinerary);
        when(mockRecommendationEngine.scoreAndFilterPlaces(anyList(), any(UserPreferences.class)))
                .thenReturn(new ArrayList<>());
        
        // Act
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        RecommendationsResponse responseBody = objectMapper.readValue(
                response.getBody(), RecommendationsResponse.class);
        
        String reasoning = responseBody.getReasoning();
        assertThat(reasoning).contains("Rome");
        assertThat(reasoning).contains("Florence");
        assertThat(reasoning).contains("historic");
        assertThat(reasoning).contains("art");
        assertThat(reasoning).contains("packed");
        assertThat(reasoning).contains("€€");
    }
    
    /**
     * Helper method to create test places for mocking.
     */
    private List<Place> createTestPlaces() {
        List<Place> places = new ArrayList<>();
        
        places.add(new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .rating(4.8)
                .durationMinutes(120)
                .priceRange("€€")
                .tags(Arrays.asList("historic", "ancient"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_002")
                .name("Uffizi Gallery")
                .type(PlaceType.MUSEUM)
                .city("Florence")
                .latitude(43.7687)
                .longitude(11.2569)
                .rating(4.7)
                .durationMinutes(180)
                .priceRange("€€")
                .tags(Arrays.asList("art", "museum"))
                .build());
        
        places.add(new Place.Builder()
                .id("place_003")
                .name("Trattoria Roma")
                .type(PlaceType.RESTAURANT)
                .city("Rome")
                .latitude(41.9000)
                .longitude(12.5000)
                .rating(4.5)
                .durationMinutes(90)
                .priceRange("€€")
                .tags(Arrays.asList("food", "traditional"))
                .build());
        
        return places;
    }
    
    /**
     * Helper method to create a test itinerary for mocking.
     */
    private Itinerary createTestItinerary() {
        List<DayPlan> days = new ArrayList<>();
        
        DayPlan day1 = new DayPlan.Builder()
                .dayNumber(1)
                .places(Arrays.asList(testPlaces.get(0)))
                .startTime("08:00")
                .build();
        
        DayPlan day2 = new DayPlan.Builder()
                .dayNumber(2)
                .places(Arrays.asList(testPlaces.get(1)))
                .startTime("08:00")
                .build();
        
        DayPlan day3 = new DayPlan.Builder()
                .dayNumber(3)
                .places(Arrays.asList(testPlaces.get(2)))
                .startTime("08:00")
                .build();
        
        days.add(day1);
        days.add(day2);
        days.add(day3);
        
        return new Itinerary.Builder()
                .name("Test Itinerary")
                .days(days)
                .build();
    }
}
