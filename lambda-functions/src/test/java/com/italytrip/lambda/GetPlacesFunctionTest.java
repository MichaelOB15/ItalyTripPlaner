package com.italytrip.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.italytrip.lambda.DatasetLoader.LoadedDataset;
import com.italytrip.lambda.GetPlacesFunction.PlacesResponse;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.models.ValidationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit tests for GetPlacesFunction Lambda handler.
 */
@ExtendWith(MockitoExtension.class)
class GetPlacesFunctionTest {
    
    @Mock
    private DatasetLoader mockDatasetLoader;
    
    @Mock
    private Context mockContext;
    
    private GetPlacesFunction function;
    private ObjectMapper objectMapper;
    private List<Place> testPlaces;
    
    @BeforeEach
    void setUp() throws Exception {
        objectMapper = new ObjectMapper();
        
        // Create test places
        testPlaces = createTestPlaces();
        
        // Setup mock dataset loader
        ValidationResult validationResult = new ValidationResult();
        validationResult.setValid(true);
        validationResult.setPlaceCount(testPlaces.size());
        validationResult.setExcludedCount(0);
        validationResult.setErrors(Collections.emptyList());
        validationResult.setWarnings(Collections.emptyList());
        
        LoadedDataset dataset = new LoadedDataset(
                testPlaces,
                validationResult,
                "test-bucket",
                "test-dataset.json"
        );
        
        when(mockDatasetLoader.loadDataset(anyString(), anyString())).thenReturn(dataset);
        
        // Create function with mocked dependencies
        function = new GetPlacesFunction(mockDatasetLoader, "test-bucket", "test-dataset.json");
    }
    
    private List<Place> createTestPlaces() {
        List<Place> places = new ArrayList<>();
        
        // Rome restaurant
        Place rome1 = new Place();
        rome1.setId("place_001");
        rome1.setName("Roman Restaurant");
        rome1.setType(PlaceType.RESTAURANT);
        rome1.setCity("Rome");
        rome1.setLatitude(41.9028);
        rome1.setLongitude(12.4964);
        rome1.setTags(Arrays.asList("italian", "pasta", "romantic"));
        places.add(rome1);
        
        // Rome historic site
        Place rome2 = new Place();
        rome2.setId("place_002");
        rome2.setName("Colosseum");
        rome2.setType(PlaceType.HISTORIC_SITE);
        rome2.setCity("Rome");
        rome2.setLatitude(41.8902);
        rome2.setLongitude(12.4922);
        rome2.setTags(Arrays.asList("ancient", "iconic", "history"));
        places.add(rome2);
        
        // Florence museum
        Place florence1 = new Place();
        florence1.setId("place_003");
        florence1.setName("Uffizi Gallery");
        florence1.setType(PlaceType.MUSEUM);
        florence1.setCity("Florence");
        florence1.setLatitude(43.7687);
        florence1.setLongitude(11.2569);
        florence1.setTags(Arrays.asList("art", "renaissance", "museum"));
        places.add(florence1);
        
        // Venice cafe
        Place venice1 = new Place();
        venice1.setId("place_004");
        venice1.setName("Venice Cafe");
        venice1.setType(PlaceType.CAFE);
        venice1.setCity("Venice");
        venice1.setLatitude(45.4408);
        venice1.setLongitude(12.3155);
        venice1.setTags(Arrays.asList("coffee", "breakfast", "italian"));
        places.add(venice1);
        
        // Milan restaurant
        Place milan1 = new Place();
        milan1.setId("place_005");
        milan1.setName("Milan Trattoria");
        milan1.setType(PlaceType.RESTAURANT);
        milan1.setCity("Milan");
        milan1.setLatitude(45.4642);
        milan1.setLongitude(9.1900);
        milan1.setTags(Arrays.asList("italian", "modern"));
        places.add(milan1);
        
        return places;
    }
    
