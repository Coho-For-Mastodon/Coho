import { LitElement, html, css } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import '../components/md/md-text-area';
import { requestMammothBot } from '../services/ai';
import type { MdTextArea } from './md/md-text-area';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@localized()
@customElement('mammoth-bot')
export class MammothBot extends LitElement {
  @state() previousMessages: ChatMessage[] = [];

  @query('md-text-area') private textArea!: MdTextArea;
  @query('ul') private messageList!: HTMLUListElement;

  static styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        background: #ffffff14;
        padding: 8px;
        border-radius: 8px;
      }

      @media (prefers-color-scheme: light) {
        :host {
          background: #f3f3f3;
        }
      }

      span {
        font-size: var(--md-sys-typescale-label-small-font-size);
        margin-bottom: 7px;
        margin-left: 4px;
        color: #d2d2d2;
      }

      md-text-area::part(textarea) {
        height: 130px;
        width: 26vw;
        overflow-y: clip;
      }

      .wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      ul {
        padding: 0;
        margin: 0;
        list-style: none;
        width: 24.5vw;
        margin-bottom: 8px;
        max-height: 200px;
        border-radius: 6px;
        padding: 8px;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .copy-button {
        background: #ffffff14;
        backdrop-filter: blur(40px);
        border: none;
        border-radius: 6px;

        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
      }

      @media (prefers-color-scheme: light) {
        .copy-button {
          background: var(--primary-color);
        }
      }

      .copy-button img {
        height: 12px;
      }

      ul li {
        background: #ffffff14;
        border-radius: 6px;
        padding: 6px;
      }

      .role {
        font-weight: bold;
        text-decoration: underline;
        margin-bottom: 6px;
      }

      md-button {
        place-self: flex-end;
        margin-top: 6px;
      }

      md-button::part(control) {
        border: none;
      }

            @media (max-width: 820px) {
        .chat-container {
          max-width: 100%;

      @media (prefers-color-scheme: dark) {
        md-text-area::part(textarea),
        md-button[variant='outlined']::part(control) {
          background: #1e1e1e;
          color: white;
        }

        ul {
          background: #1e1e1e;
        }
      }
    `,
  ];

  async handleInput() {
    const value = this.textArea?.value ?? '';
    console.log('value', value);

    this.previousMessages = [
      ...this.previousMessages,
      {
        role: 'user',
        content: value,
      },
    ];

    if (this.textArea) {
      this.textArea.value = '';
    }

    const data = await requestMammothBot(value, this.previousMessages);
    console.log('data', data);

    const response = data.choices[0].message as ChatMessage;

    this.previousMessages = [...this.previousMessages, response];

    // scroll list to last item in the list
    if (this.messageList) {
      this.messageList.scrollTop = this.messageList.scrollHeight;
      this.messageList.scrollTo(0, this.messageList.scrollHeight);
    }
  }

  copyContent(content: string) {
    // copy to clipboard
    navigator.clipboard.writeText(content);
  }

  render() {
    return html`
      <span>${msg('alpha')}</span>
      <ul>
        ${this.previousMessages.map((message) => {
          return html`
            <li>
              <div class="wrapper">
                <div class="role">${message.role}</div>

                <button
                  @click="${() => this.copyContent(message.content)}"
                  class="copy-button"
                >
                  <img src="/assets/copy-outline.svg" alt="${msg('Copy')}" />
                </button>
              </div>
              <div>${message.content}</div>
            </li>
          `;
        })}
      </ul>

      <md-text-area
        placeholder=${msg(
          'Hello, I am MammothBot. I can help you with Mastodon, such as by generating posts etc, summarizing posts and more. You can chat with me like you would anyone else, no need to talk like a robot 😊'
        )}
        rows="3"
      ></md-text-area>

      <md-button @click="${() => this.handleInput()}" variant="filled"
        >${msg('Send')}</md-button
      >
    `;
  }
}
