import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import { setupWorker } from 'msw/browser';
import { handlers } from './mocks/handlers';
import { page } from '@vitest/browser/context';

// Set up MSW worker for browser
const worker = setupWorker(...handlers);

beforeAll(async () => {
  await worker.start({ onUnhandledRequest: 'warn' });
});

afterEach(async (ctx) => {
  // Take a screenshot after every test
  const testName = ctx.task.name.replace(/[^a-zA-Z0-9]/g, '-');
  const suiteName =
    ctx.task.suite?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'unknown';
  await page.screenshot({
    path: `./tests/e2e/__screenshots__/${suiteName}/${testName}.png`,
  });

  worker.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});

afterAll(() => {
  worker.stop();
});

// In browser mode, we have real localStorage/sessionStorage - no mocking needed

// Mock navigator.storage for File System Access API (used by media.ts)
// Only mock if not available (some browsers don't have full OPFS support)
if (!navigator.storage?.getDirectory) {
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
    ...navigator,
    storage: {
      ...navigator.storage,
      getDirectory: vi.fn().mockResolvedValue(mockDirectoryHandle),
    },
  });
}

// Helper to set up auth for tests
export function setupAuth(
  server = 'tech.lgbt',
  accessToken = 'mock-access-token'
) {
  const accountId = localStorage.getItem('currentUserID') || 'self';
  localStorage.setItem('server', server);
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('token', accessToken);
  localStorage.setItem('currentUserID', accountId);
  localStorage.setItem(
    'coho:auth-session',
    JSON.stringify({
      version: 1,
      activeAccountKey: `${server}::${accountId}`,
      accounts: [
        {
          accountKey: `${server}::${accountId}`,
          server,
          accountId,
          accessToken,
          acct: 'self',
          displayName: 'Self',
          avatar: '',
          lastUsedAt: Date.now(),
        },
      ],
    })
  );
}
