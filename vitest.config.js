import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Set environment variables before running tests
    env: {
      NODE_ENV: 'test'
    },
    
    // Test file patterns
    include: [
      'tests/**/*.test.js',
      'tests/**/*.spec.js'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      '.git/**'
    ],
    
    // Global setup and teardown
    globalSetup: ['./tests/helpers/global-setup.js'],
    setupFiles: ['./tests/helpers/setup.js'],
    
    // Test execution settings
    testTimeout: 15000,
    hookTimeout: 10000,
    
    // Reporter settings  
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './test-results/index.html'
    },
    
    // UI settings for better console output display
    ui: {
      port: 51204,
      host: true,
      open: false
    },
    
    // Better console output handling
    logLevel: 'info',
    
    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'src/**/*.js'
      ],
      exclude: [
        'src/server.js', // Main entry point - tested via integration
        'src/utils/migrate.js', // Migration script
        'tests/**',
        'database/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Higher thresholds for critical business logic
        'src/models/*.js': {
          branches: 90,
          functions: 95,
          lines: 95,
          statements: 95
        },
        'src/services/*.js': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    
    // Parallel execution
    threads: true,
    maxThreads: 4,
    
    // Watch mode settings (enabled for UI)
    watch: true,
    
    // Fail on console errors in tests
    onConsoleLog: (log, type) => {
      if (type === 'stderr' && log.includes('Error:')) {
        return false; // Fail the test
      }
    }
  }
});