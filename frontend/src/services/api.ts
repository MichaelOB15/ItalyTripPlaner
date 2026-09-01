import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import {
  Place,
  GetPlacesQuery,
  GetPlacesResponse,
  RecommendationsRequest,
  RecommendationsResponse,
  ValidationResult,
  UserPreferences,
  Itinerary,
} from '../types';

/**
 * API Error class with structured error information
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * Loading state manager for API operations
 */
export class LoadingStateManager {
  private loadingMap = new Map<string, boolean>();
  private listeners = new Set<(key: string, isLoading: boolean) => void>();

  setLoading(key: string, isLoading: boolean): void {
    this.loadingMap.set(key, isLoading);
    this.listeners.forEach(listener => listener(key, isLoading));
  }

  isLoading(key: string): boolean {
    return this.loadingMap.get(key) ?? false;
  }

  subscribe(listener: (key: string, isLoading: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * Configuration options for PlacesAPIClient
 */
export interface APIClientConfig {
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  onLoadingChange?: (key: string, isLoading: boolean) => void;
}

/**
 * API client for the Italy Trip Planner backend with complete functionality:
 * - Error handling with structured APIError
 * - Loading state management
 * - Automatic retry logic with exponential backoff
 * - Request/response interceptors
 * - Environment-based configuration
 */
export class PlacesAPIClient {
  private axios: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;
  public loadingState: LoadingStateManager;

  constructor(config?: APIClientConfig) {
    const apiBaseURL = config?.baseURL || import.meta.env.VITE_API_BASE_URL || '/api';
    this.maxRetries = config?.maxRetries ?? 3;
    this.retryDelay = config?.retryDelay ?? 1000;
    this.loadingState = new LoadingStateManager();

    // Subscribe to loading state changes if callback provided
    if (config?.onLoadingChange) {
      this.loadingState.subscribe(config.onLoadingChange);
    }

    this.axios = axios.create({
      baseURL: apiBaseURL,
      timeout: config?.timeout ?? 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging and headers
    this.axios.interceptors.request.use(
      (config) => {
        // Log requests in development
        if (import.meta.env.DEV) {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.params);
        }
        return config;
      },
      (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling and logging
    this.axios.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
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
   * Transform Axios errors into structured APIError instances
   */
  private handleAxiosError(error: AxiosError): APIError {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as Record<string, unknown>;
      const message = (data?.message as string) || (data?.error as string) || error.message || 'An error occurred';
      
      console.error(`[API Error] ${status}: ${message}`, data);
      
      return new APIError(message, status, data, error);
    } else if (error.request) {
      // Request made but no response received (network error or timeout)
      
      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const message = 'Request timed out';
        console.error('[API Timeout Error]', error.message);
        return new APIError(message, 408, undefined, error);
      }
      
      // Network error (connection failed)
      const message = 'Network error: Unable to reach the server';
      console.error('[API Network Error]', error.message);
      return new APIError(message, undefined, undefined, error);
    } else {
      // Error in request setup
      const message = error.message || 'Request configuration error';
      console.error('[API Setup Error]', message);
      return new APIError(message, undefined, undefined, error);
    }
  }

  /**
   * Execute a request with retry logic and loading state management
   */
  private async executeWithRetry<T>(
    loadingKey: string,
    requestFn: () => Promise<AxiosResponse<T>>,
    retryCount = 0
  ): Promise<T> {
    this.loadingState.setLoading(loadingKey, true);

    try {
      const response = await requestFn();
      this.loadingState.setLoading(loadingKey, false);
      return response.data;
    } catch (error) {
      const apiError = error as APIError;
      
      // Determine if we should retry
      const shouldRetry = this.shouldRetryRequest(apiError, retryCount);
      
      if (shouldRetry) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = this.retryDelay * Math.pow(2, retryCount);
        console.log(`[API Retry] Attempt ${retryCount + 1}/${this.maxRetries} after ${delay}ms`);
        
        await this.sleep(delay);
        return this.executeWithRetry(loadingKey, requestFn, retryCount + 1);
      }
      
      this.loadingState.setLoading(loadingKey, false);
      throw apiError;
    }
  }

  /**
   * Determine if a request should be retried based on error type and retry count
   */
  private shouldRetryRequest(error: APIError, retryCount: number): boolean {
    if (retryCount >= this.maxRetries) {
      return false;
    }

    // Retry on network errors (no status code)
    if (!error.statusCode) {
      return true;
    }

    // Retry on 5xx server errors
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true;
    }

    // Retry on 429 (rate limit)
    if (error.statusCode === 429) {
      return true;
    }

    // Don't retry on 4xx client errors (except 429)
    return false;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch places with optional filters
   * Supports pagination and multiple filter types
   * @param filters - Optional query parameters for filtering places
   * @returns Array of places matching the filter criteria
   */
  async getPlaces(filters?: GetPlacesQuery): Promise<Place[]> {
    return this.executeWithRetry('getPlaces', () => {
      const params = new URLSearchParams();

      if (filters?.cities) {
        params.append('cities', filters.cities);
      }
      if (filters?.types) {
        params.append('types', filters.types);
      }
      if (filters?.tags) {
        params.append('tags', filters.tags);
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters?.offset) {
        params.append('offset', filters.offset.toString());
      }

      return this.axios.get<GetPlacesResponse>('/places', { params });
    }).then(response => response.places);
  }

  /**
   * Fetch the complete response from /places endpoint including metadata
   * @param filters - Optional query parameters for filtering places
   * @returns Complete response with places, total count, and pagination info
   */
  async getPlacesWithMetadata(filters?: GetPlacesQuery): Promise<GetPlacesResponse> {
    return this.executeWithRetry('getPlacesWithMetadata', () => {
      const params = new URLSearchParams();

      if (filters?.cities) {
        params.append('cities', filters.cities);
      }
      if (filters?.types) {
        params.append('types', filters.types);
      }
      if (filters?.tags) {
        params.append('tags', filters.tags);
      }
      if (filters?.limit) {
        params.append('limit', filters.limit.toString());
      }
      if (filters?.offset) {
        params.append('offset', filters.offset.toString());
      }

      return this.axios.get<GetPlacesResponse>('/places', { params });
    });
  }

  /**
   * Get itinerary recommendations based on user preferences
   * Supports both initial generation and replanning with existing itinerary
   * @param preferences - User preferences for trip planning
   * @param existingItinerary - Optional existing itinerary for replan functionality
   * @returns Recommended itinerary with reasoning and alternatives
   */
  async getRecommendations(
    preferences: UserPreferences,
    existingItinerary?: Itinerary
  ): Promise<RecommendationsResponse> {
    return this.executeWithRetry('getRecommendations', () => {
      const request: RecommendationsRequest = {
        preferences,
        existingItinerary: existingItinerary,
      };

      return this.axios.post<RecommendationsResponse>('/recommendations', request);
    });
  }

  /**
   * Validate a custom dataset file before loading
   * Checks structure, required fields, and data integrity
   * @param file - JSON file containing custom dataset
   * @returns Validation result with errors and warnings
   */
  async validateDataset(file: File): Promise<ValidationResult> {
    return this.executeWithRetry('validateDataset', () => {
      const formData = new FormData();
      formData.append('dataset', file);

      return this.axios.post<ValidationResult>('/validate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    });
  }

  /**
   * Check if a specific operation is currently loading
   * @param key - Loading state key (e.g., 'getPlaces', 'getRecommendations')
   * @returns True if the operation is in progress
   */
  isLoading(key: string): boolean {
    return this.loadingState.isLoading(key);
  }

  /**
   * Get the base URL configured for this client
   * @returns The base URL string
   */
  getBaseURL(): string {
    return this.axios.defaults.baseURL || '';
  }

  /**
   * Update request timeout
   * @param timeout - New timeout in milliseconds
   */
  setTimeout(timeout: number): void {
    this.axios.defaults.timeout = timeout;
  }

  /**
   * Add a custom header to all requests
   * @param name - Header name
   * @param value - Header value
   */
  setHeader(name: string, value: string): void {
    this.axios.defaults.headers.common[name] = value;
  }

  /**
   * Remove a custom header
   * @param name - Header name to remove
   */
  removeHeader(name: string): void {
    delete this.axios.defaults.headers.common[name];
  }
}

// Export a singleton instance
export const apiClient = new PlacesAPIClient();
