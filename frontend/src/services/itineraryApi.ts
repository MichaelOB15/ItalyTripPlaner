import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { Itinerary, UserPreferences, DayPlan } from '../types';
import { APIError } from './api';

/**
 * Request body for creating an itinerary
 */
export interface CreateItineraryRequest {
  name: string;
  days: [DayPlan, DayPlan, DayPlan];
  preferences: UserPreferences;
}

/**
 * Request body for updating an itinerary
 */
export interface UpdateItineraryRequest {
  name: string;
  days: [DayPlan, DayPlan, DayPlan];
  preferences: UserPreferences;
}

/**
 * Response from create/get/update itinerary endpoints
 */
export interface ItineraryResponse {
  itinerary: Itinerary;
}

/**
 * Response from list itineraries endpoint
 */
export interface ListItinerariesResponse {
  itineraries: Itinerary[];
}

/**
 * Configuration options for ItineraryApiClient
 */
export interface ItineraryApiClientConfig {
  baseURL?: string;
  timeout?: number;
  getAuthToken: () => string | null;
}

/**
 * API client for authenticated itinerary operations.
 * Handles CRUD operations for user itineraries with authentication.
 * 
 * **Validates Requirement 5.2:**
 * - WHEN a user is authenticated, THE Frontend_App SHALL use the Itinerary_Service API endpoints 
 *   for all itinerary operations instead of localStorage
 * 
 * Features:
 * - Automatic JWT token injection via Authorization header
 * - Error handling with structured APIError
 * - Session expiration detection and handling
 * - Environment-based configuration
 * 
 * @example
 * ```typescript
 * const client = new ItineraryApiClient({
 *   getAuthToken: () => authContext.state.accessToken
 * });
 * 
 * const itineraries = await client.listItineraries();
 * ```
 */
export class ItineraryApiClient {
  private axios: AxiosInstance;
  private getAuthToken: () => string | null;

