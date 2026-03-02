/**
 * Widget Handlers
 *
 * Handles PWA Widget installation and rendering (Windows Widgets API).
 */

import type {
  Widget,
  WidgetInstallEvent,
  CohoServiceWorkerGlobalScope,
} from './types';

declare const self: CohoServiceWorkerGlobalScope;

/**
 * Render a widget by fetching its template and data, then updating
 * the widget through the Widgets API.
 */
export async function renderWidget(widget: Widget): Promise<void> {
  const templateUrl = widget.definition.msAcTemplate;
  const dataUrl = widget.definition.data;

  const template = await (await fetch(templateUrl)).text();
  const data = await (await fetch(dataUrl)).text();

  if (self.widgets) {
    await self.widgets.updateByTag(widget.definition.tag, { template, data });
  }
}

/**
 * Handle the `widgetinstall` event by rendering the installed widget.
 */
export function handleWidgetInstall(event: Event): void {
  const widgetEvent = event as WidgetInstallEvent;
  widgetEvent.waitUntil(renderWidget(widgetEvent.widget));
}
