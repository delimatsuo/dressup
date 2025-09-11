// jest.setup.js
// Minimal mocks for Request and Response to satisfy Next.js API route testing
if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(input, init) {
      this.url = input;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
      this.json = async () => JSON.parse(this.body || '{}');
      this.formData = async () => {
        const formData = new FormData();
        const parsedBody = JSON.parse(this.body || '{}');
        for (const key in parsedBody) {
          formData.append(key, parsedBody[key]);
        }
        return formData;
      };
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class MockResponse {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
      this.json = async () => JSON.parse(this.body);
      this.text = async () => this.body;
    }
  };
}

// Polyfill for web-streams-polyfill
import { TransformStream } from 'web-streams-polyfill/ponyfill';
global.TransformStream = TransformStream;

// Mock TextEncoder and TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.crypto
const mockEncryptedData = new TextEncoder().encode(JSON.stringify([]));

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      generateKey: jest.fn().mockResolvedValue({}),
      importKey: jest.fn().mockResolvedValue({}),
      encrypt: jest.fn().mockResolvedValue(mockEncryptedData.buffer),
      decrypt: jest.fn().mockResolvedValue(mockEncryptedData.buffer),
    },
    getRandomValues: jest.fn().mockReturnValue(new Uint8Array(16)),
  },
  configurable: true,
});

// Mock IntersectionObserver
const IntersectionObserverMock = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
Object.defineProperty(global, 'IntersectionObserver', {
  value: IntersectionObserverMock,
  configurable: true,
});