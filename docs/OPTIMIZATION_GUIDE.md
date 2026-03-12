# Code Optimization Guide

This guide documents the optimizations made to the codebase and provides instructions for using the new features.

## Table of Contents

1. [Testing Framework](#testing-framework)
2. [TypeScript Configuration](#typescript-configuration)
3. [Error Handling](#error-handling)
4. [Performance Monitoring](#performance-monitoring)
5. [State Management](#state-management)
6. [Common Utilities](#common-utilities)
7. [Migration Guide](#migration-guide)

---

## Testing Framework

### Overview
We've added comprehensive testing support using Jest and Testing Library.

### Installation
The following packages have been added:
- `jest` - Testing framework
- `@testing-library/dom` - DOM testing utilities
- `@testing-library/jest-dom` - Custom Jest matchers
- `jest-environment-jsdom` - DOM environment for Jest

### Configuration Files
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test setup and mocks
- `.babelrc` - Babel configuration for Jest

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- utils.test.js

# Run tests in CI mode
npm run test:ci
```

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── utils.test.js
│   ├── translations.test.js
│   └── app.test.js
├── integration/       # Integration tests (to be added)
│   └── app.test.js
└── __fixtures__/      # Test fixtures
    └── data.js
```

### Writing Tests

#### Unit Tests

```javascript
describe('Utility Function', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('output');
  });
});
```

#### Integration Tests

```javascript
describe('App Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('should initialize app correctly', async () => {
    const app = new App();
    await app.initialize();
    expect(app.initialized).toBe(true);
  });
});
```

### Coverage Goals

- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

---

## TypeScript Configuration

### Overview
TypeScript configuration has been added to improve type safety and developer experience.

### Configuration File
- `tsconfig.json` - TypeScript compiler configuration
- `src/types/index.d.ts` - Type definitions

### Type Definitions

Key types include:
- `Module` - App module interface
- `UserActivityState` - User activity tracking
- `Translations` - Translation data structure
- `Product` - Product data structure
- `LanguageCode` - Supported language codes
- `ErrorHandlerOptions` - Error handler options
- `ToastOptions` - Toast notification options

### Using TypeScript

You can now add type annotations to your JavaScript using JSDoc:

```javascript
/**
 * @param {string} name - User name
 * @param {number} age - User age
 * @returns {Object} User object
 */
function createUser(name, age) {
  return { name, age };
}
```

---

## Error Handling

### Overview
A centralized error handling system has been implemented with user-friendly messages and error reporting.

### Features
- Error severity classification (LOW, MEDIUM, HIGH, CRITICAL)
- Error type categorization (NETWORK, VALIDATION, AUTHENTICATION, etc.)
- User-friendly error messages
- Error queue management
- Sentry integration support
- Global error handlers

### Usage

#### Basic Error Handling

```javascript
import { ErrorHandler } from './assets/error-handler.js';

try {
  // Your code
} catch (error) {
  ErrorHandler.handle(error, {
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.HIGH,
    context: 'Data Fetch',
    showToast: true,
  });
}
```

#### Async Error Wrapping

```javascript
import { ErrorHandler } from './assets/error-handler.js';

const result = await ErrorHandler.wrapAsync(
  async () => {
    const data = await fetchData();
    return data;
  },
  {
    context: 'Fetch Data',
    showToast: true,
    fallback: null,
  }
);
```

#### Configure Sentry

```javascript
import { errorHandler } from './assets/error-handler.js';

errorHandler.configure({
  sentryDsn: 'YOUR_SENTRY_DSN',
  reportingEnabled: true,
});
```

### Error Severity Levels

- **LOW**: Warnings and non-critical issues
- **MEDIUM**: Degraded functionality
- **HIGH**: Errors affecting core functionality
- **CRITICAL**: Fatal errors requiring immediate attention

### Error Types

- NETWORK: Network-related errors
- VALIDATION: Input validation errors
- AUTHENTICATION: Authentication failures
- AUTHORIZATION: Permission errors
- NOT_FOUND: Resource not found
- SERVER: Server-side errors
- CLIENT: Client-side errors
- UNKNOWN: Uncategorized errors

---

## Performance Monitoring

### Overview
A comprehensive performance monitoring system has been implemented using Web Vitals API.

### Features
- Core Web Vitals tracking (LCP, FID, CLS, FCP, TTFB)
- Performance rating (good, needs-improvement, poor)
- Resource timing analysis
- Custom performance measurements
- Sentry integration support

### Usage

#### Initialize Performance Monitoring

```javascript
import { performanceMonitor } from './assets/performance-monitor.js';

// Performance monitoring starts automatically on page load
// You can configure it:

performanceMonitor.configure({
  enabled: true,
  reportingEnabled: true,
});
```

#### Get Performance Metrics

```javascript
// Get all metrics
const metrics = performanceMonitor.getMetrics();

// Get metrics by type
const lcpMetrics = performanceMonitor.getMetricsByType(MetricType.LCP);

// Get latest metric
const latestLCP = performanceMonitor.getLatestMetric(MetricType.LCP);

// Get performance summary
const summary = performanceMonitor.getSummary();
```

#### Custom Performance Measurements

```javascript
import { PerformanceMonitor } from './assets/performance-monitor.js';

// Mark performance point
PerformanceMonitor.mark('operation-start');

// Your code here

// Measure duration
PerformanceMonitor.mark('operation-end');
PerformanceMonitor.measure('operation', 'operation-start', 'operation-end');
```

#### Get Slow Resources

```javascript
// Get resources taking longer than 2 seconds
const slowResources = performanceMonitor.getSlowResources(2000);
```

### Performance Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|-------|------------------|-------|
| LCP | < 2.5s | 2.5s - 4s | > 4s |
| FID | < 100ms | 100ms - 300ms | > 300ms |
| FCP | < 1.8s | 1.8s - 3s | > 3s |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| TTFB | < 800ms | 800ms - 1.8s | > 1.8s |

---

## State Management

### Overview
A lightweight state management system has been implemented with a Zustand-like API.

### Features
- Centralized state management
- Subscription-based updates
- TypeScript support
- LocalStorage persistence
- Optimized performance

### Stores

#### User Activity Store
```javascript
import { userActivityStore, updateUserActivity } from './assets/store.js';

// Get state
const activity = userActivityStore.getState();

// Update state
updateUserActivity({
  scrollDepth: 50,
  productViews: ['prod1', 'prod2'],
});

// Subscribe to changes
const unsubscribe = userActivityStore.subscribe((state) => {
  console.log('Activity updated:', state);
});
```

#### App Store
```javascript
import { appStore, setAppLanguage } from './assets/store.js';

// Get language
const language = appStore.get('language');

// Set language
setAppLanguage('en');
```

#### Form Store
```javascript
import { formStore, startFormSubmit, setFormSuccess, setFormError } from './assets/store.js';

// Start submission
startFormSubmit();

// Success
setFormSuccess({ id: '123' });

// Error
setFormError('Submission failed');
```

#### UI Store
```javascript
import { uiStore, showToast, hideToast } from './assets/store.js';

// Show toast
showToast('Message saved', 'success', 3000);

// Hide toast
hideToast();
```

#### Product Store
```javascript
import { productStore, setCurrentProduct, addFavoriteProduct } from './assets/store.js';

// Set current product
setCurrentProduct(productData);

// Add to favorites
addFavoriteProduct('prod123');
```

### Store API

#### Methods

```javascript
// Get entire state
store.getState()

// Get specific value
store.get(key)

// Set state
store.set({ key: value })
store.set((state) => ({ ...state, key: value }))

// Update specific key
store.update(key, value)

// Subscribe to changes
const unsubscribe = store.subscribe((state) => {
  // Handle state change
})

// Reset state
store.reset(initialState)

// Clear all listeners
store.clearListeners()
```

### Automatic Persistence

State is automatically saved to localStorage every 30 seconds and before page unload.

---

## Common Utilities

### Overview
Common utility functions have been extracted to reduce code duplication.

### Categories

#### Data Manipulation
- `deepClone` - Deep clone objects
- `isEmpty` - Check if object/array/string is empty
- `get` - Get value from object by path
- `set` - Set value in object by path

#### Validation
- `isValidEmail` - Validate email addresses
- `isValidPhone` - Validate phone numbers

#### Formatting
- `formatCurrency` - Format numbers as currency
- `formatDate` - Format dates
- `formatNumber` - Format numbers with thousand separator

#### DOM Utilities
- `isInViewport` - Check if element is in viewport
- `isPartiallyInViewport` - Check if element is partially in viewport
- `getScrollPercentage` - Get scroll percentage
- `scrollToElement` - Smooth scroll to element

#### Array Utilities
- `arraysEqual` - Compare arrays
- `mergeUniqueArrays` - Merge arrays without duplicates
- `removeDuplicates` - Remove duplicates from array
- `groupBy` - Group array by key
- `sortBy` - Sort array by key

#### Async Utilities
- `sleep` - Sleep for specified duration
- `retry` - Retry function with exponential backoff

#### Storage Utilities
- `storage` - LocalStorage helpers (get, set, remove, clear)
- `sessionStorage` - SessionStorage helpers (get, set, remove, clear)

#### Device Detection
- `isMobile` - Check if device is mobile
- `isTablet` - Check if device is tablet
- `isDesktop` - Check if device is desktop
- `getDeviceType` - Get device type
- `detectBrowser` - Detect browser
- `detectOS` - Detect OS
- `getBrowserLanguage` - Get language from browser

#### Other Utilities
- `debounce` - Debounce function execution
- `throttle` - Throttle function execution
- `escapeHtml` - Escape HTML special characters
- `copyToClipboard` - Copy text to clipboard
- `downloadFile` - Download file
- `generateId` - Generate unique ID
- `parseQueryString` - Parse query string
- `buildQueryString` - Build query string

### Usage Examples

```javascript
import {
  debounce,
  throttle,
  escapeHtml,
  formatCurrency,
  storage,
  copyToClipboard,
} from './assets/common.js';

// Debounce input handler
const debouncedInput = debounce((value) => {
  console.log('Input:', value);
}, 300);

// Throttle scroll handler
const throttledScroll = throttle(() => {
  console.log('Scrolled');
}, 100);

// Escape HTML
const safeHtml = escapeHtml('<script>alert("xss")</script>');

// Format currency
const price = formatCurrency(1234.56, 'CNY');

// Local storage
storage.set('user', { name: 'John' });
const user = storage.get('user');

// Copy to clipboard
await copyToClipboard('Text to copy');
```

---

## Migration Guide

### From LocalStorage to Store

**Before:**
```javascript
// Direct localStorage access
const language = localStorage.getItem('userLanguage');
localStorage.setItem('userLanguage', 'en');
```

**After:**
```javascript
import { appStore } from './assets/store.js';

// Using store
const language = appStore.get('language');
appStore.update('language', 'en');

// Or use helper function
import { setAppLanguage } from './assets/store.js';
setAppLanguage('en');
```

### From Console.log to ErrorHandler

**Before:**
```javascript
try {
  // Your code
} catch (error) {
  console.error('Error:', error);
}
```

**After:**
```javascript
import { ErrorHandler } from './assets/error-handler.js';

try {
  // Your code
} catch (error) {
  ErrorHandler.handle(error, {
    context: 'Operation Name',
    showToast: true,
  });
}
```

### From Duplicated Utils to Common Utilities

**Before:**
```javascript
// Duplicated debounce in multiple files
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
```

**After:**
```javascript
import { debounce } from './assets/common.js';

const debouncedFn = debounce(myFunction, 300);
```

---

## Best Practices

### Error Handling

1. Always wrap async operations in try-catch
2. Use ErrorHandler for consistent error reporting
3. Provide context for better debugging
4. Show user-friendly messages when appropriate

```javascript
try {
  const data = await fetchData();
  // Process data
} catch (error) {
  ErrorHandler.handle(error, {
    type: ErrorType.NETWORK,
    context: 'Fetch Data',
    showToast: true,
  });
}
```

### State Management

1. Use stores for global state
2. Keep local state in components
3. Subscribe only when needed
4. Unsubscribe when component unmounts

```javascript
// Subscribe to store changes
const unsubscribe = store.subscribe((state) => {
  // Update UI based on state
});

// Unsubscribe when done
unsubscribe();
```

### Performance Monitoring

1. Use custom measurements for critical paths
2. Monitor slow resources
3. Track Core Web Vitals
4. Use performance data to guide optimizations

```javascript
// Mark operation start
PerformanceMonitor.mark('operation-start');

// Your code

// Measure duration
PerformanceMonitor.mark('operation-end');
PerformanceMonitor.measure('operation', 'operation-start', 'operation-end');
```

### Testing

1. Write tests for new features
2. Maintain coverage above 60%
3. Run tests before committing
4. Use descriptive test names

```javascript
describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

---

## Troubleshooting

### Tests Failing

```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests in verbose mode
npm test -- --verbose
```

### TypeScript Errors

```bash
# Check TypeScript configuration
cat tsconfig.json

# Verify type definitions
ls src/types/
```

### State Not Persisting

```javascript
// Check if stores are initialized
import { initializeStores } from './assets/store.js';
initializeStores();

// Check localStorage
console.log(localStorage.getItem('userActivity'));
```

### Performance Metrics Not Showing

```javascript
// Check if performance monitor is enabled
import { performanceMonitor } from './assets/performance-monitor.js';
performanceMonitor.configure({
  enabled: true,
  reportingEnabled: true,
});
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library Documentation](https://testing-library.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Web Vitals](https://web.dev/vitals/)
- [Sentry Documentation](https://docs.sentry.io/)

---

## Changelog

### Version 1.1.0 (2026-03-12)

**Added:**
- Jest testing framework with full configuration
- TypeScript configuration and type definitions
- Centralized error handling system
- Performance monitoring with Web Vitals
- Lightweight state management system
- Common utilities library
- Sentry integration modules

**Improved:**
- Code organization and maintainability
- Error handling consistency
- Performance tracking capabilities
- Type safety with JSDoc annotations

**Fixed:**
- Code duplication issues
- Missing error handling in async operations
- Lack of performance monitoring
- Inconsistent state management

---

For questions or issues, please refer to the project documentation or contact the development team.
