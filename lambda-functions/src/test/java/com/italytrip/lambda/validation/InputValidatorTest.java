package com.italytrip.lambda.validation;

import com.italytrip.models.DayPlan;
import com.italytrip.models.UserPreferences;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for InputValidator.
 * Tests validation and sanitization logic for itinerary data.
 */
public class InputValidatorTest {
    
    @Test
    public void testValidateName_Success() {
        InputValidator.ValidationResult<String> result = InputValidator.validateName("My Trip to Rome");
        
        assertThat(result.isValid()).isTrue();
        assertThat(result.getValue()).isEqualTo("My Trip to Rome");
        assertThat(result.getError()).isNull();
    }
    
    @Test
    public void testValidateName_HTMLEncodingApplied() {
        InputValidator.ValidationResult<String> result = InputValidator.validateName("Trip <script>alert('xss')</script>");
        
        assertThat(result.isValid()).isTrue();
        assertThat(result.getValue()).isEqualTo("Trip &lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
    }
    
    @Test
    public void testValidateName_Null() {
        InputValidator.ValidationResult<String> result = InputValidator.validateName(null);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Name is required");
    }
    
    @Test
    public void testValidateName_Empty() {
        InputValidator.ValidationResult<String> result = InputValidator.validateName("");
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Name must not be empty");
    }
    
    @Test
    public void testValidateName_OnlyWhitespace() {
        InputValidator.ValidationResult<String> result = InputValidator.validateName("   ");
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Name must not be empty");
    }
    
    @Test
    public void testValidateName_LeadingWhitespace() {
        InputValidator.ValidationResult<String> result = InputValidator.validateName("  Trip Name");
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Name must not have leading or trailing whitespace");
    }
    
    @Test
    public void testValidateName_TrailingWhitespace() {
        InputValidator.ValidationResult<String> result = InputValidator.validateName("Trip Name  ");
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Name must not have leading or trailing whitespace");
    }
    
    @Test
    public void testValidateName_TooLong() {
        String longName = "A".repeat(201);
        InputValidator.ValidationResult<String> result = InputValidator.validateName(longName);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Name must be 200 characters or less");
    }
    
    @Test
    public void testValidateName_ExactlyMaxLength() {
        String maxName = "A".repeat(200);
        InputValidator.ValidationResult<String> result = InputValidator.validateName(maxName);
        
        assertThat(result.isValid()).isTrue();
        assertThat(result.getValue()).hasSize(200);
    }
    
    @Test
    public void testValidateName_ControlCharacters() {
        // Test with null byte (control character)
        InputValidator.ValidationResult<String> result = InputValidator.validateName("Trip\u0000Name");
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Name contains invalid control characters");
    }
    
    @Test
    public void testValidateName_AllowsTabNewlineCarriageReturn() {
        // Tab, newline, and carriage return should be allowed (not in control chars pattern)
        InputValidator.ValidationResult<String> result = InputValidator.validateName("Trip\tName");
        
        assertThat(result.isValid()).isTrue();
    }
    
    @Test
    public void testValidateDays_Success() {
        List<DayPlan> days = createValidDays();
        
        InputValidator.ValidationResult<Void> result = InputValidator.validateDays(days);
        
        assertThat(result.isValid()).isTrue();
        assertThat(result.getError()).isNull();
    }
    
    @Test
    public void testValidateDays_Null() {
        InputValidator.ValidationResult<Void> result = InputValidator.validateDays(null);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Days array is required");
    }
    
    @Test
    public void testValidateDays_TooFew() {
        List<DayPlan> days = Arrays.asList(
                createDayPlan(1),
                createDayPlan(2)
        );
        
        InputValidator.ValidationResult<Void> result = InputValidator.validateDays(days);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Exactly 3 days are required, got 2");
    }
    
    @Test
    public void testValidateDays_TooMany() {
        List<DayPlan> days = Arrays.asList(
                createDayPlan(1),
                createDayPlan(2),
                createDayPlan(3),
                createDayPlan(4)
        );
        
        InputValidator.ValidationResult<Void> result = InputValidator.validateDays(days);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Exactly 3 days are required, got 4");
    }
    
    @Test
    public void testValidateDays_NullDay() {
        List<DayPlan> days = new ArrayList<>();
        days.add(createDayPlan(1));
        days.add(null);
        days.add(createDayPlan(3));
        
        InputValidator.ValidationResult<Void> result = InputValidator.validateDays(days);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Day 2 is null");
    }
    
    @Test
    public void testValidateDays_MissingDayNumber() {
        List<DayPlan> days = Arrays.asList(
                createDayPlan(1),
                new DayPlan.Builder().places(new ArrayList<>()).build(), // missing day_number
                createDayPlan(3)
        );
        
        InputValidator.ValidationResult<Void> result = InputValidator.validateDays(days);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Day 2 must have a day_number");
    }
    
    @Test
    public void testValidateDays_IncorrectDayNumber() {
        List<DayPlan> days = Arrays.asList(
                createDayPlan(1),
                createDayPlan(5), // Should be 2
                createDayPlan(3)
        );
        
        InputValidator.ValidationResult<Void> result = InputValidator.validateDays(days);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Day 2 has incorrect day_number: 5");
    }
    
    @Test
    public void testValidatePreferences_Null() {
        InputValidator.ValidationResult<Void> result = InputValidator.validatePreferences(null);
        
        assertThat(result.isValid()).isTrue();
    }
    
    @Test
    public void testValidatePreferences_Valid() {
        UserPreferences prefs = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("Florence")
                .pace(UserPreferences.TripPace.MODERATE)
                .addPriceRange("€€")
                .build();
        
        InputValidator.ValidationResult<Void> result = InputValidator.validatePreferences(prefs);
        
        assertThat(result.isValid()).isTrue();
    }
    
    @Test
    public void testValidatePreferences_EmptyCityInList() {
        UserPreferences prefs = new UserPreferences.Builder()
                .addCity("Rome")
                .addCity("")  // Empty city
                .build();
        
        InputValidator.ValidationResult<Void> result = InputValidator.validatePreferences(prefs);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Preference cities must not contain empty values");
    }
    
    @Test
    public void testValidatePreferences_CityWithControlCharacters() {
        UserPreferences prefs = new UserPreferences.Builder()
                .addCity("Rome\u0000")  // Null byte
                .build();
        
        InputValidator.ValidationResult<Void> result = InputValidator.validatePreferences(prefs);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("Preference city contains invalid control characters");
    }
    
    @Test
    public void testValidatePreferences_InvalidPriceRange() {
        UserPreferences prefs = new UserPreferences.Builder()
                .addPriceRange("€€€€")  // Invalid - should be €, €€, or €€€
                .build();
        
        InputValidator.ValidationResult<Void> result = InputValidator.validatePreferences(prefs);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).contains("must be '€', '€€', or '€€€'");
    }
    
