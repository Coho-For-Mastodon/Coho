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
  private getPostAuthRedirect;
  private login;
  handleServerInput(
    event:
      | Event
      | CustomEvent<{
          value: string;
        }>
  ): void;
  private doSearchInstances;
  handleServerSelect(event: CustomEvent): void;
  private joinMastodon;
  private explore;
  render(): import('lit-html').TemplateResult<1>;
}
