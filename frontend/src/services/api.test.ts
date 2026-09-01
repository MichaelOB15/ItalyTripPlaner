import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { PlacesAPIClient, APIError, LoadingStateManager } from './api';
import {
  Place,
  GetPlacesResponse,
  RecommendationsResponse,
  ValidationResult,
  UserPreferences,
  Itinerary,
  DayPlan,
} from '../types';

describe('LoadingStateManager', () => {
  let manager: LoadingStateManager;

  beforeEach(() => {
    manager = new LoadingStateManager();
  });

  it('should initialize with no loading states', () => {
    expect(manager.isLoading('test')).toBe(false);
  });

  it('should set and get loading state', () => {
    manager.setLoading('test', true);
    expect(manager.isLoading('test')).toBe(true);

    manager.setLoading('test', false);
    expect(manager.isLoading('test')).toBe(false);
  });

  it('should notify subscribers of loading state changes', () => {
    const listener = vi.fn();
    manager.subscribe(listener);

    manager.setLoading('test', true);
    expect(listener).toHaveBeenCalledWith('test', true);

    manager.setLoading('test', false);
    expect(listener).toHaveBeenCalledWith('test', false);
  });

  it('should allow unsubscribing', () => {
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    manager.setLoading('test', true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    manager.setLoading('test', false);
    expect(listener).toHaveBeenCalledTimes(1); // Not called again
  });
});

describe('APIError', () => {
  it('should create error with all properties', () => {
    const originalError = new Error('Original');
    const error = new APIError('Test error', 404, { detail: 'Not found' }, originalError);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(404);
    expect(error.response).toEqual({ detail: 'Not found' });
    expect(error.originalError).toBe(originalError);
    expect(error.name).toBe('APIError');
  });

  it('should create error with minimal properties', () => {
    const error = new APIError('Simple error');

    expect(error.message).toBe('Simple error');
    expect(error.statusCode).toBeUndefined();
    expect(error.response).toBeUndefined();
    expect(error.originalError).toBeUndefined();
  });
});

describe('PlacesAPIClient', () => {
  let client: PlacesAPIClient;
  let mock: MockAdapter;

  // Mock data
  const mockPlace: Place = {
    id: 'place_001',
    name: 'Colosseum',
    type: 'historic_site',
    city: 'Rome',
    latitude: 41.8902,
    longitude: 12.4922,
    description: 'Ancient amphitheater',
    rating: 4.8,
    price_range: '€€',
    tags: ['ancient', 'iconic'],
  };

  const mockPreferences: UserPreferences = {
    cities: ['Rome'],
    interests: ['ancient', 'history'],
    pace: 'moderate',
    price_range: ['€€'],
    include_booking_required: false,
  };

  const mockDayPlan: DayPlan = {
    day_number: 1,
    places: [mockPlace],
    total_duration: 120,
    start_time: '08:00',
  };

  const mockItinerary: Itinerary = {
    id: 'itin_001',
    name: 'Rome Trip',
    days: [mockDayPlan, mockDayPlan, mockDayPlan],
    preferences: mockPreferences,
    created_at: '2024-01-01T00:00:00Z',
    last_modified: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Create a new mock adapter for each test
    mock = new MockAdapter(axios);
    client = new PlacesAPIClient({ 
      baseURL: 'http://localhost:3000/api',
      maxRetries: 2,
      retryDelay: 100, // Short delay for tests
    });
  });

  afterEach(() => {
    mock.reset();
    mock.restore();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default config', () => {
      const defaultClient = new PlacesAPIClient();
      expect(defaultClient).toBeInstanceOf(PlacesAPIClient);
      expect(defaultClient.loadingState).toBeInstanceOf(LoadingStateManager);
    });

    it('should initialize with custom config', () => {
      const onLoadingChange = vi.fn();
      const customClient = new PlacesAPIClient({
        baseURL: 'http://custom.api',
        timeout: 5000,
        maxRetries: 5,
        retryDelay: 500,
        onLoadingChange,
      });

      expect(customClient.getBaseURL()).toBe('http://custom.api');
      
      // Trigger loading state to test callback
      customClient.loadingState.setLoading('test', true);
      expect(onLoadingChange).toHaveBeenCalledWith('test', true);
    });

    it('should use environment variable for base URL', () => {
      const originalEnv = import.meta.env.VITE_API_BASE_URL;
      import.meta.env.VITE_API_BASE_URL = 'http://env.api';
      
      const envClient = new PlacesAPIClient();
      expect(envClient.getBaseURL()).toBe('http://env.api');
      
      import.meta.env.VITE_API_BASE_URL = originalEnv;
    });
  });

  describe('getPlaces', () => {
    it('should fetch places without filters', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [mockPlace],
        total: 1,
        has_more: false,
      };

      mock.onGet('/places').reply(200, mockResponse);

      const places = await client.getPlaces();

      expect(places).toEqual([mockPlace]);
      expect(mock.history.get).toHaveLength(1);
      expect(mock.history.get[0].url).toBe('/places');
    });

    it('should fetch places with city filter', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [mockPlace],
        total: 1,
        has_more: false,
      };

      mock.onGet('/places').reply(200, mockResponse);

      const places = await client.getPlaces({ cities: 'Rome' });

      expect(places).toEqual([mockPlace]);
      expect(mock.history.get[0].params).toBeDefined();
      expect(mock.history.get[0].url).toContain('cities=Rome');
    });

    it('should fetch places with multiple filters', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [mockPlace],
        total: 1,
        has_more: false,
      };

      mock.onGet('/places').reply(200, mockResponse);

      const places = await client.getPlaces({
        cities: 'Rome,Florence',
        types: 'historic_site,museum',
        tags: 'ancient',
        limit: 10,
        offset: 0,
      });

      expect(places).toEqual([mockPlace]);
      expect(mock.history.get[0].url).toContain('cities=Rome,Florence');
      expect(mock.history.get[0].url).toContain('types=historic_site,museum');
      expect(mock.history.get[0].url).toContain('tags=ancient');
      expect(mock.history.get[0].url).toContain('limit=10');
      expect(mock.history.get[0].url).toContain('offset=0');
    });

    it('should handle empty results', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [],
        total: 0,
        has_more: false,
      };

      mock.onGet('/places').reply(200, mockResponse);

      const places = await client.getPlaces();

      expect(places).toEqual([]);
    });

    it('should set loading state during request', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [mockPlace],
        total: 1,
        has_more: false,
      };

      mock.onGet('/places').reply(200, mockResponse);

      const loadingStates: boolean[] = [];
      client.loadingState.subscribe((key, isLoading) => {
        if (key === 'getPlaces') {
          loadingStates.push(isLoading);
        }
      });

      await client.getPlaces();

      expect(loadingStates).toEqual([true, false]);
    });
  });

  describe('getPlacesWithMetadata', () => {
    it('should fetch complete response with metadata', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [mockPlace],
        total: 100,
        has_more: true,
      };

      mock.onGet('/places').reply(200, mockResponse);

      const response = await client.getPlacesWithMetadata({ limit: 10 });

      expect(response.places).toEqual([mockPlace]);
      expect(response.total).toBe(100);
      expect(response.has_more).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    it('should fetch recommendations without existing itinerary', async () => {
      const mockResponse: RecommendationsResponse = {
        itinerary: mockItinerary,
        reasoning: 'Based on your preferences',
        alternative_places: [],
      };

      mock.onPost('/recommendations').reply(200, mockResponse);

      const response = await client.getRecommendations(mockPreferences);

      expect(response.itinerary).toEqual(mockItinerary);
      expect(response.reasoning).toBe('Based on your preferences');
      expect(mock.history.post).toHaveLength(1);
      expect(JSON.parse(mock.history.post[0].data)).toEqual({
        preferences: mockPreferences,
        existing_itinerary: undefined,
      });
    });

    it('should fetch recommendations with existing itinerary for replan', async () => {
      const mockResponse: RecommendationsResponse = {
        itinerary: mockItinerary,
        reasoning: 'Replanned based on updated preferences',
        alternative_places: [mockPlace],
      };

      mock.onPost('/recommendations').reply(200, mockResponse);

      const response = await client.getRecommendations(mockPreferences, mockItinerary);

      expect(response.itinerary).toEqual(mockItinerary);
      expect(JSON.parse(mock.history.post[0].data)).toEqual({
        preferences: mockPreferences,
        existing_itinerary: mockItinerary,
      });
    });

    it('should set loading state during request', async () => {
      const mockResponse: RecommendationsResponse = {
        itinerary: mockItinerary,
        reasoning: 'Test',
        alternative_places: [],
      };

      mock.onPost('/recommendations').reply(200, mockResponse);

      const loadingStates: boolean[] = [];
      client.loadingState.subscribe((key, isLoading) => {
        if (key === 'getRecommendations') {
          loadingStates.push(isLoading);
        }
      });

      await client.getRecommendations(mockPreferences);

      expect(loadingStates).toEqual([true, false]);
    });
  });

  describe('validateDataset', () => {
    it('should validate dataset file successfully', async () => {
      const mockFile = new File(['{}'], 'test.json', { type: 'application/json' });
      const mockResponse: ValidationResult = {
        is_valid: true,
        errors: [],
        warnings: [],
        place_count: 10,
        excluded_count: 0,
      };

      mock.onPost('/validate').reply(200, mockResponse);

      const result = await client.validateDataset(mockFile);

      expect(result.is_valid).toBe(true);
      expect(result.place_count).toBe(10);
      expect(mock.history.post).toHaveLength(1);
      expect(mock.history.post[0].headers?.['Content-Type']).toContain('multipart/form-data');
    });

    it('should return validation errors for invalid dataset', async () => {
      const mockFile = new File(['{}'], 'invalid.json', { type: 'application/json' });
      const mockResponse: ValidationResult = {
        is_valid: false,
        errors: [
          {
            place_id: 'place_001',
            field: 'latitude',
            message: 'Missing latitude',
            severity: 'critical',
          },
        ],
        warnings: [],
        place_count: 5,
        excluded_count: 3,
      };

      mock.onPost('/validate').reply(200, mockResponse);

      const result = await client.validateDataset(mockFile);

      expect(result.is_valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.excluded_count).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      mock.onGet('/places').reply(404, { message: 'Not found' });

      await expect(client.getPlaces()).rejects.toThrow(APIError);
      
      try {
        await client.getPlaces();
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).statusCode).toBe(404);
        expect((error as APIError).message).toBe('Not found');
      }
    });

    it('should handle 500 server errors', async () => {
      mock.onGet('/places').reply(500, { error: 'Internal server error' });

      await expect(client.getPlaces()).rejects.toThrow(APIError);
      
      try {
        await client.getPlaces();
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).statusCode).toBe(500);
      }
    });

    it('should handle network errors', async () => {
      mock.onGet('/places').networkError();

      await expect(client.getPlaces()).rejects.toThrow(APIError);
      
      try {
        await client.getPlaces();
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        expect((error as APIError).message).toContain('Network error');
        expect((error as APIError).statusCode).toBeUndefined();
      }
    });

    it('should handle timeout errors', async () => {
      mock.onGet('/places').timeout();

      await expect(client.getPlaces()).rejects.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 500 server errors', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [mockPlace],
        total: 1,
        has_more: false,
      };

      // First two requests fail, third succeeds
      mock
        .onGet('/places')
        .replyOnce(500)
        .onGet('/places')
        .replyOnce(500)
        .onGet('/places')
        .replyOnce(200, mockResponse);

      const places = await client.getPlaces();

      expect(places).toEqual([mockPlace]);
      expect(mock.history.get).toHaveLength(3); // Initial + 2 retries
    });

    it('should retry on network errors', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [mockPlace],
        total: 1,
        has_more: false,
      };

      // First request fails with network error, second succeeds
      mock
        .onGet('/places')
        .networkErrorOnce()
        .onGet('/places')
        .replyOnce(200, mockResponse);

      const places = await client.getPlaces();

      expect(places).toEqual([mockPlace]);
      expect(mock.history.get).toHaveLength(2);
    });

    it('should not retry on 400 client errors', async () => {
      mock.onGet('/places').reply(400, { message: 'Bad request' });

      await expect(client.getPlaces()).rejects.toThrow(APIError);

      expect(mock.history.get).toHaveLength(1); // No retries
    });

    it('should retry on 429 rate limit errors', async () => {
      const mockResponse: GetPlacesResponse = {
        places: [mockPlace],
        total: 1,
        has_more: false,
      };

      mock
        .onGet('/places')
        .replyOnce(429)
        .onGet('/places')
        .replyOnce(200, mockResponse);

      const places = await client.getPlaces();

      expect(places).toEqual([mockPlace]);
      expect(mock.history.get).toHaveLength(2);
    });

    it('should stop retrying after max retries', async () => {
      mock.onGet('/places').reply(500);

      await expect(client.getPlaces()).rejects.toThrow(APIError);

      // maxRetries is 2, so initial + 2 retries = 3 total
      expect(mock.history.get).toHaveLength(3);
    });
  });

  describe('Utility Methods', () => {
    it('should check loading state', () => {
      expect(client.isLoading('test')).toBe(false);
      
      client.loadingState.setLoading('test', true);
      expect(client.isLoading('test')).toBe(true);
    });

    it('should get base URL', () => {
      expect(client.getBaseURL()).toBe('http://localhost:3000/api');
    });

    it('should update timeout', () => {
      client.setTimeout(5000);
      // Timeout is set internally, we can't directly verify but method should not throw
    });

    it('should add custom headers', () => {
      client.setHeader('X-Custom-Header', 'test-value');
      
      const mockResponse: GetPlacesResponse = {
        places: [],
        total: 0,
        has_more: false,
      };

      mock.onGet('/places').reply(200, mockResponse);

      // The header will be included in the next request
      client.getPlaces();
    });

    it('should remove custom headers', () => {
      client.setHeader('X-Custom-Header', 'test-value');
      client.removeHeader('X-Custom-Header');
      
      // Header should be removed (method should not throw)
    });
  });
});
