package com.italytrip.models;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Enumeration of place types in the Italy Trip Planner system.
 * Maps to the "type" field in the dataset JSON.
 */
public enum PlaceType {
    RESTAURANT("restaurant"),
    HISTORIC_SITE("historic_site"),
    MUSEUM("museum"),
    NEIGHBORHOOD("neighborhood"),
    MARKET("market"),
    CAFE("cafe"),
    VIEWPOINT("viewpoint"),
    EXPERIENCE("experience"),
    PARK("park"),
    SHOP("shop");

    private final String value;

    PlaceType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    /**
     * Converts a string value to the corresponding PlaceType enum.
     * Used for JSON deserialization.
     *
     * @param value the string representation
     * @return the corresponding PlaceType
     * @throws IllegalArgumentException if the value is not recognized
     */
    public static PlaceType fromValue(String value) {
        for (PlaceType type : PlaceType.values()) {
            if (type.value.equals(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown place type: " + value);
    }
}
