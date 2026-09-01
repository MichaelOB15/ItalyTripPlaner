package com.italytrip.lambda;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.italytrip.models.Place;
import com.italytrip.models.ValidationError;
import com.italytrip.models.ValidationResult;
import com.italytrip.models.ValidationWarning;
import com.italytrip.validation.DataValidator;
import com.italytrip.validation.ValidationContext;
import com.italytrip.validation.ValidationOutcome;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Loads and parses JSON datasets from S3, integrating with DataValidator for smart validation.
 * Implements 5-minute caching to optimize performance and reduce S3 API calls.
 */
public class DatasetLoader {
    private static final Logger LOGGER = Logger.getLogger(DatasetLoader.class.getName());
    private static final int CACHE_TTL_SECONDS = 300; // 5 minutes
    
    private final S3Client s3Client;
    private final DataValidator dataValidator;
    private final ObjectMapper objectMapper;
    
    // Cache fields
    private LoadedDataset cachedDataset;
    private Instant cacheExpiry;
    
    /**
     * Creates a DatasetLoader with provided S3 client and data validator.
     * 
     * @param s3Client AWS S3 client for reading datasets
     * @param dataValidator Validator for smart validation with criticality assessment
     */
    public DatasetLoader(S3Client s3Client, DataValidator dataValidator) {
        this.s3Client = Objects.requireNonNull(s3Client, "S3Client cannot be null");
        this.dataValidator = Objects.requireNonNull(dataValidator, "DataValidator cannot be null");
        this.objectMapper = createObjectMapper();
    }
    
    /**
     * Creates a DatasetLoader with default S3 client and data validator.
     */
    public DatasetLoader() {
        this(S3Client.builder().build(), new DataValidator());
    }
    