    @Test
    void testReturnsAllPlacesWhenNoFiltersApplied() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(null);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        assertThat(response.getHeaders()).containsEntry("Content-Type", "application/json");
        assertThat(response.getHeaders()).containsEntry("Access-Control-Allow-Origin", "*");
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(5);
        assertThat(placesResponse.getTotal()).isEqualTo(5);
        assertThat(placesResponse.isHasMore()).isFalse();
    }
    
    @Test
    void testCityFilterReturnsOnlyMatchingPlaces() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("cities", "Rome");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(2);
        assertThat(placesResponse.getTotal()).isEqualTo(2);
        assertThat(placesResponse.getPlaces())
                .allMatch(place -> place.getCity().equals("Rome"));
    }
    
    @Test
    void testMultipleCityFilterUsesOrLogic() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("cities", "Rome,Florence");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(3);
        assertThat(placesResponse.getTotal()).isEqualTo(3);
        assertThat(placesResponse.getPlaces())
                .allMatch(place -> place.getCity().equals("Rome") || place.getCity().equals("Florence"));
    }
    
    @Test
    void testTypeFilterReturnsOnlyMatchingPlaces() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("types", "restaurant");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(2);
        assertThat(placesResponse.getTotal()).isEqualTo(2);
        assertThat(placesResponse.getPlaces())
                .allMatch(place -> place.getType() == PlaceType.RESTAURANT);
    }
    
    @Test
    void testMultipleTypeFilterUsesOrLogic() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("types", "restaurant,cafe");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(3);
        assertThat(placesResponse.getTotal()).isEqualTo(3);
    }
    
    @Test
    void testTagFilterReturnsPlacesWithAtLeastOneMatchingTag() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("tags", "italian");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(3); // Rome restaurant, Venice cafe, Milan restaurant
        assertThat(placesResponse.getTotal()).isEqualTo(3);
        assertThat(placesResponse.getPlaces())
                .allMatch(place -> place.getTags() != null && place.getTags().contains("italian"));
    }
    
    @Test
    void testMultipleTagFilterUsesOrLogic() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("tags", "art,history");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(2); // Colosseum (history), Uffizi (art)
        assertThat(placesResponse.getTotal()).isEqualTo(2);
    }
    
    @Test
    void testCombinedFiltersUseAndLogic() throws Exception {
        // Given - Filter for restaurants in Rome
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("cities", "Rome");
        queryParams.put("types", "restaurant");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(1); // Only Roman Restaurant
        assertThat(placesResponse.getTotal()).isEqualTo(1);
        assertThat(placesResponse.getPlaces().get(0).getId()).isEqualTo("place_001");
    }
    
    @Test
    void testPaginationWithLimit() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("limit", "2");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(2);
        assertThat(placesResponse.getTotal()).isEqualTo(5);
        assertThat(placesResponse.isHasMore()).isTrue();
    }
    
    @Test
    void testPaginationWithOffset() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("limit", "2");
        queryParams.put("offset", "2");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(2);
        assertThat(placesResponse.getTotal()).isEqualTo(5);
        assertThat(placesResponse.isHasMore()).isTrue();
        
        // Verify we got the 3rd and 4th places
        assertThat(placesResponse.getPlaces().get(0).getId()).isEqualTo("place_003");
        assertThat(placesResponse.getPlaces().get(1).getId()).isEqualTo("place_004");
    }
    
    @Test
    void testPaginationLastPage() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("limit", "2");
        queryParams.put("offset", "4");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(1);
        assertThat(placesResponse.getTotal()).isEqualTo(5);
        assertThat(placesResponse.isHasMore()).isFalse();
    }
    
    @Test
    void testInvalidLimitReturns400Error() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("limit", "not-a-number");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Invalid limit parameter");
    }
    
    @Test
    void testNegativeLimitReturns400Error() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("limit", "-1");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Limit must be greater than 0");
    }
    
    @Test
    void testInvalidOffsetReturns400Error() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("offset", "not-a-number");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Invalid offset parameter");
    }
    
    @Test
    void testNegativeOffsetReturns400Error() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("offset", "-1");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Offset must be non-negative");
    }
    
    @Test
    void testInvalidPlaceTypeReturns400Error() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("types", "invalid_type");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(400);
        assertThat(response.getBody()).contains("Invalid place type");
    }
    
    @Test
    void testResponseFormatMatchesSchema() throws Exception {
        // Given
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(null);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        
        // Verify response has all required fields
        assertThat(placesResponse.getPlaces()).isNotNull();
        assertThat(placesResponse.getTotal()).isGreaterThanOrEqualTo(0);
        
        // Verify places have required fields
        if (!placesResponse.getPlaces().isEmpty()) {
            Place place = placesResponse.getPlaces().get(0);
            assertThat(place.getId()).isNotNull();
            assertThat(place.getName()).isNotNull();
            assertThat(place.getType()).isNotNull();
            assertThat(place.getCity()).isNotNull();
        }
    }
    
    @Test
    void testEmptyFilterParametersAreIgnored() throws Exception {
        // Given
        Map<String, String> queryParams = new HashMap<>();
        queryParams.put("cities", "");
        queryParams.put("types", "  ");
        queryParams.put("tags", ",,,");
        
        APIGatewayProxyRequestEvent request = new APIGatewayProxyRequestEvent();
        request.setQueryStringParameters(queryParams);
        
        // When
        APIGatewayProxyResponseEvent response = function.handleRequest(request, mockContext);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(200);
        
        PlacesResponse placesResponse = objectMapper.readValue(response.getBody(), PlacesResponse.class);
        assertThat(placesResponse.getPlaces()).hasSize(5); // All places returned
    }
}
