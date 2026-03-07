export function createReloadTrampolineUrl(targetPath: string): string {
  return `/reload.html?target=${encodeURIComponent(targetPath)}`;
}

export function reloadWindow(): void {
  const targetPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(createReloadTrampolineUrl(targetPath));
}