    /**
     * Configures Jackson ObjectMapper for JSON parsing.
     */
    private ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.configure(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY, true);
        return mapper;
    }
    
    /**
     * Loads and validates a dataset from S3, using cache if available.
     * 
     * @param bucketName S3 bucket containing the dataset
     * @param key S3 object key (file path) of the dataset
     * @return LoadedDataset containing valid places and validation result
     * @throws DatasetLoaderException if loading or parsing fails
     */
    public LoadedDataset loadDataset(String bucketName, String key) throws DatasetLoaderException {
        Objects.requireNonNull(bucketName, "Bucket name cannot be null");
        Objects.requireNonNull(key, "Key cannot be null");
        
        // Check cache first
        if (isCacheValid(bucketName, key)) {
            LOGGER.info("Returning cached dataset for " + bucketName + "/" + key);
            return cachedDataset;
        }
        
        LOGGER.info("Loading dataset from S3: " + bucketName + "/" + key);
        
        try {
            // Read JSON from S3
            String jsonContent = readFromS3(bucketName, key);
            
            // Parse JSON into Place objects
            List<Place> parsedPlaces = parseJson(jsonContent);
            
            // Validate places
            LoadedDataset dataset = validateDataset(parsedPlaces, bucketName, key);
            
            // Update cache
            updateCache(dataset, bucketName, key);
            
            LOGGER.info(String.format("Successfully loaded dataset: %d valid places, %d excluded",
                    dataset.getValidPlaces().size(), dataset.getValidationResult().getExcludedCount()));
            
            return dataset;
            
        } catch (DatasetLoaderException e) {
            throw e;
        } catch (Exception e) {
            throw new DatasetLoaderException("Unexpected error loading dataset: " + e.getMessage(), e);
        }
    }
    
    /**
     * Reads file content from S3.
     * 
     * @param bucketName S3 bucket name
     * @param key S3 object key
     * @return String content of the S3 object
     * @throws DatasetLoaderException if S3 read fails
     */
    private String readFromS3(String bucketName, String key) throws DatasetLoaderException {
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            
            try (ResponseInputStream<GetObjectResponse> response = s3Client.getObject(request)) {
                return new String(response.readAllBytes());
            }
            
        } catch (NoSuchKeyException e) {
            throw new DatasetLoaderException(
                    "Dataset file not found: " + bucketName + "/" + key, e);
        } catch (S3Exception e) {
            String errorMessage = e.awsErrorDetails() != null 
                    ? e.awsErrorDetails().errorMessage() 
                    : e.getMessage();
            throw new DatasetLoaderException(
                    "S3 error reading dataset: " + errorMessage, e);
        } catch (IOException e) {
            throw new DatasetLoaderException(
                    "IO error reading dataset from S3", e);
        }
    }
    
    /**
     * Parses JSON content into list of Place objects.
     * 
     * @param jsonContent JSON string to parse
     * @return List of parsed Place objects (may contain invalid places)
     * @throws DatasetLoaderException if JSON parsing fails
     */
    private List<Place> parseJson(String jsonContent) throws DatasetLoaderException {
        try {
            TypeReference<List<Place>> typeRef = new TypeReference<List<Place>>() {};
            List<Place> places = objectMapper.readValue(jsonContent, typeRef);
            
            if (places == null || places.isEmpty()) {
                LOGGER.warning("Dataset contains no places");
                return Collections.emptyList();
            }
            
            LOGGER.info("Parsed " + places.size() + " places from JSON");
            return places;
            
        } catch (IOException e) {
            throw new DatasetLoaderException(
                    "Invalid JSON syntax: " + e.getMessage(), e);
        }
    }
    
    /**
     * Validates all places using DataValidator with smart criticality assessment.
     * 
     * @param places List of parsed places to validate
     * @param bucketName Source bucket name (for metadata)
     * @param key Source key (for metadata)
     * @return LoadedDataset with valid places and validation result
     */
    private LoadedDataset validateDataset(List<Place> places, String bucketName, String key) {
        List<Place> validPlaces = new ArrayList<>();
        List<ValidationError> allErrors = new ArrayList<>();
        List<ValidationWarning> allWarnings = new ArrayList<>();
        int excludedCount = 0;
        
        // Use validation context with all features enabled
        ValidationContext context = ValidationContext.withAllFeatures();
        
        for (Place place : places) {
            ValidationOutcome outcome = dataValidator.validatePlace(place, context);
            
            if (outcome.shouldInclude()) {
                // Place is valid - add the processed place (with defaults applied)
                validPlaces.add(outcome.getPlace());
                allWarnings.addAll(outcome.getWarnings());
            } else {
                // Place is invalid - log exclusion and record errors
                excludedCount++;
                allErrors.addAll(outcome.getErrors());
                allWarnings.addAll(outcome.getWarnings());
                
                String placeId = place.getId() != null ? place.getId() : "unknown";
                LOGGER.log(Level.WARNING, 
                        "Excluding place {0} due to critical validation errors: {1}",
                        new Object[]{placeId, outcome.getErrors()});
            }
        }
        
        // Create validation result
        ValidationResult result = new ValidationResult();
        result.setValid(!validPlaces.isEmpty());
        result.setPlaceCount(places.size());
        result.setExcludedCount(excludedCount);
        result.setErrors(allErrors);
        result.setWarnings(allWarnings);
        
        return new LoadedDataset(validPlaces, result, bucketName, key);
    }
    
    /**
     * Checks if cached dataset is valid for the requested bucket and key.
     */
    private boolean isCacheValid(String bucketName, String key) {
        if (cachedDataset == null || cacheExpiry == null) {
            return false;
        }
        
        if (Instant.now().isAfter(cacheExpiry)) {
            LOGGER.info("Cache expired");
            return false;
        }
        
        boolean matches = bucketName.equals(cachedDataset.getSourceBucket()) 
                && key.equals(cachedDataset.getSourceKey());
        
        if (!matches) {
            LOGGER.info("Cache miss: different dataset requested");
        }
        
        return matches;
    }
    
    /**
     * Updates the cache with newly loaded dataset.
     */
    private void updateCache(LoadedDataset dataset, String bucketName, String key) {
        this.cachedDataset = dataset;
        this.cacheExpiry = Instant.now().plusSeconds(CACHE_TTL_SECONDS);
        LOGGER.info("Cache updated, expires at " + cacheExpiry);
    }
    
    /**
     * Clears the cache. Useful for testing or forcing a refresh.
     */
    public void clearCache() {
        this.cachedDataset = null;
        this.cacheExpiry = null;
        LOGGER.info("Cache cleared");
    }
    
    /**
     * Container for loaded dataset with validation metadata.
     */
    public static class LoadedDataset {
        private final List<Place> validPlaces;
        private final ValidationResult validationResult;
        private final String sourceBucket;
        private final String sourceKey;
        private final Instant loadedAt;
        
        public LoadedDataset(List<Place> validPlaces, ValidationResult validationResult,
                            String sourceBucket, String sourceKey) {
            this.validPlaces = Collections.unmodifiableList(validPlaces);
            this.validationResult = validationResult;
            this.sourceBucket = sourceBucket;
            this.sourceKey = sourceKey;
            this.loadedAt = Instant.now();
        }
        
        public List<Place> getValidPlaces() {
            return validPlaces;
        }
        
        public ValidationResult getValidationResult() {
            return validationResult;
        }
        
        public String getSourceBucket() {
            return sourceBucket;
        }
        
        public String getSourceKey() {
            return sourceKey;
        }
        
        public Instant getLoadedAt() {
            return loadedAt;
        }
        
        public boolean hasWarnings() {
            return !validationResult.getWarnings().isEmpty();
        }
        
        public boolean hasErrors() {
            return !validationResult.getErrors().isEmpty();
        }
    }
    
    /**
     * Exception thrown when dataset loading fails.
     */
    public static class DatasetLoaderException extends Exception {
        public DatasetLoaderException(String message) {
            super(message);
        }
        
        public DatasetLoaderException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
