import React from 'react';
import { Place } from '../types';

export interface CrossCityWarningModalProps {
  isOpen: boolean;
  cities: string[];
  places: Place[];
  onContinue: () => void;
  onCancel: () => void;
}

/**
 * CrossCityWarningModal Component
 * 
 * Warns users when they're adding activities from different cities to the same day.
 * Travel between cities can be time-consuming and may make it impossible to complete
 * all activities in one day.
 */
export function CrossCityWarningModal({
  isOpen,
  cities,
  places,
  onContinue,
  onCancel,
}: CrossCityWarningModalProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cross-city-warning-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full">
          <svg
            className="w-6 h-6 text-orange-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 
          id="cross-city-warning-title"
          className="text-xl font-bold text-gray-900 text-center mb-2"
        >
          Multiple Cities in One Day
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-4">
          This day includes activities in <strong>{cities.length} different cities</strong>:
        </p>

        {/* City List */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <ul className="space-y-2">
            {cities.map((city) => {
              const cityPlaces = places.filter(p => p.city === city);
              return (
                <li key={city} className="text-sm">
                  <span className="font-semibold text-gray-900">{city}</span>
                  <span className="text-gray-500"> ({cityPlaces.length} {cityPlaces.length === 1 ? 'activity' : 'activities'})</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800">
            ⚠️ <strong>Travel time between cities can be significant</strong> (1-3 hours each way). 
            You may not have enough time to visit all these activities in one day.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Remove Activity
          </button>
          <button
            onClick={onContinue}
            className="flex-1 px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
