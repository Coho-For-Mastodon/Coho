export interface HomeSettingsState {
  wellnessMode: boolean;
  dataSaverMode: boolean;
  hapticsEnabled: boolean;
}

export interface HomeSettingsHost {
  getState: () => HomeSettingsState;
  setState: (patch: Partial<HomeSettingsState>) => void;
  showErrorToast: (message: string, variant?: string) => Promise<void>;
}

export class HomeSettingsController {
  private _toastListener: ((event: Event) => void) | null = null;

  constructor(private host: HomeSettingsHost) {}

  async init() {
    const { getSettings } = await import('../../services/settings');
    const settings = await getSettings();

    if (settings) {
      this.handleWellnessMode(settings.wellness || false);
      this.handleDataSaverMode(settings.data_saver || false);
      this.handleHapticsMode(settings.haptics !== false);
    }
  }

  async handleWellnessMode(check: boolean) {
    this.host.setState({ wellnessMode: check });
    const { setSettings } = await import('../../services/settings');
    await setSettings({ wellness: check });
  }

  async handleDataSaverMode(mode: boolean) {
    this.host.setState({ dataSaverMode: mode });
    const { setSettings } = await import('../../services/settings');
    await setSettings({ data_saver: mode });
  }

  async handleHapticsMode(enabled: boolean) {
    this.host.setState({ hapticsEnabled: enabled });
    const { setHapticsEnabled } = await import('../../utils/haptics');
    setHapticsEnabled(enabled);
    const { setSettings } = await import('../../services/settings');
    await setSettings({ haptics: enabled });
  }

  handlePrimaryColor(color: string) {
    document.documentElement.style.setProperty('--sl-color-primary-600', color);
    localStorage.setItem('primary_color', color);
  }

  setupGlobalToastListener() {
    this._toastListener = async (event: Event) => {
      const customEvent = event as CustomEvent<{
        message: string;
        variant: string;
      }>;
      if (customEvent.detail) {
        await this.host.showErrorToast(
          customEvent.detail.message,
          customEvent.detail.variant
        );
      }
    };
    window.addEventListener('app-toast', this._toastListener);
  }

  destroy() {
    if (this._toastListener) {
      window.removeEventListener('app-toast', this._toastListener);
      this._toastListener = null;
    }
  }
}
