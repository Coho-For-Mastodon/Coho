export interface MastodonClientConfig {
  url: string;
  accessToken: string;
}

export const getClientConfig = (): MastodonClientConfig => {
  return {
    url: localStorage.getItem('server') || '',
    accessToken: localStorage.getItem('accessToken') || '',
  };
};
