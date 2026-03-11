/**
 * Firebase Functions for Coho Mastodon PWA
 * Migrated from Azure Functions
 */

import { onRequest, Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';
import * as crypto from 'crypto';

// Define the secret
const openaiApiKey = defineSecret('OPENAI_API_KEY');

// Helper to enable CORS
const allowedOrigins = [
  'https://coho.place',
  'https://coho-mastodon.web.app',
  'http://localhost:3000',
];

const applyCors = (
  request: { headers: { origin?: string } },
  response: { set: (key: string, value: string) => void }
) => {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
  }
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// ============================================================================
// Server URL Validation (SSRF Protection)
// ============================================================================

/**
 * Validate that a server hostname looks like a legitimate Mastodon instance host.
 * Performs basic SSRF mitigation by rejecting localhost-like and malformed hostnames.
 */
function validateServerUrl(server: string): boolean {
  if (!server || typeof server !== 'string') return false;

  // Strip any protocol or path that might have slipped through
  const cleaned = server.replace(/^https?:\/\//, '').split(/[/?#]/)[0];
  if (cleaned !== server) return false;

  // Reject if contains port numbers
  if (cleaned.includes(':')) return false;

  // Must look like a valid hostname (alphanumeric, dots, hyphens)
  const hostnameRegex =
    /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!hostnameRegex.test(cleaned)) return false;

  // Reject localhost and loopback
  const lower = cleaned.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) return false;

  // Reject common internal/private hostnames
  if (lower.endsWith('.local') || lower.endsWith('.internal')) return false;

  return true;
}

/**
 * Validate that a resource ID is safe for URL interpolation.
 * Mastodon IDs are typically numeric strings but some forks use alphanumeric.
 */
function validateResourceId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Extract access token and server from request body (POST) with fallback to
 * query params for backwards compatibility during migration.
 */
function extractProxyParams(request: Request): {
  accessToken: string;
  server: string;
  id?: string;
} {
  // Prefer body params (secure) over query params (legacy)
  const accessToken =
    (request.body?.accessToken as string) ||
    (request.query.code as string) ||
    '';
  const rawServer =
    (request.body?.server as string) || (request.query.server as string) || '';
  const id =
    (request.body?.id as string) || (request.query.id as string) || undefined;
  const server = rawServer.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return { accessToken, server, id };
}

// ============================================================================
// OAuth Encrypted State (timestamped with TTL)
// ============================================================================

interface OAuthStatePayload {
  clientId: string;
  clientSecret: string;
  server: string;
  redirectUri: string;
  ts: number;
}

const STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Derive a stable encryption key for OAuth state.
 * Uses FIREBASE_CONFIG (always set in Cloud Functions and emulator) as entropy
 * so the key is consistent across invocations without requiring a user-managed secret.
 */
function getStateEncryptionKey(): Buffer {
  const seed =
    process.env.OAUTH_STATE_KEY ||
    process.env.FIREBASE_CONFIG ||
    'coho-local-dev-key';
  return crypto.createHash('sha256').update(seed).digest();
}

/** Encrypt an OAuth state payload into a URL-safe string */
function encryptState(payload: OAuthStatePayload): string {
  const key = getStateEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // iv (12) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64url');
}

