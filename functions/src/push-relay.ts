/**
 * Push Relay — bridges Mastodon Web Push to FCM for Capacitor Android.
 *
 * Mastodon sends encrypted Web Push messages to an endpoint URL.
 * This relay:
 *  1. Registers an FCM token + generates ECDH keys → returns a Web Push–compatible
 *     subscription (endpoint + keys) that can be sent to Mastodon.
 *  2. Receives incoming Web Push POSTs from Mastodon, decrypts them, and
 *     forwards the JSON payload to the device via FCM.
 *  3. Supports unregistration to clean up Firestore entries.
 */

import { onRequest, type Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import * as http from 'http';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ece = require('http_ece');

// ---------------------------------------------------------------------------
// Patch: strip non-standard Content-Encoding from Web Push requests
// ---------------------------------------------------------------------------
// Mastodon sends Content-Encoding: aesgcm (an *application-level* encryption
// scheme, not an HTTP transfer encoding). The Cloud Functions runtime's
// body-parser rejects anything it can't decompress (gzip/deflate/br/identity)
// with a 415 — and there's no way to disable or configure it.
//
// This patch intercepts the Node.js HTTP 'request' event (which fires before
// Express routing) and moves the non-standard value to x-content-encoding so
// body-parser sees no encoding and parses the raw bytes normally.
// ---------------------------------------------------------------------------

const WEB_PUSH_ENCODINGS = new Set(['aesgcm', 'aes128gcm']);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _origEmit: (...args: any[]) => boolean = http.Server.prototype.emit;

http.Server.prototype.emit = function (
  this: any,
  event: string,
  ...args: any[]
): boolean {
  if (event === 'request') {
    const req = args[0];
    if (req?.headers) {
      const ce: string | undefined = req.headers['content-encoding'];
      if (ce && WEB_PUSH_ENCODINGS.has(ce)) {
        req.headers['x-content-encoding'] = ce;
        delete req.headers['content-encoding'];
      }
    }
  }
  return _origEmit.apply(this, [event, ...args]);
};

// ---------------------------------------------------------------------------
// Firebase Admin Initialisation (idempotent)
// ---------------------------------------------------------------------------

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

const COLLECTION = 'push-relay-registrations';

// ---------------------------------------------------------------------------
// CORS (same list used by the rest of the functions)
// ---------------------------------------------------------------------------

const allowedOrigins = [
  'https://coho.place',
  'https://coho-mastodon.web.app',
  'http://localhost:3000',
  'https://localhost', // Capacitor Android WebView
];

function applyCors(
  request: { headers: { origin?: string } },
  response: { set: (key: string, value: string) => void }
) {
  const origin = request.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
  }
  response.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

/** Generate an ECDH P-256 key pair and a 16-byte auth secret. */
function generateSubscriptionKeys() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();

  // Public key in uncompressed format (65 bytes)
  const publicKey = ecdh.getPublicKey();
  const privateKey = ecdh.getPrivateKey();

  // Random 16-byte auth secret
  const auth = crypto.randomBytes(16);

  return {
    p256dh: publicKey.toString('base64url'),
    auth: auth.toString('base64url'),
    // Stored server-side only — never sent to the client
    privateKeyHex: privateKey.toString('hex'),
    authHex: auth.toString('hex'),
  };
}

// ---------------------------------------------------------------------------
// Web Push Decryption (RFC 8291 — aes128gcm, via http_ece)
// ---------------------------------------------------------------------------

/**
 * Parse a named parameter (e.g. salt=… or dh=…) from an HTTP header value.
 * Parameters are separated by ; or ,.
 */
function parseHeaderParam(header: string, param: string): string | null {
  const match = header.match(
    new RegExp(`(?:^|[;,])\\s*${param}=([^;,\\s]+)`, 'i')
  );
  return match ? match[1] : null;
}

/**
 * Decrypt a Web Push payload.
 *
 * Supports both encryption schemes:
 *  - **aesgcm** (draft-ietf-webpush-encryption) – used by most Mastodon
 *    instances.  Salt and sender DH key are in the Encryption / Crypto-Key
 *    request headers.
 *  - **aes128gcm** (RFC 8291) – salt and key-id are embedded in the payload.
 */
