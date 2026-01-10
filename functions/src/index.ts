/**
 * Firebase Functions for Coho Mastodon PWA
 * Migrated from Azure Functions
 */

import { onRequest, Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import OpenAI from 'openai';

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

    const prompt = request.query.prompt as string;
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

    const prompt = request.query.prompt as string;
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

// Mastodon API Proxy Functions

export const bookmark = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v1/statuses/${id}/bookmark`,
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v1/statuses/${id}/reblog`,
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

  const accessToken = request.query.code as string;
  const server = `https://${request.query.server}`;
  const id = request.query.id as string;

  if (!accessToken || !server || !id) {
    response.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  try {
    const apiResponse = await fetch(
      `${server}/api/v1/statuses/${id}/favourite`,
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v1/accounts/${id}/follow`,
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(`${server}/api/v1/statuses/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(`${server}/api/v1/statuses`, {
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v1/accounts/relationships?id=${id}`,
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(`${server}/api/v1/conversations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v1/statuses/${id}/context`,
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;
    const excludeReplies = request.query.exclude_replies as string;
    const onlyMedia = request.query.only_media as string;
    const maxId = request.query.max_id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      // Build URL with optional filter parameters
      let url = `${server}/api/v1/accounts/${id}/statuses?limit=40`;
      if (excludeReplies === 'true') {
        url += '&exclude_replies=true';
      }
      if (onlyMedia === 'true') {
        url += '&only_media=true';
      }
      if (maxId) {
        url += `&max_id=${maxId}`;
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

export const getAccount = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(`${server}/api/v1/accounts/${id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const query = request.query.query as string;

    if (!accessToken || !server || !query) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v2/search?q=${query}&type=hashtags`,
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const query = request.query.query as string;

    if (!accessToken || !server || !query) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(`${server}/api/v2/search?q=${query}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v1/accounts/${id}/following`,
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const id = request.query.id as string;

    if (!accessToken || !server || !id) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v1/accounts/${id}/followers`,
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(`${server}/api/v1/favourites`, {
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(`${server}/api/v1/bookmarks`, {
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(`${server}/api/v1/notifications`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;
    const sinceId = request.query.since_id as string;

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    let url = `${server}/api/v1/timelines/home?limit=40`;
    if (sinceId) {
      url += `&max_id=${sinceId}`;
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

    const accessToken = request.query.code as string;
    const server = `https://${request.query.server}`;

    if (!accessToken || !server) {
      response.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    try {
      const apiResponse = await fetch(
        `${server}/api/v1/accounts/verify_credentials`,
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

    const serverURL = request.query.server as string;
    const rawRedirectUri =
      (request.query.redirect_uri as string) ||
      'https://wonderful-glacier-07b022d1e.2.azurestaticapps.net';

    // Normalize redirect_uri - remove trailing slash for consistency
    const redirectUri = rawRedirectUri.replace(/\/$/, '');

    if (!serverURL) {
      response.status(400).json({ error: 'Server is required' });
      return;
    }

    try {
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

      // Encode credentials to pass them back through the OAuth flow
      const encodedState = Buffer.from(
        JSON.stringify({
          clientId: clientID,
          clientSecret: clientSecret,
          server: serverURL,
          redirectUri: redirectUri, // Store the exact redirect_uri used
        })
      ).toString('base64');

      const authResponseURL = `https://${serverURL}/oauth/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read+write+follow+push&state=${encodedState}`;

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

    const code = request.query.code as string;
    const state = request.query.state as string;
    const rawRedirectUri = request.query.redirect_uri as string;

    if (!code || !state) {
      response.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    try {
      // Decode the state parameter to get client credentials
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
      const {
        clientId,
        clientSecret,
        server,
        redirectUri: storedRedirectUri,
      } = decodedState;

      if (!clientId || !clientSecret || !server) {
        response.status(400).json({ error: 'Invalid state parameter' });
        return;
      }

      // Use the stored redirect_uri from state (which matches what was used in authenticate)
      // Fall back to the provided redirect_uri (normalized) if not in state
      const redirectUri =
        storedRedirectUri ||
        (rawRedirectUri
          ? rawRedirectUri.replace(/\/$/, '')
          : 'https://wonderful-glacier-07b022d1e.2.azurestaticapps.net');

      logger.info('Token exchange attempt', {
        server,
        redirectUri,
        hasCode: !!code,
      });

      const apiResponse = await fetch(`https://${server}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'read write follow push',
        }),
      });

      const data = (await apiResponse.json()) as { access_token?: string };

      if (data.access_token) {
        response.json({ access_token: data.access_token });
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
