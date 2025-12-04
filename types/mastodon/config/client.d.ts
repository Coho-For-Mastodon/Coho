export interface MastodonClientConfig {
    url: string;
    accessToken: string;
}
export declare const getClientConfig: () => MastodonClientConfig;
