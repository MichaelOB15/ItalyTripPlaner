# Implementation Plan: Italy Trip Planner

## Overview

This implementation plan guides the development of a full-stack serverless Italy Trip Planner application. The backend uses **Java** with AWS Lambda functions, while the frontend is built with **React** and **TypeScript**. The architecture leverages AWS S3 for data storage, API Gateway for RESTful endpoints, and CloudFront for CDN delivery. The application enables users to browse Italian destinations, create 3-day itineraries with intelligent recommendations, and interactively edit plans through drag-and-drop operations.

**Technology Stack:**
- **Backend**: Java 17+ (Lambda runtime), AWS Lambda, API Gateway, S3
- **Frontend**: React 18+, TypeScript, Context API, Leaflet.js, React DnD
- **Infrastructure**: AWS CDK (TypeScript), CloudFront, IAM
- **Testing**: JUnit 5 (backend), Jest + React Testing Library (frontend)
- **Build Tools**: Maven (backend), npm/webpack (frontend)

## Tasks

- [x] 1. Project Setup and Infrastructure Foundation
  - [x] 1.1 Initialize backend Java project structure with Maven
    - Create multi-module Maven project with modules: `lambda-functions`, `common`, `models`
    - Configure Maven POM files with dependencies: AWS SDK v2, Jackson, JUnit 5, AssertJ
    - Set up Java 17+ compiler target and runtime configuration
    - Create base package structure: `com.italytrip.lambda`, `com.italytrip.models`, `com.italytrip.validation`
    - Configure Maven build plugins for Lambda deployment packaging
    - _Requirements: 10.3, 10.4, 15.1_

  - [x] 1.2 Initialize frontend React project with TypeScript
    - Create React application using Vite with TypeScript template
    - Configure TypeScript compiler options (strict mode, ES2020 target)
    - Set up ESLint and Prettier for code quality
    - Install core dependencies: React 18, React Router, Axios, Tailwind CSS
    - Configure project structure: `/src/components`, `/src/contexts`, `/src/services`, `/src/types`, `/src/utils`
    - _Requirements: 9.1, 9.2, 9.4_

  - [x] 1.3 Set up AWS infrastructure with CDK
    - Initialize AWS CDK project in TypeScript
    - Define S3 buckets: `frontend-bucket` (website hosting), `data-bucket` (datasets)
    - Configure bucket policies: block public access, enable versioning, SSE-S3 encryption
    - Create CloudFront distribution with OAI for frontend bucket access
    - Configure CloudFront cache behaviors: static assets (1yr TTL), index.html (no cache)
    - Set up API Gateway REST API with CORS configuration
    - Create IAM roles: Lambda execution role with S3 read permissions, CloudFront OAI role
    - Configure Parameter Store for environment variables (bucket names, API endpoint)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 15.1, 15.2, 15.3_

  - [x] 1.4 Upload default dataset to S3
    - Copy `initial_documents/file_italy.json` to S3 data bucket
    - Verify file upload and accessibility from Lambda execution role
    - Enable S3 versioning and test rollback capability
    - _Requirements: 10.6, 10.7_

- [x] 2. Data Models and Core Validation Logic
  - [x] 2.1 Create Java data models for Place and related types
    - Implement `Place` record/class with all fields (id, name, type, city, coordinates, optional fields)
    - Create `PlaceType` enum with all place types (restaurant, historic_site, museum, etc.)
    - Implement `Itinerary` class with 3-day structure
    - Create `DayPlan` class with place list and metadata
    - Implement `UserPreferences` class for recommendation preferences
    - Create `ValidationResult`, `ValidationError`, `ValidationWarning` classes
    - Add Jackson annotations for JSON serialization/deserialization
    - Implement builders for complex objects
    - _Requirements: 1.1, 1.3, 1.5_

  - [x] 2.2 Implement smart data validation with criticality assessment
    - Create `FieldCriticality` enum (CRITICAL_ALWAYS, CRITICAL_CONDITIONAL, IMPORTANT, OPTIONAL)
    - Implement `DataValidator` class with `validatePlace` method
    - Define criticality map: id/name/type/city as CRITICAL_ALWAYS, coordinates as CRITICAL_CONDITIONAL
    - Implement validation logic that classifies missing fields by criticality
    - Generate warnings for missing non-critical fields (description, hours, rating, etc.)
    - Generate errors for missing critical fields
    - Apply default values for important missing fields (60min duration, €1 price, empty tags)
    - Return `ValidationOutcome` with inclusion decision and validation messages
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9_

  - [ ]* 2.3 Write unit tests for data models and validation
    - Test Place model serialization/deserialization with Jackson
    - Test validation accepts place with all required fields
    - Test validation rejects place missing critical fields (id, name, type, city)
    - Test validation includes place with missing coordinates but generates warnings
    - Test validation applies default values correctly
    - Test validation handles null vs missing fields appropriately
    - Test edge cases: empty strings, invalid enum values, out-of-range coordinates
    - _Requirements: 1.3, 1.4, 17.1-17.9_

