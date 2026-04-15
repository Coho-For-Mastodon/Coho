/**
 * Shared auth / server helpers for service modules.
 *
 * These small wrappers around localStorage keep the auth access pattern
 * consistent and avoid duplicating the same one-liner in every service file.
 */

export const getAccessToken = () => localStorage.getItem('accessToken') || '';

export const getServer = () => localStorage.getItem('server') || '';
