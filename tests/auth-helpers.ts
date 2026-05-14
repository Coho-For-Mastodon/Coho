// Helper to set up auth for tests.
// Kept in its own file so test files don't need to import tests/setup.ts
// directly (importing setup.ts from a test file can cause "Vitest failed to
// find the runner" in CI because the Vitest lifecycle hooks in that file run
// a second time outside of the runner's initialization phase).
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