- [x] 3. Dataset Loading and Parsing Lambda Function
  - [x] 3.1 Implement dataset loader Lambda function in Java
    - Create `DatasetLoaderFunction` class extending AWS Lambda RequestHandler
    - Implement S3 client initialization with SDK v2
    - Load dataset JSON from S3 using bucket and key from environment variables
    - Parse JSON into `List<Place>` using Jackson ObjectMapper
    - Handle JSON parsing errors with descriptive error messages
    - Implement in-memory caching with 5-minute TTL to reduce S3 reads
    - Apply validation to each place using `DataValidator`
    - Collect validation results and generate summary
    - Log excluded places with specific missing fields
    - Return validated place list or error response
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.7_

  - [ ]* 3.2 Write unit tests for dataset loader
    - Mock S3 client to return test JSON dataset
    - Test successful parsing of valid dataset
    - Test error handling for invalid JSON syntax
    - Test validation integration with DataValidator
    - Test caching behavior (cache hit reduces S3 calls)
    - Test cache expiration after TTL
    - Test exclusion logging for places with missing critical fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Places API Lambda Function (GET /places)
  - [x] 4.1 Implement places query Lambda function
    - Create `GetPlacesFunction` class with API Gateway proxy integration
    - Load dataset using dataset loader (leverage cache)
    - Parse query parameters: cities, types, tags (comma-separated), limit, offset
    - Implement filter logic:
      - City filter: match place.city against list (OR logic within filter)
      - Type filter: match place.type against list (OR logic)
      - Tag filter: place must have at least one matching tag (OR logic)
      - Combined filters: AND logic across different filter types
    - Apply pagination: limit (default 100) and offset
    - Return response: `{ places: Place[], total: number, hasMore: boolean }`
    - Handle invalid requests with 400 error and details
    - Set CORS headers in response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 4.2 Write unit tests for places API
    - Test returns all places when no filters applied
    - Test city filter returns only matching places
    - Test type filter returns only matching places
    - Test tag filter returns places with at least one matching tag
    - Test combined filters apply AND logic correctly
    - Test pagination with limit and offset
    - Test invalid request returns 400 error
    - Test response format matches schema
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Recommendation Engine Algorithm
  - [x] 5.1 Implement place scoring algorithm
    - Create `RecommendationEngine` class
    - Implement `scorePlaceForPreferences` method:
      - City match: +3 points
      - Interest/tag match: +2 points per matching tag
      - Price range match: +1 point
      - Rating boost: +rating/2 points
      - Booking required penalty: -2 points if user preference is false
      - Floor score at 0
    - Filter out places with score < 1
    - Store scores as transient field on Place objects
    - _Requirements: 18.3, 18.5_

  - [x] 5.2 Implement geographic clustering algorithm
    - Create `clusterByCity` method that groups places by city
    - Sort city clusters by total score
    - Implement allocation strategy: assign top 1-2 cities to dedicated days
    - For 3+ cities, distribute across days with <= 2 cities per day
    - _Requirements: 18.6_

  - [x] 5.3 Implement temporal scheduling algorithm
    - Create `schedulePlaces` method with pace parameter
    - Define max daily minutes: relaxed=360, moderate=480, packed=600
    - Sort places: morning-tagged first, then by score
    - Schedule places while total duration <= max daily minutes
    - Add 30-minute buffer between places for travel time
    - Default place duration to 60 minutes if missing
    - _Requirements: 18.4, 5.1, 5.2_

  - [x] 5.4 Implement day balancing algorithm
    - Create `balanceItinerary` method
    - Ensure type diversity: max 2 places of same type per day
    - Ensure meal coverage: at least 1 restaurant/cafe per day
    - Distribute high-rated places across days
    - Verify geographic coherence (no city zigzagging within days)
    - Target 3-5 places per day
    - _Requirements: 18.4_

  - [x] 5.5 Integrate all recommendation phases
    - Create `generateItinerary` method that runs all phases sequentially:
      1. Score and filter places
      2. Cluster by city
      3. Schedule places to days
      4. Balance itinerary
    - Generate 3-day itinerary with DayPlan objects
    - Include generation metadata: reasoning, alternative places
    - Handle edge cases: insufficient places, all low scores
    - Implement fallback: return top-scored places in simple list if algorithm fails
    - _Requirements: 18.3, 18.4, 18.5, 18.6, 18.7_

  - [ ]* 5.6 Write unit tests for recommendation engine
    - Test scoring function with various preference combinations
    - Test scoring correctly applies weights and penalties
    - Test filtering excludes low-score places
    - Test clustering groups places by city
    - Test scheduling respects time constraints
    - Test scheduling prioritizes morning-tagged places
    - Test balancing enforces type diversity limits
    - Test balancing ensures meal coverage
    - Test end-to-end itinerary generation produces valid 3-day plan
    - Test edge case: insufficient places (< 9) produces valid itinerary
    - _Requirements: 18.3, 18.4, 18.5, 18.6_

- [x] 6. Recommendations API Lambda Function (POST /recommendations)
  - [x] 6.1 Implement recommendations Lambda function
    - Create `GetRecommendationsFunction` class with API Gateway integration
    - Parse request body: `UserPreferences` (cities, interests, pace, priceRange, includeBookingRequired)
    - Load dataset using dataset loader
    - Call `RecommendationEngine.generateItinerary` with preferences and dataset
    - Create unique itinerary ID (UUID)
    - Build response with itinerary, reasoning, alternative places
    - Handle errors: invalid preferences, insufficient matching places
    - Set CORS headers
    - _Requirements: 18.1, 18.2, 18.3, 18.7_

  - [ ]* 6.2 Write unit tests for recommendations API
    - Test successful itinerary generation with valid preferences
    - Test invalid request body returns 400 error
    - Test response includes itinerary, reasoning, alternatives
    - Test generated itinerary matches preferences (cities, interests)
    - Test generated itinerary respects pace constraints
    - _Requirements: 18.1, 18.2, 18.3, 18.7_

