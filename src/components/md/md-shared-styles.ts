import { css } from 'lit';

export const mdSharedStyles = css`
  :host {
    font-family: var(
      --md-font-family,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      'Helvetica Neue',
      sans-serif
    );
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :host * {
    font-family: inherit;
  }
`;
