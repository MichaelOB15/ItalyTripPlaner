import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import {
  ItineraryApiClient,
  CreateItineraryRequest,
  UpdateItineraryRequest,
} from './itineraryApi';
import { Itinerary, DayPlan, UserPreferences } from '../types';
import { APIError } from './api';

// Mock data for tests
const mockPreferences: UserPreferences = {
  cities: ['Rome'],
  interests: ['history', 'art'],
  pace: 'moderate',
  price_range: ['€€'],
  include_booking_required: false,
};

const mockDayPlan: DayPlan = {
  day_number: 1,
  places: [],
  total_duration: 0,
  start_time: '08:00',
};

const mockItinerary: Itinerary = {
  id: 'itin_123_abc',
  name: 'Rome Weekend',
  days: [mockDayPlan, { ...mockDayPlan, day_number: 2 }, { ...mockDayPlan, day_number: 3 }] as [DayPlan, DayPlan, DayPlan],
  preferences: mockPreferences,
  created_at: '2024-01-15T10:00:00Z',
  last_modified: '2024-01-15T10:00:00Z',
};

const mockCreateRequest: CreateItineraryRequest = {
  name: 'Rome Weekend',
  days: [mockDayPlan, { ...mockDayPlan, day_number: 2 }, { ...mockDayPlan, day_number: 3 }] as [DayPlan, DayPlan, DayPlan],
  preferences: mockPreferences,
};

