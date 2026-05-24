import * as THREE from 'three';
import type { Post } from '../../interfaces/Post';
import {
  createPlaceholderTexture,
  createPostCardTexture,
  WARP_CARD_TEXTURE_HEIGHT,
  WARP_CARD_TEXTURE_WIDTH,
  WARP_ACTION_HITBOXES,
  type WarpPostAction,
  type WarpTheme,
} from './post-card-texture';
import { WARP_POST_LEAD, WARP_POST_SPACING } from './scene';

export interface WarpCardPickResult {
  post: Post;
  postIndex: number;
  action: WarpPostAction | null;
}

const poolSize = 20;
const fullTextureSlots = 10;
const nearTextureDistance = 24;
const focusedCardWidth = 3.35;
const maxConcurrentTextureBuilds = 3;
const postsBehindCamera = 4;

interface WarpCard {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  postIndex: number;
  hasFullTexture: boolean;
  loadingTexture: boolean;
}

export class WarpCardPool {
  private readonly cards: WarpCard[] = [];
  private readonly textureCache = new Map<number, THREE.CanvasTexture>();
  private readonly curveLength: number;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private textureBuildsInFlight = 0;

  constructor(
    private posts: Post[],
    private readonly scene: THREE.Scene,
    private readonly curve: THREE.CatmullRomCurve3,
    private readonly theme: WarpTheme
  ) {
    this.curveLength = curve.getLength();

    const visibleCount = Math.min(poolSize, posts.length);
    for (let index = 0; index < visibleCount; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        map: createPlaceholderTexture(theme),
        transparent: true,
        side: THREE.DoubleSide,
      });
      const cardWidth = focusedCardWidth;
      const cardHeight =
        cardWidth * (WARP_CARD_TEXTURE_HEIGHT / WARP_CARD_TEXTURE_WIDTH);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(cardWidth, cardHeight),
        material
      );
      mesh.renderOrder = 2;
      this.scene.add(mesh);
      this.cards.push({
        mesh,
        postIndex: -1,
        hasFullTexture: false,
        loadingTexture: false,
      });
    }
  }

  updatePosts(posts: Post[]) {
    this.posts = posts;
  }

  update(progress: number, camera: THREE.PerspectiveCamera) {
    const baseIndex = Math.max(0, Math.floor(progress) - postsBehindCamera);
    const availableTextureBuilds = Math.max(
      0,
      maxConcurrentTextureBuilds - this.textureBuildsInFlight
    );
    let textureBuildsStarted = 0;

    this.cards.forEach((card, slotIndex) => {
      const postIndex = baseIndex + slotIndex;
      if (postIndex < 0 || postIndex >= this.posts.length) {
        card.mesh.visible = false;
        return;
      }

      card.mesh.visible = true;
      if (card.postIndex !== postIndex) {
        this.assignPost(card, postIndex);
      }

      const t =
        ((postIndex + WARP_POST_LEAD) * WARP_POST_SPACING) / this.curveLength;
      const curveT = Math.min(t, 0.985);
      const position = this.curve.getPointAt(curveT);
      const tangent = this.curve.getTangentAt(curveT).normalize();
      const viewportScale = getViewportCardScale(camera.aspect);
      const lane = getAnchoredCardPlacement(
        postIndex - progress,
        postIndex,
        tangent,
        viewportScale
      );
      card.mesh.position.set(
        position.x + lane.x,
        position.y + lane.y,
        position.z
      );
      card.mesh.scale.setScalar(lane.scale);
      card.mesh.material.opacity = 1;
      card.mesh.lookAt(camera.position);

      const distance = camera.position.distanceTo(card.mesh.position);
      const distanceFromTravel = Math.abs(postIndex - progress);
      card.mesh.material.opacity = THREE.MathUtils.clamp(
        1 - (distanceFromTravel - 9) * 0.12,
        0.42,
        1
      );
      if (
        (distanceFromTravel < fullTextureSlots ||
          distance < nearTextureDistance) &&
        !card.hasFullTexture &&
        !card.loadingTexture &&
        textureBuildsStarted < availableTextureBuilds
      ) {
        textureBuildsStarted += 1;
        this.promoteTexture(card);
      }
    });
  }

  pick(
    clientX: number,
    clientY: number,
    bounds: DOMRect,
    camera: THREE.PerspectiveCamera
  ): WarpCardPickResult | null {
    this.pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, camera);

    const intersections = this.raycaster.intersectObjects(
      this.cards.filter((card) => card.mesh.visible).map((card) => card.mesh)
    );
    const intersection = intersections[0];
    const mesh = intersection?.object;
    const card = this.cards.find((candidate) => candidate.mesh === mesh);
    if (!card) {
      return null;
    }

    return {
      post: this.posts[card.postIndex],
      postIndex: card.postIndex,
      action: intersection?.uv ? getActionFromUv(intersection.uv) : null,
    };
  }

  updatePost(postIndex: number, post: Post) {
    this.posts = this.posts.map((candidate, index) =>
      index === postIndex ? post : candidate
    );

    const card = this.cards.find(
      (candidate) => candidate.postIndex === postIndex
    );
    if (!card) {
      const cachedTexture = this.textureCache.get(postIndex);
      cachedTexture?.dispose();
      this.textureCache.delete(postIndex);
      return;
    }

    this.refreshTexture(card, postIndex);
  }

  dispose() {
    this.cards.forEach((card) => {
      this.scene.remove(card.mesh);
      card.mesh.geometry.dispose();
      this.disposeTextureIfUncached(card.mesh.material.map);
      card.mesh.material.dispose();
    });
    this.cards.length = 0;
    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
  }

  private assignPost(card: WarpCard, postIndex: number) {
    card.postIndex = postIndex;
    card.loadingTexture = false;
    this.disposeTextureIfUncached(card.mesh.material.map);

    const cachedTexture = this.textureCache.get(postIndex);
    card.hasFullTexture = cachedTexture !== undefined;
    card.mesh.material.map =
      cachedTexture ?? createPlaceholderTexture(this.theme);
    card.mesh.material.needsUpdate = true;
  }

  private async promoteTexture(card: WarpCard) {
    card.loadingTexture = true;
    this.textureBuildsInFlight += 1;
    const post = this.posts[card.postIndex];
    const postIndex = card.postIndex;

    try {
      const cachedTexture = this.textureCache.get(postIndex);
      if (cachedTexture) {
        this.disposeTextureIfUncached(card.mesh.material.map);
        card.mesh.material.map = cachedTexture;
        card.mesh.material.needsUpdate = true;
        card.hasFullTexture = true;
        return;
      }

      const texture = await createPostCardTexture(post, this.theme);
      if (card.postIndex !== postIndex) {
        texture.dispose();
        return;
      }

      this.textureCache.set(postIndex, texture);
      this.disposeTextureIfUncached(card.mesh.material.map);
      card.mesh.material.map = texture;
      card.mesh.material.needsUpdate = true;
      card.hasFullTexture = true;
    } finally {
      this.textureBuildsInFlight = Math.max(0, this.textureBuildsInFlight - 1);
      card.loadingTexture = false;
    }
  }

  private async refreshTexture(card: WarpCard, postIndex: number) {
    if (card.loadingTexture) {
      return;
    }

    card.loadingTexture = true;
    const previousTexture = this.textureCache.get(postIndex);

    try {
      const texture = await createPostCardTexture(
        this.posts[postIndex],
        this.theme
      );
      if (card.postIndex !== postIndex) {
        texture.dispose();
        return;
      }

      this.textureCache.set(postIndex, texture);
      card.mesh.material.map = texture;
      card.mesh.material.needsUpdate = true;
      card.hasFullTexture = true;

      if (previousTexture && previousTexture !== texture) {
        previousTexture.dispose();
      }
    } finally {
      card.loadingTexture = false;
    }
  }

  private disposeTextureIfUncached(texture: THREE.Texture | null) {
    if (!texture) {
      return;
    }

    if (
      ![...this.textureCache.values()].includes(texture as THREE.CanvasTexture)
    ) {
      texture.dispose();
    }
  }
}

