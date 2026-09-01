import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock CSS and PostCSS imports completely
vi.mock('postcss', () => ({}));
vi.mock('autoprefixer', () => ({}));
vi.mock('tailwindcss', () => ({}));
vi.mock('@csstools/css-calc', () => ({}));
vi.mock('@asamuzakjp/css-color', () => ({}));

// Mock CSS imports to avoid loading Tailwind and PostCSS
vi.mock('*.css', () => ({}));
vi.mock('*.scss', () => ({}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});