  /**
   * Create a new ItineraryApiClient instance.
   * 
   * @param config - Configuration including base URL and auth token getter
   * @throws Error if getAuthToken is not provided
   */
  constructor(config: ItineraryApiClientConfig) {
    if (!config.getAuthToken) {
      throw new Error('getAuthToken callback is required');
    }

    // Configure base URL from environment variable or config
    const apiBaseURL = config.baseURL || import.meta.env.VITE_API_BASE_URL || '/api';
    this.getAuthToken = config.getAuthToken;

    // Create axios instance with defaults
    this.axios = axios.create({
      baseURL: apiBaseURL,
      timeout: config.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to inject JWT token
    this.axios.interceptors.request.use(
      (config) => {
        // Get current access token
        const token = this.getAuthToken();
        
        // Inject Authorization header with Bearer token
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Log requests in development
        if (import.meta.env.DEV) {
          console.log(`[Itinerary API Request] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        console.error('[Itinerary API Request Error]', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling and logging
    this.axios.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
          console.log(
            `[Itinerary API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
            response.status
          );
        }
        return response;
      },
      (error: AxiosError) => {
        // Transform Axios errors into structured APIError
        const apiError = this.handleAxiosError(error);
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Transform Axios errors into structured APIError instances.
   * Handles special cases like 401 Unauthorized for session expiration.
   * 
   * **Validates Requirements:**
   * - 1.10: When a Session token expires, prompt user to sign in again
   * - 5.7: Handle API authentication errors by prompting user to sign in again
   */
  private handleAxiosError(error: AxiosError): APIError {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as Record<string, unknown>;
      const message =
        (data?.error as string) ||
        (data?.message as string) ||
        error.message ||
        'An error occurred';

      // Special handling for 401 Unauthorized (session expired)
      if (status === 401) {
        console.error('[Itinerary API] Session expired or unauthorized');
        return new APIError(
          'Session expired. Please sign in again.',
          status,
          data,
          error
        );
      }

      console.error(`[Itinerary API Error] ${status}: ${message}`, data);
      return new APIError(message, status, data, error);
    } else if (error.request) {
      // Request made but no response received (network error or timeout)
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const message = 'Request timed out';
        console.error('[Itinerary API Timeout]', error.message);
        return new APIError(message, 408, undefined, error);
      }

      // Network error (connection failed)
      const message = 'Network error: Unable to reach the server';
      console.error('[Itinerary API Network Error]', error.message);
      return new APIError(message, undefined, undefined, error);
    } else {
      // Error in request setup
      const message = error.message || 'Request configuration error';
      console.error('[Itinerary API Setup Error]', message);
      return new APIError(message, undefined, undefined, error);
    }
  }

  /**
   * Create a new itinerary for the authenticated user.
   * 
   * **Validates Requirement 4.1, 4.2:**
   * - POST /itineraries endpoint creates new itinerary
   * - Generates unique itinerary_id and stores in DynamoDB
   * 
   * @param request - Itinerary data (name, days, preferences)
   * @returns Created itinerary with server-generated ID
   * @throws APIError if creation fails or user is unauthorized
   */
  async createItinerary(request: CreateItineraryRequest): Promise<Itinerary> {
    const response = await this.axios.post<ItineraryResponse>(
      '/itineraries',
      request
    );
    return response.data.itinerary;
  }

  /**
   * List all itineraries for the authenticated user.
   * Returns itineraries sorted by last_modified in descending order.
   * 
   * **Validates Requirement 4.3, 4.4:**
   * - GET /itineraries retrieves all user's itineraries
   * - Returns array sorted by last_modified descending
   * 
   * @returns Array of user's itineraries
   * @throws APIError if retrieval fails or user is unauthorized
   */
  async listItineraries(): Promise<Itinerary[]> {
    const response = await this.axios.get<ListItinerariesResponse>(
      '/itineraries'
    );
    return response.data.itineraries;
  }

  /**
   * Get a specific itinerary by ID.
   * Verifies ownership - only returns itinerary if it belongs to authenticated user.
   * 
   * **Validates Requirement 4.5, 4.6:**
   * - GET /itineraries/{itinerary_id} retrieves specific itinerary
   * - Verifies ownership before returning data
   * 
   * @param itineraryId - Unique itinerary identifier
   * @returns Itinerary details
   * @throws APIError with 404 if not found or unauthorized, 401 if session expired
   */
  async getItinerary(itineraryId: string): Promise<Itinerary> {
    const response = await this.axios.get<ItineraryResponse>(
      `/itineraries/${itineraryId}`
    );
    return response.data.itinerary;
  }

  /**
   * Update an existing itinerary.
   * Verifies ownership - only updates if itinerary belongs to authenticated user.
   * Updates last_modified timestamp automatically.
   * 
   * **Validates Requirement 4.7, 4.8:**
   * - PUT /itineraries/{itinerary_id} updates existing itinerary
   * - Updates last_modified timestamp
   * 
   * @param itineraryId - Unique itinerary identifier
   * @param request - Updated itinerary data
   * @returns Updated itinerary
   * @throws APIError with 404 if not found or unauthorized, 400 if invalid data
   */
  async updateItinerary(
    itineraryId: string,
    request: UpdateItineraryRequest
  ): Promise<Itinerary> {
    const response = await this.axios.put<ItineraryResponse>(
      `/itineraries/${itineraryId}`,
      request
    );
    return response.data.itinerary;
  }

  /**
   * Delete an itinerary.
   * Verifies ownership - only deletes if itinerary belongs to authenticated user.
   * 
   * **Validates Requirement 4.9, 4.10:**
   * - DELETE /itineraries/{itinerary_id} deletes itinerary
   * - Verifies ownership before deletion
   * 
   * @param itineraryId - Unique itinerary identifier
   * @throws APIError with 404 if not found or unauthorized
   */
  async deleteItinerary(itineraryId: string): Promise<void> {
    await this.axios.delete(`/itineraries/${itineraryId}`);
  }

  /**
   * Get the base URL configured for this client.
   * @returns The base URL string
   */
  getBaseURL(): string {
    return this.axios.defaults.baseURL || '';
  }

  /**
   * Update request timeout.
   * @param timeout - New timeout in milliseconds
   */
  setTimeout(timeout: number): void {
    this.axios.defaults.timeout = timeout;
  }
}
