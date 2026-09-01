# Models Module

Java domain models for the Italy Trip Planner.

## Quick Start

```bash
mvn clean install        # Build module
mvn test                 # Run tests
```

## Core Models

### Place
Location/destination with geographic coordinates, type, rating, tags.

```java
Place place = new Place.Builder()
    .id("place_001")
    .name("Colosseum")
    .type(PlaceType.HISTORIC_SITE)
    .city("Rome")
    .latitude(41.8902)
    .longitude(12.4922)
    .build();
```

### Itinerary
3-day travel plan with user preferences.

```java
Itinerary itinerary = new Itinerary.Builder()
    .name("My Rome Trip")
    .preferences(preferences)
    .build();
```

### DayPlan
Single day's plan with ordered places.

### UserPreferences
User preferences for AI recommendations (cities, interests, pace, budget).

### PlaceType (Enum)
RESTAURANT, HISTORIC_SITE, MUSEUM, CAFE, MARKET, VIEWPOINT, EXPERIENCE, PARK, etc.

## Features

- Jackson JSON serialization
- Builder pattern for object creation
- Automatic duration calculations
- Validation-ready structure

## Dependencies

- Jackson (JSON)
- JUnit 5 (testing)
- AssertJ (assertions)
