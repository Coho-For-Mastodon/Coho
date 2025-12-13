import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './md/md-checkbox.js';
import type { MdCheckbox } from './md/md-checkbox.js';

@customElement('user-terms')
export class UserTerms extends LitElement {
  @state() private _interests: string[] = [];

  static styles = [
    css`
      :host {
        display: block;
      }

      ul {
        list-style: none;
        padding: 8px;
        margin: 0;

        gap: 8px;
        display: flex;
        flex-direction: column;
        height: 200px;
        overflow-y: auto;
      }
    `,
  ];

  async firstUpdated() {
    const { get } = await import('idb-keyval');

    const interests = await get('interests');

    if (interests && interests.length > 0) {
      this._interests = interests;
    }
  }

  async handleChecked(e: CustomEvent<{ checked: boolean }>) {
    const checkbox = e.target as MdCheckbox;
    const value = checkbox.value;

    console.log('checkbox', checkbox);
    console.log('value', value);

    if (checkbox.checked) {
      this._interests.push(value);
    } else {
      const index = this._interests.indexOf(value);
      if (index > -1) {
        this._interests.splice(index, 1);
      }
    }

    console.log('interests', this._interests);

    // dedupe this._interests
    this._interests = [...new Set(this._interests)];

    const { set } = await import('idb-keyval');
    await set('interests', this._interests);
  }

  render() {
    return html`
      <h4 id="title">Interests</h4>

      <div id="interests">
        <ul>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('news')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="news"
              >News</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('technology')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="technology"
              >Technology</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('sports')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="sports"
              >Sports</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('politics')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="politics"
              >Politics</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('entertainment')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="entertainment"
              >Entertainment</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('business')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="business"
              >Business</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('science')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="science"
              >Science</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('health')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="health"
              >Health</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('travel')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="travel"
              >Travel</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('food')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="food"
              >Food</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('fashion')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="fashion"
              >Fashion</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('lifestyle')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="lifestyle"
              >Lifestyle</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('art')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="art"
              >Art</md-checkbox
            >
          </li>
          <li>
            <md-checkbox
              ?checked="${this._interests.includes('music')}"
              @change="${(e: CustomEvent<{ checked: boolean }>) =>
                this.handleChecked(e)}"
              value="music"
              >Music</md-checkbox
            >
          </li>
        </ul>
      </div>
    `;
  }
}
