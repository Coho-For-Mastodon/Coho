/**
 * Server-side user preferences returned by GET /api/v1/preferences.
 * Keys follow the Mastodon API naming convention.
 */
export interface ServerPreferences {
  'posting:default:visibility'?: string;
  'posting:default:sensitive'?: boolean;
  'posting:default:language'?: string | null;
  'reading:expand:media'?: string;
  'reading:expand:spoilers'?: boolean;
}