- [x] 7. Dataset Validation API Lambda Function (POST /validate)
  - [x] 7.1 Implement dataset validation Lambda function
    - Create `ValidateDatasetFunction` class handling multipart form data
    - Parse uploaded file from request
    - Attempt JSON parsing with Jackson
    - Validate each place using `DataValidator`
    - Collect all validation errors and warnings
    - Generate validation summary: total places, included count, excluded count
    - Return `ValidationResult` with detailed error/warning lists
    - Handle file parsing errors with descriptive messages
    - _Requirements: 16.2, 16.3, 17.8_

  - [ ]* 7.2 Write unit tests for validation API
    - Test valid dataset returns success with no errors
    - Test dataset with invalid JSON returns descriptive error
    - Test dataset with missing critical fields returns errors for each place
    - Test dataset with missing non-critical fields returns warnings
    - Test validation summary counts correctly
    - Test response format matches ValidationResult schema
    - _Requirements: 16.2, 16.3, 17.8_

- [x] 8. Deploy Backend Lambda Functions
  - [x] 8.1 Package and deploy Lambda functions with CDK
    - Configure CDK to build Java Lambda functions with Maven
    - Create Lambda function constructs in CDK stack for each function:
      - `GetPlacesFunction` (512MB memory, 10s timeout)
      - `GetRecommendationsFunction` (1024MB memory, 10s timeout)
      - `ValidateDatasetFunction` (512MB memory, 10s timeout)
    - Configure environment variables from Parameter Store
    - Grant S3 read permissions to Lambda execution roles
    - Wire Lambda functions to API Gateway endpoints:
      - GET /places → GetPlacesFunction
      - POST /recommendations → GetRecommendationsFunction
      - POST /validate → ValidateDatasetFunction
    - Deploy stack to AWS with `cdk deploy`
    - Verify endpoints are accessible via API Gateway URL
    - _Requirements: 10.3, 10.4, 15.1, 15.2, 15.3, 15.4_

- [x] 9. Checkpoint - Backend API Verification
  - Ensure all Lambda functions are deployed and accessible
  - Test each API endpoint with curl/Postman
  - Verify CORS headers are present
  - Verify error responses return appropriate status codes
  - Ask the user if questions arise

- [x] 10. Frontend TypeScript Types and API Client
  - [x] 10.1 Define TypeScript interfaces for data models
    - Create `types/Place.ts` with Place interface matching Java model
    - Define PlaceType union type with all place types
    - Create `types/Itinerary.ts` with Itinerary and DayPlan interfaces
    - Create `types/UserPreferences.ts`
    - Create `types/FilterState.ts`
    - Create `types/ValidationResult.ts` with error/warning types
    - Create `types/ApiResponses.ts` for API response shapes
    - _Requirements: 9.2, 9.4_

  - [x] 10.2 Implement API client service
    - Create `services/PlacesAPIClient.ts` class
    - Configure Axios instance with base URL from environment variable
    - Set timeout to 10 seconds, headers for JSON
    - Implement `getPlaces(filters?: PlaceFilters): Promise<Place[]>` method
    - Implement `getRecommendations(preferences: UserPreferences): Promise<Itinerary>` method
    - Implement `validateDataset(file: File): Promise<ValidationResult>` method
    - Add error handling with retry logic for network errors
    - Transform API responses to TypeScript types
    - _Requirements: 9.2, 15.2_

  - [ ]* 10.3 Write unit tests for API client
    - Mock Axios responses for each API method
    - Test getPlaces constructs correct query parameters
    - Test getRecommendations sends correct request body
    - Test validateDataset handles multipart form data
    - Test error handling transforms errors appropriately
    - _Requirements: 9.2, 9.6_

- [x] 11. Frontend State Management with Context API
  - [x] 11.1 Implement DatasetContext for place data
    - Create `contexts/DatasetContext.tsx`
    - Define state: `{ places: Place[], source: 'default' | 'custom', isLoading: boolean, error: string | null }`
    - Implement reducer with actions: LOAD_START, LOAD_SUCCESS, LOAD_ERROR, SWITCH_DATASET
    - Create context provider component wrapping reducer
    - Implement `loadDataset()` function that calls API client
    - Implement `loadCustomDataset(file: File)` function
    - Add error handling and loading state management
    - _Requirements: 9.3, 9.5, 16.1, 16.4_

  - [x] 11.2 Implement ItineraryContext for itinerary state
    - Create `contexts/ItineraryContext.tsx`
    - Define state: `{ days: [DayPlan, DayPlan, DayPlan], lastModified: Date }`
    - Implement reducer with actions:
      - ADD_PLACE: adds place to specific day
      - REMOVE_PLACE: removes place from day by index
      - REORDER_PLACES: reorders places within a day
      - MOVE_PLACE: moves place between days
      - REPLACE_ITINERARY: replaces entire itinerary (for recommendations)
      - CLEAR_ITINERARY: resets to empty 3-day structure
    - Create context provider with reducer
    - Implement LocalStorage persistence: save on state change, restore on mount
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 9.3, 19.8, 19.9_

  - [x] 11.3 Implement FilterContext for filter state
    - Create `contexts/FilterContext.tsx`
    - Define state: `{ cities: string[], types: PlaceType[], tags: string[], priceRanges: string[], searchQuery: string }`
    - Implement reducer with actions: SET_CITY_FILTER, SET_TYPE_FILTER, SET_TAG_FILTER, SET_PRICE_FILTER, SET_SEARCH_QUERY, CLEAR_FILTERS
    - Create filter application function that filters places array
    - Implement debounced search (300ms delay)
    - _Requirements: 3.2, 3.3, 11.2, 11.3, 11.4, 13.3_

  - [x] 11.4 Implement UIContext for UI state
    - Create `contexts/UIContext.tsx`
    - Define state: `{ selectedPlace: Place | null, activeDay: 1 | 2 | 3, mapCenter: [number, number], mapZoom: number }`
    - Implement actions: SELECT_PLACE, CLOSE_MODAL, SET_ACTIVE_DAY, UPDATE_MAP_VIEW
    - Create context provider
    - _Requirements: 3.5, 6.5_

  - [ ]* 11.5 Write unit tests for context providers
    - Test DatasetContext loads places successfully
    - Test DatasetContext handles load errors
    - Test ItineraryContext adds place to correct day
    - Test ItineraryContext reorders places within day
    - Test ItineraryContext moves place between days
    - Test ItineraryContext persists to LocalStorage
    - Test ItineraryContext restores from LocalStorage on mount
    - Test FilterContext applies filters correctly
    - Test FilterContext debounces search input
    - _Requirements: 4.1-4.8, 9.3_

