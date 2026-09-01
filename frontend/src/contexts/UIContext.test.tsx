import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { UIProvider, useUI } from './UIContext';
import { Place } from '../types';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Mock place for testing
 */
const mockPlace: Place = {
  id: 'place_001',
  name: 'Colosseum',
  type: 'historic_site',
  city: 'Rome',
  latitude: 41.8902,
  longitude: 12.4922,
  description: 'Ancient Roman amphitheater',
  rating: 4.8,
  price_range: '€€',
  tags: ['history', 'iconic'],
};

const anotherMockPlace: Place = {
  id: 'place_002',
  name: 'Trevi Fountain',
  type: 'historic_site',
  city: 'Rome',
  latitude: 41.9009,
  longitude: 12.4833,
  description: 'Famous baroque fountain',
  rating: 4.7,
  price_range: '€',
  tags: ['landmark', 'iconic'],
};

/**
 * Wrapper for providing context in tests
 */
function wrapper({ children }: { children: React.ReactNode }) {
  return <UIProvider>{children}</UIProvider>;
}

// ============================================================================
// Test Suite
// ============================================================================

describe('UIContext', () => {
  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      expect(result.current.state.selectedPlace).toBeNull();
      expect(result.current.state.activeDay).toBe(1);
      expect(result.current.state.mapCenter).toEqual([41.9028, 12.4964]); // Rome
      expect(result.current.state.mapZoom).toBe(6);
      expect(result.current.state.modals.placeDetail).toBe(false);
      expect(result.current.state.modals.preferences).toBe(false);
      expect(result.current.state.modals.datasetUploader).toBe(false);
    });

    it('should accept custom initial state', () => {
      const customInitialState = {
        activeDay: 2 as const,
        mapZoom: 10,
      };

      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <UIProvider initialUIState={customInitialState}>{children}</UIProvider>
      );

      const { result } = renderHook(() => useUI(), { wrapper: customWrapper });

      expect(result.current.state.activeDay).toBe(2);
      expect(result.current.state.mapZoom).toBe(10);
    });
  });

  describe('Selected Place', () => {
    it('should set selected place', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setSelectedPlace(mockPlace);
      });

      expect(result.current.state.selectedPlace).toEqual(mockPlace);
    });

    it('should clear selected place', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setSelectedPlace(mockPlace);
      });

      expect(result.current.state.selectedPlace).toEqual(mockPlace);

      act(() => {
        result.current.setSelectedPlace(null);
      });

      expect(result.current.state.selectedPlace).toBeNull();
    });

    it('should replace selected place', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setSelectedPlace(mockPlace);
      });

      expect(result.current.state.selectedPlace).toEqual(mockPlace);

      act(() => {
        result.current.setSelectedPlace(anotherMockPlace);
      });

      expect(result.current.state.selectedPlace).toEqual(anotherMockPlace);
    });
  });

  describe('Active Day', () => {
    it('should set active day to 1', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setActiveDay(1);
      });

      expect(result.current.state.activeDay).toBe(1);
    });

    it('should set active day to 2', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setActiveDay(2);
      });

      expect(result.current.state.activeDay).toBe(2);
    });

    it('should set active day to 3', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setActiveDay(3);
      });

      expect(result.current.state.activeDay).toBe(3);
    });

    it('should switch between days', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setActiveDay(1);
      });
      expect(result.current.state.activeDay).toBe(1);

      act(() => {
        result.current.setActiveDay(2);
      });
      expect(result.current.state.activeDay).toBe(2);

      act(() => {
        result.current.setActiveDay(3);
      });
      expect(result.current.state.activeDay).toBe(3);
    });
  });

  describe('Map State', () => {
    it('should set map center', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      const newCenter: [number, number] = [45.4642, 9.19]; // Milan

      act(() => {
        result.current.setMapCenter(newCenter);
      });

      expect(result.current.state.mapCenter).toEqual(newCenter);
    });

    it('should set map zoom', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setMapZoom(12);
      });

      expect(result.current.state.mapZoom).toBe(12);
    });

    it('should update map center and zoom independently', () => {
      const { result } = renderHook(() => useUI(), { wrapper });
      const newCenter: [number, number] = [43.7696, 11.2558]; // Florence

      act(() => {
        result.current.setMapCenter(newCenter);
      });
      expect(result.current.state.mapCenter).toEqual(newCenter);
      expect(result.current.state.mapZoom).toBe(6); // Should remain default

      act(() => {
        result.current.setMapZoom(15);
      });
      expect(result.current.state.mapZoom).toBe(15);
      expect(result.current.state.mapCenter).toEqual(newCenter); // Should remain unchanged
    });
  });

  describe('Modal Management - Generic', () => {
    it('should open a modal', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openModal('place-detail');
      });

      expect(result.current.state.modals.placeDetail).toBe(true);
    });

    it('should close a modal', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openModal('place-detail');
      });
      expect(result.current.state.modals.placeDetail).toBe(true);

      act(() => {
        result.current.closeModal('place-detail');
      });
      expect(result.current.state.modals.placeDetail).toBe(false);
    });

    it('should handle null modal type gracefully', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openModal(null);
      });

      expect(result.current.state.modals.placeDetail).toBe(false);
      expect(result.current.state.modals.preferences).toBe(false);
      expect(result.current.state.modals.datasetUploader).toBe(false);
    });

    it('should close all modals', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      // Open all modals
      act(() => {
        result.current.openModal('place-detail');
        result.current.openModal('preferences');
        result.current.openModal('dataset-uploader');
      });

      expect(result.current.state.modals.placeDetail).toBe(true);
      expect(result.current.state.modals.preferences).toBe(true);
      expect(result.current.state.modals.datasetUploader).toBe(true);

      // Close all
      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.state.modals.placeDetail).toBe(false);
      expect(result.current.state.modals.preferences).toBe(false);
      expect(result.current.state.modals.datasetUploader).toBe(false);
    });

    it('should clear selected place when closing all modals', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setSelectedPlace(mockPlace);
        result.current.openModal('place-detail');
      });

      expect(result.current.state.selectedPlace).toEqual(mockPlace);

      act(() => {
        result.current.closeAllModals();
      });

      expect(result.current.state.selectedPlace).toBeNull();
    });
  });

  describe('Modal Management - Place Detail', () => {
    it('should open place detail modal with place', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openPlaceDetailModal(mockPlace);
      });

      expect(result.current.state.modals.placeDetail).toBe(true);
      expect(result.current.state.selectedPlace).toEqual(mockPlace);
    });

    it('should close place detail modal and clear selected place', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openPlaceDetailModal(mockPlace);
      });

      expect(result.current.state.modals.placeDetail).toBe(true);
      expect(result.current.state.selectedPlace).toEqual(mockPlace);

      act(() => {
        result.current.closePlaceDetailModal();
      });

      expect(result.current.state.modals.placeDetail).toBe(false);
      expect(result.current.state.selectedPlace).toBeNull();
    });
  });

  describe('Modal Management - Preferences', () => {
    it('should open preferences modal', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openPreferencesModal();
      });

      expect(result.current.state.modals.preferences).toBe(true);
    });

    it('should close preferences modal', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openPreferencesModal();
      });
      expect(result.current.state.modals.preferences).toBe(true);

      act(() => {
        result.current.closePreferencesModal();
      });

      expect(result.current.state.modals.preferences).toBe(false);
    });
  });

  describe('Modal Management - Dataset Uploader', () => {
    it('should open dataset uploader modal', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openDatasetUploaderModal();
      });

      expect(result.current.state.modals.datasetUploader).toBe(true);
    });

    it('should close dataset uploader modal', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openDatasetUploaderModal();
      });
      expect(result.current.state.modals.datasetUploader).toBe(true);

      act(() => {
        result.current.closeDatasetUploaderModal();
      });

      expect(result.current.state.modals.datasetUploader).toBe(false);
    });
  });

  describe('Modal Management - Multiple Modals', () => {
    it('should allow multiple modals to be open simultaneously', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openPreferencesModal();
        result.current.openDatasetUploaderModal();
      });

      expect(result.current.state.modals.preferences).toBe(true);
      expect(result.current.state.modals.datasetUploader).toBe(true);
    });

    it('should close specific modals independently', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openPreferencesModal();
        result.current.openDatasetUploaderModal();
      });

      act(() => {
        result.current.closePreferencesModal();
      });

      expect(result.current.state.modals.preferences).toBe(false);
      expect(result.current.state.modals.datasetUploader).toBe(true);
    });
  });

  describe('Reset UI', () => {
    it('should reset all UI state to initial values', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      // Modify all state
      act(() => {
        result.current.setSelectedPlace(mockPlace);
        result.current.setActiveDay(3);
        result.current.setMapCenter([45.4642, 9.19]);
        result.current.setMapZoom(15);
        result.current.openPlaceDetailModal(mockPlace);
        result.current.openPreferencesModal();
      });

      // Verify state was modified
      expect(result.current.state.selectedPlace).toEqual(mockPlace);
      expect(result.current.state.activeDay).toBe(3);
      expect(result.current.state.mapCenter).toEqual([45.4642, 9.19]);
      expect(result.current.state.mapZoom).toBe(15);
      expect(result.current.state.modals.placeDetail).toBe(true);
      expect(result.current.state.modals.preferences).toBe(true);

      // Reset
      act(() => {
        result.current.resetUI();
      });

      // Verify reset to initial state
      expect(result.current.state.selectedPlace).toBeNull();
      expect(result.current.state.activeDay).toBe(1);
      expect(result.current.state.mapCenter).toEqual([41.9028, 12.4964]);
      expect(result.current.state.mapZoom).toBe(6);
      expect(result.current.state.modals.placeDetail).toBe(false);
      expect(result.current.state.modals.preferences).toBe(false);
      expect(result.current.state.modals.datasetUploader).toBe(false);
    });
  });

  describe('Hook Error Handling', () => {
    it('should throw error when useUI is used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      expect(() => {
        renderHook(() => useUI());
      }).toThrow('useUI must be used within a UIProvider');

      console.error = originalError;
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setActiveDay(1);
        result.current.setActiveDay(2);
        result.current.setActiveDay(3);
        result.current.setActiveDay(1);
      });

      expect(result.current.state.activeDay).toBe(1);
    });

    it('should handle opening and closing same modal rapidly', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.openPreferencesModal();
        result.current.closePreferencesModal();
        result.current.openPreferencesModal();
      });

      expect(result.current.state.modals.preferences).toBe(true);
    });

    it('should maintain other state when modifying one piece', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => {
        result.current.setSelectedPlace(mockPlace);
        result.current.setActiveDay(2);
        result.current.setMapZoom(10);
      });

      // Change only map center
      act(() => {
        result.current.setMapCenter([45.4642, 9.19]);
      });

      // Other state should remain unchanged
      expect(result.current.state.selectedPlace).toEqual(mockPlace);
      expect(result.current.state.activeDay).toBe(2);
      expect(result.current.state.mapZoom).toBe(10);
      expect(result.current.state.mapCenter).toEqual([45.4642, 9.19]);
    });
  });
});
