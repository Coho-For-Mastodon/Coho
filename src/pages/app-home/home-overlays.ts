import { html, type TemplateResult } from 'lit';
import { msg } from '@lit/localize';
import type { Post } from '../../interfaces/Post';
import type { Account } from '../../mastodon/types/account';
import type { Instance } from '../../mastodon/types/instance';
import type { ColorChosenEvent } from '../../types/events';

export interface RightClickMenuProps {
  rightClickLoaded: boolean;
  onNewPost: () => void;
  onOpenTab: (tabName: string) => void;
}

export function renderRightClickMenu(
  p: RightClickMenuProps
): TemplateResult | null {
  if (!p.rightClickLoaded) return null;

  return html`
    <right-click>
      <md-menu>
        <md-menu-item @menu-item-click=${() => p.onNewPost()}>
          <md-icon slot="prefix" name="add"></md-icon>
          ${msg('New Post')}
        </md-menu-item>

        <md-menu-item @click="${() => p.onOpenTab('search')}">
          <md-icon slot="prefix" name="search"></md-icon>
          ${msg('Explore')}
        </md-menu-item>
        <md-menu-item @click="${() => p.onOpenTab('notifications')}">
          <md-icon slot="prefix" name="notifications"></md-icon>
          ${msg('Notifications')}
        </md-menu-item>
        <md-menu-item @click="${() => p.onOpenTab('messages')}">
          <md-icon slot="prefix" name="chatbox"></md-icon>
          ${msg('Messages')}
        </md-menu-item>
        <md-menu-item @click="${() => p.onOpenTab('bookmarks')}">
          <md-icon slot="prefix" name="bookmark"></md-icon>
          ${msg('Saved')}
        </md-menu-item>
        <md-menu-item @click="${() => p.onOpenTab('faves')}">
          <md-icon slot="prefix" name="heart"></md-icon>
          ${msg('Favorites')}
        </md-menu-item>
      </md-menu>
    </right-click>
  `;
}

export interface InstallDialogProps {
  isDialogVisible: boolean;
  onHide: () => void;
  onDismiss: () => void;
  onSuccess: () => void;
}

export function renderInstallOverlay(p: InstallDialogProps): TemplateResult {
  if (p.isDialogVisible) {
    return html`
      <md-dialog
        id="install-dialog"
        .label="${msg('Install Coho')}"
        @md-dialog-hide="${() => p.onHide()}"
      >
        <pwa-install
          @pwa-install-dismiss="${() => p.onDismiss()}"
          @pwa-install-success="${() => p.onSuccess()}"
          @pwa-installed="${() => p.onSuccess()}"
        ></pwa-install>
      </md-dialog>
    `;
  }

  return html`
    <pwa-install
      style="display: none;"
      @pwa-install-dismiss="${() => p.onDismiss()}"
      @pwa-install-success="${() => p.onSuccess()}"
      @pwa-installed="${() => p.onSuccess()}"
    ></pwa-install>
  `;
}

export interface SettingsDrawerProps {
  user: Account | null;
  instanceInfo: Instance | null;
  wellnessMode: boolean;
  dataSaverMode: boolean;
  hapticsEnabled: boolean;
  appThemeLoaded: boolean;
  onHide: () => void;
  onWellnessChange: (checked: boolean) => void;
  onDataSaverChange: (checked: boolean) => void;
  onHapticsChange: (checked: boolean) => void;
  onOpenFilters: () => void;
  onOpenScheduledStatuses: () => void;
  onColorChosen: (event: ColorChosenEvent) => void;
}

export function renderSettingsDrawer(p: SettingsDrawerProps): TemplateResult {
  return html`
    <otter-drawer
      id="settings-drawer"
      placement="end"
      .label="${msg('Settings')}"
      @otter-hide="${() => p.onHide()}"
    >
      <settings-drawer-content
        .user="${p.user}"
        .instanceInfo="${p.instanceInfo}"
        .wellnessMode="${p.wellnessMode}"
        .dataSaverMode="${p.dataSaverMode}"
        .hapticsEnabled="${p.hapticsEnabled}"
        .appThemeLoaded="${p.appThemeLoaded}"
        @wellness-change="${(e: CustomEvent<{ checked: boolean }>) =>
          p.onWellnessChange(e.detail.checked)}"
        @data-saver-change="${(e: CustomEvent<{ checked: boolean }>) =>
          p.onDataSaverChange(e.detail.checked)}"
        @haptics-change="${(e: CustomEvent<{ checked: boolean }>) =>
          p.onHapticsChange(e.detail.checked)}"
        @open-filters="${() => p.onOpenFilters()}"
        @open-scheduled-statuses="${() => p.onOpenScheduledStatuses()}"
        @color-chosen="${(e: ColorChosenEvent) => p.onColorChosen(e)}"
      ></settings-drawer-content>
    </otter-drawer>
  `;
}

export interface RepliesDrawerProps {
  replies: Post[];
  onHide: () => void;
}

export function renderRepliesDrawer(p: RepliesDrawerProps): TemplateResult {
  return html`
    <otter-drawer
      id="replies-drawer"
      placement="end"
      .label="${msg('Comments')}"
      @otter-hide="${() => p.onHide()}"
    >
      ${
        p.replies.length > 0
          ? html`<ul>
              ${p.replies.map((reply) => {
                return html`
                  <timeline-item
                    ?show="${false}"
                    .tweet="${reply}"
                  ></timeline-item>
                `;
              })}
            </ul>`
          : html`
              <div id="no-replies">
                <p>${msg('No comments yet.')}</p>
              </div>
            `
      }
    </otter-drawer>
  `;
}
