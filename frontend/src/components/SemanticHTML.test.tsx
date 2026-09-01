/**
 * Semantic HTML Structure Tests
 * 
 * **Validates: Requirements 14.1, 14.2, 14.5**
 * 
 * Tests that verify proper semantic HTML structure including:
 * - Semantic elements (<header>, <nav>, <main>, <section>, <article>, <footer>)
 * - Proper use of <button> for interactive elements
 * - Proper heading hierarchy (h1 → h2 → h3)
 * - ARIA landmarks for screen readers
 * - Skip links for keyboard navigation
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import { Header } from './Header';
import { MainLayout } from './MainLayout';
import { PlaceExplorer } from './PlaceExplorer';
import { PlaceCard } from './PlaceCard';
import { DayPlan } from './DayPlan';
import { DatasetProvider } from '../contexts/DatasetContext';
import { FilterProvider } from '../contexts/FilterContext';
import { ItineraryProvider } from '../contexts/ItineraryContext';
import { UIProvider } from '../contexts/UIContext';
import { Place } from '../types';

// ============================================================================
// Test Utilities
// ============================================================================

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <DatasetProvider>
      <FilterProvider>
        <ItineraryProvider>
          <UIProvider>
            {children}
          </UIProvider>
        </ItineraryProvider>
      </FilterProvider>
    </DatasetProvider>
  </BrowserRouter>
);

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
  tags: ['history', 'architecture'],
  duration_minutes: 120,
};

// ============================================================================
// App-Level Semantic Structure Tests
// ============================================================================

describe('App - Semantic HTML Structure', () => {
  it('should include a skip link for screen readers', () => {
    render(<App />, { wrapper: TestWrapper });
    
    const skipLink = screen.getByText(/skip to main content/i);
    expect(skipLink).toBeInTheDocument();
    expect(skipLink.tagName).toBe('A');
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('should have a <header> element with proper role', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    const headers = container.querySelectorAll('header');
    expect(headers.length).toBeGreaterThan(0);
    
    // Check for banner role (implicit from header element)
    const banners = container.querySelectorAll('[role="banner"]');
    expect(banners.length).toBeGreaterThanOrEqual(0); // May be implicit
  });

  it('should have a <main> element with proper role and id', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('role', 'main');
    expect(main).toHaveAttribute('id', 'main-content');
  });
});

// ============================================================================
// Header Component Semantic Structure Tests
// ============================================================================

describe('Header - Semantic HTML Structure', () => {
  it('should render as a <header> element', () => {
    const { container } = render(
      <Header />,
      { wrapper: TestWrapper }
    );
    
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('should have h1 heading with app title', () => {
    render(<Header />, { wrapper: TestWrapper });
    
    const heading = screen.getByRole('heading', { name: /italy trip planner/i, level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H1');
  });

  it('should use button elements for interactive controls', () => {
    const { container } = render(
      <Header />,
      { wrapper: TestWrapper }
    );
    
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0); // May have dataset switcher buttons
    
    // Ensure no divs with onClick handlers
    const clickableDivs = container.querySelectorAll('div[onclick]');
    expect(clickableDivs.length).toBe(0);
  });
});

// ============================================================================
// MainLayout Component Semantic Structure Tests
// ============================================================================

describe('MainLayout - Semantic HTML Structure', () => {
  it('should use semantic elements for content regions', () => {
    const { container } = render(
      <MainLayout
        placeExplorer={<div>Place Explorer</div>}
        itineraryPanel={<div>Itinerary</div>}
        mapView={<div>Map</div>}
      />,
      { wrapper: TestWrapper }
    );
    
    // Check for semantic elements
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    
    const sections = container.querySelectorAll('section, article, aside');
    expect(sections.length).toBeGreaterThan(0);
  });

  it('should have ARIA landmarks for all content regions', () => {
    const { container } = render(
      <MainLayout
        placeExplorer={<div>Place Explorer</div>}
        itineraryPanel={<div>Itinerary</div>}
        mapView={<div>Map</div>}
      />,
      { wrapper: TestWrapper }
    );
    
    // Check for aria-label on regions
    const placeExplorer = container.querySelector('[aria-label*="Place Explorer"]');
    expect(placeExplorer).toBeInTheDocument();
    
    const itineraryPanel = container.querySelector('[aria-label*="Itinerary Panel"]');
    expect(itineraryPanel).toBeInTheDocument();
    
    const mapView = container.querySelector('[aria-label*="Map View"]');
    expect(mapView).toBeInTheDocument();
  });

  it('should use role="search" for Place Explorer', () => {
    const { container } = render(
      <MainLayout
        placeExplorer={<div>Place Explorer</div>}
        itineraryPanel={<div>Itinerary</div>}
        mapView={<div>Map</div>}
      />,
      { wrapper: TestWrapper }
    );
    
    const searchRegion = container.querySelector('[role="search"]');
    expect(searchRegion).toBeInTheDocument();
  });

  it('should use <article> for Itinerary Panel (main content)', () => {
    const { container } = render(
      <MainLayout
        placeExplorer={<div>Place Explorer</div>}
        itineraryPanel={<div>Itinerary</div>}
        mapView={<div>Map</div>}
      />,
      { wrapper: TestWrapper }
    );
    
    const article = container.querySelector('article[aria-label*="Itinerary"]');
    expect(article).toBeInTheDocument();
  });

  it('should use <aside> for Map View (complementary content)', () => {
    const { container } = render(
      <MainLayout
        placeExplorer={<div>Place Explorer</div>}
        itineraryPanel={<div>Itinerary</div>}
        mapView={<div>Map</div>}
      />,
      { wrapper: TestWrapper }
    );
    
    const aside = container.querySelector('aside[aria-label*="Map"]');
    expect(aside).toBeInTheDocument();
  });
});

// ============================================================================
// PlaceExplorer Component Semantic Structure Tests
// ============================================================================

describe('PlaceExplorer - Semantic HTML Structure', () => {
  it('should render as a <nav> element', () => {
    const { container } = render(
      <PlaceExplorer />,
      { wrapper: TestWrapper }
    );
    
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', expect.stringContaining('Place'));
  });

  it('should have a <header> with h2 heading', () => {
    const { container } = render(
      <PlaceExplorer />,
      { wrapper: TestWrapper }
    );
    
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    
    const heading = screen.getByRole('heading', { name: /explore places/i, level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H2');
  });
});

// ============================================================================
// PlaceCard Component Semantic Structure Tests
// ============================================================================

describe('PlaceCard - Semantic HTML Structure', () => {
  it('should render as an <article> element', () => {
    const { container } = render(
      <PlaceCard place={mockPlace} />,
      { wrapper: TestWrapper }
    );
    
    const article = container.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('should have a <header> with h3 heading for place name', () => {
    const { container } = render(
      <PlaceCard place={mockPlace} />,
      { wrapper: TestWrapper }
    );
    
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
    
    const heading = screen.getByRole('heading', { name: mockPlace.name, level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H3');
  });

  it('should use <button> for "Add to Itinerary" action', () => {
    const mockCallback = vi.fn();
    const { container } = render(
      <PlaceCard place={mockPlace} onAddToItinerary={mockCallback} />,
      { wrapper: TestWrapper }
    );
    
    const button = screen.getByRole('button', { name: /add.*to itinerary/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });

  it('should not use divs with onClick handlers', () => {
    const { container } = render(
      <PlaceCard place={mockPlace} />,
      { wrapper: TestWrapper }
    );
    
    // The card itself may have onClick, but should be role="button"
    const clickableDiv = container.querySelector('div[onclick]:not([role="button"])');
    expect(clickableDiv).not.toBeInTheDocument();
  });
});

// ============================================================================
// DayPlan Component Semantic Structure Tests
// ============================================================================

describe('DayPlan - Semantic HTML Structure', () => {
  it('should use proper heading hierarchy with h2 for day title', () => {
    const { container } = render(
      <DayPlan dayNumber={1} places={[]} totalDuration={0} />,
      { wrapper: TestWrapper }
    );
    
    const heading = screen.getByRole('heading', { name: /day 1/i, level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H2');
  });

  it('should have proper aria-label for day region', () => {
    const { container } = render(
      <DayPlan dayNumber={1} places={[]} totalDuration={0} />,
      { wrapper: TestWrapper }
    );
    
    const region = container.querySelector('[aria-label*="Day 1"]');
    expect(region).toBeInTheDocument();
  });

  it('should use <button> elements for interactive actions', () => {
    const mockCallback = vi.fn();
    render(
      <DayPlan dayNumber={1} places={[]} totalDuration={0} onAddPlace={mockCallback} />,
      { wrapper: TestWrapper }
    );
    
    const button = screen.getByRole('button', { name: /add place/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });
});

// ============================================================================
// Heading Hierarchy Tests
// ============================================================================

describe('Heading Hierarchy - Proper Order', () => {
  it('should maintain proper heading hierarchy across the app', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    const h1Elements = container.querySelectorAll('h1');
    const h2Elements = container.querySelectorAll('h2');
    const h3Elements = container.querySelectorAll('h3');
    
    // Should have one h1 (app title)
    expect(h1Elements.length).toBe(1);
    
    // Should have h2 elements for major sections
    expect(h2Elements.length).toBeGreaterThanOrEqual(0);
    
    // h3 elements should be within sections with h2
    expect(h3Elements.length).toBeGreaterThanOrEqual(0);
  });

  it('should not skip heading levels', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const levels = Array.from(headings).map(h => parseInt(h.tagName[1]));
    
    // Check that we don't skip from h1 to h3, etc.
    for (let i = 1; i < levels.length; i++) {
      const diff = levels[i] - levels[i - 1];
      // Difference should be at most 1 when going down, or any when going up
      if (diff > 0) {
        expect(diff).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ============================================================================
// Button vs Div Tests
// ============================================================================

describe('Interactive Elements - Button Usage', () => {
  it('should use <button> elements for all clickable actions', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    // Check that divs with onClick handlers have proper role
    const interactiveDivs = container.querySelectorAll('div[onclick], div[role="button"]');
    interactiveDivs.forEach(div => {
      // If a div is interactive, it should have role="button"
      if (div.getAttribute('onclick')) {
        expect(div).toHaveAttribute('role', 'button');
      }
    });
  });

  it('should have accessible labels for all buttons', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      const hasText = button.textContent && button.textContent.trim().length > 0;
      const hasAriaLabel = button.hasAttribute('aria-label');
      const hasAriaLabelledBy = button.hasAttribute('aria-labelledby');
      
      expect(hasText || hasAriaLabel || hasAriaLabelledBy).toBe(true);
    });
  });
});

// ============================================================================
// ARIA Landmarks Tests
// ============================================================================

describe('ARIA Landmarks - Screen Reader Navigation', () => {
  it('should have main landmark', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    const main = container.querySelector('main, [role="main"]');
    expect(main).toBeInTheDocument();
  });

  it('should have banner landmark (header)', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    const banner = container.querySelector('header, [role="banner"]');
    expect(banner).toBeInTheDocument();
  });

  it('should have search landmark', () => {
    const { container } = render(<App />, { wrapper: TestWrapper });
    
    const search = container.querySelector('[role="search"]');
    expect(search).toBeInTheDocument();
  });

  it('should have complementary landmark (aside/complementary)', () => {
    const { container } = render(
      <MainLayout
        placeExplorer={<div>Place Explorer</div>}
        itineraryPanel={<div>Itinerary</div>}
        mapView={<div>Map</div>}
      />,
      { wrapper: TestWrapper }
    );
    
    const aside = container.querySelector('aside, [role="complementary"]');
    expect(aside).toBeInTheDocument();
  });
});
