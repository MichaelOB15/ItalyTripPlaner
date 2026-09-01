/**
 * Image Optimization Utilities
 * 
 * Provides utilities for working with optimized images, including:
 * - WebP format detection and fallback support
 * - Image URL generation with format options
 * - Responsive image srcset generation
 */

/**
 * Check if the browser supports WebP format
 * Uses a simple approach with a 1x1 WebP data URI
 */
export const supportsWebP = (): boolean => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if support has already been determined
  const cached = sessionStorage.getItem('webp-support');
  if (cached !== null) {
    return cached === 'true';
  }

  // Create a test canvas and check if toDataURL supports WebP
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    const testWebP = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    sessionStorage.setItem('webp-support', testWebP.toString());
    return testWebP;
  }

  return false;
};

/**
 * Get the optimal image format based on browser support
 * @param webpSrc - WebP version of the image
 * @param fallbackSrc - Fallback image (JPEG/PNG)
 * @returns The appropriate image source
 */
export const getOptimalImageSrc = (webpSrc: string, fallbackSrc: string): string => {
  return supportsWebP() ? webpSrc : fallbackSrc;
};

/**
 * Generate a srcset string for responsive images
 * @param basePath - Base path without extension
 * @param extension - File extension (webp, jpg, png)
 * @param widths - Array of image widths
 * @returns srcset string
 */
export const generateSrcSet = (
  basePath: string,
  extension: string,
  widths: number[]
): string => {
  return widths
    .map((width) => `${basePath}-${width}w.${extension} ${width}w`)
    .join(', ');
};

/**
 * Image loading strategy types
 */
export type ImageLoadingStrategy = 'lazy' | 'eager' | 'auto';

/**
 * Determine the appropriate loading strategy based on image position
 * @param isBelowFold - Whether the image is below the fold
 * @param isPriority - Whether the image is high priority
 * @returns Loading strategy
 */
export const getLoadingStrategy = (
  isBelowFold: boolean,
  isPriority: boolean = false
): ImageLoadingStrategy => {
  if (isPriority) {
    return 'eager';
  }
  return isBelowFold ? 'lazy' : 'auto';
};

/**
 * Preload critical images for better performance
 * @param imageSources - Array of image sources to preload
 */
export const preloadImages = (imageSources: string[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  imageSources.forEach((src) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    
    // Add WebP type if applicable
    if (src.endsWith('.webp')) {
      link.type = 'image/webp';
    }
    
    document.head.appendChild(link);
  });
};

/**
 * Generate a low-quality image placeholder (LQIP) data URI
 * This is a mock implementation - in production, you'd generate these during build
 * @param width - Placeholder width
 * @param height - Placeholder height
 * @param color - Background color
 * @returns Data URI string
 */
export const generatePlaceholder = (
  width: number,
  height: number,
  color: string = '#f3f4f6'
): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/png', 0.1);
};

/**
 * Calculate the aspect ratio of an image
 * @param width - Image width
 * @param height - Image height
 * @returns Aspect ratio as a percentage string (for padding-bottom technique)
 */
export const calculateAspectRatio = (width: number, height: number): string => {
  return `${(height / width) * 100}%`;
};

/**
 * Image optimization configuration
 */
export interface ImageOptimizationConfig {
  enableWebP: boolean;
  lazyLoadThreshold: number; // Distance from viewport to start loading (in pixels)
  placeholderColor: string;
  preloadCriticalImages: boolean;
}

/**
 * Default optimization configuration
 */
export const defaultImageConfig: ImageOptimizationConfig = {
  enableWebP: true,
  lazyLoadThreshold: 50,
  placeholderColor: '#f3f4f6',
  preloadCriticalImages: true,
};
