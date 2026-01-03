import { LitElement } from 'lit';
import '../components/md/md-autocomplete';
import '../components/md/md-button';
import type { AutocompleteOption } from '../components/md/md-autocomplete';
export declare class AppLogin extends LitElement {
  instances: AutocompleteOption[];
  chosenServer: string;
  loadingInstances: boolean;
  private _searchDebounceTimer;
  static styles: import('lit').CSSResult[];
  firstUpdated(): Promise<void>;
  private determinePostAuthRedirect;
  login(): Promise<void>;
  handleServerInput(
    event:
      | Event
      | CustomEvent<{
          value: string;
        }>
  ): void;
  doSearchInstances(query: string): Promise<void>;
  handleServerSelect(event: CustomEvent): void;
  joinMastodon(): Promise<void>;
  explore(): Promise<void>;
  render(): import('lit-html').TemplateResult<1>;
}
