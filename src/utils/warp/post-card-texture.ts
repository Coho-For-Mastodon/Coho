import * as THREE from 'three';
import type { Post } from '../../interfaces/Post';
import type { MediaAttachment } from '../../mastodon/types/media';

export interface WarpTheme {
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  outline: string;
}

export type WarpPostAction = 'reply' | 'boost' | 'like' | 'open';

export interface WarpActionHitbox {
  action: WarpPostAction;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const WARP_CARD_TEXTURE_WIDTH = 512;
export const WARP_CARD_TEXTURE_HEIGHT = 390;

export const WARP_ACTION_HITBOXES: WarpActionHitbox[] = [
  { action: 'reply', x: 32, y: 340, width: 88, height: 34 },
  { action: 'boost', x: 138, y: 340, width: 92, height: 34 },
  { action: 'like', x: 248, y: 340, width: 88, height: 34 },
  { action: 'open', x: 392, y: 340, width: 88, height: 34 },
];

const maxCachedImages = 96;
const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

export async function createPostCardTexture(
  post: Post,
  theme: WarpTheme
): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement('canvas');
  canvas.width = WARP_CARD_TEXTURE_WIDTH;
  canvas.height = WARP_CARD_TEXTURE_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create post card canvas context');
  }

  drawCardBackground(context, theme);
  await drawAvatar(context, post, theme);
  drawText(context, post, theme);
  await drawMediaGrid(context, post, theme);
  drawActions(context, post, theme);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
}

export function createPlaceholderTexture(
  theme: WarpTheme
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = WARP_CARD_TEXTURE_WIDTH;
  canvas.height = WARP_CARD_TEXTURE_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create placeholder canvas context');
  }

  drawCardBackground(context, theme);
  context.fillStyle = withAlpha(theme.primary, 0.18);
  roundedRect(context, 32, 28, 50, 50, 25);
  context.fill();
  context.fillStyle = withAlpha(theme.onSurfaceVariant, 0.18);
  roundedRect(context, 98, 34, 210, 18, 9);
  context.fill();
  roundedRect(context, 98, 62, 260, 14, 7);
  context.fill();
  roundedRect(context, 32, 116, 448, 16, 8);
  context.fill();
  roundedRect(context, 32, 146, 390, 16, 8);
  context.fill();
  roundedRect(context, 32, 166, 448, 156, 18);
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function drawCardBackground(
  context: CanvasRenderingContext2D,
  theme: WarpTheme
) {
  context.clearRect(0, 0, WARP_CARD_TEXTURE_WIDTH, WARP_CARD_TEXTURE_HEIGHT);
  context.fillStyle = theme.surface;
  roundedRect(
    context,
    0,
    0,
    WARP_CARD_TEXTURE_WIDTH,
    WARP_CARD_TEXTURE_HEIGHT,
    18
  );
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = withAlpha(theme.outline, 0.2);
  context.stroke();
}

async function drawAvatar(
  context: CanvasRenderingContext2D,
  post: Post,
  theme: WarpTheme
) {
  const avatarX = 32;
  const avatarY = 28;
  const avatarSize = 50;
  const avatarUrl = post.reblog?.account.avatar || post.account.avatar;

  context.save();
  context.beginPath();
  context.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2
  );
  context.clip();

  const image = avatarUrl ? await loadImage(avatarUrl) : null;
  if (image) {
    context.drawImage(image, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    context.fillStyle = withAlpha(theme.primary, 0.26);
    context.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    context.fillStyle = theme.onSurface;
    context.font =
      '700 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      getDisplayName(post).slice(0, 1).toUpperCase() || '@',
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2 + 1
    );
  }

  context.restore();
}

function drawText(
  context: CanvasRenderingContext2D,
  post: Post,
  theme: WarpTheme
) {
  const displayName = getDisplayName(post);
  const account = post.reblog?.account || post.account;
  const handle = `@${account.acct || account.username}`;
  const content = stripHtml(post.reblog?.content || post.content);
  const hasMedia = getVisualMediaAttachments(post).length > 0;

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  context.fillStyle = theme.onSurface;
  context.font =
    '700 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  context.fillText(truncateText(context, displayName, 340), 98, 50);

  context.fillStyle = theme.onSurfaceVariant;
  context.font =
    '500 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  context.fillText(truncateText(context, handle, 340), 98, 74);

  context.fillStyle = theme.onSurface;
  context.font =
    '500 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  wrapText(
    context,
    content || 'No text content',
    32,
    116,
    448,
    25,
    hasMedia ? 2 : 7
  );
}