/** Decrypt an OAuth state string back into a payload (returns null if invalid/expired) */
function decryptState(stateStr: string): OAuthStatePayload | null {
  try {
    const key = getStateEncryptionKey();
    const combined = Buffer.from(stateStr, 'base64url');
    if (combined.length < 28) return null; // 12 iv + 16 tag minimum
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted =
      decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
    const payload = JSON.parse(decrypted) as OAuthStatePayload;
    // Check TTL
    if (Date.now() - payload.ts > STATE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}

// OpenAI Functions

export const generateImage = onRequest(
  { secrets: [openaiApiKey] },
  async (request: Request, response: Response) => {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      response.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const openai = new OpenAI({ apiKey });

    const prompt =
      (request.body?.prompt as string) || (request.query.prompt as string);
    if (!prompt) {
      response.status(400).json({ error: 'Prompt is required' });
      return;
    }

    try {
      const result = await openai.images.generate({
        prompt: prompt,
        response_format: 'b64_json',
      });

      logger.info('Generated image', { prompt });
      response.json(result.data);
    } catch (error) {
      logger.error('Image generation failed', { error });
      response.status(500).json({ error: 'Image generation failed' });
    }
  }
);

export const generateStatus = onRequest(
  { secrets: [openaiApiKey] },
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      response.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const openai = new OpenAI({ apiKey });

    const prompt =
      (request.body?.prompt as string) || (request.query.prompt as string);
    if (!prompt) {
      response.status(400).json({ error: 'Prompt is required' });
      return;
    }

    try {
      const result = await openai.completions.create({
        model: 'gpt-3.5-turbo-instruct',
        prompt: `Generate a post for Mastodon that is about: ${prompt}`,
        max_tokens: 50,
        temperature: 0,
      });

      logger.info('Generated status', { prompt });
      response.json(result.choices);
    } catch (error) {
      logger.error('Status generation failed', { error });
      response.status(500).json({ error: 'Status generation failed' });
    }
  }
);

export const translateStatus = onRequest(
  { secrets: [openaiApiKey] },
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      response.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const openai = new OpenAI({ apiKey });

    const content = request.query.content as string;
    const target_language = request.query.language as string;

    if (!content || !target_language) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const result = await openai.responses.create({
        model: 'gpt-5-nano',
        input: `Translate the following text to ${target_language}: ${content} . Provide only the translated text.`,
      });

      logger.info('Translated status', {
        content,
        target_language,
        result: result.output_text,
      });
      response.json(result.output_text);
    } catch (error) {
      logger.error('Translation failed', { error });
      response.status(500).json({ error: 'Translation failed' });
    }
  }
);

export const generateAltText = onRequest(
  { secrets: [openaiApiKey] },
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const apiKey = openaiApiKey.value();
    if (!apiKey) {
      response.status(500).json({ error: 'OpenAI API key not configured' });
      return;
    }

    const openai = new OpenAI({ apiKey });

    const imageUrl = request.body.imageUrl || request.query.imageUrl;
    if (!imageUrl) {
      response.status(400).json({ error: 'Image URL is required' });
      return;
    }

    try {
      const result = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Give me alt text for the following image. Only return the alt text, no other text or markdown:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const altText = result.choices[0].message.content;
      logger.info('Generated alt text');
      response.json({ altText });
    } catch (error) {
      logger.error('Alt text generation failed', { error });
      response.status(500).json({
        error: 'Alt text generation failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Mastodon API Proxy Functions

export const bookmark = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/statuses/${id}/bookmark`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Bookmark failed', { error });
      response.status(500).json({ error: 'Bookmark failed' });
    }
  }
);

export const reblog = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/statuses/${id}/reblog`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Reblog failed', { error });
      response.status(500).json({ error: 'Reblog failed' });
    }
  }
);

export const boost = onRequest(async (request: Request, response: Response) => {
  if (request.method === 'OPTIONS') {
    applyCors(request, response);
    response.status(204).send('');
    return;
  }

  applyCors(request, response);

  const { accessToken, server, id } = extractProxyParams(request);

  if (!accessToken || !server || !id) {
    response.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  if (!validateServerUrl(server)) {
    response.status(400).json({ error: 'Invalid server URL' });
    return;
  }

  if (!validateResourceId(id)) {
    response.status(400).json({ error: 'Invalid resource ID' });
    return;
  }

  try {
    const apiResponse = await fetch(
      `https://${server}/api/v1/statuses/${id}/favourite`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await apiResponse.json();
    response.json(data);
  } catch (error) {
    logger.error('Favourite failed', { error });
    response.status(500).json({ error: 'Favourite failed' });
  }
});

export const follow = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/accounts/${id}/follow`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Follow failed', { error });
      response.status(500).json({ error: 'Follow failed' });
    }
  }
);

export const getStatus = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/statuses/${id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get status failed', { error });
      response.status(500).json({ error: 'Get status failed' });
    }
  }
);

export const postStatus = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(`https://${server}/api/v1/statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status: request.body.status,
          visibility: request.body.visibility || 'public',
          media_ids: request.body.media_ids || [],
        }),
      });

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Post status failed', { error });
      response.status(500).json({ error: 'Post status failed' });
    }
  }
);

export const isFollowing = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/accounts/relationships?id=${id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Check following failed', { error });
      response.status(500).json({ error: 'Check following failed' });
    }
  }
);

