import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';
import 'fake-indexeddb/auto';

// Set up MSW server
export const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => {
  server.close();
});

// Mock localStorage with a simple in-memory implementation
const localStorageMock = new Map<string, string>();

vi.stubGlobal('localStorage', {
  getItem: (key: string) => localStorageMock.get(key) ?? null,
  setItem: (key: string, value: string) => localStorageMock.set(key, value),
  removeItem: (key: string) => localStorageMock.delete(key),
  clear: () => localStorageMock.clear(),
  get length() {
    return localStorageMock.size;
  },
  key: (index: number) => {
    const keys = Array.from(localStorageMock.keys());
    return keys[index] ?? null;
  },
});

// Mock sessionStorage with a simple in-memory implementation
const sessionStorageMock = new Map<string, string>();

vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => sessionStorageMock.get(key) ?? null,
  setItem: (key: string, value: string) => sessionStorageMock.set(key, value),
  removeItem: (key: string) => sessionStorageMock.delete(key),
  clear: () => sessionStorageMock.clear(),
  get length() {
    return sessionStorageMock.size;
  },
  key: (index: number) => {
    const keys = Array.from(sessionStorageMock.keys());
    return keys[index] ?? null;
  },
});

// Mock navigator.storage for File System Access API (used by media.ts)
const mockDirectoryHandle = {
  getFileHandle: vi.fn().mockResolvedValue({
    createWritable: vi.fn().mockResolvedValue({
      write: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }),
    getFile: vi.fn().mockResolvedValue(new File([], 'mock-file')),
  }),
  getDirectoryHandle: vi.fn().mockResolvedValue({
    getFileHandle: vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      getFile: vi.fn().mockResolvedValue(new File([], 'mock-file')),
    }),
    values: vi.fn().mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        // Empty iterator
      },
    }),
  }),
  values: vi.fn().mockReturnValue({
    [Symbol.asyncIterator]: async function* () {
      // Empty iterator
    },
  }),
};

vi.stubGlobal('navigator', {
  ...globalThis.navigator,
  storage: {
    getDirectory: vi.fn().mockResolvedValue(mockDirectoryHandle),
    estimate: vi.fn().mockResolvedValue({ quota: 0, usage: 0 }),
    persist: vi.fn().mockResolvedValue(true),
    persisted: vi.fn().mockResolvedValue(false),
  },
});

// Mock window.navigation (Navigation API) for router tests
const mockNavigation = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  navigate: vi
    .fn()
    .mockResolvedValue({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    }),
  back: vi
    .fn()
    .mockResolvedValue({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    }),
  forward: vi
    .fn()
    .mockResolvedValue({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    }),
  traverseTo: vi
    .fn()
    .mockResolvedValue({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    }),
  reload: vi
    .fn()
    .mockResolvedValue({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    }),
  currentEntry: {
    url: 'http://localhost:3000/',
    key: 'mock-key',
    id: 'mock-id',
    index: 0,
    sameDocument: true,
    getState: vi.fn().mockReturnValue({}),
  },
  entries: vi.fn().mockReturnValue([]),
  canGoBack: false,
  canGoForward: false,
  transition: null,
};

// Only stub if not already defined
if (!window.navigation) {
  vi.stubGlobal('navigation', mockNavigation);
  // Also add to window object
  Object.defineProperty(window, 'navigation', {
    value: mockNavigation,
    writable: true,
    configurable: true,
  });
}

// Helper to set up auth for tests
export function setupAuth(
  server = 'tech.lgbt',
  accessToken = 'mock-access-token'
) {
  localStorage.setItem('server', server);
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('token', accessToken);
}
