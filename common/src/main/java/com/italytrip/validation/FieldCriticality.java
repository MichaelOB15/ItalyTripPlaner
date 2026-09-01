package com.italytrip.validation;

/**
 * Enumeration of field criticality levels for data validation.
 * Determines how severely the absence of a field impacts functionality.
 */
public enum FieldCriticality {
    /**
     * Field is always required - absence prevents place inclusion.
     * Examples: id, name, type, city
     */
    CRITICAL_ALWAYS,

    /**
     * Field is required for specific features but not always.
     * Place can be included in some contexts but excluded from others.
     * Examples: latitude/longitude (required for map, optional for lists)
     */
    CRITICAL_CONDITIONAL,

    /**
     * Field is important for UX but not blocking.
     * Absence degrades experience but defaults can be applied.
     * Examples: description, hours, duration_minutes, rating
     */
    IMPORTANT,

    /**
     * Field is nice to have but fully optional.
     * Absence has minimal impact on functionality.
     * Examples: region, neighborhood, tags, seasonal_notes
     */
    OPTIONAL
}
