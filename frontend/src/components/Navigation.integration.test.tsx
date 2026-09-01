import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from './Header';
import { DatasetProvider } from '../contexts/DatasetContext';
import { AuthProvider } from '../contexts/AuthContext';

/**
 * Integration test for navigation functionality
 * Tests that the Progress tab is properly integrated into navigation
 * 
 * **Validates Requirement 6.1:** Progress View accessible via navigation
 */
describe('Navigation Integration - Progress Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Progress tab in navigation', () => {
    const mockOnTabChange = vi.fn();
    
    render(
      <BrowserRouter>
        <DatasetProvider>
          <AuthProvider>
            <Header activeTab="home" onTabChange={mockOnTabChange} />
          </AuthProvider>
        </DatasetProvider>
      </BrowserRouter>
    );

    // Check that all four tabs are rendered
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Browse Activities')).toBeInTheDocument();
    expect(screen.getByText('Itinerary Builder')).toBeInTheDocument();
    expect(screen.getByText('Saved Itineraries')).toBeInTheDocument();
  });

  it('should call onTabChange when Progress tab is clicked', () => {
    const mockOnTabChange = vi.fn();
    
    render(
      <BrowserRouter>
        <DatasetProvider>
          <AuthProvider>
            <Header activeTab="home" onTabChange={mockOnTabChange} />
          </AuthProvider>
        </DatasetProvider>
      </BrowserRouter>
    );

    const progressTab = screen.getByText('Saved Itineraries');
    fireEvent.click(progressTab);

    expect(mockOnTabChange).toHaveBeenCalledWith('progress');
  });

  it('should highlight the Progress tab when active', () => {
    const mockOnTabChange = vi.fn();
    
    render(
      <BrowserRouter>
        <DatasetProvider>
          <AuthProvider>
            <Header activeTab="progress" onTabChange={mockOnTabChange} />
          </AuthProvider>
        </DatasetProvider>
      </BrowserRouter>
    );

    const progressTab = screen.getByText('Saved Itineraries');
    const button = progressTab.closest('button');
    
    // Check that the active tab has the blue border
    expect(button).toHaveClass('border-blue-600');
    expect(button).toHaveClass('text-blue-600');
  });

  it('should have proper ARIA attributes for accessibility', () => {
    const mockOnTabChange = vi.fn();
    
    render(
      <BrowserRouter>
        <DatasetProvider>
          <AuthProvider>
            <Header activeTab="progress" onTabChange={mockOnTabChange} />
          </AuthProvider>
        </DatasetProvider>
      </BrowserRouter>
    );

    const progressTab = screen.getByText('Saved Itineraries');
    const button = progressTab.closest('button');
    
    expect(button).toHaveAttribute('role', 'tab');
    expect(button).toHaveAttribute('aria-selected', 'true');
    expect(button).toHaveAttribute('aria-controls', 'progress-panel');
  });
});
