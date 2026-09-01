import { DayPlan } from '../types';

export interface ValidationWarning {
  type: 'duration_exceeded' | 'multiple_cities';
  message: string;
  severity: 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
}

/**
 * Validates a day plan against duration and geographic constraints
 * Returns non-blocking warnings for issues
 */
export function validateDay(day: DayPlan): ValidationResult {
  const warnings: ValidationWarning[] = [];
  
  // Duration validation (>10 hours = 600 minutes)
  if (day.total_duration > 600) {
    warnings.push({
      type: 'duration_exceeded',
      message: 'This day exceeds 10 hours of activities',
      severity: 'warning'
    });
  }
  
  // Geographic validation (>2 cities)
  const cities = new Set(day.places.map(p => p.city));
  if (cities.size > 2) {
    warnings.push({
      type: 'multiple_cities',
      message: `This day includes activities in ${cities.size} different cities`,
      severity: 'warning'
    });
  }
  
  // Always valid, just may have warnings
  return { isValid: true, warnings };
}

/**
 * Validates all days in an itinerary
 */
export function validateItinerary(days: DayPlan[]): Map<number, ValidationResult> {
  const results = new Map<number, ValidationResult>();
  
  days.forEach((day, index) => {
    results.set(day.day_number, validateDay(day));
  });
  
  return results;
}