- [x] 12. Core UI Components - Layout and Structure
  - [x] 12.1 Create App component with context providers
    - Create `App.tsx` as root component
    - Wrap app with all context providers: DatasetContext, ItineraryContext, FilterContext, UIContext
    - Set up React Router for navigation (if multi-page)
    - Add ErrorBoundary for global error handling
    - Implement initial data load on mount
    - _Requirements: 9.1, 9.2, 9.5, 9.6_

  - [x] 12.2 Create Header component
    - Create `components/Header.tsx`
    - Display application branding and title
    - Add navigation links (if needed)
    - Add dataset switcher button (default vs custom)
    - Style with Tailwind CSS
    - _Requirements: 9.7, 14.1_

  - [x] 12.3 Create MainLayout component with responsive grid
    - Create `components/MainLayout.tsx`
    - Implement 3-column responsive layout: PlaceExplorer | ItineraryPanel | MapView
    - Use CSS Grid with breakpoints: mobile (single column), tablet (2 columns), desktop (3 columns)
    - Add loading indicators for async data
    - Add error message display area
    - _Requirements: 9.7, 14.1_

  - [ ]* 12.4 Write unit tests for layout components
    - Test App renders without crashing
    - Test App loads dataset on mount
    - Test Header displays branding
    - Test MainLayout renders all sections
    - Test responsive layout adjusts on viewport changes
    - _Requirements: 9.1, 9.7_

- [x] 13. Place Discovery Components
  - [x] 13.1 Create SearchBar component with debounced input
    - Create `components/SearchBar.tsx`
    - Implement text input with 300ms debounce
    - Call FilterContext to update search query
    - Add clear button to reset search
    - Show search result count
    - Style with Tailwind CSS
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 13.3_

  - [x] 13.2 Create FilterPanel component with multi-select filters
    - Create `components/FilterPanel.tsx`
    - Implement city multi-select with checkboxes
    - Implement type multi-select with checkboxes
    - Implement tag multi-select with chips
    - Implement price range multi-select
    - Display selected filters as removable chips
    - Add "Clear All Filters" button
    - Call FilterContext to update filter state
    - _Requirements: 3.2, 3.3_

  - [x] 13.3 Create PlaceCard component for place summary
    - Create `components/PlaceCard.tsx`
    - Display place name, city, type as header
    - Show rating as stars (★★★★☆) or "Unrated" if null
    - Show price range as euro symbols (€€) or "€" if null
    - Show tags as colored badges
    - Show booking required indicator icon
    - Display truncated description with "Read more" link
    - Add "Add to Itinerary" button with day selector
    - Highlight if place is already in itinerary
    - Call UIContext to open PlaceModal on click
    - Handle missing fields with fallback text
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 12.1_

  - [x] 13.4 Create PlaceModal component for detailed view
    - Create `components/PlaceModal.tsx`
    - Display full place information: name, type, city, neighborhood, region
    - Show complete description
    - Show hours (or "Hours not specified" if null)
    - Show duration_minutes (or "Estimated 1 hour" if null)
    - Show rating and price range
    - Show all tags
    - Show seasonal notes if present
    - Show booking required indicator with explanation
    - Show coordinates
    - Add "Add to Day 1/2/3" buttons
    - Add close button
    - Implement modal overlay with click-outside to close
    - _Requirements: 3.5, 3.6, 3.7, 12.1_

  - [x] 13.5 Create PlaceList component with virtual scrolling
    - Create `components/PlaceList.tsx`
    - Use react-window for virtual scrolling (100+ items)
    - Map filtered places to PlaceCard components
    - Show empty state when no results: "No places match your filters"
    - Show loading skeleton while data loads
    - Optimize re-renders with React.memo
    - _Requirements: 3.1, 3.3, 13.2_

  - [x] 13.6 Integrate PlaceExplorer component
    - Create `components/PlaceExplorer.tsx`
    - Compose SearchBar, FilterPanel, and PlaceList
    - Consume DatasetContext for places
    - Consume FilterContext for filter state
    - Apply filters to places before passing to PlaceList
    - Display filtered count vs total count
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 13.7 Write unit tests for place discovery components
    - Test SearchBar updates search query on input
    - Test SearchBar debounces input correctly
    - Test FilterPanel displays all filter options
    - Test FilterPanel updates filter state on selection
    - Test PlaceCard displays all place information
    - Test PlaceCard handles missing fields gracefully
    - Test PlaceCard shows "Add to Itinerary" button
    - Test PlaceModal displays detailed information
    - Test PlaceList renders virtual scrolling correctly
    - Test PlaceExplorer integrates all components
    - Test PlaceExplorer applies filters correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 11.1-11.5, 12.1_