    @Test
    public void testValidatePreferences_ValidPriceRanges() {
        for (String validPrice : Arrays.asList("€", "€€", "€€€")) {
            UserPreferences prefs = new UserPreferences.Builder()
                    .addPriceRange(validPrice)
                    .build();
            
            InputValidator.ValidationResult<Void> result = InputValidator.validatePreferences(prefs);
            
            assertThat(result.isValid()).isTrue();
        }
    }
    
    @Test
    public void testValidateItineraryRequest_AllValid() {
        String name = "My Trip";
        List<DayPlan> days = createValidDays();
        UserPreferences prefs = new UserPreferences.Builder()
                .addCity("Rome")
                .build();
        
        List<String> errors = InputValidator.validateItineraryRequest(name, days, prefs);
        
        assertThat(errors).isEmpty();
    }
    
    @Test
    public void testValidateItineraryRequest_MultipleErrors() {
        String name = null;  // Invalid
        List<DayPlan> days = Arrays.asList(createDayPlan(1)); // Invalid - only 1 day
        UserPreferences prefs = new UserPreferences.Builder()
                .addCity("")  // Invalid - empty city
                .build();
        
        List<String> errors = InputValidator.validateItineraryRequest(name, days, prefs);
        
        assertThat(errors).hasSize(3);
        assertThat(errors).contains("Name is required");
        assertThat(errors).contains("Exactly 3 days are required, got 1");
        assertThat(errors).contains("Preference cities must not contain empty values");
    }
    
    @Test
    public void testSanitizeString_Success() {
        InputValidator.ValidationResult<String> result = 
                InputValidator.sanitizeString("Normal text", "field", 100);
        
        assertThat(result.isValid()).isTrue();
        assertThat(result.getValue()).isEqualTo("Normal text");
    }
    
    @Test
    public void testSanitizeString_HTMLEncoding() {
        InputValidator.ValidationResult<String> result = 
                InputValidator.sanitizeString("<script>alert('xss')</script>", "field", 100);
        
        assertThat(result.isValid()).isTrue();
        assertThat(result.getValue()).isEqualTo("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;");
    }
    
    @Test
    public void testSanitizeString_TooLong() {
        String longText = "A".repeat(101);
        InputValidator.ValidationResult<String> result = 
                InputValidator.sanitizeString(longText, "description", 100);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("description must be 100 characters or less");
    }
    
    @Test
    public void testSanitizeString_ControlCharacters() {
        InputValidator.ValidationResult<String> result = 
                InputValidator.sanitizeString("Text\u0000here", "field", 100);
        
        assertThat(result.isValid()).isFalse();
        assertThat(result.getError()).isEqualTo("field contains invalid control characters");
    }
    
    @Test
    public void testSanitizeString_Null() {
        InputValidator.ValidationResult<String> result = 
                InputValidator.sanitizeString(null, "field", 100);
        
        assertThat(result.isValid()).isTrue();
        assertThat(result.getValue()).isNull();
    }
    
    // Helper methods
    
    private List<DayPlan> createValidDays() {
        return Arrays.asList(
                createDayPlan(1),
                createDayPlan(2),
                createDayPlan(3)
        );
    }
    
    private DayPlan createDayPlan(int dayNumber) {
        return new DayPlan.Builder()
                .dayNumber(dayNumber)
                .places(new ArrayList<>())
                .build();
    }
}
