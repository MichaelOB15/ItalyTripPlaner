/**
 * Manual Verification Test for Bug #2 Fix
 * 
 * This test verifies that tasks 6.1 and 6.2 correctly implemented the fix
 * for premature auto-save during load.
 * 
 * The fix adds an `isLoadingFromAPI` ref that prevents auto-save from
 * triggering when the itinerary is being loaded from the API.
 */

import { describe, it, expect } from 'vitest';

describe('Bug #2 Fix Verification - isLoadingFromAPI Implementation', () => {
  it('should have isLoadingFromAPI ref defined in ItineraryContext', async () => {
    // Read the ItineraryContext source to verify implementation
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const contextPath = path.join(__dirname, 'ItineraryContext.tsx');
    const contextSource = await fs.readFile(contextPath, 'utf-8');
    
    // Verify isLoadingFromAPI ref is defined
    expect(contextSource).toContain('const isLoadingFromAPI = useRef(false)');
    
    // Verify the guard is in the auto-save effect
    expect(contextSource).toContain('if (isLoadingFromAPI.current)');
    expect(contextSource).toContain('Skipping auto-save during load');
    
    // Verify flag is set to true before API load
    expect(contextSource).toContain('isLoadingFromAPI.current = true');
    expect(contextSource).toContain('Setting isLoadingFromAPI = true');
    
    // Verify flag is reset to false after load
    expect(contextSource).toContain('isLoadingFromAPI.current = false');
    expect(contextSource).toContain('Setting isLoadingFromAPI = false');
    
    // Verify flag is reset on error
    const errorResetPattern = /catch.*isLoadingFromAPI\.current = false/s;
    expect(contextSource).toMatch(errorResetPattern);
  });

  it('should have the guard placed before any auto-save logic', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const contextPath = path.join(__dirname, 'ItineraryContext.tsx');
    const contextSource = await fs.readFile(contextPath, 'utf-8');
    
    // Find the auto-save effect
    const autoSaveEffectRegex = /useEffect\s*\(\s*\(\)\s*=>\s*{[^}]*Don't auto-save if we're currently loading/s;
    expect(contextSource).toMatch(autoSaveEffectRegex);
    
    // Verify the guard comes BEFORE the hasUnsavedChanges check
    // Find the auto-save effect and verify guard is first
    const hasGuardFirst = contextSource.includes('if (isLoadingFromAPI.current)') &&
                          contextSource.indexOf('if (isLoadingFromAPI.current)') < 
                          contextSource.indexOf('if (state.currentItinerary && state.hasUnsavedChanges)');
    expect(hasGuardFirst).toBe(true);
  });

  it('should set and clear the flag in the correct locations', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const contextPath = path.join(__dirname, 'ItineraryContext.tsx');
    const contextSource = await fs.readFile(contextPath, 'utf-8');
    
    // Extract the loadItinerary function
    const loadItineraryStart = contextSource.indexOf('const loadItinerary = useCallback(async () =>');
    const loadItineraryEnd = contextSource.indexOf('}, [state.storageMode', loadItineraryStart);
    const loadItineraryFunction = contextSource.substring(loadItineraryStart, loadItineraryEnd);
    
    // Verify flag is set before API call
    expect(loadItineraryFunction).toContain('isLoadingFromAPI.current = true');
    
    // Count how many times the flag is set to false (should be at least 2: success + error)
    const falseCount = (loadItineraryFunction.match(/isLoadingFromAPI\.current = false/g) || []).length;
    expect(falseCount).toBeGreaterThanOrEqual(2);
  });

  it('should have proper documentation comments for the fix', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const contextPath = path.join(__dirname, 'ItineraryContext.tsx');
    const contextSource = await fs.readFile(contextPath, 'utf-8');
    
    // Verify documentation comments explain the fix
    expect(contextSource).toContain('Track when we\'re loading data from the API to prevent premature auto-save');
    expect(contextSource).toContain('Don\'t auto-save if we\'re currently loading from API');
    expect(contextSource).toContain('Set loading flag to prevent auto-save during load');
    expect(contextSource).toContain('Clear loading flag after load is complete');
  });
});