- [x] 14. Itinerary Management Components
  - [x] 14.1 Create DraggablePlace component with react-dnd
    - Create `components/DraggablePlace.tsx`
    - Implement drag source with react-dnd useDrag hook
    - Display place summary: name, duration, time slot
    - Add remove button with confirmation
    - Show drag handle icon
    - Style with Tailwind CSS for drag state (opacity on drag)
    - _Requirements: 19.2, 19.3_

  - [x] 14.2 Create DayPlan component with drop target
    - Create `components/DayPlan.tsx`
    - Implement drop target with react-dnd useDrop hook
    - Display day number and summary stats (place count, total duration)
    - Calculate and display time slots starting at 8:00 AM
    - Show warning indicator when total duration > 600 minutes (10 hours)
    - Render list of DraggablePlace components
    - Show empty state when no places: "Drag places here or click + to add"
    - Add "+ Add Place" button to open place selector
    - Handle drop events: add place from external, reorder within day, move between days
    - Highlight drop zone on drag over
    - _Requirements: 4.3, 4.4, 5.3, 5.4, 5.5, 19.2, 19.5_

  - [x] 14.3 Create ItineraryHeader component with actions
    - Create `components/ItineraryHeader.tsx`
    - Display itinerary title with edit option
    - Show last modified timestamp
    - Add "Export PDF" button
    - Add "Print" button
    - Add "Replan" button
    - Add "Clear Itinerary" button with confirmation
    - Style with Tailwind CSS
    - _Requirements: 8.1, 20.1_

  - [x] 14.4 Create DayPlanList component organizing 3 days
    - Create `components/DayPlanList.tsx`
    - Render 3 DayPlan components (days 1, 2, 3)
    - Pass day-specific places from ItineraryContext
    - Handle drag-and-drop between days
    - Show aggregate statistics (total places, total duration across all days)
    - _Requirements: 4.3_

  - [x] 14.5 Integrate ItineraryPanel component
    - Create `components/ItineraryPanel.tsx`
    - Compose ItineraryHeader and DayPlanList
    - Consume ItineraryContext for itinerary state
    - Implement drag-and-drop context provider (DndProvider)
    - Handle add, remove, reorder, move actions via ItineraryContext dispatch
    - Implement export functionality (call export service)
    - Implement replan functionality (call recommendations API)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [ ]* 14.6 Write unit tests for itinerary components
    - Test DraggablePlace renders place information
    - Test DraggablePlace allows dragging
    - Test DayPlan accepts dropped places
    - Test DayPlan calculates time slots correctly
    - Test DayPlan shows warning for > 10 hours
    - Test DayPlan reorders places within day
    - Test DayPlanList renders 3 days
    - Test ItineraryPanel integrates all components
    - Test ItineraryPanel dispatches correct actions on drag-drop
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 5.3, 5.4, 19.2, 19.3, 19.5_

- [x] 15. Map Visualization with Leaflet
  - [x] 15.1 Create LeafletMap component with lazy loading
    - Create `components/LeafletMap.tsx`
    - Use React.lazy to lazy load Leaflet library
    - Initialize Leaflet map with OpenStreetMap tiles
    - Configure map center and zoom from UIContext
    - Implement map move event handler (update UIContext)
    - Debounce map move events (100ms)
    - Add map controls (zoom, attribution)
    - _Requirements: 6.1, 6.6, 13.5_

  - [x] 15.2 Create PlaceMarkers component with clustering
    - Create `components/PlaceMarkers.tsx`
    - Filter places to only those with coordinates (latitude/longitude not null)
    - Render Leaflet markers for each place
    - Implement marker clustering for zoom < 10
    - Use custom icons for different place types
    - Add marker popup showing place name and basic info
    - Handle marker click to open PlaceModal via UIContext
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 12.4_

  - [x] 15.3 Create ItineraryMarkers component with highlighting
    - Create `components/ItineraryMarkers.tsx`
    - Render highlighted markers for places in current itinerary
    - Use distinct marker style (different color/icon)
    - Show itinerary day number on marker
    - Add lines connecting places within same day (optional enhancement)
    - _Requirements: 6.3_

  - [x] 15.4 Integrate MapView component
    - Create `components/MapView.tsx`
    - Compose LeafletMap, PlaceMarkers, ItineraryMarkers
    - Consume DatasetContext for places
    - Consume ItineraryContext for itinerary places
    - Consume UIContext for map state
    - Handle places without coordinates gracefully (exclude from map)
    - Show message if no places have coordinates
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 12.4_

  - [ ]* 15.5 Write unit tests for map components
    - Test LeafletMap initializes with correct center and zoom
    - Test PlaceMarkers renders markers for places with coordinates
    - Test PlaceMarkers excludes places without coordinates
    - Test PlaceMarkers opens modal on marker click
    - Test ItineraryMarkers highlights itinerary places
    - Test MapView integrates all components
    - Test MapView handles empty places array
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 12.4_

