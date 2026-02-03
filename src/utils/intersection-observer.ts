export const DEFAULT_INTERSECTION_OBSERVER_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: '0px',
  threshold: 0.1,
};

export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) =>
  new IntersectionObserver(callback, {
    ...DEFAULT_INTERSECTION_OBSERVER_OPTIONS,
    ...options,
  });

export const disconnectIntersectionObserver = (
  observer?: IntersectionObserver | null
) => {
  observer?.disconnect();
};
