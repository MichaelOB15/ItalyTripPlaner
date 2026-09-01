import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
  plugins: [react()],
  build: {
    // Enable code splitting and optimize bundle sizes
    rollupOptions: {
      output: {
        // Manual chunking strategy for optimal bundle sizes
        // Target: main bundle < 200KB gzipped, vendor bundle < 150KB gzipped
        manualChunks(id) {
          // Core React libraries - prioritize for main vendor bundle
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          
          // Router - keep with React core
          if (id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/@remix-run')) {
            return 'vendor-react';
          }
          
          // Leaflet and mapping libraries - heavy dependency, separate chunk
          // This will be lazy-loaded via React.lazy on MapView
          if (id.includes('node_modules/leaflet') ||
              id.includes('node_modules/react-leaflet') ||
              id.includes('node_modules/@react-leaflet')) {
            return 'vendor-map';
          }
          
          // jsPDF - lazy loaded on export
          // Already dynamically imported, but ensure it's in separate chunk
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-pdf';
          }
          
          // React DnD - used for itinerary editing
          if (id.includes('node_modules/react-dnd') ||
              id.includes('node_modules/dnd-core')) {
            return 'vendor-dnd';
          }
          
          // Utilities - axios and other common utilities
          if (id.includes('node_modules/axios')) {
            return 'vendor-utils';
          }
          
          // React Window - virtual scrolling for lists
          if (id.includes('node_modules/react-window')) {
            return 'vendor-utils';
          }
          
          // Group all other node_modules into a catch-all vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor-other';
          }
        },
        // Asset file naming with content hash for optimal caching
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          
          // Organize assets by type
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`
          } else if (/woff2?|ttf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`
          } else if (/css/i.test(ext)) {
            return `assets/css/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
        // JS chunk naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js'
      },
    },
    // Target modern browsers for better optimization
    target: 'es2015',
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'], // Remove specific console calls
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Handle Safari 10+ issues
      },
    },
    // Set chunk size warnings - targeting 200KB gzipped for main, 150KB for vendor
    chunkSizeWarningLimit: 500, // 500 KB warning threshold (uncompressed)
    
    // Asset optimization settings
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb as base64
    cssCodeSplit: true, // Enable CSS code splitting
    sourcemap: false, // Disable source maps in production
    reportCompressedSize: true, // Report compressed size (gzip)
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios'],
    // Exclude heavy deps that should be lazy loaded
    exclude: ['leaflet', 'jspdf'],
  },
  
  // Define environment-specific settings
  define: {
    // Make environment variables available at build time
    __APP_ENV__: JSON.stringify(env.VITE_ENV || mode),
  },
}
})