async function drawMediaGrid(
  context: CanvasRenderingContext2D,
  post: Post,
  theme: WarpTheme
) {
  const mediaAttachments = getVisualMediaAttachments(post);
  if (mediaAttachments.length === 0) {
    return;
  }

  const gridX = 32;
  const gridY = 166;
  const gridWidth = 448;
  const gridHeight = 156;
  const gap = 3;
  const visibleMedia = mediaAttachments.slice(0, 4);
  const cells = getMediaGridCells(
    visibleMedia.length,
    gridX,
    gridY,
    gridWidth,
    gridHeight,
    gap
  );

  context.save();
  roundedRect(context, gridX, gridY, gridWidth, gridHeight, 14);
  context.clip();

  for (const [index, media] of visibleMedia.entries()) {
    const cell = cells[index];
    await drawMediaCell(context, media, cell, theme);
  }

  context.restore();

  context.lineWidth = 2;
  context.strokeStyle = withAlpha(theme.outline, 0.26);
  roundedRect(context, gridX, gridY, gridWidth, gridHeight, 14);
  context.stroke();

  if (mediaAttachments.length > visibleMedia.length) {
    context.fillStyle = withAlpha(theme.surface, 0.82);
    roundedRect(
      context,
      gridX + gridWidth - 54,
      gridY + gridHeight - 34,
      38,
      22,
      11
    );
    context.fill();
    context.fillStyle = theme.onSurface;
    context.font =
      '700 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      `+${mediaAttachments.length - visibleMedia.length}`,
      gridX + gridWidth - 35,
      gridY + gridHeight - 23
    );
  }
}

async function drawMediaCell(
  context: CanvasRenderingContext2D,
  media: MediaAttachment,
  cell: MediaGridCell,
  theme: WarpTheme
) {
  const previewUrl = media.preview_url || media.url;
  const image = previewUrl ? await loadImage(previewUrl) : null;

  context.fillStyle = withAlpha(theme.onSurfaceVariant, 0.14);
  context.fillRect(cell.x, cell.y, cell.width, cell.height);

  if (image) {
    drawImageContain(context, image, cell.x, cell.y, cell.width, cell.height);
  } else {
    context.fillStyle = withAlpha(theme.primary, 0.18);
    context.fillRect(cell.x, cell.y, cell.width, cell.height);
    context.fillStyle = theme.onSurfaceVariant;
    context.font =
      '700 15px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      'Media',
      cell.x + cell.width / 2,
      cell.y + cell.height / 2
    );
  }

  if (media.type === 'video' || media.type === 'gifv') {
    context.fillStyle = withAlpha(theme.surface, 0.82);
    roundedRect(context, cell.x + 8, cell.y + 8, 42, 22, 11);
    context.fill();
    context.fillStyle = theme.onSurface;
    context.font =
      '700 12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      media.type === 'gifv' ? 'GIF' : 'Video',
      cell.x + 29,
      cell.y + 19
    );
  }
}

function drawActions(
  context: CanvasRenderingContext2D,
  post: Post,
  theme: WarpTheme
) {
  drawActionButton(
    context,
    theme,
    WARP_ACTION_HITBOXES[0],
    formatActionLabel('Reply', post.replies_count),
    false
  );
  drawActionButton(
    context,
    theme,
    WARP_ACTION_HITBOXES[1],
    formatActionLabel(
      post.reblogged ? 'Reposted' : 'Repost',
      post.reblogs_count
    ),
    post.reblogged
  );
  drawActionButton(
    context,
    theme,
    WARP_ACTION_HITBOXES[2],
    formatActionLabel(
      post.favourited ? 'Liked' : 'Like',
      post.favourites_count
    ),
    post.favourited
  );
  drawActionButton(context, theme, WARP_ACTION_HITBOXES[3], 'Open', false);
}

function drawActionButton(
  context: CanvasRenderingContext2D,
  theme: WarpTheme,
  hitbox: WarpActionHitbox,
  label: string,
  active: boolean
) {
  context.fillStyle = active ? withAlpha(theme.primary, 0.28) : 'transparent';
  roundedRect(context, hitbox.x, hitbox.y, hitbox.width, hitbox.height, 15);
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = active
    ? withAlpha(theme.primary, 0.64)
    : withAlpha(theme.outline, 0.34);
  context.stroke();
  context.fillStyle = active ? theme.primary : theme.onSurfaceVariant;
  context.font =
    '700 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(
    truncateText(context, label, hitbox.width - 18),
    hitbox.x + hitbox.width / 2,
    hitbox.y + hitbox.height / 2 + 1
  );
}

function formatActionLabel(label: string, count: number): string {
  return count > 0 ? `${label} ${count}` : label;
}

function getDisplayName(post: Post): string {
  const account = post.reblog?.account || post.account;
  return stripHtml(account.display_name || account.username || account.acct);
}

