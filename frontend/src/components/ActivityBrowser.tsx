import React, { useMemo } from 'react';
import { Place } from '../types';
import { DraggableActivity } from './DraggableActivity';
import { SearchBar } from './SearchBar';
import { useItinerary } from '../contexts/ItineraryContext';
import { useFilter } from '../contexts/FilterContext';

// ============================================================================
// Types
// ============================================================================

export interface ActivityBrowserProps {
  activities: Place[];
}

// ============================================================================
// Component
// ============================================================================

export function ActivityBrowser({ activities }: ActivityBrowserProps): JSX.Element {
  const { filters } = useFilter();
  const { state } = useItinerary();

  // Create set of place IDs that are already in the itinerary
  const activitiesInItinerary = useMemo(() => {
    if (!state.currentItinerary) return new Set<string>();
    
    const ids = new Set<string>();
    state.currentItinerary.days.forEach((day) => {
      day.places.forEach((place) => {
        ids.add(place.id);
      });
    });
    return ids;
  }, [state.currentItinerary]);

  // Filter activities based on search query from FilterContext
  const filteredActivities = useMemo(() => {
    if (!filters.searchQuery) return activities;
    
    const query = filters.searchQuery.toLowerCase();
    return activities.filter((activity) => {
      return (
        activity.name.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query) ||
        activity.neighborhood?.toLowerCase().includes(query) ||
        activity.city.toLowerCase().includes(query)
      );
    });
  }, [activities, filters.searchQuery]);

  return (
    <div className="activity-browser h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Browse Activities
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Drag activities into your itinerary days
        </p>
        
        {/* Search */}
        <SearchBar
          filteredPlaces={filteredActivities}
          placeholder="Search activities..."
        />
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No activities found</p>
            {filters.searchQuery && (
              <p className="mt-2 text-sm text-gray-400">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <DraggableActivity
              key={activity.id}
              place={activity}
              isInItinerary={activitiesInItinerary.has(activity.id)}
            />
          ))
        )}
      </div>

      {/* Footer with count */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing {filteredActivities.length} of {activities.length} activities
        </p>
      </div>
    </div>
  );
}