- [x] 16. Smart Recommendations Workflow
  - [x] 16.1 Create PreferencesModal component for recommendation input
    - Create `components/PreferencesModal.tsx`
    - Display modal form for user preferences
    - Add city multi-select (max 3 cities)
    - Add interests/tags multi-select (max 5 tags)
    - Add pace radio buttons (relaxed, moderate, packed) with descriptions
    - Add price range multi-select checkboxes (€, €€, €€€, €€€€)
    - Add booking required toggle
    - Add submit and cancel buttons
    - Validate form: at least 1 city and 1 interest selected
    - _Requirements: 18.2_

  - [x] 16.2 Implement recommendation workflow in ItineraryPanel
    - Add "Generate Recommendation" button in ItineraryHeader
    - Open PreferencesModal on button click
    - Call API client getRecommendations with preferences
    - Show loading indicator during API call
    - Dispatch REPLACE_ITINERARY action with generated itinerary
    - Show success toast with summary (X places across Y cities)
    - Handle errors: show error message if API fails
    - _Requirements: 18.1, 18.2, 18.3, 18.7, 18.8_

  - [x] 16.3 Implement replan workflow
    - Add "Replan" button in ItineraryHeader
    - Open PreferencesModal pre-filled with previous preferences (if available)
    - Allow user to update preferences
    - Call getRecommendations with updated preferences
    - Dispatch REPLACE_ITINERARY to replace current itinerary
    - Show change summary (X places changed, Y cities changed)
    - Add cancel option to keep current itinerary
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

  - [x] 16.4 Add contextual recommendations in PlaceExplorer
    - Implement "Recommended for You" section in PlaceExplorer
    - When itinerary has places, analyze existing preferences (cities, tags)
    - Filter places to show similar options
    - Sort by rating and preference match
    - Limit to 10 recommendations
    - Show empty state if no recommendations available
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 16.5 Write unit tests for recommendation workflow
    - Test PreferencesModal validates form correctly
    - Test PreferencesModal submits preferences
    - Test recommendation button opens modal
    - Test recommendation API call dispatches REPLACE_ITINERARY
    - Test recommendation error handling shows error message
    - Test replan opens modal with previous preferences
    - Test replan updates itinerary with new recommendations
    - _Requirements: 18.1, 18.2, 18.3, 18.7, 20.1, 20.2, 20.3_

- [x] 17. Custom Dataset Upload Workflow
  - [x] 17.1 Create DatasetUploader component
    - Create `components/DatasetUploader.tsx`
    - Add file input with accept=".json"
    - Add "Upload Custom Dataset" button
    - Validate file type is JSON before upload
    - Show file name and size after selection
    - Call validateDataset API to check format
    - Show validation results: success/errors/warnings summary
    - If valid, load custom dataset and update DatasetContext
    - Show error messages for invalid datasets with specific field issues
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 17.2 Implement dataset switching
    - Add dataset selector in Header component
    - Show current active dataset (default vs custom name)
    - Add "Switch to Default" button when custom dataset active
    - Add "Switch to Custom" button when default dataset active (if custom previously loaded)
    - Dispatch SWITCH_DATASET action in DatasetContext
    - Persist active dataset selection in LocalStorage
    - Restore selected dataset on app mount
    - _Requirements: 16.5, 16.6, 16.7, 16.8_

  - [x] 17.3 Display validation warnings in UI
    - Show validation summary in DatasetUploader after upload
    - Display excluded place count with reasons
    - Show warnings for places with missing non-critical fields
    - Link to documentation explaining field criticality
    - Allow user to proceed with warnings or cancel upload
    - _Requirements: 17.8_

  - [ ]* 17.4 Write unit tests for dataset upload
    - Test DatasetUploader accepts JSON files only
    - Test DatasetUploader calls validateDataset API
    - Test DatasetUploader shows validation errors
    - Test DatasetUploader loads custom dataset on success
    - Test dataset switching updates DatasetContext
    - Test dataset selection persists to LocalStorage
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [x] 18. Export and Print Functionality
  - [x] 18.1 Create PDF export service
    - Create `services/ExportService.ts`
    - Use jsPDF library to generate PDF
    - Implement `exportItineraryToPDF(itinerary: Itinerary): void` method
    - Format PDF with title: "Italy Trip Planner - [Itinerary Name]"
    - Add header with generation date
    - Organize content by day with headers: "Day 1", "Day 2", "Day 3"
    - For each place: name, type, city, address (if available), hours, duration, description
    - Add footer with page numbers
    - Style with appropriate fonts and spacing
    - Trigger download with filename: `itinerary-[date].pdf`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 18.2 Create print-friendly view
    - Create `components/PrintView.tsx`
    - Implement CSS @media print styles
    - Hide UI chrome (header, buttons, filters)
    - Show only itinerary content in print view
    - Format for single-column layout
    - Add page breaks between days
    - Call window.print() on "Print" button click
    - _Requirements: 8.6_

  - [x] 18.3 Integrate export functionality
    - Add export button click handler in ItineraryHeader
    - Call ExportService.exportItineraryToPDF
    - Show success toast after export
    - Handle export errors gracefully
    - Disable export button when itinerary is empty
    - _Requirements: 8.1, 8.2_

  - [ ]* 18.4 Write unit tests for export functionality
    - Test PDF export generates valid PDF structure
    - Test PDF includes all itinerary information
    - Test print view applies correct styles
    - Test export button is disabled when itinerary empty
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 19. Error Handling and User Feedback
  - [x] 19.1 Implement global error boundary
    - Create `components/ErrorBoundary.tsx` class component
    - Implement componentDidCatch lifecycle method
    - Log errors to console (and monitoring service in production)
    - Display user-friendly error fallback UI
    - Add "Reload" button to recover
    - _Requirements: 9.6_

  - [x] 19.2 Create Toast notification system
    - Create `components/Toast.tsx`
    - Implement toast container with position (top-right)
    - Support toast types: success, error, warning, info
    - Auto-dismiss after 5 seconds (configurable)
    - Add close button for manual dismissal
    - Support multiple simultaneous toasts
    - Style with Tailwind CSS
    - _Requirements: 9.6, 14.7_

  - [x] 19.3 Implement error handling in API calls
    - Wrap all API calls in try-catch blocks
    - Transform errors to user-friendly messages
    - Show toast notifications for errors
    - Handle network errors: "Unable to connect. Check your internet connection."
    - Handle 400 errors: "Invalid request. Please check your input."
    - Handle 500 errors: "Server error. Please try again later."
    - Handle timeout errors: "Request timed out. Please try again."
    - _Requirements: 9.6, 12.5_

  - [x] 19.4 Add loading states for async operations
    - Show loading spinner during dataset load
    - Show loading spinner during recommendation generation
    - Show loading spinner during dataset validation
    - Disable action buttons during async operations
    - Show skeleton screens for place list while loading
    - _Requirements: 9.5, 13.1_

  - [ ]* 19.5 Write unit tests for error handling
    - Test ErrorBoundary catches errors and displays fallback
    - Test Toast renders with correct type and message
    - Test Toast auto-dismisses after timeout
    - Test API error handling transforms errors correctly
    - Test loading states display during async operations
    - _Requirements: 9.5, 9.6, 12.5_

