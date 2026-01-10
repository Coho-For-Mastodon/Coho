import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { msg } from '@lit/localize';

// You can also import styles from another file
// if you prefer to keep your CSS seperate from your component
import { styles } from './about-styles';

import { styles as sharedStyles } from '../../styles/shared-styles';

@customElement('app-about')
export class AppAbout extends LitElement {
  static styles = [sharedStyles, styles];

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('About Page')}</h2>

        <sl-card>
          <h2>${msg('Did you know?')}</h2>

          <p>
            ${msg(
              'PWAs have access to many useful APIs in modern browsers! These APIs have enabled many new types of apps that can be built as PWAs, such as advanced graphics editing apps, games, apps that use machine learning and more!'
            )}
          </p>

          <p>
            ${msg(
              'Check out these docs to learn more about the advanced features that you can use in your PWA'
            )}
          </p>
        </sl-card>
      </main>
    `;
  }
}