function getVisualMediaAttachments(post: Post): MediaAttachment[] {
  const sourcePost = post.reblog ?? post;
  if (sourcePost.sensitive) {
    return [];
  }

  return (sourcePost.media_attachments ?? []).filter(
    (media) =>
      media.type === 'image' || media.type === 'gifv' || media.type === 'video'
  );
}

interface MediaGridCell {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getMediaGridCells(
  count: number,
  x: number,
  y: number,
  width: number,
  height: number,
  gap: number
): MediaGridCell[] {
  if (count === 1) {
    return [{ x, y, width, height }];
  }

  if (count === 2) {
    const cellWidth = (width - gap) / 2;
    return [
      { x, y, width: cellWidth, height },
      { x: x + cellWidth + gap, y, width: cellWidth, height },
    ];
  }

  if (count === 3) {
    const leftWidth = (width - gap) / 2;
    const rightHeight = (height - gap) / 2;
    return [
      { x, y, width: leftWidth, height },
      { x: x + leftWidth + gap, y, width: leftWidth, height: rightHeight },
      {
        x: x + leftWidth + gap,
        y: y + rightHeight + gap,
        width: leftWidth,
        height: rightHeight,
      },
    ];
  }

  const cellWidth = (width - gap) / 2;
  const cellHeight = (height - gap) / 2;
  return [
    { x, y, width: cellWidth, height: cellHeight },
    { x: x + cellWidth + gap, y, width: cellWidth, height: cellHeight },
    { x, y: y + cellHeight + gap, width: cellWidth, height: cellHeight },
    {
      x: x + cellWidth + gap,
      y: y + cellHeight + gap,
      width: cellWidth,
      height: cellHeight,
    },
  ];
}

function stripHtml(value: string): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(value, 'text/html');
  return (document.body.textContent || '')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const lines: string[] = [];
  let lineStart = 0;

  while (lineStart < normalizedText.length && lines.length < maxLines) {
    let lineEnd = lineStart;
    let lastBreak = -1;

    while (lineEnd < normalizedText.length) {
      const candidate = normalizedText.slice(lineStart, lineEnd + 1);
      if (context.measureText(candidate).width > maxWidth) {
        break;
      }

      if (isSoftBreakCharacter(normalizedText[lineEnd])) {
        lastBreak = lineEnd + 1;
      }
      lineEnd += 1;
    }

    if (lineEnd >= normalizedText.length) {
      lines.push(normalizedText.slice(lineStart).trim());
      break;
    }

    const breakAt =
      lastBreak > lineStart ? lastBreak : Math.max(lineStart + 1, lineEnd);
    lines.push(normalizedText.slice(lineStart, breakAt).trim());
    lineStart = breakAt;

    while (normalizedText[lineStart] === ' ') {
      lineStart += 1;
    }
  }

  lines.slice(0, maxLines).forEach((lineText, index) => {
    const finalLine =
      index === maxLines - 1 && lineStart < normalizedText.length
        ? truncateText(context, lineText, maxWidth)
        : lineText;
    context.fillText(finalLine, x, y + index * lineHeight);
  });
}

function isSoftBreakCharacter(character: string): boolean {
  return (
    character === ' ' ||
    character === '/' ||
    character === '-' ||
    character === '_'
  );
}

function truncateText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let truncated = text;
  while (
    truncated.length > 1 &&
    context.measureText(`${truncated}...`).width > maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const bigint = Number.parseInt(
      hex.length === 3
        ? hex
            .split('')
            .map((part) => `${part}${part}`)
            .join('')
        : hex,
      16
    );
    const red = (bigint >> 16) & 255;
    const green = (bigint >> 8) & 255;
    const blue = bigint & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  return color.startsWith('rgb(')
    ? color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
    : color;
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(
    width / image.naturalWidth,
    height / image.naturalHeight
  );
  const fittedWidth = image.naturalWidth * scale;
  const fittedHeight = image.naturalHeight * scale;
  const fittedX = x + (width - fittedWidth) / 2;
  const fittedY = y + (height - fittedHeight) / 2;

  context.drawImage(image, fittedX, fittedY, fittedWidth, fittedHeight);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const cachedImage = imageCache.get(src);
  if (cachedImage) {
    return cachedImage;
  }

  const imagePromise = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => {
      imageCache.delete(src);
      resolve(null);
    };
    image.src = src;
  });

  imageCache.set(src, imagePromise);
  if (imageCache.size > maxCachedImages) {
    const oldestKey = imageCache.keys().next().value;
    if (oldestKey) {
      imageCache.delete(oldestKey);
    }
  }

  return imagePromise;
}
