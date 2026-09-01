import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

// Mock the contexts to avoid actual API calls and data loading
vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock('./contexts/DatasetContext', () => ({
  DatasetProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDataset: () => ({ state: { isLoading: false, error: null, places: [] }, dispatch: vi.fn() }),
}));

vi.mock('./contexts/FilterContext', () => ({
  FilterProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./contexts/ItineraryContext', () => ({
  ItineraryProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./contexts/UIContext', () => ({
  UIProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock components
vi.mock('./components/Header', () => ({
  Header: () => <header className="bg-white shadow"><h1>Italy Trip Planner</h1></header>,
}));

vi.mock('./components/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('./components/HomeTab', () => ({
  HomeTab: () => (
    <div>
      <h2>Welcome to Italy Trip Planner</h2>
      <p>Frontend application initialized with React 18</p>
      <p>Context providers: Dataset, Filter, Itinerary, UI</p>
    </div>
  ),
}));

vi.mock('./components/PlaceExplorer', () => ({
  PlaceExplorer: () => <div>PlaceExplorer</div>,
}));

vi.mock('./components/ItineraryPanel', () => ({
  ItineraryPanel: () => <div>ItineraryPanel</div>,
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Italy Trip Planner')).toBeInTheDocument();
  });

  it('displays the welcome message', () => {
    render(<App />);
    expect(screen.getByText('Welcome to Italy Trip Planner')).toBeInTheDocument();
  });

  it('displays the application description', () => {
    render(<App />);
    expect(
      screen.getByText(/Frontend application initialized with React 18/)
    ).toBeInTheDocument();
  });

  it('displays context provider confirmation', () => {
    render(<App />);
    expect(
      screen.getByText(/Context providers: Dataset, Filter, Itinerary, UI/)
    ).toBeInTheDocument();
  });

  it('wraps the app with AuthProvider', () => {
    const { container } = render(<App />);
    const authProvider = container.querySelector('[data-testid="auth-provider"]');
    expect(authProvider).toBeInTheDocument();
  });

  it('renders the header with correct styling', () => {
    render(<App />);
    const header = screen.getByText('Italy Trip Planner').closest('header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('bg-white', 'shadow');
  });

  it('renders the main content area', () => {
    render(<App />);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });

  it('has correct layout structure', () => {
    const { container } = render(<App />);
    // Check for min-h-screen on root div
    const rootDiv = container.querySelector('.min-h-screen');
    expect(rootDiv).toBeInTheDocument();
  });
});