export const getMessages = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/conversations`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get messages failed', { error });
      response.status(500).json({ error: 'Get messages failed' });
    }
  }
);

export const getReplies = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/statuses/${id}/context`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get replies failed', { error });
      response.status(500).json({ error: 'Get replies failed' });
    }
  }
);

export const getUserPosts = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);
    const excludeReplies =
      (request.body?.exclude_replies as string) ||
      (request.query.exclude_replies as string);
    const onlyMedia =
      (request.body?.only_media as string) ||
      (request.query.only_media as string);
    const maxId =
      (request.body?.max_id as string) || (request.query.max_id as string);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      // Build URL with optional filter parameters
      let url = `https://${server}/api/v1/accounts/${id}/statuses?limit=40`;
      if (excludeReplies === 'true') {
        url += '&exclude_replies=true';
      }
      if (onlyMedia === 'true') {
        url += '&only_media=true';
      }
      if (maxId) {
        if (!validateResourceId(maxId)) {
          response.status(400).json({ error: 'Invalid max_id parameter' });
          return;
        }
        url += `&max_id=${encodeURIComponent(maxId)}`;
      }

      const apiResponse = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get user posts failed', { error });
      response.status(500).json({ error: 'Get user posts failed' });
    }
  }
);

export const getPinnedPosts = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/accounts/${id}/statuses?pinned=true&limit=40`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get pinned posts failed', { error });
      response.status(500).json({ error: 'Get pinned posts failed' });
    }
  }
);

export const getAccount = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/accounts/${id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get account failed', { error });
      response.status(500).json({ error: 'Get account failed' });
    }
  }
);

export const getHashtags = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);
    const query =
      (request.body?.query as string) || (request.query.query as string);

    if (!accessToken || !server || !query) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v2/search?q=${encodeURIComponent(query)}&type=hashtags`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get hashtags failed', { error });
      response.status(500).json({ error: 'Get hashtags failed' });
    }
  }
);

export const search = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);
    const query =
      (request.body?.query as string) || (request.query.query as string);

    if (!accessToken || !server || !query) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v2/search?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Search failed', { error });
      response.status(500).json({ error: 'Search failed' });
    }
  }
);

export const getFollowing = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/accounts/${id}/following`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get following failed', { error });
      response.status(500).json({ error: 'Get following failed' });
    }
  }
);

export const getFollowers = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server, id } = extractProxyParams(request);

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    if (!validateResourceId(id)) {
      response.status(400).json({ error: 'Invalid resource ID' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/accounts/${id}/followers`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get followers failed', { error });
      response.status(500).json({ error: 'Get followers failed' });
    }
  }
);

export const getFavorites = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(`https://${server}/api/v1/favourites`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get favorites failed', { error });
      response.status(500).json({ error: 'Get favorites failed' });
    }
  }
);

export const getBookmarks = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(`https://${server}/api/v1/bookmarks`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get bookmarks failed', { error });
      response.status(500).json({ error: 'Get bookmarks failed' });
    }
  }
);

export const getNotifications = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/notifications`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get notifications failed', { error });
      response.status(500).json({ error: 'Get notifications failed' });
    }
  }
);

export const getTimelinePaginated = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);
    const sinceId =
      (request.body?.since_id as string) || (request.query.since_id as string);

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    let url = `https://${server}/api/v1/timelines/home?limit=40`;
    if (sinceId) {
      if (!validateResourceId(sinceId)) {
        response.status(400).json({ error: 'Invalid since_id parameter' });
        return;
      }
      url += `&max_id=${encodeURIComponent(sinceId)}`;
    }

    try {
      const apiResponse = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get timeline failed', { error });
      response.status(500).json({ error: 'Get timeline failed' });
    }
  }
);