function decryptPayload(
  body: Buffer,
  privateKeyHex: string,
  authHex: string,
  contentEncoding: string,
  encryptionHeader?: string,
  cryptoKeyHeader?: string
): string {
  const receiverEcdh = crypto.createECDH('prime256v1');
  receiverEcdh.setPrivateKey(Buffer.from(privateKeyHex, 'hex'));
  const authSecret = Buffer.from(authHex, 'hex');

  if (contentEncoding === 'aesgcm') {
    const salt = parseHeaderParam(encryptionHeader || '', 'salt');
    const dh = parseHeaderParam(cryptoKeyHeader || '', 'dh');
    if (!salt || !dh) {
      throw new Error(
        'Missing Encryption/Crypto-Key header parameters for aesgcm'
      );
    }
    const decrypted: Buffer = ece.decrypt(body, {
      version: 'aesgcm',
      privateKey: receiverEcdh,
      dh: Buffer.from(dh, 'base64url'),
      salt: Buffer.from(salt, 'base64url'),
      authSecret,
    });
    return decrypted.toString('utf-8');
  }

  // aes128gcm (RFC 8291) – self-contained payload
  const decrypted: Buffer = ece.decrypt(body, {
    version: 'aes128gcm',
    privateKey: receiverEcdh,
    authSecret,
  });
  return decrypted.toString('utf-8');
}

// ---------------------------------------------------------------------------
// Validate FCM token format (basic sanity check)
// ---------------------------------------------------------------------------
function isValidFcmToken(token: string): boolean {
  return (
    typeof token === 'string' && token.length >= 32 && token.length <= 4096
  );
}

// ---------------------------------------------------------------------------
// Firebase Functions
// ---------------------------------------------------------------------------

/**
 * POST   /pushRelay  body: { action: 'register', fcmToken }
 *                     → { registrationId, endpoint, keys: { p256dh, auth } }
 *
 * DELETE /pushRelay  body: { action: 'unregister', registrationId }
 *                     → { success: true }
 *
 * The push reception endpoint is a *separate* function (pushRelayPush) so Mastodon
 * can POST raw encrypted bytes to it.
 */
