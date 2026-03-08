function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) {
      return true;
    }
  }

  return false;
}

export function sanitizeReloadTarget(targetPath: string | null): string {
  if (!targetPath) {
    return '/';
  }

  const candidate = targetPath.trim();

  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    hasControlCharacters(candidate)
  ) {
    return '/';
  }

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) {
      return '/';
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export function createReloadTrampolineUrl(targetPath: string): string {
  const safeTarget = sanitizeReloadTarget(targetPath);
  return `/reload.html?target=${encodeURIComponent(safeTarget)}`;
}

export function reloadWindow(): void {
  const targetPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(createReloadTrampolineUrl(targetPath));
}