export const getUser = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const { accessToken, server } = extractProxyParams(request);

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    if (!validateServerUrl(server)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${server}/api/v1/accounts/verify_credentials`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await apiResponse.json();
      response.json(data);
    } catch (error) {
      logger.error('Get user failed', { error });
      response.status(500).json({ error: 'Get user failed' });
    }
  }
);

// Authentication Functions

export const authenticate = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const serverURL =
      (request.body?.server as string) || (request.query.server as string);
    const rawRedirectUri =
      (request.body?.redirect_uri as string) ||
      (request.query.redirect_uri as string) ||
      'https://coho.place';

    // Normalize redirect_uri - remove trailing slash for consistency
    const redirectUri = rawRedirectUri.replace(/\/$/, '');

    if (!serverURL) {
      response.status(400).json({ error: 'Server is required' });
      return;
    }

    if (!validateServerUrl(serverURL)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      // Note: PKCE (code_challenge) is NOT sent in the authorize URL.
      // Many Mastodon forks (Glitch-soc, Hometown) crash on unknown OAuth params
      // even when reporting version >= 4.3.0. Since we use a confidential client
      // (client_secret stays server-side), PKCE is not required for security.
      // The code_challenge/code_verifier are still stored in state for future use
      // when fork support stabilizes.

      const apiResponse = await fetch(`https://${serverURL}/api/v1/apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: 'Coho',
          redirect_uris: redirectUri,
          scopes: 'read write follow push',
          website: redirectUri,
        }),
      });

      const data = (await apiResponse.json()) as {
        client_id: string;
        client_secret: string;
      };

      const clientID = data.client_id;
      const clientSecret = data.client_secret;

      // Encrypt OAuth credentials into the state parameter (stateless, works across instances)
      const encryptedState = encryptState({
        clientId: clientID,
        clientSecret: clientSecret,
        server: serverURL,
        redirectUri,
        ts: Date.now(),
      });

      // Build authorization URL (no PKCE params — see note above)
      const authResponseURL =
        `https://${serverURL}/oauth/authorize?client_id=${clientID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=read+write+follow+push` +
        `&state=${encodeURIComponent(encryptedState)}`;

      response.json({ url: authResponseURL });
    } catch (error) {
      logger.error('Authentication init failed', { error, serverURL });
      response.status(500).json({ error: 'Authentication init failed' });
    }
  }
);

export const getClient = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const code =
      (request.body?.code as string) || (request.query.code as string);
    const state =
      (request.body?.state as string) || (request.query.state as string);

    if (!code || !state) {
      response.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    try {
      // Decrypt the state parameter to retrieve stored credentials
      const statePayload = decryptState(state);

      if (!statePayload) {
        response
          .status(400)
          .json({ error: 'Invalid or expired state parameter' });
        return;
      }

      const { clientId, clientSecret, server, redirectUri } = statePayload;

      if (!validateServerUrl(server)) {
        response.status(400).json({ error: 'Invalid server URL in state' });
        return;
      }

      logger.info('Token exchange attempt', {
        server,
        redirectUri,
        hasCode: !!code,
      });

      // Build token exchange body
      const tokenBody: Record<string, string> = {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'read write follow push',
      };

      const apiResponse = await fetch(`https://${server}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tokenBody),
      });

      const data = (await apiResponse.json()) as { access_token?: string };

      if (data.access_token) {
        // Return server and client credentials so frontend can store them for revocation
        response.json({
          access_token: data.access_token,
          server,
          clientId,
          clientSecret,
        });
      } else {
        logger.error('No access token in response', { data, redirectUri });
        response
          .status(500)
          .json({ error: 'Failed to get access token', details: data });
      }
    } catch (error) {
      logger.error('Get client token failed', { error });
      response.status(500).json({ error: 'Get client token failed' });
    }
  }
);

// Token Revocation

export const revokeToken = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const server = request.body?.server as string;
    const clientId = request.body?.clientId as string;
    const clientSecret = request.body?.clientSecret as string;
    const token = request.body?.token as string;

    if (!server || !clientId || !clientSecret || !token) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    const normalizedServer = server
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    if (!validateServerUrl(normalizedServer)) {
      response.status(400).json({ error: 'Invalid server URL' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `https://${normalizedServer}/oauth/revoke`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            token,
          }),
        }
      );

      if (apiResponse.ok || apiResponse.status === 200) {
        response.json({ success: true });
      } else {
        const data = await apiResponse.json().catch(() => ({}));
        logger.warn('Token revocation returned non-OK', {
          status: apiResponse.status,
          data,
        });
        // Still return success — best effort revocation
        response.json({ success: true });
      }
    } catch (error) {
      logger.error('Token revocation failed', { error });
      // Return success anyway — we don't want revocation failure to block logout
      response.json({ success: true });
    }
  }
);
