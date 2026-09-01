import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders an SVG element with correct attributes', () => {
    const { container } = render(<Icon name="map" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('applies custom size', () => {
    const { container } = render(<Icon name="calendar" size={32} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('applies custom className', () => {
    const { container } = render(<Icon name="clock" className="custom-icon" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('icon');
    expect(svg).toHaveClass('icon-clock');
    expect(svg).toHaveClass('custom-icon');
  });

  it('applies custom color', () => {
    const { container } = render(<Icon name="star" color="#ff0000" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', '#ff0000');
  });

  it('sets aria-hidden to true by default', () => {
    const { container } = render(<Icon name="location" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets aria-label when provided', () => {
    const { container } = render(<Icon name="search" aria-label="Search icon" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-label', 'Search icon');
    expect(svg).toHaveAttribute('role', 'img');
  });

  it('can override aria-hidden', () => {
    const { container } = render(<Icon name="filter" aria-hidden={false} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'false');
  });

  it('renders correct icon for different names', () => {
    const { container: container1 } = render(<Icon name="map" />);
    const { container: container2 } = render(<Icon name="calendar" />);

    const svg1 = container1.querySelector('svg');
    const svg2 = container2.querySelector('svg');

    expect(svg1).toHaveClass('icon-map');
    expect(svg2).toHaveClass('icon-calendar');
  });

  it('renders all icon types without errors', () => {
    const iconNames = [
      'map',
      'calendar',
      'clock',
      'star',
      'location',
      'filter',
      'search',
      'close',
      'menu',
      'export',
      'plus',
      'minus',
      'trash',
      'edit',
      'check',
      'chevron-down',
      'chevron-up',
      'info',
      'warning',
      'restaurant',
      'museum',
      'historic-site',
    ];

    iconNames.forEach((name) => {
      const { container } = render(<Icon name={name as any} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('handles unknown icon names gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const { container } = render(<Icon name={'unknown-icon' as any} />);
    
    const svg = container.querySelector('svg');
    expect(svg).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('Icon "unknown-icon" not found');
    
    consoleSpy.mockRestore();
  });

  it('renders with correct SVG properties', () => {
    const { container } = render(<Icon name="star" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '2');
    expect(svg).toHaveAttribute('stroke-linecap', 'round');
    expect(svg).toHaveAttribute('stroke-linejoin', 'round');
  });

  it('renders icon with string size', () => {
    const { container } = render(<Icon name="map" size="48px" />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '48px');
    expect(svg).toHaveAttribute('height', '48px');
  });
});
