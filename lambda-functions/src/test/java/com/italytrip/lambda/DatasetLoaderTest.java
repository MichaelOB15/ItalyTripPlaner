package com.italytrip.lambda;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.italytrip.lambda.DatasetLoader.DatasetLoaderException;
import com.italytrip.lambda.DatasetLoader.LoadedDataset;
import com.italytrip.models.Place;
import com.italytrip.models.PlaceType;
import com.italytrip.validation.DataValidator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DatasetLoader class.
 * Tests S3 integration, JSON parsing, validation, and caching functionality.
 */
@ExtendWith(MockitoExtension.class)
class DatasetLoaderTest {

    @Mock
    private S3Client mockS3Client;

    @Mock
    private DataValidator mockDataValidator;

    private DatasetLoader loader;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        loader = new DatasetLoader(mockS3Client, mockDataValidator);
        objectMapper = new ObjectMapper();
    }

    @AfterEach
    void tearDown() {
        if (loader != null) {
            loader.clearCache();
        }
    }

    @Test
    void testLoadDataset_ValidJson_ReturnsValidPlaces() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/italy.json";
        
        Place validPlace = createValidPlace("place_001", "Colosseum", "Rome");
        String jsonContent = objectMapper.writeValueAsString(List.of(validPlace));
        
        mockS3Response(bucketName, key, jsonContent);
        mockValidatorAcceptsPlace(validPlace);

        // Act
        LoadedDataset result = loader.loadDataset(bucketName, key);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getValidPlaces()).hasSize(1);
        assertThat(result.getValidPlaces().get(0).getId()).isEqualTo("place_001");
        assertThat(result.getSourceBucket()).isEqualTo(bucketName);
        assertThat(result.getSourceKey()).isEqualTo(key);
        assertThat(result.getValidationResult().getPlaceCount()).isEqualTo(1);
        assertThat(result.getValidationResult().getExcludedCount()).isEqualTo(0);
        
        verify(mockS3Client, times(1)).getObject(any(GetObjectRequest.class));
    }

    @Test
    void testLoadDataset_MultiplePlaces_ValidatesEach() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/italy.json";
        
        Place place1 = createValidPlace("place_001", "Colosseum", "Rome");
        Place place2 = createValidPlace("place_002", "Uffizi Gallery", "Florence");
        Place place3 = createValidPlace("place_003", "Rialto Bridge", "Venice");
        
        String jsonContent = objectMapper.writeValueAsString(Arrays.asList(place1, place2, place3));
        
        mockS3Response(bucketName, key, jsonContent);
        mockValidatorAcceptsPlace(place1);
        mockValidatorAcceptsPlace(place2);
        mockValidatorAcceptsPlace(place3);

        // Act
        LoadedDataset result = loader.loadDataset(bucketName, key);

        // Assert
        assertThat(result.getValidPlaces()).hasSize(3);
        assertThat(result.getValidationResult().getPlaceCount()).isEqualTo(3);
        assertThat(result.getValidationResult().getExcludedCount()).isEqualTo(0);
        
        verify(mockDataValidator, times(3)).validatePlace(any(Place.class), any());
    }

    @Test
    void testLoadDataset_InvalidPlace_ExcludesFromResult() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/italy.json";
        
        Place validPlace = createValidPlace("place_001", "Colosseum", "Rome");
        Place invalidPlace = createInvalidPlace("place_002"); // Missing required fields
        
        String jsonContent = objectMapper.writeValueAsString(Arrays.asList(validPlace, invalidPlace));
        
        mockS3Response(bucketName, key, jsonContent);
        mockValidatorAcceptsPlace(validPlace);
        mockValidatorRejectsPlace(invalidPlace);

        // Act
        LoadedDataset result = loader.loadDataset(bucketName, key);

        // Assert
        assertThat(result.getValidPlaces()).hasSize(1);
        assertThat(result.getValidPlaces().get(0).getId()).isEqualTo("place_001");
        assertThat(result.getValidationResult().getPlaceCount()).isEqualTo(2);
        assertThat(result.getValidationResult().getExcludedCount()).isEqualTo(1);
        assertThat(result.hasErrors()).isTrue();
    }

    @Test
    void testLoadDataset_InvalidJson_ThrowsException() {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/invalid.json";
        String invalidJson = "{ invalid json content }";
        
        mockS3Response(bucketName, key, invalidJson);

        // Act & Assert
        assertThatThrownBy(() -> loader.loadDataset(bucketName, key))
                .isInstanceOf(DatasetLoaderException.class)
                .hasMessageContaining("Invalid JSON syntax");
        
        verify(mockS3Client, times(1)).getObject(any(GetObjectRequest.class));
    }

    @Test
    void testLoadDataset_FileNotFound_ThrowsException() {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/missing.json";
        
        when(mockS3Client.getObject(any(GetObjectRequest.class)))
                .thenThrow(NoSuchKeyException.builder()
                        .message("The specified key does not exist")
                        .build());

        // Act & Assert
        assertThatThrownBy(() -> loader.loadDataset(bucketName, key))
                .isInstanceOf(DatasetLoaderException.class)
                .hasMessageContaining("Dataset file not found");
    }

    @Test
    void testLoadDataset_S3Error_ThrowsException() {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/italy.json";
        
        when(mockS3Client.getObject(any(GetObjectRequest.class)))
                .thenThrow(S3Exception.builder()
                        .message("Access Denied")
                        .statusCode(403)
                        .build());

        // Act & Assert
        assertThatThrownBy(() -> loader.loadDataset(bucketName, key))
                .isInstanceOf(DatasetLoaderException.class)
                .hasMessageContaining("S3 error reading dataset");
    }

    @Test
    void testLoadDataset_EmptyDataset_ReturnsEmptyList() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/empty.json";
        String emptyJson = "[]";
        
        mockS3Response(bucketName, key, emptyJson);

        // Act
        LoadedDataset result = loader.loadDataset(bucketName, key);

        // Assert
        assertThat(result.getValidPlaces()).isEmpty();
        assertThat(result.getValidationResult().getPlaceCount()).isEqualTo(0);
        assertThat(result.getValidationResult().getExcludedCount()).isEqualTo(0);
    }

    @Test
    void testLoadDataset_NullBucketName_ThrowsException() {
        // Act & Assert
        assertThatThrownBy(() -> loader.loadDataset(null, "key"))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Bucket name cannot be null");
    }

    @Test
    void testLoadDataset_NullKey_ThrowsException() {
        // Act & Assert
        assertThatThrownBy(() -> loader.loadDataset("bucket", null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("Key cannot be null");
    }

    @Test
    void testCache_SecondLoadWithinTTL_UsesCachedData() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/italy.json";
        
        Place validPlace = createValidPlace("place_001", "Colosseum", "Rome");
        String jsonContent = objectMapper.writeValueAsString(List.of(validPlace));
        
        mockS3Response(bucketName, key, jsonContent);
        mockValidatorAcceptsPlace(validPlace);

        // Act - First load
        LoadedDataset result1 = loader.loadDataset(bucketName, key);
        Instant firstLoadTime = result1.getLoadedAt();
        
        // Act - Second load (should use cache)
        LoadedDataset result2 = loader.loadDataset(bucketName, key);

        // Assert
        assertThat(result2.getValidPlaces()).hasSize(1);
        assertThat(result2.getLoadedAt()).isEqualTo(firstLoadTime); // Same instance from cache
        
        // S3 should only be called once
        verify(mockS3Client, times(1)).getObject(any(GetObjectRequest.class));
    }

    @Test
    void testCache_DifferentDataset_IgnoresCache() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key1 = "datasets/italy.json";
        String key2 = "datasets/france.json";
        
        Place place1 = createValidPlace("place_001", "Colosseum", "Rome");
        Place place2 = createValidPlace("place_002", "Eiffel Tower", "Paris");
        
        String json1 = objectMapper.writeValueAsString(List.of(place1));
        String json2 = objectMapper.writeValueAsString(List.of(place2));
        
        // Set up mocks for two different datasets
        ByteArrayInputStream inputStream1 = new ByteArrayInputStream(
                json1.getBytes(StandardCharsets.UTF_8));
        ByteArrayInputStream inputStream2 = new ByteArrayInputStream(
                json2.getBytes(StandardCharsets.UTF_8));
        
        ResponseInputStream<GetObjectResponse> responseStream1 = 
                new ResponseInputStream<>(
                        GetObjectResponse.builder().build(),
                        AbortableInputStream.create(inputStream1)
                );
        ResponseInputStream<GetObjectResponse> responseStream2 = 
                new ResponseInputStream<>(
                        GetObjectResponse.builder().build(),
                        AbortableInputStream.create(inputStream2)
                );
        
        when(mockS3Client.getObject(argThat((GetObjectRequest req) ->
                req != null && req.bucket().equals(bucketName) && req.key().equals(key1))))
                .thenReturn(responseStream1);
        when(mockS3Client.getObject(argThat((GetObjectRequest req) ->
                req != null && req.bucket().equals(bucketName) && req.key().equals(key2))))
                .thenReturn(responseStream2);
        
        mockValidatorAcceptsPlace(place1);
        mockValidatorAcceptsPlace(place2);

        // Act
        LoadedDataset result1 = loader.loadDataset(bucketName, key1);
        LoadedDataset result2 = loader.loadDataset(bucketName, key2);

        // Assert
        assertThat(result1.getValidPlaces().get(0).getName()).isEqualTo("Colosseum");
        assertThat(result2.getValidPlaces().get(0).getName()).isEqualTo("Eiffel Tower");
        
        // S3 should be called twice (different keys)
        verify(mockS3Client, times(2)).getObject(any(GetObjectRequest.class));
    }

    @Test
    void testCache_ClearCache_ForcesReload() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/italy.json";
        
        Place validPlace = createValidPlace("place_001", "Colosseum", "Rome");
        String jsonContent = objectMapper.writeValueAsString(List.of(validPlace));
        
        // Mock S3 responses - need two separate input streams
        ByteArrayInputStream inputStream1 = new ByteArrayInputStream(
                jsonContent.getBytes(StandardCharsets.UTF_8));
        ByteArrayInputStream inputStream2 = new ByteArrayInputStream(
                jsonContent.getBytes(StandardCharsets.UTF_8));
        
        ResponseInputStream<GetObjectResponse> responseStream1 = 
                new ResponseInputStream<>(
                        GetObjectResponse.builder().build(),
                        AbortableInputStream.create(inputStream1)
                );
        ResponseInputStream<GetObjectResponse> responseStream2 = 
                new ResponseInputStream<>(
                        GetObjectResponse.builder().build(),
                        AbortableInputStream.create(inputStream2)
                );
        
        when(mockS3Client.getObject(any(GetObjectRequest.class)))
                .thenReturn(responseStream1, responseStream2);
        
        mockValidatorAcceptsPlace(validPlace);

        // Act
        LoadedDataset result1 = loader.loadDataset(bucketName, key);
        loader.clearCache();
        LoadedDataset result2 = loader.loadDataset(bucketName, key);

        // Assert
        assertThat(result1.getValidPlaces()).hasSize(1);
        assertThat(result2.getValidPlaces()).hasSize(1);
        assertThat(result2.getLoadedAt()).isAfter(result1.getLoadedAt());
        
        // S3 should be called twice (cache was cleared)
        verify(mockS3Client, times(2)).getObject(any(GetObjectRequest.class));
    }

    @Test
    void testLoadDataset_PreservesOptionalFields() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/italy.json";
        
        Place place = new Place.Builder()
                .id("place_001")
                .name("Colosseum")
                .type(PlaceType.HISTORIC_SITE)
                .city("Rome")
                .latitude(41.8902)
                .longitude(12.4922)
                .description("Ancient amphitheater")
                .hours("9:00-19:00")
                .durationMinutes(120)
                .priceRange("€€")
                .rating(4.8)
                .tags(Arrays.asList("iconic", "historic"))
                .seasonalNotes("Crowded in summer")
                .bookingRequired(true)
                .build();
        
        String jsonContent = objectMapper.writeValueAsString(List.of(place));
        
        mockS3Response(bucketName, key, jsonContent);
        mockValidatorAcceptsPlace(place);

        // Act
        LoadedDataset result = loader.loadDataset(bucketName, key);

        // Assert
        Place loaded = result.getValidPlaces().get(0);
        assertThat(loaded.getDescription()).isEqualTo("Ancient amphitheater");
        assertThat(loaded.getHours()).isEqualTo("9:00-19:00");
        assertThat(loaded.getDurationMinutes()).isEqualTo(120);
        assertThat(loaded.getPriceRange()).isEqualTo("€€");
        assertThat(loaded.getRating()).isEqualTo(4.8);
        assertThat(loaded.getTags()).containsExactly("iconic", "historic");
        assertThat(loaded.getSeasonalNotes()).isEqualTo("Crowded in summer");
        assertThat(loaded.getBookingRequired()).isTrue();
    }

    @Test
    void testLoadedDataset_HasWarnings_ReturnsTrue() throws Exception {
        // Arrange
        String bucketName = "test-bucket";
        String key = "datasets/italy.json";
        
        Place place = createValidPlace("place_001", "Colosseum", "Rome");
        String jsonContent = objectMapper.writeValueAsString(List.of(place));
        
        mockS3Response(bucketName, key, jsonContent);
        mockValidatorAcceptsPlaceWithWarnings(place);

        // Act
        LoadedDataset result = loader.loadDataset(bucketName, key);

        // Assert
        assertThat(result.hasWarnings()).isTrue();
        assertThat(result.getValidationResult().getWarnings()).isNotEmpty();
    }

    // Helper methods

    private Place createValidPlace(String id, String name, String city) {
        return new Place.Builder()
                .id(id)
                .name(name)
                .type(PlaceType.HISTORIC_SITE)
                .city(city)
                .latitude(41.8902)
                .longitude(12.4922)
                .build();
    }

    private Place createInvalidPlace(String id) {
        Place place = new Place();
        place.setId(id);
        // Missing required fields: name, type, city
        return place;
    }

    private void mockS3Response(String bucketName, String key, String content) {
        try {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(
                    content.getBytes(StandardCharsets.UTF_8));
            
            ResponseInputStream<GetObjectResponse> responseInputStream = 
                    new ResponseInputStream<>(
                            GetObjectResponse.builder().build(),
                            AbortableInputStream.create(inputStream)
                    );
            
            when(mockS3Client.getObject(argThat((GetObjectRequest req) ->
                    req.bucket().equals(bucketName) && req.key().equals(key))))
                    .thenReturn(responseInputStream);
        } catch (Exception e) {
            throw new RuntimeException("Failed to mock S3 response", e);
        }
    }

    private void mockValidatorAcceptsPlace(Place place) {
        com.italytrip.validation.ValidationOutcome outcome = 
                new com.italytrip.validation.ValidationOutcome(
                        true, 
                        List.of(), 
                        List.of(), 
                        place
                );
        
        when(mockDataValidator.validatePlace(eq(place), any()))
                .thenReturn(outcome);
    }

    private void mockValidatorAcceptsPlaceWithWarnings(Place place) {
        com.italytrip.models.ValidationWarning warning = 
                new com.italytrip.models.ValidationWarning(
                        place.getId(),
                        "description",
                        "Missing description",
                        "Reduced information available"
                );
        
        com.italytrip.validation.ValidationOutcome outcome = 
                new com.italytrip.validation.ValidationOutcome(
                        true, 
                        List.of(), 
                        List.of(warning), 
                        place
                );
        
        when(mockDataValidator.validatePlace(eq(place), any()))
                .thenReturn(outcome);
    }

    private void mockValidatorRejectsPlace(Place place) {
        com.italytrip.models.ValidationError error = 
                new com.italytrip.models.ValidationError(
                        place.getId(),
                        "name",
                        "Missing display name",
                        com.italytrip.models.ValidationError.Severity.CRITICAL
                );
        
        com.italytrip.validation.ValidationOutcome outcome = 
                new com.italytrip.validation.ValidationOutcome(
                        false, 
                        List.of(error), 
                        List.of(), 
                        null
                );
        
        when(mockDataValidator.validatePlace(eq(place), any()))
                .thenReturn(outcome);
    }
}
