/**
 * Performance instrumentation for Coho.
 *
 * Sets up PerformanceObserver-based automatic metrics (LCP, FCP, CLS, INP,
 * long tasks, navigation timing, slow resources) and exports helpers for
 * manual marks/measures at critical user-story boundaries.
 *
 * All output goes to the browser console with a consistent `[perf]` prefix
 * so it's easy to filter — useful for self-debugging and asking users to
 * share their console logs when reporting perf issues.
 *
 * Every observer is in its own try/catch so unsupported entry types
 * (e.g., `longtask` in Firefox, `soft-navigation` behind a Chrome flag)
 * degrade gracefully without breaking anything.
 */

// ─── Shared logger ──────────────────────────────────────────────────────────

const PREFIX = '%c[perf]%c';
const LABEL_STYLE = 'color:#7c4dff;font-weight:bold';
const RESET_STYLE = 'color:inherit;font-weight:normal';

const WARN_STYLE = 'color:#ff6d00;font-weight:bold';
const ERROR_STYLE = 'color:#d50000;font-weight:bold';

export const PERF_OBSERVER_DEVTOOLS_FLAG = '__COHO_ENABLE_PERF_OBSERVER__';
export const PERF_OBSERVER_STORAGE_KEY = 'coho:enablePerfObserver';

function isPersistentPerfFlagEnabled(): boolean {
  try {
    return localStorage.getItem(PERF_OBSERVER_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isPerfInstrumentationEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window[PERF_OBSERVER_DEVTOOLS_FLAG] === true ||
    isPersistentPerfFlagEnabled()
  );
}

function log(message: string, ...args: unknown[]) {
  console.debug(PREFIX + ' ' + message, LABEL_STYLE, RESET_STYLE, ...args);
}

function warn(message: string, ...args: unknown[]) {
  console.warn(PREFIX + ' ' + message, WARN_STYLE, RESET_STYLE, ...args);
}

// ─── Manual mark / measure helpers ──────────────────────────────────────────

/**
 * Place a named performance mark.
 * Safe to call at any time — silently no-ops if the Performance API is absent.
 */
export function perfMark(name: string): void {
  if (!isPerfInstrumentationEnabled()) return;

  try {
    performance.mark(name);
  } catch {
    // Silently ignore
  }
}

/**
 * Measure the duration between two marks and log the result.
 * @param label  Human-readable label shown in the console
 * @param start  Name of the start mark (created with perfMark)
 * @param end    Name of the end mark (created with perfMark). If omitted the
 *               measurement ends at "now".
 */
export function perfMeasure(label: string, start: string, end?: string): void {
  if (!isPerfInstrumentationEnabled()) return;

  try {
    const measure = end
      ? performance.measure(label, start, end)
      : performance.measure(label, start);
    const ms = measure.duration.toFixed(1);

    // Colour-code by duration bucket
    if (measure.duration > 3000) {
      console.warn(
        PREFIX + ` ${label}: %c${ms} ms`,
        WARN_STYLE,
        RESET_STYLE,
        ERROR_STYLE,
        ''
      );
    } else if (measure.duration > 1000) {
      warn(`${label}: ${ms} ms`);
    } else {
      log(`${label}: ${ms} ms`);
    }
  } catch {
    // Marks may not exist yet (e.g., observer never fired)
  }
}

// ─── Automatic PerformanceObserver setup ────────────────────────────────────

let initialized = false;

/**
 * Initialise all PerformanceObserver listeners.
 * Call once, early in app bootstrap. Safe to call multiple times — subsequent
 * calls are no-ops.
 */
export function initPerfObserver(): void {
  if (
    initialized ||
    !isPerfInstrumentationEnabled() ||
    typeof PerformanceObserver === 'undefined'
  )
    return;
  initialized = true;

  _observeLCP();
  _observeFCP();
  _observeNavigationTiming();
  _observeLongTasks();
  _observeCLS();
  _observeInteractions();
}

// ── LCP ─────────────────────────────────────────────────────────────────────
function _observeLCP() {
  try {
    let latestLcp: PerformanceEntry | null = null;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        latestLcp = entry;
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });

    // LCP is finalised when the user interacts or when the page hides.
    // We log the latest candidate at that point.
    const report = () => {
      if (!latestLcp) return;
      const lcp = latestLcp as PerformanceEntry & {
        startTime: number;
        size?: number;
        element?: Element | null;
        url?: string;
      };
      const ms = lcp.startTime.toFixed(1);
      const el = lcp.element
        ? `<${lcp.element.tagName.toLowerCase()}${lcp.element.id ? '#' + lcp.element.id : ''}>`
        : 'unknown';
      const size = lcp.size ? ` ${lcp.size}px²` : '';
      const url = lcp.url ? ` url:${lcp.url}` : '';
      log(`LCP: ${ms} ms  element:${el}${size}${url}`);
      observer.disconnect();
    };

    ['visibilitychange', 'keydown', 'click', 'pointerdown'].forEach((evt) =>
      document.addEventListener(evt, report, { once: true, capture: true })
    );
  } catch {
    /* unsupported */
  }
}

