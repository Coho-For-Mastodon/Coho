import { css } from 'lit';

/**
 * Shared keyframe animations used across multiple components.
 * Import the ones you need into your component's `static styles` array.
 */

/** 360° rotation — spinners and loading indicators. */
export const spinAnimation = css`
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

/** Simple opacity fade-in (0 → 1). */
export const fadeInAnimation = css`
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

/** Skeleton shimmer — translateX sweep. Used by md-skeleton components. */
export const shimmerAnimation = css`
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
`;
