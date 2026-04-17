export function isSafari(): boolean {
  const userAgent = navigator.userAgent;
  const isChrome = userAgent.indexOf('Chrome') > -1;
  const isSafari = userAgent.indexOf('Safari') > -1;

  // Chrome user agent also contains "Safari", so we must exclude it
  return isSafari && !isChrome;
}

export function isFirefox(): boolean {
  return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
}
