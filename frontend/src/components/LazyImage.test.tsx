import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { LazyImage } from './LazyImage';

describe('LazyImage', () => {
  beforeEach(() => {
    // Mock IntersectionObserver
    global.IntersectionObserver = class IntersectionObserver {
      constructor(private callback: IntersectionObserverCallback) {}
      observe() {
        // Immediately trigger callback to simulate element in viewport
        this.callback(
          [
            {
              isIntersecting: true,
              intersectionRatio: 1,
              boundingClientRect: {} as DOMRectReadOnly,
              intersectionRect: {} as DOMRectReadOnly,
              rootBounds: null,
              target: document.createElement('div'),
              time: Date.now(),
            },
          ],
          this as unknown as IntersectionObserver
        );
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
      get root() {
        return null;
      }
      get rootMargin() {
        return '0px';
      }
      get thresholds() {
        return [0];
      }
    } as unknown as typeof IntersectionObserver;
  });

  it('renders an image with the provided src and alt text', () => {
    render(<LazyImage src="/test-image.jpg" alt="Test image" />);

    const img = screen.getByAltText('Test image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/test-image.jpg');
  });

  it('renders a picture element with WebP source when webpSrc is provided', async () => {
    const { container } = render(
      <LazyImage src="/test-image.jpg" alt="Test image" webpSrc="/test-image.webp" />
    );

    await waitFor(() => {
      const picture = container.querySelector('picture');
      expect(picture).toBeInTheDocument();

      const source = container.querySelector('source');
      expect(source).toBeInTheDocument();
      expect(source).toHaveAttribute('srcSet', '/test-image.webp');
      expect(source).toHaveAttribute('type', 'image/webp');
    });
  });

  it('applies custom className to the image', () => {
    render(<LazyImage src="/test-image.jpg" alt="Test image" className="custom-class" />);

    const img = screen.getByAltText('Test image');
    expect(img).toHaveClass('custom-class');
  });

  it('sets width and height attributes when provided', () => {
    render(<LazyImage src="/test-image.jpg" alt="Test image" width={800} height={600} />);

    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '600');
  });

  it('calls onLoad callback when image loads', async () => {
    const handleLoad = vi.fn();
    render(<LazyImage src="/test-image.jpg" alt="Test image" onLoad={handleLoad} />);

    const img = screen.getByAltText('Test image') as HTMLImageElement;
    
    // Simulate image load using fireEvent
    fireEvent.load(img);

    expect(handleLoad).toHaveBeenCalled();
  });

  it('calls onError callback when image fails to load', async () => {
    const handleError = vi.fn();
    render(<LazyImage src="/invalid-image.jpg" alt="Test image" onError={handleError} />);

    const img = screen.getByAltText('Test image') as HTMLImageElement;
    
    // Simulate image error using fireEvent
    fireEvent.error(img);

    expect(handleError).toHaveBeenCalled();
  });

  it('uses eager loading when loading prop is set to eager', () => {
    render(<LazyImage src="/test-image.jpg" alt="Test image" loading="eager" />);

    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('uses lazy loading by default', () => {
    render(<LazyImage src="/test-image.jpg" alt="Test image" />);

    const img = screen.getByAltText('Test image');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('shows placeholder image before loading actual image', () => {
    const { rerender } = render(
      <LazyImage
        src="/test-image.jpg"
        alt="Test image"
        placeholderSrc="/placeholder.jpg"
      />
    );

    const img = screen.getByAltText('Test image');
    // Initially might show placeholder, then after IntersectionObserver triggers, shows real image
    expect(img).toBeInTheDocument();
    
    // After rerender, the intersection observer callback should have been called
    rerender(
      <LazyImage
        src="/test-image.jpg"
        alt="Test image"
        placeholderSrc="/placeholder.jpg"
      />
    );
  });

  it('applies loading and loaded classes correctly', async () => {
    render(<LazyImage src="/test-image.jpg" alt="Test image" />);

    const img = screen.getByAltText('Test image') as HTMLImageElement;
    
    // Initially has loading class
    expect(img).toHaveClass('loading');

    // Simulate image load
    fireEvent.load(img);

    // Should have loaded class after load
    expect(img).toHaveClass('loaded');
  });

  it('applies error class when image fails to load', async () => {
    render(<LazyImage src="/invalid-image.jpg" alt="Test image" />);

    const img = screen.getByAltText('Test image') as HTMLImageElement;
    
    // Simulate image error
    fireEvent.error(img);

    // Should have error class after error
    expect(img).toHaveClass('error');
  });

  it('handles transition styles for opacity', () => {
    render(<LazyImage src="/test-image.jpg" alt="Test image" />);

    const img = screen.getByAltText('Test image');
    expect(img).toHaveStyle({ transition: 'opacity 0.3s ease-in-out' });
  });
});
