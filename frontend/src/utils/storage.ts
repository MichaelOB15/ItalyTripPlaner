import { Itinerary } from '../types';

const ITINERARY_KEY = 'italy-trip-planner-itinerary';
const DATASET_KEY = 'italy-trip-planner-dataset-source';

/**
 * Save itinerary to local storage
 */
export function saveItinerary(itinerary: Itinerary): void {
  try {
    localStorage.setItem(ITINERARY_KEY, JSON.stringify(itinerary));
  } catch (error) {
    console.error('Failed to save itinerary to localStorage:', error);
  }
}

/**
 * Load itinerary from local storage
 */
export function loadItinerary(): Itinerary | null {
  try {
    const saved = localStorage.getItem(ITINERARY_KEY);
    if (!saved) return null;

    const itinerary = JSON.parse(saved);

    // Convert date strings back to Date objects
    itinerary.createdAt = new Date(itinerary.createdAt);
    itinerary.lastModified = new Date(itinerary.lastModified);

    return itinerary;
  } catch (error) {
    console.error('Failed to load itinerary from localStorage:', error);
    return null;
  }
}

/**
 * Clear saved itinerary
 */
export function clearItinerary(): void {
  try {
    localStorage.removeItem(ITINERARY_KEY);
  } catch (error) {
    console.error('Failed to clear itinerary from localStorage:', error);
  }
}

/**
 * Save dataset source preference
 */
export function saveDatasetSource(source: 'default' | 'custom'): void {
  try {
    localStorage.setItem(DATASET_KEY, source);
  } catch (error) {
    console.error('Failed to save dataset source to localStorage:', error);
  }
}

/**
 * Load dataset source preference
 */
export function loadDatasetSource(): 'default' | 'custom' {
  try {
    const source = localStorage.getItem(DATASET_KEY);
    return source === 'custom' ? 'custom' : 'default';
  } catch (error) {
    console.error('Failed to load dataset source from localStorage:', error);
    return 'default';
  }
}
