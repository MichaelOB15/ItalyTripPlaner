import React from 'react';
import { LandingHero } from './LandingHero';
import { RecommendationButton } from './RecommendationButton';

/**
 * ItineraryInstructions Component
 * 
 * Displays helpful instructions and guidance for users creating their first itinerary.
 * Shows when no itinerary exists yet to provide clear onboarding.
 * 
 * Features:
 * - Prominent landing hero with clear value proposition
 * - Step-by-step visual guide for creating an itinerary
 * - Clear call-to-action to get started
 * - Tips for using the application effectively
 * - Responsive design with icons
 * 
 * Requirements Coverage:
 * - 14.6: Display clear instructions for creating an itinerary
 * - 9.7: Responsive and usable on mobile and desktop
 * 
 * @example
 * ```tsx
 * {!currentItinerary && <ItineraryInstructions />}
 * ```
 */
export const ItineraryInstructions = React.memo(function ItineraryInstructions(): JSX.Element {
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Landing Hero */}
      <LandingHero />

      {/* How It Works Section */}
      <div className="max-w-2xl mx-auto text-center mt-12">
        {/* Welcome Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            How It Works
          </h2>
          <p className="text-lg text-gray-600">
            Create your personalized Italian adventure in just a few steps
          </p>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-6 mb-8 text-left">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Generate Smart Recommendations
              </h3>
              <p className="text-sm text-gray-600">
                Click "Generate Itinerary" above to get smart recommendations based on your 
                preferences (cities, interests, pace), or browse places manually below.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Browse and Add Places
              </h3>
              <p className="text-sm text-gray-600">
                Explore Italian destinations in the Place Explorer on the left. Filter by city, type, or tags
                to find the perfect spots. Click "Add to Itinerary" to include them in your trip.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Organize Your Days
              </h3>
              <p className="text-sm text-gray-600">
                Drag and drop places to reorder them or move them between days. Each day shows total duration
                and will warn you if you're planning more than 10 hours of activities.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              4
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                Export and Share
              </h3>
              <p className="text-sm text-gray-600">
                When you're done planning, export your itinerary as a PDF or print it for offline access
                during your trip.
              </p>
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 text-sm mb-1">Pro Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Your itinerary is automatically saved in your browser</li>
                <li>Look for places with ⭐ ratings to find popular destinations</li>
                <li>Check the map on the right to see where places are located</li>
                <li>Places marked with 🗓️ require advance booking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action Note */}
        <div className="text-center mt-10">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Ready to start planning?
              </p>
              <p className="text-sm text-blue-800">
                Click the button to generate your personalized itinerary in seconds!
              </p>
            </div>
            <RecommendationButton />
          </div>
        </div>
      </div>
    </div>
  );
});
