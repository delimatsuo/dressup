// jest.setup.api.js
// Minimal mocks for Next.js API routes in a Node.js environment

// Mock the global fetch function if it's not already defined (Node.js 18+ has it)
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    })
  );
}

// Mock Request and Response objects for Next.js API routes
// These are simplified mocks to allow NextRequest/NextResponse to be constructed
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

// Mock TextEncoder and TextDecoder if not available (Node.js 11+ has them)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock FormData if not available
if (typeof global.FormData === 'undefined') {
  global.FormData = class MockFormData {
    constructor() {
      this._data = {};
    }
    append(name, value) {
      this._data[name] = value;
    }
    // Add other FormData methods if needed by your tests
  };
}

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(global.URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'blob:mock-url'),
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
});