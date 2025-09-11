# Testing Documentation - DressUp AI

## Overview

The DressUp AI project uses a comprehensive testing strategy with Jest and React Testing Library. Tests are separated into UI and API configurations for better organization and performance.

## Test Configuration

### Dual Configuration Setup

The project uses two separate Jest configurations:

1. **UI Tests** (`jest.config.ui.js`): 
   - Tests React components and hooks
   - Uses `jsdom` environment
   - Includes React Testing Library setup

2. **API Tests** (`jest.config.api.js`):
   - Tests API routes and backend logic
   - Uses `node` environment
   - Tests business logic and integrations

### Key Configuration Files

- `jest.config.js` - Main configuration that runs both UI and API tests
- `jest.setup.ui.js` - UI test setup with mocks for browser APIs
- `jest.setup.api.js` - API test setup with Node.js specific mocks
- `package.json` - Contains test scripts

## Running Tests

### Command Reference

```bash
# Run all tests
npm test

# Run only UI tests
npm run test:ui

# Run only API tests
npm run test:api

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a specific test file
npm test -- src/components/__tests__/GarmentGallery.test.tsx

# Clear Jest cache (if tests are behaving unexpectedly)
npm test -- --clearCache
```

## Test Coverage Status

### Current Coverage (as of latest update)
- **Overall Pass Rate**: 83.5% (96/115 tests passing)
- **Total Test Suites**: 12 (6 passing, 6 with failures)

### Component Test Status

#### ✅ Fully Passing
- `GarmentGallery` - All 8 tests passing
- `KeyboardNavigation` - All tests passing
- `MobileResultsGallery` - All tests passing
- `ResultsDisplay` - All tests passing
- `useIsMobile` hook - All 8 tests passing
- `try-on` API - All tests passing

#### ⚠️ Partially Passing
- `HomePage` - 3/7 tests passing
- `MobilePhotoUpload` - Most tests passing with minor failures
- `FeedbackSection` - Most tests passing with element query issues
- `UploadArea` - Most tests passing with async timing issues

#### ❌ Complex Integration Tests Failing
- `PhotoUploadInterface` - Complex multi-step form with file upload
- `responsive.integration` - Full application responsive behavior

## Common Test Patterns

### Component Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import ComponentName from '../ComponentName';

describe('ComponentName', () => {
  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText(/expected text/i)).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    const mockHandler = jest.fn();
    render(<ComponentName onClick={mockHandler} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import useCustomHook from '../useCustomHook';

describe('useCustomHook', () => {
  it('should return expected value', () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.value).toBe(expectedValue);
  });
});
```

### API Route Testing

```typescript
import { POST } from '@/app/api/route-name/route';

describe('API Route', () => {
  it('should handle POST request', async () => {
    const request = new Request('http://localhost/api/route-name', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

## Mock Configurations

### Browser API Mocks (jest.setup.ui.js)

The UI setup file provides mocks for:
- `window.matchMedia` - Media query support
- `navigator.maxTouchPoints` - Touch device detection
- `localStorage` - Browser storage API
- `URL.createObjectURL` - File handling
- Canvas API via `jest-canvas-mock`

### Troubleshooting Mock Issues

If touch detection tests fail:
```javascript
// Ensure proper cleanup in tests
afterEach(() => {
  delete window.ontouchstart;
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: 0,
    writable: true,
    configurable: true,
  });
});
```

## Known Issues and Solutions

### 1. SWC Syntax Errors

**Issue**: Jest fails to parse TypeScript/JSX files with SWC.

**Solution**: Ensure `@swc/jest` is installed and configured:
```json
{
  "transform": {
    "^.+\\.(t|j)sx?$": ["@swc/jest"]
  }
}
```

### 2. Multiple Elements Found

**Issue**: Tests fail with "Found multiple elements with role..."

**Solution**: Use more specific queries:
```typescript
// Instead of
screen.getByRole('button', { name: /submit/i })

// Use
const buttons = screen.getAllByRole('button');
const submitButton = buttons.find(btn => 
  btn.textContent?.includes('Submit')
);
```

### 3. Async Test Failures

**Issue**: Tests fail due to async operations not completing.

**Solution**: Use `waitFor` with appropriate timeout:
```typescript
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument();
}, { timeout: 3000 });
```

### 4. Act Warnings

**Issue**: Console warnings about wrapping in act().

**Solution**: Ensure all state updates are wrapped:
```typescript
await act(async () => {
  fireEvent.click(button);
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on others
2. **Mock External Dependencies**: Mock API calls, timers, and external services
3. **Use Semantic Queries**: Prefer queries that users would use (getByRole, getByLabelText)
4. **Test User Behavior**: Focus on testing what users do, not implementation details
5. **Keep Tests Simple**: One assertion per test when possible
6. **Use Descriptive Names**: Test names should clearly describe what is being tested

## Future Improvements

### Planned Enhancements
1. Increase coverage for integration tests
2. Add E2E tests with Playwright
3. Implement visual regression testing
4. Add performance testing for critical paths
5. Set up CI/CD test automation

### Coverage Goals
- Target: 90% overall test coverage
- Focus areas: PhotoUploadInterface, responsive behavior
- Add more edge case testing

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass before committing
3. Update this documentation for new patterns
4. Maintain consistent test structure

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Next.js Applications](https://nextjs.org/docs/testing)
- [SWC Jest Configuration](https://swc.rs/docs/usage/jest)