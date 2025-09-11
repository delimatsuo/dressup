import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator for mobile detection tests
// Note: Individual tests can override these values
if (!('maxTouchPoints' in navigator)) {
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: 0,
    writable: true,
    configurable: true, // Allow tests to override
  });
}
if (!('ontouchstart' in window)) {
  Object.defineProperty(window, 'ontouchstart', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}


// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => {
    localStorageMock.store[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete localStorageMock.store[key];
  }),
  clear: jest.fn(() => {
    localStorageMock.store = {};
  }),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  configurable: true,
  value: jest.fn((obj) => `blob:${obj.size}`),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  configurable: true,
  value: jest.fn(),
});