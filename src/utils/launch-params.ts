export function getEffectiveParams(windowLocation: Location): URLSearchParams {
  const urlParams = new URLSearchParams(windowLocation.search);
  const effectiveParams = new URLSearchParams(urlParams);

  try {
    const launchUrl = sessionStorage.getItem('coho:launchUrl');
    if (launchUrl) {
      const launch = new URL(launchUrl, windowLocation.origin);

      // Only “fill in” missing intent params from the launch URL.
      for (const key of ['tab', 'newPost', 'name'] as const) {
        if (!effectiveParams.has(key) && launch.searchParams.has(key)) {
          const value = launch.searchParams.get(key);
          if (value != null) effectiveParams.set(key, value);
        }
      }

      // We’re now on /home; don’t let launch intent leak into later navigations.
      sessionStorage.removeItem('coho:launchUrl');
    }
  } catch {
    // sessionStorage may be unavailable in some privacy contexts; ignore.
  }

  return effectiveParams;
}
