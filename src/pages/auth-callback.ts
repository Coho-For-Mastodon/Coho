import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { msg, localized } from '@lit/localize';

const getRouter = () => import('../router/routes').then((m) => m.router);

/**
 * Lightweight callback page that handles the OAuth redirect.
 * Parses `code` and `state` from query params, exchanges for a token,
 * then navigates to the post-auth destination.
 */
@localized()
@customElement('auth-callback')
export class AuthCallback extends LitElement {
  @state() private error: string | null = null;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100dvh;
      width: 100%;
    }

    .container {
      text-align: center;
      padding: 2rem;
    }

    .error {
      color: var(--md-sys-color-error, #b3261e);
    }

    a {
      color: var(--md-sys-color-primary, #6750a4);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.handleCallback();
  }

  private async handleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code || !state) {
      this.error = 'Missing authorization parameters.';
      return;
    }

    try {
      const { bootstrapSession } = await import('../services/auth-session.js');
      await bootstrapSession();

      const { authToClient } = await import('../services/account.js');
      await authToClient(code, state);

      const router = await getRouter();
      await router.navigate(await this.getPostAuthRedirect());
    } catch (err) {
      console.error('Auth callback error', err);
      this.error =
        err instanceof Error ? err.message : 'Authentication failed.';
    }
  }

  private async getPostAuthRedirect(): Promise<string> {
    const { consumeAuthRedirect } = await import('../utils/auth-redirect.js');
    const storedRedirect = consumeAuthRedirect();
    if (storedRedirect) {
      return storedRedirect;
    }
    return '/home';
  }

  render() {
    if (this.error) {
      return html`
        <div class="container">
          <p class="error">${this.error}</p>
          <a href="/">${msg('Back to login')}</a>
        </div>
      `;
    }

    return html`
      <div class="container">
        <p>${msg('Signing in…')}</p>
      </div>
    `;
  }
}
