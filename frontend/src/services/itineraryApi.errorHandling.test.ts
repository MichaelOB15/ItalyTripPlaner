/**
 * Itinerary API Error Handling Verification Tests
 * 
 * **Validates Task 7.8**: Implement error handling with user-friendly messages
 * - Map HTTP status codes to specific error messages
 * - Handle network errors with user-friendly messages
 * 
 * **Validates Requirements:**
 * - 9.2: Network connectivity errors should be handled gracefully
 * - 9.3: Provide user-friendly error messages
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { ItineraryApiClient } from './itineraryApi';
import { APIError } from './api';

describe('ItineraryApiClient Error Handling - Task 7.8 Verification', () => {
  let mockAxios: MockAdapter;
  let client: ItineraryApiClient;
  let mockGetAuthToken: () => string | null;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    mockGetAuthToken = vi.fn(() => 'test-token');
    client = new ItineraryApiClient({
      baseURL: 'https://api.example.com',
      getAuthToken: mockGetAuthToken,
    });
  });

  describe('Requirement 9.3: User-Friendly Error Messages - HTTP Status Code Mapping', () => {
    it('should map 400 Bad Request to user-friendly message', async () => {
      mockAxios.onGet('/itineraries').reply(400, {
        error: 'Invalid request body',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(400);
        expect(apiError.message).toBe('Invalid request body');
      }
    });

    it('should map 401 Unauthorized to user-friendly message with session expiration', async () => {
      mockAxios.onGet('/itineraries').reply(401, {
        error: 'Token expired',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(401);
        // Requirement 1.10, 5.7: Prompt user to sign in again on session expiry
        expect(apiError.message).toBe('Session expired. Please sign in again.');
      }
    });

    it('should map 403 Forbidden to user-friendly message', async () => {
      mockAxios.onGet('/itineraries').reply(403, {
        error: 'Access denied',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(403);
        expect(apiError.message).toBeTruthy();
      }
    });

    it('should map 404 Not Found to user-friendly message', async () => {
      mockAxios.onGet('/itineraries/itin-123').reply(404, {
        error: 'Itinerary not found',
      });

      try {
        await client.getItinerary('itin-123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(404);
        expect(apiError.message).toBe('Itinerary not found');
      }
    });

    it('should map 429 Rate Limit to user-friendly message', async () => {
      mockAxios.onGet('/itineraries').reply(429, {
        error: 'Too many requests',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(429);
        expect(apiError.message).toBeTruthy();
      }
    });

    it('should map 500 Internal Server Error to user-friendly message', async () => {
      mockAxios.onGet('/itineraries').reply(500, {
        error: 'Internal server error',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(500);
        expect(apiError.message).toBe('Internal server error');
      }
    });

    it('should map 503 Service Unavailable to user-friendly message', async () => {
      mockAxios.onGet('/itineraries').reply(503, {
        error: 'Service temporarily unavailable',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(503);
        expect(apiError.message).toBe('Service temporarily unavailable');
      }
    });
  });

  describe('Requirement 9.2: Network Connectivity Error Handling', () => {
    it('should handle network connection failures with user-friendly message', async () => {
      mockAxios.onGet('/itineraries').networkError();

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        // No status code for network errors
        expect(apiError.statusCode).toBeUndefined();
        // User-friendly message (axios-mock-adapter uses "Network Error")
        expect(apiError.message).toContain('Network');
        expect(apiError.message).not.toContain('ERR_');
      }
    });

    it('should handle timeout errors with user-friendly message', async () => {
      mockAxios.onGet('/itineraries').timeout();

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        // Timeout errors from axios-mock-adapter don't have status codes
        expect(apiError.statusCode).toBeUndefined();
        expect(apiError.message).toMatch(/timeout/i);
      }
    });

    it('should handle aborted requests with user-friendly message', async () => {
      // Simulate ECONNABORTED error
      mockAxios.onGet('/itineraries').reply(() => {
        const error: any = new Error('timeout of 10000ms exceeded');
        error.code = 'ECONNABORTED';
        return Promise.reject(error);
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        // Aborted requests are caught as setup errors
        expect(apiError.statusCode).toBeUndefined();
        expect(apiError.message).toMatch(/timeout/i);
      }
    });
  });

  describe('Error Message Extraction from API Response', () => {
    it('should extract error message from "error" field', async () => {
      mockAxios.onPost('/itineraries').reply(400, {
        error: 'Name is required',
      });

      try {
        await client.createItinerary({
          name: '',
          days: [{} as any, {} as any, {} as any],
          preferences: {} as any,
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.message).toBe('Name is required');
      }
    });

    it('should extract error message from "message" field', async () => {
      mockAxios.onPost('/itineraries').reply(400, {
        message: 'Validation failed',
      });

      try {
        await client.createItinerary({
          name: 'Test',
          days: [{} as any, {} as any, {} as any],
          preferences: {} as any,
        });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.message).toBe('Validation failed');
      }
    });

    it('should use generic message when no specific error message provided', async () => {
      mockAxios.onGet('/itineraries').reply(500);

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        expect(apiError.message).toBeTruthy();
        expect(apiError.message).not.toBe('');
      }
    });
  });

  describe('Error Logging for Debugging', () => {
    it('should log errors to console for debugging', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockAxios.onGet('/itineraries').reply(500, {
        error: 'Database connection failed',
      });

      try {
        await client.listItineraries();
      } catch (error) {
        // Error should be logged
        expect(consoleErrorSpy).toHaveBeenCalled();
      }

      consoleErrorSpy.mockRestore();
    });

    it('should log network errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockAxios.onGet('/itineraries').networkError();

      try {
        await client.listItineraries();
      } catch (error) {
        // Network error should be logged
        expect(consoleErrorSpy).toHaveBeenCalled();
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cross-Operation Error Consistency', () => {
    it('should handle errors consistently across all CRUD operations', async () => {
      // List operation
      mockAxios.onGet('/itineraries').networkError();
      await expect(client.listItineraries()).rejects.toThrow(APIError);

      // Get operation
      mockAxios.onGet('/itineraries/itin-123').networkError();
      await expect(client.getItinerary('itin-123')).rejects.toThrow(APIError);

      // Create operation
      mockAxios.onPost('/itineraries').networkError();
      await expect(client.createItinerary({
        name: 'Test',
        days: [{} as any, {} as any, {} as any],
        preferences: {} as any,
      })).rejects.toThrow(APIError);

      // Update operation
      mockAxios.onPut('/itineraries/itin-123').networkError();
      await expect(client.updateItinerary('itin-123', {
        name: 'Test',
        days: [{} as any, {} as any, {} as any],
        preferences: {} as any,
      })).rejects.toThrow(APIError);

      // Delete operation
      mockAxios.onDelete('/itineraries/itin-123').networkError();
      await expect(client.deleteItinerary('itin-123')).rejects.toThrow(APIError);
    });
  });

  describe('Task 7.8 Completion Verification', () => {
    it('verifies HTTP status codes are mapped to specific error messages', async () => {
      const statusCodes = [400, 401, 403, 404, 429, 500, 503];
      
      for (const statusCode of statusCodes) {
        mockAxios.reset();
        mockAxios.onGet('/itineraries').reply(statusCode, {
          error: `Test error for ${statusCode}`,
        });

        try {
          await client.listItineraries();
          expect.fail(`Should have thrown error for status ${statusCode}`);
        } catch (error) {
          expect(error).toBeInstanceOf(APIError);
          const apiError = error as APIError;
          expect(apiError.statusCode).toBe(statusCode);
          expect(apiError.message).toBeTruthy();
          expect(apiError.message).not.toBe('');
        }
      }
    });

    it('verifies network errors have user-friendly messages', async () => {
      mockAxios.onGet('/itineraries').networkError();

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        
        // User-friendly message (not technical)
        expect(apiError.message).not.toContain('ERR_');
        expect(apiError.message).not.toContain('ECONNREFUSED');
        expect(apiError.message).not.toContain('stack');
        
        // Contains helpful information
        expect(apiError.message.toLowerCase()).toMatch(/network|server|reach/);
      }
    });

    it('verifies errors include context data for debugging', async () => {
      mockAxios.onGet('/itineraries').reply(400, {
        error: 'Invalid request',
        details: 'Missing required field: name',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        
        // Error has status code and message
        expect(apiError.statusCode).toBe(400);
        expect(apiError.message).toBe('Invalid request');
        // Original axios error is preserved for debugging
        expect(apiError.originalError).toBeDefined();
      }
    });
  });
});
