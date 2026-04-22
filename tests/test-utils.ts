import { LitElement } from 'lit';
import { render } from 'lit';

/**
 * Simple fixture utility for Vitest browser mode
 * Replaces @open-wc/testing fixture for browser mode compatibility
 */

let fixtureContainer: HTMLDivElement | null = null;
let fixtureCount = 0;

function getFixtureContainer(): HTMLDivElement {
  // Create a fresh container for each fixture to avoid Lit render conflicts
  fixtureCount++;
  const container = document.createElement('div');
  container.id = `fixture-container-${fixtureCount}`;
  document.body.appendChild(container);

  // Track for cleanup
  if (!fixtureContainer) {
    fixtureContainer = container;
  }

  return container;
}

/**
 * Creates a DOM fixture from a TemplateResult or HTML string
 * Similar to @open-wc/testing fixture but works with Vitest browser mode
 */
export async function fixture<T extends HTMLElement>(
  template: ReturnType<typeof import('lit').html> | string
): Promise<T> {
  const container = getFixtureContainer();

  if (typeof template === 'string') {
    container.innerHTML = template;
  } else {
    // For Lit templates, render them
    render(template, container);
  }

  const element = container.firstElementChild as T;

  // Wait for Lit element to update
  if (element instanceof LitElement) {
    await element.updateComplete;
  }

  return element;
}

/**
 * Waits for a LitElement to complete its update cycle
 */
export async function elementUpdated(
  element: LitElement | Element
): Promise<void> {
  if ('updateComplete' in element) {
    await (element as LitElement).updateComplete;
  }
}

/**
 * Re-export html from lit for convenience
 */
export { html } from 'lit';

/**
 * Cleanup fixtures after tests - removes all fixture containers from the DOM
 */
export function cleanupFixtures(): void {
  // Remove all fixture containers
  document
    .querySelectorAll('[id^="fixture-container-"]')
    .forEach((el) => el.remove());
  fixtureContainer = null;
  fixtureCount = 0;
}