export const pushRelay = onRequest(
  async (request: Request, response: Response) => {
    if (request.method === 'OPTIONS') {
      applyCors(request, response);
      response.status(204).send('');
      return;
    }

    applyCors(request, response);

    const action: string = request.body?.action || request.query.action || '';

    // ── Register ──────────────────────────────────────────────
    if (request.method === 'POST' && action === 'register') {
      const fcmToken: string = request.body?.fcmToken;

      if (!fcmToken || !isValidFcmToken(fcmToken)) {
        response.status(400).json({ error: 'Valid fcmToken is required' });
        return;
      }

      try {
        const keys = generateSubscriptionKeys();
        const registrationId = crypto.randomUUID();

        await db.collection(COLLECTION).doc(registrationId).set({
          fcmToken,
          p256dh: keys.p256dh,
          auth: keys.auth,
          privateKeyHex: keys.privateKeyHex,
          authHex: keys.authHex,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Build the Web Push–compatible endpoint that Mastodon will POST to.
        // The URL is the pushRelayPush function URL.
        const projectId =
          process.env.GCLOUD_PROJECT ||
          process.env.GCP_PROJECT ||
          JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId ||
          'coho-mastodon';
        const region = process.env.FUNCTION_REGION || 'us-central1';
        const endpoint = `https://${region}-${projectId}.cloudfunctions.net/pushRelayPush/${registrationId}`;

        logger.info('Push relay registered', { registrationId });

        response.json({
          registrationId,
          endpoint,
          keys: {
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
        });
      } catch (error) {
        logger.error('Push relay registration failed', { error });
        response.status(500).json({ error: 'Registration failed' });
      }
      return;
    }

    // ── Unregister ────────────────────────────────────────────
    if (
      (request.method === 'POST' && action === 'unregister') ||
      request.method === 'DELETE'
    ) {
      const registrationId: string =
        request.body?.registrationId || request.query.registrationId || '';

      if (!registrationId) {
        response.status(400).json({ error: 'registrationId is required' });
        return;
      }

      try {
        await db.collection(COLLECTION).doc(registrationId).delete();
        logger.info('Push relay unregistered', { registrationId });
        response.json({ success: true });
      } catch (error) {
        logger.error('Push relay unregistration failed', { error });
        response.status(500).json({ error: 'Unregistration failed' });
      }
      return;
    }

    response.status(400).json({ error: 'Invalid action' });
  }
);

/**
 * Receives incoming Web Push payloads from Mastodon.
 *
 * Mastodon POSTs encrypted bytes to:
 *   https://<region>-<project>.cloudfunctions.net/pushRelayPush/<registrationId>
 *
 * The non-standard Content-Encoding header (aesgcm) is stripped by the
 * http.Server.prototype.emit patch above and saved as x-content-encoding.
 */
export const pushRelayPush = onRequest(
  async (request: Request, response: Response) => {
    if (request.method !== 'POST') {
      response.status(405).send('Method Not Allowed');
      return;
    }

    // Extract registrationId from the URL path
    const pathParts = request.path.split('/').filter(Boolean);
    const registrationId = pathParts[pathParts.length - 1];

    if (!registrationId) {
      response.status(400).send('Missing registrationId');
      return;
    }

    try {
      const doc = await db.collection(COLLECTION).doc(registrationId).get();
      if (!doc.exists) {
        response.status(404).send('Registration not found');
        return;
      }

      const data = doc.data()!;
      const { fcmToken, privateKeyHex, authHex } = data;

      // Original Content-Encoding saved by the http.Server patch above
      const contentEncoding =
        (request.headers['x-content-encoding'] as string) || 'aes128gcm';

      logger.info('Incoming push', {
        registrationId,
        contentEncoding,
        hasEncryptionHeader: !!request.headers['encryption'],
        hasCryptoKeyHeader: !!request.headers['crypto-key'],
        bodyLength: request.rawBody?.length ?? 0,
      });

      // rawBody is always available on Firebase Functions requests
      const rawBody = Buffer.isBuffer(request.rawBody)
        ? request.rawBody
        : Buffer.from(request.rawBody || '');

      let decryptedJson: string;
      try {
        decryptedJson = decryptPayload(
          rawBody,
          privateKeyHex,
          authHex,
          contentEncoding,
          request.headers['encryption'] as string | undefined,
          request.headers['crypto-key'] as string | undefined
        );
      } catch (decryptError) {
        logger.error('Failed to decrypt push payload', { decryptError });
        response.status(201).send('Accepted (decrypt failed)');
        return;
      }

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(decryptedJson);
      } catch {
        logger.error('Decrypted payload is not valid JSON', {
          decryptedJson: decryptedJson.substring(0, 200),
        });
        response.status(201).send('Accepted (invalid JSON)');
        return;
      }

      const title = String(payload.title || 'Coho');
      const body = String(payload.body || 'You have a new notification');
      const notificationType = String(payload.notification_type || '');
      // Map Mastodon notification types to Android notification channels
      const channelMap: Record<string, string> = {
        mention: 'coho_mentions',
        reblog: 'coho_boosts',
        favourite: 'coho_favourites',
        follow: 'coho_follows',
        follow_request: 'coho_follows',
        poll: 'coho_polls',
        status: 'coho_status',
        update: 'coho_status',
      };
      const channelId = channelMap[notificationType] || 'coho_general';

      // FCM data values must all be strings — stringify everything
      const fcmData: Record<string, string> = {};
      for (const [key, value] of Object.entries(payload)) {
        fcmData[key] =
          typeof value === 'string' ? value : JSON.stringify(value);
      }
      // Ensure required keys exist
      fcmData.title = title;
      fcmData.body = body;

      await messaging.send({
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: fcmData,
        android: {
          priority: 'high',
          notification: {
            channelId,
            icon: 'ic_stat_name',
            color: '#d6325c',
            tag: `coho_${notificationType || 'general'}`,
          },
        },
      });

      logger.info('Push relayed to FCM', {
        registrationId,
        type: payload.notification_type,
      });
      response.status(201).send('Created');
    } catch (error) {
      logger.error('Push relay delivery failed', { error });

      if (
        error instanceof Error &&
        (error.message.includes('not-registered') ||
          error.message.includes('invalid-registration-token'))
      ) {
        await db.collection(COLLECTION).doc(registrationId).delete();
        logger.info('Cleaned up stale registration', { registrationId });
      }

      response.status(500).send('Relay failed');
    }
  }
);
