import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage component for lazy loading images below the fold
 * Uses Intersection Observer API for efficient loading
 * Supports WebP format with fallback to other formats
 */

interface LazyImageProps {
  src: string;
  alt: string;
  webpSrc?: string; // Optional WebP version for better compression
  className?: string;
  placeholderSrc?: string; // Low-quality placeholder for better UX
  width?: number | string;
  height?: number | string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  webpSrc,
  className = '',
  placeholderSrc,
  width,
  height,
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Use native lazy loading if supported, otherwise use Intersection Observer
    if (loading === 'eager') {
      setIsInView(true);
      return;
    }

    // Check if Intersection Observer is supported
    if (!('IntersectionObserver' in window)) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Show placeholder while loading
  const imageSrc = isInView ? src : placeholderSrc || '';

  return (
    <picture ref={imgRef}>
      {/* WebP source for modern browsers */}
      {webpSrc && isInView && (
        <source srcSet={webpSrc} type="image/webp" />
      )}
      
      {/* Fallback image */}
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          opacity: isLoaded ? 1 : 0.5,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </picture>
  );
};

export default LazyImage;
