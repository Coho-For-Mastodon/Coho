/**
 * Auth state utilities for managing guest mode and authentication state
 */
/**
 * Check if the user is in guest mode (not authenticated)
 */
export declare function isGuestMode(): boolean;
/**
 * Get the server URL to use. For guests, returns mastodon.social.
 * For authenticated users, returns their configured server.
 */
export declare function getGuestServer(): string;
/**
 * Get the effective server - uses user's server if authenticated,
 * otherwise falls back to guest server
 */
export declare function getEffectiveServer(): string;
/**
 * Enter guest mode - sets up localStorage for guest browsing
 */
export declare function enterGuestMode(): void;
/**
 * Exit guest mode (called when user logs in)
 */
export declare function exitGuestMode(): void;
/**
 * Check if explicitly in guest mode (vs just not logged in)
 */
export declare function isExplicitGuestMode(): boolean;
