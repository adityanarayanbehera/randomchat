// ========================================================================
// FILE: frontend/vite.config.js
// ✅ OPTIMIZED FOR FREE TIER: Maximum bundle size reduction
// ========================================================================
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  
  // ========== BUILD OPTIMIZATIONS ==========
  build: {
    // Target modern browsers for smaller bundle
    target: "es2015",
    
    // Minify aggressively
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'], // Remove specific console calls
      },
    },
    
    // Enable CSS code splitting
    cssCodeSplit: true,
    
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    
    // Manual chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks (libraries that don't change often)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'socket-vendor': ['socket.io-client'],
          'ui-vendor': ['react-hot-toast', 'lucide-react'],
          // Admin pages separate chunk (won't load for regular users)
          'admin': [
            './src/pages/admin/AdminLoginPage',
            './src/pages/admin/AdminDashboard',
            './src/pages/admin/UsersManagementPage',
            './src/pages/admin/AdminSettingsPage',
            './src/pages/admin/BanManagementPage',
            './src/pages/admin/FeedbackManagementPage',
            './src/pages/admin/GroupsManagementPage',
            './src/pages/admin/MessageCleanupPage',
            './src/pages/admin/SubscriptionManagePage',
            './src/pages/admin/SystemMonitorPage'
          ],
        },
        // Optimize file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Source maps only for errors
    sourcemap: false,
  },
  
  // ========== DEPENDENCY OPTIMIZATION ==========
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'socket.io-client',
      'zustand',
    ],
  },
});
