import type { AutocompleteOption } from '../components/md/md-autocomplete';
export declare const POPULAR_INSTANCES: AutocompleteOption[];
export declare function searchInstances(
  query: string
): Promise<AutocompleteOption[]>;
