import type { MdDialog } from '../../components/md/md-dialog';
import type { PwaInstall } from '../../components/pwa-install';

export interface PwaInstallControllerState {
  showInstallPrompt: boolean;
  pwaInstallLoaded: boolean;
}

export interface PwaInstallControllerHost {
  getState: () => PwaInstallControllerState;
  setState: (patch: Partial<PwaInstallControllerState>) => void;
  getPwaInstall: () => PwaInstall | undefined;
  getInstallDialog: () => MdDialog | undefined;
  showOverlay: (name: string) => Promise<void>;
  hideOverlay: (name: string) => void;
  updateComplete: Promise<boolean>;
}

export class HomePwaInstallController {
  constructor(private host: PwaInstallControllerHost) {}

  async checkInstallPrompt() {
    // Skip install prompt entirely when running inside Capacitor native shell
    const { isNativePlatform } = await import('../../utils/platform');
    if (isNativePlatform()) return;

    // Wait a moment for the pwa-install component to initialize
    await this.host.updateComplete;

    const pwaInstall = this.host.getPwaInstall();

    // Don't show if already installed
    if (
      pwaInstall &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches)
    ) {
      return;
    }

    const isMobile = window.matchMedia('(max-width: 820px)').matches;

    // On desktop with Web Install API, always show (ignore dismissal)
    if (!isMobile && pwaInstall?.hasWebInstallAPI) {
      this.host.setState({
        showInstallPrompt: true,
        pwaInstallLoaded: true,
      });
      return;
    }

    // Otherwise, check if install can be shown (respects dismissal)
    if (pwaInstall?.canShow || pwaInstall?.hasInstallMethod) {
      this.host.setState({
        showInstallPrompt: true,
        pwaInstallLoaded: true,
      });
    }
  }

  async openInstallDialog() {
    await import('../../components/md/md-dialog');
    await this.host.showOverlay('install-dialog');
    const dialog = this.host.getInstallDialog();
    dialog?.show();
  }

  async handleInstallDismiss() {
    this.host.setState({ showInstallPrompt: false });
    const dialog = this.host.getInstallDialog();
    await dialog?.hide();
    this.host.hideOverlay('install-dialog');
  }

  async handleInstallSuccess() {
    this.host.setState({ showInstallPrompt: false });
    const dialog = this.host.getInstallDialog();
    await dialog?.hide();
    this.host.hideOverlay('install-dialog');
  }
}
