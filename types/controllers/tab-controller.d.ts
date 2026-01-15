import { ReactiveController, ReactiveControllerHost } from 'lit';
import { TabChangeEvent } from '../types/events';
export declare class TabController implements ReactiveController {
  private host;
  activeTab: string;
  tabsOrientation: 'horizontal' | 'vertical';
  tabsPlacement: 'top' | 'bottom' | 'start' | 'end';
  private _wasOnHomeTab;
  constructor(host: ReactiveControllerHost);
  hostConnected(): void;
  hostDisconnected(): void;
  private handleMediaChange;
  /**
   * Switch to a tab by name - shared logic for programmatic and user-initiated tab changes
   */
  switchToTab(
    name: string,
    resetHomeTracking?: boolean,
    loadCallback?: (name: string) => Promise<void>,
    sideEffectsCallback?: (name: string) => Promise<void>
  ): Promise<void>;
  openATab(
    name: string,
    loadCallback?: (name: string) => Promise<void>,
    sideEffectsCallback?: (name: string) => Promise<void>
  ): Promise<void>;
  handleTabChange(
    event: TabChangeEvent,
    loadCallback?: (name: string) => Promise<void>,
    sideEffectsCallback?: (name: string) => Promise<void>
  ): Promise<void>;
  reloadHome(refreshCallback?: () => void): void;
}
