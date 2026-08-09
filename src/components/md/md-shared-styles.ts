import { css } from 'lit';

export const mdSharedStyles = css`
  :host {
    font-family: var(
      --md-font-family,
      'Roboto',
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif
    );
  }

  :host * {
    font-family: inherit;
  }
`;
