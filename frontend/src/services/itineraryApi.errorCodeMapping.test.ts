/**
 * Task 12.12: Unit Test for API Error Code Mapping
 * 
 * **Validates Requirement 9.3:**
 * - WHEN an API request returns an error status code, 
 *   THE Frontend_App SHALL display a user-friendly error message
 * 
 * This test verifies that specific HTTP error codes (400, 401, 404, 500)
 * are correctly mapped to user-friendly error messages in the ItineraryApiClient.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { ItineraryApiClient } from './itineraryApi';
import { APIError } from './api';

describe('Task 12.12: API Error Code Mapping to User-Friendly Messages', () => {
  let mockAxios: MockAdapter;
  let client: ItineraryApiClient;
  let mockGetAuthToken: () => string | null;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    mockGetAuthToken = vi.fn(() => 'test-auth-token');
    client = new ItineraryApiClient({
      baseURL: 'https://api.test.example.com',
      getAuthToken: mockGetAuthToken,
    });
  });

  describe('Requirement 9.3: User-Friendly Error Messages for HTTP Error Codes', () => {
    it('should map 400 Bad Request to user-friendly error message', async () => {
      // Setup: Mock API to return 400 error
      mockAxios.onPost('/itineraries').reply(400, {
        error: 'Invalid itinerary data: Name cannot be empty',
      });

      // Act & Assert
      try {
        await client.createItinerary({
          name: '',
          days: [{} as any, {} as any, {} as any],
          preferences: {} as any,
        });
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        // Verify error is APIError with correct status code
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        
        expect(apiError.statusCode).toBe(400);
        expect(apiError.message).toBe('Invalid itinerary data: Name cannot be empty');
        // Message should be user-friendly (no technical jargon)
        expect(apiError.message).not.toContain('ERR_');
        expect(apiError.message).not.toContain('stack');
      }
    });

    it('should map 401 Unauthorized to user-friendly session expiration message', async () => {
      // Setup: Mock API to return 401 error
      mockAxios.onGet('/itineraries').reply(401, {
        error: 'Unauthorized: Token expired',
      });

      // Act & Assert
      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        
        expect(apiError.statusCode).toBe(401);
        // Special handling: 401 should always prompt re-authentication
        expect(apiError.message).toBe('Session expired. Please sign in again.');
        // Verify message is user-friendly
        expect(apiError.message).not.toContain('JWT');
        expect(apiError.message).not.toContain('token');
      }
    });

    it('should map 404 Not Found to user-friendly error message', async () => {
      // Setup: Mock API to return 404 error
      mockAxios.onGet('/itineraries/nonexistent-id').reply(404, {
        error: 'Itinerary not found or you do not have access',
      });

      // Act & Assert
      try {
        await client.getItinerary('nonexistent-id');
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        
        expect(apiError.statusCode).toBe(404);
        expect(apiError.message).toBe('Itinerary not found or you do not have access');
        // Message should be clear and actionable
        expect(apiError.message.toLowerCase()).toMatch(/not found|access/);
      }
    });

    it('should map 500 Internal Server Error to user-friendly error message', async () => {
      // Setup: Mock API to return 500 error
      mockAxios.onGet('/itineraries').reply(500, {
        error: 'An unexpected error occurred. Please try again later.',
      });

      // Act & Assert
      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        expect(error).toBeInstanceOf(APIError);
        const apiError = error as APIError;
        
        expect(apiError.statusCode).toBe(500);
        expect(apiError.message).toBe('An unexpected error occurred. Please try again later.');
        // Message should not expose internal details
        expect(apiError.message).not.toContain('database');
        expect(apiError.message).not.toContain('SQL');
        expect(apiError.message).not.toContain('NullPointer');
      }
    });
  });

  describe('Error Message Extraction Priority', () => {
    it('should extract error message from "error" field first', async () => {
      // Setup: Response has both "error" and "message" fields
      mockAxios.onGet('/itineraries').reply(400, {
        error: 'Primary error message',
        message: 'Secondary message',
      });

      // Act & Assert
      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        // "error" field should take precedence
        expect(apiError.message).toBe('Primary error message');
      }
    });

    it('should extract error message from "message" field if "error" not present', async () => {
      // Setup: Response has only "message" field
      mockAxios.onGet('/itineraries').reply(400, {
        message: 'Validation failed',
      });

      // Act & Assert
      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        expect(apiError.message).toBe('Validation failed');
      }
    });

    it('should use fallback message when no error fields are present', async () => {
      // Setup: Response has no error or message fields
      mockAxios.onGet('/itineraries').reply(500, {});

      // Act & Assert
      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        // Should have some message (not empty)
        expect(apiError.message).toBeTruthy();
        expect(apiError.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Code Mapping Across Different API Operations', () => {
    it('should map 400 errors consistently for CREATE operation', async () => {
      mockAxios.onPost('/itineraries').reply(400, {
        error: 'Invalid request body',
      });

      try {
        await client.createItinerary({
          name: 'Test',
          days: [{} as any, {} as any, {} as any],
          preferences: {} as any,
        });
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(400);
        expect(apiError.message).toBe('Invalid request body');
      }
    });

    it('should map 404 errors consistently for GET operation', async () => {
      mockAxios.onGet('/itineraries/missing-id').reply(404, {
        error: 'Resource not found',
      });

      try {
        await client.getItinerary('missing-id');
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(404);
        expect(apiError.message).toBe('Resource not found');
      }
    });

    it('should map 404 errors consistently for UPDATE operation', async () => {
      mockAxios.onPut('/itineraries/missing-id').reply(404, {
        error: 'Itinerary not found',
      });

      try {
        await client.updateItinerary('missing-id', {
          name: 'Updated',
          days: [{} as any, {} as any, {} as any],
          preferences: {} as any,
        });
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(404);
        expect(apiError.message).toBe('Itinerary not found');
      }
    });

    it('should map 404 errors consistently for DELETE operation', async () => {
      mockAxios.onDelete('/itineraries/missing-id').reply(404, {
        error: 'Cannot delete: itinerary not found',
      });

      try {
        await client.deleteItinerary('missing-id');
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(404);
        expect(apiError.message).toBe('Cannot delete: itinerary not found');
      }
    });

    it('should map 401 errors consistently for LIST operation', async () => {
      mockAxios.onGet('/itineraries').reply(401, {
        error: 'Authentication required',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        expect(apiError.statusCode).toBe(401);
        // 401 always gets special session expired message
        expect(apiError.message).toBe('Session expired. Please sign in again.');
      }
    });
  });

  describe('APIError Structure Validation', () => {
    it('should include status code in APIError', async () => {
      mockAxios.onGet('/itineraries').reply(400, {
        error: 'Bad request',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        expect(apiError.statusCode).toBeDefined();
        expect(typeof apiError.statusCode).toBe('number');
        expect(apiError.statusCode).toBe(400);
      }
    });

    it('should include response data in APIError for debugging', async () => {
      const responseData = {
        error: 'Validation failed',
        details: ['Name is required', 'Days must be 3'],
      };

      mockAxios.onPost('/itineraries').reply(400, responseData);

      try {
        await client.createItinerary({
          name: '',
          days: [{} as any, {} as any, {} as any],
          preferences: {} as any,
        });
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        // Original response should be available for debugging
        expect(apiError.response).toBeDefined();
        expect(apiError.response).toEqual(responseData);
      }
    });

    it('should include original error for debugging', async () => {
      mockAxios.onGet('/itineraries').reply(500, {
        error: 'Server error',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        // Original axios error should be preserved
        expect(apiError.originalError).toBeDefined();
      }
    });
  });

  describe('Task 12.12 Completion Verification', () => {
    it('verifies all required error codes (400, 401, 404, 500) are correctly mapped', async () => {
      const errorCodes = [
        { code: 400, message: 'Bad request error' },
        { code: 401, message: 'Unauthorized error' },
        { code: 404, message: 'Not found error' },
        { code: 500, message: 'Internal server error' },
      ];

      for (const { code, message } of errorCodes) {
        mockAxios.reset();
        mockAxios.onGet('/itineraries').reply(code, { error: message });

        try {
          await client.listItineraries();
          expect.fail(`Should have thrown error for status ${code}`);
        } catch (error) {
          expect(error).toBeInstanceOf(APIError);
          const apiError = error as APIError;
          
          // Verify status code is correctly mapped
          expect(apiError.statusCode).toBe(code);
          
          // Verify message is present and user-friendly
          expect(apiError.message).toBeTruthy();
          expect(apiError.message).not.toBe('');
          
          // For 401, verify special handling
          if (code === 401) {
            expect(apiError.message).toBe('Session expired. Please sign in again.');
          }
        }
      }
    });

    it('verifies error messages are user-friendly (no technical jargon)', async () => {
      mockAxios.onGet('/itineraries').reply(500, {
        error: 'Service temporarily unavailable',
      });

      try {
        await client.listItineraries();
        expect.fail('Should have thrown an APIError');
      } catch (error) {
        const apiError = error as APIError;
        
        // User-friendly checks
        const message = apiError.message.toLowerCase();
        expect(message).not.toContain('err_');
        expect(message).not.toContain('econnrefused');
        expect(message).not.toContain('stack');
        expect(message).not.toContain('exception');
        expect(message).not.toContain('null pointer');
        
        // Should be readable
        expect(apiError.message.length).toBeGreaterThan(5);
      }
    });
  });
});
