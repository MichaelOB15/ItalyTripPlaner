package com.italytrip.lambda.validation;

import com.italytrip.models.DayPlan;
import com.italytrip.models.UserPreferences;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Input validation and sanitization for itinerary data.
 * 
 * <p>Implements requirement 7.8: Sanitize all input data to prevent injection attacks.
 * 
 * <p>Validation rules:
 * <ul>
 *   <li>Name: non-empty, max 200 chars, no leading/trailing whitespace</li>
 *   <li>Days: exactly 3 elements, valid structure</li>
 *   <li>String inputs: HTML encoding, reject control characters</li>
 * </ul>
 * 
 * <p>Returns specific field errors in format suitable for 400 Bad Request responses.
 */
public class InputValidator {
    
    // Control characters pattern (ASCII 0-31 except tab, newline, carriage return)
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]");
    
    // Maximum field lengths
    private static final int MAX_NAME_LENGTH = 200;
    private static final int MAX_DESCRIPTION_LENGTH = 1000;
    private static final int REQUIRED_DAYS_COUNT = 3;
    
    /**
     * Validates and sanitizes an itinerary name.
     * 
     * @param name The name to validate
     * @return ValidationResult with error or sanitized value
     */
    public static ValidationResult<String> validateName(String name) {
        if (name == null) {
            return ValidationResult.error("Name is required");
        }
        
        String trimmed = name.trim();
        
        // Check if empty after trimming
        if (trimmed.isEmpty()) {
            return ValidationResult.error("Name must not be empty");
        }
        
        // Check for leading/trailing whitespace (after checking empty)
        if (!name.equals(trimmed)) {
            return ValidationResult.error("Name must not have leading or trailing whitespace");
        }
        
        // Check length
        if (name.length() > MAX_NAME_LENGTH) {
            return ValidationResult.error("Name must be " + MAX_NAME_LENGTH + " characters or less");
        }
        
        // Sanitize: reject control characters
        if (CONTROL_CHARS.matcher(name).find()) {
            return ValidationResult.error("Name contains invalid control characters");
        }
        
        // HTML encode for safety
        String sanitized = htmlEncode(name);
        
        return ValidationResult.success(sanitized);
    }
    
    /**
     * Validates the days array structure.
     * 
     * @param days The days array to validate
     * @return ValidationResult with error or null (structure is valid)
     */
    public static ValidationResult<Void> validateDays(List<DayPlan> days) {
        if (days == null) {
            return ValidationResult.error("Days array is required");
        }
        
        // Check exactly 3 elements
        if (days.size() != REQUIRED_DAYS_COUNT) {
            return ValidationResult.error("Exactly " + REQUIRED_DAYS_COUNT + " days are required, got " + days.size());
        }
        
        // Validate each day has proper structure
        for (int i = 0; i < days.size(); i++) {
            DayPlan day = days.get(i);
            
            if (day == null) {
                return ValidationResult.error("Day " + (i + 1) + " is null");
            }
            
            if (day.getDayNumber() == null) {
                return ValidationResult.error("Day " + (i + 1) + " must have a day_number");
            }
            
            if (day.getDayNumber() != i + 1) {
                return ValidationResult.error("Day " + (i + 1) + " has incorrect day_number: " + day.getDayNumber());
            }
            
            // Validate day has places list (can be empty)
            if (day.getPlaces() == null) {
                return ValidationResult.error("Day " + (i + 1) + " must have a places array (can be empty)");
            }
        }
        
        return ValidationResult.success(null);
    }
    
    /**
     * Validates user preferences (optional field).
     * 
     * @param preferences The preferences to validate (can be null)
     * @return ValidationResult with error or null (preferences are valid)
     */
    public static ValidationResult<Void> validatePreferences(UserPreferences preferences) {
        // Preferences are optional
        if (preferences == null) {
            return ValidationResult.success(null);
        }
        
        // If preferences exist, validate their structure
        // Cities list can be empty or null
        if (preferences.getCities() != null) {
            for (String city : preferences.getCities()) {
                if (city == null || city.trim().isEmpty()) {
                    return ValidationResult.error("Preference cities must not contain empty values");
                }
                
                // Reject control characters in city names
                if (CONTROL_CHARS.matcher(city).find()) {
                    return ValidationResult.error("Preference city contains invalid control characters");
                }
            }
        }
        
        // Validate pace if provided - it's an enum, so Jackson will handle invalid values
        // No additional validation needed here
        
        // Validate price range if provided - it's a List<String>
        if (preferences.getPriceRange() != null && !preferences.getPriceRange().isEmpty()) {
            for (String priceItem : preferences.getPriceRange()) {
                if (priceItem == null || priceItem.trim().isEmpty()) {
                    return ValidationResult.error("Preference price_range must not contain empty values");
                }
                if (!priceItem.equals("€") && !priceItem.equals("€€") && !priceItem.equals("€€€") && !priceItem.equals("€€€€")) {
                    return ValidationResult.error("Preference price_range items must be '€', '€€', '€€€', or '€€€€'");
                }
            }
        }
        
        return ValidationResult.success(null);
    }
    
    /**
     * Sanitizes a string field by HTML encoding and rejecting control characters.
     * 
     * @param value The string to sanitize
     * @param fieldName The field name for error messages
     * @param maxLength The maximum allowed length
     * @return ValidationResult with error or sanitized value
     */
    public static ValidationResult<String> sanitizeString(String value, String fieldName, int maxLength) {
        if (value == null) {
            return ValidationResult.success(null);
        }
        
        // Check length
        if (value.length() > maxLength) {
            return ValidationResult.error(fieldName + " must be " + maxLength + " characters or less");
        }
        
        // Reject control characters
        if (CONTROL_CHARS.matcher(value).find()) {
            return ValidationResult.error(fieldName + " contains invalid control characters");
        }
        
        // HTML encode
        String sanitized = htmlEncode(value);
        
        return ValidationResult.success(sanitized);
    }
    
    /**
     * HTML encodes a string to prevent XSS attacks.
     * Encodes: &, <, >, ", '
     * 
     * @param input The string to encode
     * @return HTML-encoded string
     */
    private static String htmlEncode(String input) {
        if (input == null) {
            return null;
        }
        
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#x27;");
    }
    
    /**
     * Validates a complete itinerary request (for Create and Update operations).
     * 
     * @param name The itinerary name
     * @param days The days array
     * @param preferences The user preferences (optional)
     * @return List of validation errors (empty if valid)
     */
    public static List<String> validateItineraryRequest(String name, List<DayPlan> days, UserPreferences preferences) {
        List<String> errors = new ArrayList<>();
        
        // Validate name
        ValidationResult<String> nameResult = validateName(name);
        if (!nameResult.isValid()) {
            errors.add(nameResult.getError());
        }
        
        // Validate days
        ValidationResult<Void> daysResult = validateDays(days);
        if (!daysResult.isValid()) {
            errors.add(daysResult.getError());
        }
        
        // Validate preferences
        ValidationResult<Void> prefsResult = validatePreferences(preferences);
        if (!prefsResult.isValid()) {
            errors.add(prefsResult.getError());
        }
        
        return errors;
    }
    
    /**
     * Result of a validation operation.
     * 
     * @param <T> The type of the validated value
     */
    public static class ValidationResult<T> {
        private final boolean valid;
        private final String error;
        private final T value;
        
        private ValidationResult(boolean valid, String error, T value) {
            this.valid = valid;
            this.error = error;
            this.value = value;
        }
        
        public static <T> ValidationResult<T> success(T value) {
            return new ValidationResult<>(true, null, value);
        }
        
        public static <T> ValidationResult<T> error(String error) {
            return new ValidationResult<>(false, error, null);
        }
        
        public boolean isValid() {
            return valid;
        }
        
        public String getError() {
            return error;
        }
        
        public T getValue() {
            return value;
        }
    }
}