- [x] 20. Checkpoint - Frontend Integration Testing
  - Test complete place discovery workflow: browse, filter, search, view details
  - Test manual itinerary creation: add, remove, reorder, move places
  - Test drag-and-drop functionality between days
  - Test recommendation workflow: enter preferences, generate, view itinerary
  - Test replan workflow: update preferences, regenerate
  - Test custom dataset upload: validate, load, switch datasets
  - Test export functionality: PDF export, print view
  - Test map visualization: markers display, clustering, popups
  - Test error handling: network errors, validation errors
  - Ensure all tests pass and ask the user if questions arise

- [x] 21. Accessibility and Usability Enhancements
  - [x] 21.1 Implement semantic HTML structure
    - Use semantic elements: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
    - Use `<button>` for interactive elements (not `<div>` with onClick)
    - Use proper heading hierarchy (h1 → h2 → h3)
    - Add ARIA landmarks for screen readers
    - _Requirements: 14.1_

  - [x] 21.2 Add keyboard navigation support
    - Ensure all interactive elements are focusable (tab order)
    - Add visible focus indicators (outline or ring)
    - Support keyboard shortcuts: Escape to close modals, Enter to submit forms
    - Implement arrow key navigation in lists
    - Add skip links to main content
    - _Requirements: 14.2, 14.5_

  - [x] 21.3 Ensure color contrast and readability
    - Use Tailwind CSS color palette with sufficient contrast ratios (4.5:1 for text)
    - Test color contrast with browser DevTools or online tools
    - Avoid color as only indicator (use icons + color)
    - Use readable font sizes (minimum 16px for body text)
    - _Requirements: 14.3_

  - [x] 21.4 Add descriptive labels and ARIA attributes
    - Add labels to all form inputs (visible or aria-label)
    - Add alt text to images
    - Use aria-describedby for helper text
    - Use aria-live for dynamic content updates (toast notifications)
    - Add aria-expanded for collapsible sections
    - _Requirements: 14.4_

  - [x] 21.5 Implement user guidance and feedback
    - Add tooltips for icon-only buttons
    - Show clear instructions for creating itinerary
    - Provide feedback for invalid actions (e.g., "Cannot add same place twice")
    - Show empty states with helpful prompts
    - Add confirmation dialogs for destructive actions (clear itinerary)
    - _Requirements: 14.6, 14.7_

  - [ ]* 21.6 Run accessibility audit with axe-core
    - Install @axe-core/react for automated a11y checks
    - Run audit in development mode
    - Fix all critical and serious issues
    - Document any known issues with mitigation plans
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 22. Performance Optimization
  - [x] 22.1 Implement code splitting and lazy loading
    - Use React.lazy for MapView component (heavy Leaflet dependency)
    - Use React.lazy for ExportService (jsPDF only needed on export)
    - Configure Vite code splitting for optimal bundle sizes
    - Target: main bundle < 200KB gzipped, vendor bundle < 150KB gzipped
    - _Requirements: 13.1, 13.5_

  - [x] 22.2 Optimize rendering performance
    - Use React.memo for expensive components (PlaceCard, DraggablePlace)
    - Use useMemo for expensive computations (filtered places, sorted places)
    - Use useCallback for event handlers passed to child components
    - Avoid anonymous functions in render methods
    - Implement virtual scrolling for PlaceList (react-window)
    - _Requirements: 13.2_

  - [x] 22.3 Add debouncing and throttling
    - Debounce search input (300ms) - already implemented in FilterContext
    - Throttle map move events (100ms)
    - Debounce window resize events (200ms)
    - _Requirements: 13.3_

  - [x] 22.4 Optimize asset loading
    - Compress images to WebP format with fallbacks
    - Use SVG for icons (inline or sprite)
    - Lazy load images below the fold
    - Configure Vite to minify and compress assets
    - _Requirements: 13.6_

  - [ ]* 22.5 Run performance audit with Lighthouse
    - Run Lighthouse performance audit
    - Target: Performance score > 90, TTI < 5s, LCP < 2.5s
    - Fix any performance issues identified
    - Document optimization results
    - _Requirements: 13.1, 13.2, 13.4_

