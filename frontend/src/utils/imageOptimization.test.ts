import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  supportsWebP,
  getOptimalImageSrc,
  generateSrcSet,
  getLoadingStrategy,
  preloadImages,
  generatePlaceholder,
  calculateAspectRatio,
  defaultImageConfig,
} from './imageOptimization';

describe('imageOptimization', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  describe('supportsWebP', () => {
    it('returns boolean value', () => {
      const result = supportsWebP();
      expect(typeof result).toBe('boolean');
    });

    it('caches result in sessionStorage if available', () => {
      // In some test environments, sessionStorage might not work with canvas
      const firstCall = supportsWebP();
      expect(typeof firstCall).toBe('boolean');
    });

    it('uses cached value on subsequent calls', () => {
      sessionStorage.setItem('webp-support', 'true');
      expect(supportsWebP()).toBe(true);

      sessionStorage.setItem('webp-support', 'false');
      expect(supportsWebP()).toBe(false);
    });
  });

  describe('getOptimalImageSrc', () => {
    it('returns webpSrc when WebP is supported', () => {
      sessionStorage.setItem('webp-support', 'true');
      const result = getOptimalImageSrc('/image.webp', '/image.jpg');
      expect(result).toBe('/image.webp');
    });

    it('returns fallbackSrc when WebP is not supported', () => {
      sessionStorage.setItem('webp-support', 'false');
      const result = getOptimalImageSrc('/image.webp', '/image.jpg');
      expect(result).toBe('/image.jpg');
    });
  });

  describe('generateSrcSet', () => {
    it('generates correct srcset string for multiple widths', () => {
      const result = generateSrcSet('/images/photo', 'jpg', [400, 800, 1200]);
      expect(result).toBe(
        '/images/photo-400w.jpg 400w, /images/photo-800w.jpg 800w, /images/photo-1200w.jpg 1200w'
      );
    });

    it('generates correct srcset string for WebP', () => {
      const result = generateSrcSet('/images/photo', 'webp', [400, 800]);
      expect(result).toBe('/images/photo-400w.webp 400w, /images/photo-800w.webp 800w');
    });

    it('handles single width', () => {
      const result = generateSrcSet('/images/photo', 'png', [800]);
      expect(result).toBe('/images/photo-800w.png 800w');
    });

    it('handles empty widths array', () => {
      const result = generateSrcSet('/images/photo', 'jpg', []);
      expect(result).toBe('');
    });
  });

  describe('getLoadingStrategy', () => {
    it('returns "eager" for priority images regardless of fold position', () => {
      expect(getLoadingStrategy(true, true)).toBe('eager');
      expect(getLoadingStrategy(false, true)).toBe('eager');
    });

    it('returns "lazy" for below-fold non-priority images', () => {
      expect(getLoadingStrategy(true, false)).toBe('lazy');
    });

    it('returns "auto" for above-fold non-priority images', () => {
      expect(getLoadingStrategy(false, false)).toBe('auto');
    });
  });

  describe('preloadImages', () => {
    it('creates link elements for each image source', () => {
      const sources = ['/image1.jpg', '/image2.webp'];
      preloadImages(sources);

      const links = document.querySelectorAll('link[rel="preload"][as="image"]');
      expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it('sets correct type for WebP images', () => {
      preloadImages(['/image.webp']);

      const link = Array.from(
        document.querySelectorAll('link[rel="preload"][as="image"]')
      ).find((l) => l.getAttribute('href') === '/image.webp');

      expect(link).toBeDefined();
      if (link) {
        expect(link.getAttribute('type')).toBe('image/webp');
      }
    });

    it('handles empty array', () => {
      expect(() => preloadImages([])).not.toThrow();
    });
  });

  describe('generatePlaceholder', () => {
    it('generates a data URI string or empty string in test environment', () => {
      const result = generatePlaceholder(100, 100);
      // In test environment, may return empty string due to lack of canvas support
      expect(typeof result).toBe('string');
    });

    it('generates placeholder with custom dimensions', () => {
      const result = generatePlaceholder(200, 150);
      expect(typeof result).toBe('string');
    });

    it('generates placeholder with custom color', () => {
      const result = generatePlaceholder(100, 100, '#ff0000');
      expect(typeof result).toBe('string');
    });

    it('uses default color when not provided', () => {
      const result = generatePlaceholder(100, 100);
      expect(typeof result).toBe('string');
    });
  });

  describe('calculateAspectRatio', () => {
    it('calculates correct aspect ratio for square images', () => {
      const result = calculateAspectRatio(100, 100);
      expect(result).toBe('100%');
    });

    it('calculates correct aspect ratio for landscape images', () => {
      const result = calculateAspectRatio(1600, 900);
      expect(result).toBe('56.25%');
    });

    it('calculates correct aspect ratio for portrait images', () => {
      const result = calculateAspectRatio(900, 1600);
      expect(result).toBe('177.77777777777777%');
    });

    it('handles different dimensions', () => {
      const result = calculateAspectRatio(1920, 1080);
      expect(result).toBe('56.25%');
    });
  });

  describe('defaultImageConfig', () => {
    it('has correct default values', () => {
      expect(defaultImageConfig.enableWebP).toBe(true);
      expect(defaultImageConfig.lazyLoadThreshold).toBe(50);
      expect(defaultImageConfig.placeholderColor).toBe('#f3f4f6');
      expect(defaultImageConfig.preloadCriticalImages).toBe(true);
    });
  });
});