describe('ItineraryApiClient', () => {
  let mockAxios: MockAdapter;
  let mockGetAuthToken: () => string | null;
  let client: ItineraryApiClient;

  beforeEach(() => {
    // Reset axios mock before each test
    mockAxios = new MockAdapter(axios);
    
    // Create mock auth token getter
    mockGetAuthToken = vi.fn(() => 'mock-jwt-token');
    
    // Create client instance
    client = new ItineraryApiClient({
      baseURL: 'https://api.example.com',
      getAuthToken: mockGetAuthToken,
    });
  });

  afterEach(() => {
    mockAxios.reset();
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create client with default configuration', () => {
      const client = new ItineraryApiClient({
        getAuthToken: mockGetAuthToken,
      });

      expect(client).toBeInstanceOf(ItineraryApiClient);
    });

    it('should create client with custom base URL', () => {
      const client = new ItineraryApiClient({
        baseURL: 'https://custom.api.com',
        getAuthToken: mockGetAuthToken,
      });

      expect(client.getBaseURL()).toBe('https://custom.api.com');
    });

    it('should create client with custom timeout', () => {
      const client = new ItineraryApiClient({
        getAuthToken: mockGetAuthToken,
        timeout: 5000,
      });

      expect(client).toBeInstanceOf(ItineraryApiClient);
    });

    it('should throw error if getAuthToken is not provided', () => {
      expect(() => {
        new ItineraryApiClient({} as any);
      }).toThrow('getAuthToken callback is required');
    });

    it('should use environment variable for base URL if not provided', () => {
      // Note: In actual environment, VITE_API_BASE_URL would be set
      const client = new ItineraryApiClient({
        getAuthToken: mockGetAuthToken,
      });

      expect(client).toBeInstanceOf(ItineraryApiClient);
    });
  });

  describe('createItinerary', () => {
    it('should create a new itinerary successfully', async () => {
      mockAxios.onPost('/itineraries').reply(201, {
        itinerary: mockItinerary,
      });

      const result = await client.createItinerary(mockCreateRequest);

      expect(result).toEqual(mockItinerary);
      expect(mockGetAuthToken).toHaveBeenCalled();
    });

    it('should include Authorization header with Bearer token', async () => {
      mockAxios.onPost('/itineraries').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer mock-jwt-token');
        return [201, { itinerary: mockItinerary }];
      });

      await client.createItinerary(mockCreateRequest);
    });

    it('should send correct request body', async () => {
      mockAxios.onPost('/itineraries').reply((config) => {
        const data = JSON.parse(config.data);
        expect(data).toEqual(mockCreateRequest);
        return [201, { itinerary: mockItinerary }];
      });

      await client.createItinerary(mockCreateRequest);
    });

    it('should throw APIError on 400 Bad Request', async () => {
      mockAxios.onPost('/itineraries').reply(400, {
        error: 'Invalid request body',
      });

      await expect(client.createItinerary(mockCreateRequest)).rejects.toThrow(
        APIError
      );
      await expect(client.createItinerary(mockCreateRequest)).rejects.toThrow(
        'Invalid request body'
      );
    });

    it('should throw APIError on 401 Unauthorized', async () => {
      mockAxios.onPost('/itineraries').reply(401, {
        error: 'Unauthorized',
      });

      await expect(client.createItinerary(mockCreateRequest)).rejects.toThrow(
        'Session expired. Please sign in again.'
      );
    });

    it('should throw APIError on 500 Internal Server Error', async () => {
      mockAxios.onPost('/itineraries').reply(500, {
        error: 'Internal server error',
      });

      await expect(client.createItinerary(mockCreateRequest)).rejects.toThrow(
        APIError
      );
    });
  });

  describe('listItineraries', () => {
    it('should retrieve all itineraries successfully', async () => {
      const mockItineraries = [mockItinerary, { ...mockItinerary, id: 'itin_456_def' }];
      mockAxios.onGet('/itineraries').reply(200, {
        itineraries: mockItineraries,
      });

      const result = await client.listItineraries();

      expect(result).toEqual(mockItineraries);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no itineraries exist', async () => {
      mockAxios.onGet('/itineraries').reply(200, {
        itineraries: [],
      });

      const result = await client.listItineraries();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should include Authorization header', async () => {
      mockAxios.onGet('/itineraries').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer mock-jwt-token');
        return [200, { itineraries: [] }];
      });

      await client.listItineraries();
    });

    it('should throw APIError on 401 Unauthorized', async () => {
      mockAxios.onGet('/itineraries').reply(401, {
        error: 'Unauthorized',
      });

      await expect(client.listItineraries()).rejects.toThrow(
        'Session expired. Please sign in again.'
      );
    });
  });

  describe('getItinerary', () => {
    it('should retrieve specific itinerary successfully', async () => {
      mockAxios.onGet('/itineraries/itin_123_abc').reply(200, {
        itinerary: mockItinerary,
      });

      const result = await client.getItinerary('itin_123_abc');

      expect(result).toEqual(mockItinerary);
    });

    it('should include Authorization header', async () => {
      mockAxios.onGet('/itineraries/itin_123_abc').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer mock-jwt-token');
        return [200, { itinerary: mockItinerary }];
      });

      await client.getItinerary('itin_123_abc');
    });

    it('should throw APIError on 404 Not Found', async () => {
      mockAxios.onGet('/itineraries/nonexistent').reply(404, {
        error: 'Itinerary not found',
      });

      await expect(client.getItinerary('nonexistent')).rejects.toThrow(
        'Itinerary not found'
      );
    });

    it('should throw APIError on 403 Forbidden (wrong user)', async () => {
      mockAxios.onGet('/itineraries/itin_123_abc').reply(403, {
        error: 'Forbidden',
      });

      await expect(client.getItinerary('itin_123_abc')).rejects.toThrow(
        APIError
      );
    });
  });

  describe('updateItinerary', () => {
    const updateRequest: UpdateItineraryRequest = {
      name: 'Updated Rome Trip',
      days: mockCreateRequest.days,
      preferences: mockPreferences,
    };

    const updatedItinerary: Itinerary = {
      ...mockItinerary,
      name: 'Updated Rome Trip',
      last_modified: '2024-01-16T12:00:00Z',
    };

    it('should update itinerary successfully', async () => {
      mockAxios.onPut('/itineraries/itin_123_abc').reply(200, {
        itinerary: updatedItinerary,
      });

      const result = await client.updateItinerary('itin_123_abc', updateRequest);

      expect(result).toEqual(updatedItinerary);
      expect(result.name).toBe('Updated Rome Trip');
    });

    it('should include Authorization header', async () => {
      mockAxios.onPut('/itineraries/itin_123_abc').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer mock-jwt-token');
        return [200, { itinerary: updatedItinerary }];
      });

      await client.updateItinerary('itin_123_abc', updateRequest);
    });

    it('should send correct request body', async () => {
      mockAxios.onPut('/itineraries/itin_123_abc').reply((config) => {
        const data = JSON.parse(config.data);
        expect(data).toEqual(updateRequest);
        return [200, { itinerary: updatedItinerary }];
      });

      await client.updateItinerary('itin_123_abc', updateRequest);
    });

    it('should throw APIError on 404 Not Found', async () => {
      mockAxios.onPut('/itineraries/nonexistent').reply(404, {
        error: 'Itinerary not found',
      });

      await expect(
        client.updateItinerary('nonexistent', updateRequest)
      ).rejects.toThrow('Itinerary not found');
    });

    it('should throw APIError on 400 Bad Request', async () => {
      mockAxios.onPut('/itineraries/itin_123_abc').reply(400, {
        error: 'Invalid request body',
      });

      await expect(
        client.updateItinerary('itin_123_abc', updateRequest)
      ).rejects.toThrow('Invalid request body');
    });
  });

  describe('deleteItinerary', () => {
    it('should delete itinerary successfully', async () => {
      mockAxios.onDelete('/itineraries/itin_123_abc').reply(204);

      await expect(
        client.deleteItinerary('itin_123_abc')
      ).resolves.toBeUndefined();
    });

    it('should include Authorization header', async () => {
      mockAxios.onDelete('/itineraries/itin_123_abc').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer mock-jwt-token');
        return [204];
      });

      await client.deleteItinerary('itin_123_abc');
    });

    it('should throw APIError on 404 Not Found', async () => {
      mockAxios.onDelete('/itineraries/nonexistent').reply(404, {
        error: 'Itinerary not found',
      });

      await expect(client.deleteItinerary('nonexistent')).rejects.toThrow(
        'Itinerary not found'
      );
    });

    it('should throw APIError on 403 Forbidden', async () => {
      mockAxios.onDelete('/itineraries/itin_123_abc').reply(403, {
        error: 'Forbidden',
      });

      await expect(client.deleteItinerary('itin_123_abc')).rejects.toThrow(
        APIError
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockAxios.onGet('/itineraries').networkError();

      await expect(client.listItineraries()).rejects.toThrow(APIError);
      await expect(client.listItineraries()).rejects.toThrow('Network Error');
    });

    it('should handle timeout errors', async () => {
      mockAxios.onGet('/itineraries').timeout();

      await expect(client.listItineraries()).rejects.toThrow(APIError);
      await expect(client.listItineraries()).rejects.toThrow(/timeout/i);
    });

    it('should handle 401 Unauthorized with custom message', async () => {
      mockAxios.onGet('/itineraries').reply(401, {
        error: 'Token expired',
      });

      const error = await client.listItineraries().catch((e) => e);

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('Session expired. Please sign in again.');
      expect(error.statusCode).toBe(401);
    });

    it('should handle errors with no response data', async () => {
      mockAxios.onGet('/itineraries').reply(500);

      await expect(client.listItineraries()).rejects.toThrow(APIError);
    });
  });

  describe('Authentication Token Injection', () => {
    it('should inject token from getAuthToken callback', async () => {
      mockGetAuthToken = vi.fn(() => 'new-token-123');
      client = new ItineraryApiClient({
        baseURL: 'https://api.example.com',
        getAuthToken: mockGetAuthToken,
      });

      mockAxios.onGet('/itineraries').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer new-token-123');
        return [200, { itineraries: [] }];
      });

      await client.listItineraries();
      expect(mockGetAuthToken).toHaveBeenCalled();
    });

    it('should handle null token gracefully', async () => {
      mockGetAuthToken = vi.fn(() => null);
      client = new ItineraryApiClient({
        baseURL: 'https://api.example.com',
        getAuthToken: mockGetAuthToken,
      });

      mockAxios.onGet('/itineraries').reply((config) => {
        // Should not have Authorization header if token is null
        expect(config.headers?.Authorization).toBeUndefined();
        return [200, { itineraries: [] }];
      });

      await client.listItineraries();
    });

    it('should call getAuthToken for each request', async () => {
      const tokenGetter = vi.fn(() => 'token');
      client = new ItineraryApiClient({
        baseURL: 'https://api.example.com',
        getAuthToken: tokenGetter,
      });

      mockAxios.onGet('/itineraries').reply(200, { itineraries: [] });
      mockAxios.onPost('/itineraries').reply(201, { itinerary: mockItinerary });

      await client.listItineraries();
      await client.createItinerary(mockCreateRequest);

      expect(tokenGetter).toHaveBeenCalledTimes(2);
    });
  });

  describe('Utility Methods', () => {
    it('should return base URL', () => {
      expect(client.getBaseURL()).toBe('https://api.example.com');
    });

    it('should update timeout', () => {
      client.setTimeout(5000);
      // No direct way to verify, but should not throw
      expect(client).toBeInstanceOf(ItineraryApiClient);
    });
  });
});