- [-] 23. Deployment and CI/CD Pipeline
  - [x] 23.1 Configure production environment variables
    - Create `.env.production` file
    - Set API Gateway endpoint URL
    - Set CloudFront distribution URL (if different from default)
    - Configure build-time environment variable injection
    - _Requirements: 15.1, 15.2_

  - [x] 23.2 Build and deploy frontend to S3
    - Run production build: `npm run build`
    - Upload build artifacts to S3 frontend bucket
    - Set correct content types and cache headers
    - Invalidate CloudFront cache for index.html
    - _Requirements: 10.1, 10.5_

  - [x] 23.3 Set up GitHub Actions CI/CD pipeline
    - Create `.github/workflows/ci-cd.yml`
    - Add jobs: lint, test, build, deploy
    - Configure secrets: AWS credentials, API keys
    - Run pipeline on push to main branch
    - Add pull request checks (lint + test only)
    - _Requirements: 15.1_

  - [x] 23.4 Configure CloudFront cache invalidation
    - Invalidate `/index.html` on every deployment (no caching)
    - Keep long cache TTL for static assets (1 year)
    - Configure cache behaviors in CDK stack
    - _Requirements: 10.5_

  - [-] 23.5 Verify production deployment
    - Access application via CloudFront URL
    - Test all core workflows end-to-end
    - Verify API endpoints are accessible
    - Check CloudWatch logs for errors
    - Monitor performance metrics
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 24. Documentation and Finalization
  - [x] 24.1 Write README.md with setup instructions
    - Document prerequisites: Java 17+, Maven, Node.js 20+, AWS CLI, AWS CDK
    - Provide local development setup instructions
    - Document backend build and test commands
    - Document frontend build and test commands
    - Document deployment commands
    - Include architecture overview and diagrams
    - Add troubleshooting section

  - [x] 24.2 Write API documentation
    - Document all API endpoints: GET /places, POST /recommendations, POST /validate
    - Include request/response schemas
    - Provide example requests with curl
    - Document query parameters and request bodies
    - Document error response formats

  - [x] 24.3 Write user guide
    - Document how to browse and filter places
    - Explain how to create manual itinerary
    - Explain recommendation workflow
    - Document drag-and-drop editing
    - Explain custom dataset upload format
    - Document export and print functionality

  - [x] 24.4 Add inline code comments
    - Add JSDoc comments to all public functions and classes (frontend)
    - Add Javadoc comments to all public methods (backend)
    - Document complex algorithms (recommendation engine)
    - Explain validation logic and field criticality

- [x] 25. Final Checkpoint and Handoff
  - Run full test suite (backend + frontend)
  - Verify all acceptance criteria are met
  - Perform final accessibility audit
  - Verify production deployment is stable
  - Review all documentation
  - Ensure all tests pass and ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability (format: `_Requirements: X.Y_`)
- The implementation uses **Java** for backend Lambda functions and **React/TypeScript** for frontend
- Backend follows AWS Lambda best practices: stateless functions, in-memory caching, environment-based configuration
- Frontend follows React best practices: functional components, hooks, Context API for state, separation of concerns
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Testing strategy includes unit tests for business logic and integration tests for workflows
- Property-based testing is not applicable as the application involves UI rendering, infrastructure setup, and side-effect-heavy operations
- The recommendation engine algorithm is deterministic and well-suited for example-based testing
- Accessibility compliance (WCAG 2.1 AA) is a priority throughout frontend development
- Performance optimization focuses on bundle size, lazy loading, virtual scrolling, and caching
- The architecture is serverless and scalable, leveraging AWS managed services

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2"]
    },
    {
      "id": 1,
      "tasks": ["1.3", "2.1"]
    },
    {
      "id": 2,
      "tasks": ["1.4", "2.2", "10.1"]
    },
    {
      "id": 3,
      "tasks": ["2.3", "3.1", "10.2"]
    },
    {
      "id": 4,
      "tasks": ["3.2", "4.1", "10.3", "11.1"]
    },
    {
      "id": 5,
      "tasks": ["4.2", "5.1", "11.2", "11.3", "11.4"]
    },
    {
      "id": 6,
      "tasks": ["5.2", "5.3", "11.5", "12.1"]
    },
    {
      "id": 7,
      "tasks": ["5.4", "12.2", "12.3"]
    },
    {
      "id": 8,
      "tasks": ["5.5", "12.4", "13.1", "13.2"]
    },
    {
      "id": 9,
      "tasks": ["5.6", "6.1", "13.3", "13.4"]
    },
    {
      "id": 10,
      "tasks": ["6.2", "7.1", "13.5"]
    },
    {
      "id": 11,
      "tasks": ["7.2", "8.1", "13.6", "13.7"]
    },
    {
      "id": 12,
      "tasks": ["14.1", "14.2"]
    },
    {
      "id": 13,
      "tasks": ["14.3", "14.4"]
    },
    {
      "id": 14,
      "tasks": ["14.5", "14.6"]
    },
    {
      "id": 15,
      "tasks": ["15.1", "15.2", "15.3"]
    },
    {
      "id": 16,
      "tasks": ["15.4", "15.5", "16.1"]
    },
    {
      "id": 17,
      "tasks": ["16.2", "16.3", "16.4"]
    },
    {
      "id": 18,
      "tasks": ["16.5", "17.1", "17.2"]
    },
    {
      "id": 19,
      "tasks": ["17.3", "17.4", "18.1"]
    },
    {
      "id": 20,
      "tasks": ["18.2", "18.3", "18.4"]
    },
    {
      "id": 21,
      "tasks": ["19.1", "19.2", "19.3"]
    },
    {
      "id": 22,
      "tasks": ["19.4", "19.5", "21.1", "21.2"]
    },
    {
      "id": 23,
      "tasks": ["21.3", "21.4", "21.5"]
    },
    {
      "id": 24,
      "tasks": ["21.6", "22.1", "22.2"]
    },
    {
      "id": 25,
      "tasks": ["22.3", "22.4", "22.5"]
    },
    {
      "id": 26,
      "tasks": ["23.1", "23.2"]
    },
    {
      "id": 27,
      "tasks": ["23.3", "23.4"]
    },
    {
      "id": 28,
      "tasks": ["23.5", "24.1", "24.2"]
    },
    {
      "id": 29,
      "tasks": ["24.3", "24.4"]
    }
  ]
}
```