// ── FCP ─────────────────────────────────────────────────────────────────────
function _observeFCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          log(`FCP: ${entry.startTime.toFixed(1)} ms`);
          observer.disconnect();
        }
      }
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    /* unsupported */
  }
}

// ── Navigation timing (TTFB / DOM interactive / load) ───────────────────────
function _observeNavigationTiming() {
  try {
    const report = (entry: PerformanceNavigationTiming) => {
      const ttfb = (entry.responseStart - entry.startTime).toFixed(1);
      const domInteractive = (entry.domInteractive - entry.startTime).toFixed(
        1
      );
      const load = (entry.loadEventEnd - entry.startTime).toFixed(1);
      const transferKb = entry.transferSize
        ? ` transfer:${(entry.transferSize / 1024).toFixed(1)} KB`
        : '';
      log(
        `Navigation timing  TTFB:${ttfb} ms  domInteractive:${domInteractive} ms  load:${load} ms${transferKb}`
      );
    };

    // Try buffered observer first (Chrome 80+), fall back to getEntriesByType
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        report(entry as PerformanceNavigationTiming);
        observer.disconnect();
      }
    });
    observer.observe({ type: 'navigation', buffered: true });
  } catch {
    // Fallback: read after load
    try {
      const nav = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (nav) {
        window.addEventListener(
          'load',
          () => {
            const ttfb = (nav.responseStart - nav.startTime).toFixed(1);
            const domInteractive = (nav.domInteractive - nav.startTime).toFixed(
              1
            );
            log(
              `Navigation timing  TTFB:${ttfb} ms  domInteractive:${domInteractive} ms`
            );
          },
          { once: true }
        );
      }
    } catch {
      /* nothing */
    }
  }
}

// ── Long tasks ───────────────────────────────────────────────────────────────
function _observeLongTasks() {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const taskEntry = entry as PerformanceEntry & {
          attribution?: Array<{
            containerName?: string;
            containerSrc?: string;
            name?: string;
          }>;
        };
        const ms = entry.duration.toFixed(1);
        const attr = taskEntry.attribution?.[0];
        const where =
          attr?.containerName || attr?.containerSrc || attr?.name || 'unknown';
        warn(`Long task: ${ms} ms  (${where})`);
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    /* unsupported (e.g. Firefox, Safari) */
  }
}

// ── CLS ──────────────────────────────────────────────────────────────────────
function _observeCLS() {
  try {
    let cumulativeCls = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput?: boolean;
          value?: number;
          sources?: Array<{ node?: Node }>;
        };
        if (shift.hadRecentInput) continue; // Ignore user-initiated shifts
        const value = shift.value ?? 0;
        cumulativeCls += value;

        const sourceEl =
          shift.sources?.[0]?.node instanceof Element
            ? `<${(shift.sources[0].node as Element).tagName.toLowerCase()}>`
            : 'unknown';
        warn(
          `CLS shift: +${value.toFixed(4)}  cumulative:${cumulativeCls.toFixed(4)}  source:${sourceEl}`
        );
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* unsupported */
  }
}

// ── INP / Interaction responsiveness ─────────────────────────────────────────
function _observeInteractions() {
  try {
    const SLOW_THRESHOLD_MS = 200;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration >= SLOW_THRESHOLD_MS) {
          const eventEntry = entry as PerformanceEntry & {
            processingStart?: number;
            processingEnd?: number;
          };
          const inputDelay = eventEntry.processingStart
            ? (eventEntry.processingStart - entry.startTime).toFixed(1)
            : '?';
          const processingTime =
            eventEntry.processingStart && eventEntry.processingEnd
              ? (eventEntry.processingEnd - eventEntry.processingStart).toFixed(
                  1
                )
              : '?';
          warn(
            `Slow interaction: ${entry.name}  total:${entry.duration.toFixed(1)} ms  inputDelay:${inputDelay} ms  processing:${processingTime} ms`
          );
        }
      }
    });
    observer.observe({
      type: 'event',
      durationThreshold: 16,
      buffered: true,
    } as PerformanceObserverInit);
  } catch {
    /* unsupported */
  }
}