function getActionFromUv(uv: THREE.Vector2): WarpPostAction | null {
  const x = uv.x * WARP_CARD_TEXTURE_WIDTH;
  const y = (1 - uv.y) * WARP_CARD_TEXTURE_HEIGHT;
  const hitbox = WARP_ACTION_HITBOXES.find(
    (candidate) =>
      x >= candidate.x &&
      x <= candidate.x + candidate.width &&
      y >= candidate.y &&
      y <= candidate.y + candidate.height
  );

  return hitbox?.action ?? null;
}

function getAnchoredCardPlacement(
  distanceFromFocus: number,
  postIndex: number,
  tangent: THREE.Vector3,
  viewportScale: number
): { x: number; y: number; scale: number } {
  const worldUp = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();

  if (right.lengthSq() < 0.001) {
    right.set(1, 0, 0);
  }

  const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
  const side = postIndex % 2 === 0 ? -1 : 1;
  const distance = Math.abs(distanceFromFocus);
  const clampedDistance = Math.min(distance, 6);
  const sideOffset = 1.45 * side * viewportScale;
  const verticalPattern =
    postIndex % 4 === 0 ? 0.22 : postIndex % 4 === 3 ? -0.16 : 0.04;
  const scaleBoost = 1 + (1 - Math.min(clampedDistance, 1)) * 0.12;
  const depthScale = Math.max(0.72, 1 - clampedDistance * 0.045);
  const offset = right
    .multiplyScalar(sideOffset)
    .add(up.multiplyScalar(verticalPattern * viewportScale));

  return {
    x: offset.x,
    y: offset.y,
    scale: depthScale * scaleBoost * viewportScale,
  };
}

function getViewportCardScale(aspect: number): number {
  if (aspect >= 0.82) {
    return 1;
  }

  return THREE.MathUtils.clamp(aspect / 0.82, 0.58, 1);
}
