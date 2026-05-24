import { LitElement, css, html, nothing } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';

import '../components/md/md-button';
import '../components/md/md-skeleton';

import { router } from '../router/routes';
import type { Post } from '../interfaces/Post';
import type { WarpCardPool } from '../utils/warp/card-pool';
import type { WarpScene } from '../utils/warp/scene';
import type { WarpTheme } from '../utils/warp/post-card-texture';

@localized()
@customElement('app-warp')
export class AppWarp extends LitElement {
  @query('canvas') private canvas?: HTMLCanvasElement;

  @state() private posts: Post[] = [];
  @state() private loading = true;
  @state() private error = '';
  @state() private featureEnabled = false;
  @state() private reducedMotion = false;
  @state() private lowPowerWarning = false;
  @state() private sceneReady = false;
  @state() private reachedEnd = false;
  @state() private loadingMore = false;

  private scene: WarpScene | null = null;
  private cardPool: WarpCardPool | null = null;
  private animationFrame = 0;
  private lastFrameTime = 0;
  private progress = 0;
  private travelVelocity = 0;
  private inputDirection = 0;
  private lookYaw = 0;
  private lookPitch = 0;
  private targetLookYaw = 0;
  private targetLookPitch = 0;
  private pointerLocked = false;
  private lastInputAt = 0;
  private lastLookAt = 0;
  private readonly pressedKeys = new Set<string>();
  private readonly keyboardTravelSpeed = 4.8;
  private readonly travelAcceleration = 10;
  private readonly travelFriction = 4.6;
  private readonly maxTravelVelocity = 10;
  private readonly wheelImpulse = 0.018;
  private readonly mouseLookSensitivity = 0.0018;
  private readonly maxLookYaw = 0.86;
  private readonly maxLookPitch = 0.42;
  private touchStartY = 0;
  private touchStartX = 0;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerStartAt = 0;
  private pendingStart = false;
  private hasMorePosts = true;

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: #090a0f;
      color: #f7f2ff;
    }

    .warp-shell {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: #090a0f;
      touch-action: none;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .top-bar,
    .status-panel {
      position: fixed;
      z-index: 2;
      display: flex;
      gap: 8px;
    }

    .top-bar {
      top: max(18px, env(safe-area-inset-top));
      left: max(18px, env(safe-area-inset-left));
      right: max(18px, env(safe-area-inset-right));
      justify-content: space-between;
      align-items: center;
      pointer-events: none;
    }

    .top-bar md-button {
      pointer-events: auto;
    }

    .status-panel {
      left: 50%;
      top: 50%;
      width: min(420px, calc(100vw - 32px));
      transform: translate(-50%, -50%);
      flex-direction: column;
      align-items: stretch;
      padding: 20px;
      border-radius: 8px;
      background: var(--md-sys-color-surface-container-high, #25252b);
      color: var(--md-sys-color-on-surface, #f5f5f5);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
    }

    .status-panel h2,
    .status-panel p {
      margin: 0;
    }

    .status-panel h2 {
      font-size: var(--md-sys-typescale-title-large-font-size, 1.375rem);
    }

    .status-panel p {
      color: var(--md-sys-color-on-surface-variant, #c8c5cc);
      line-height: 1.45;
    }

    .actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 8px;
    }

    .loader {
      position: fixed;
      left: 50%;
      bottom: max(26px, env(safe-area-inset-bottom));
      z-index: 2;
      width: min(300px, calc(100vw - 48px));
      transform: translateX(-50%);
    }

    .reticle {
      position: fixed;
      left: 50%;
      top: 50%;
      z-index: 1;
      width: 18px;
      height: 18px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      opacity: 0.54;
    }

    .reticle::before,
    .reticle::after {
      position: absolute;
      content: '';
      background: rgba(255, 255, 255, 0.72);
      border-radius: 999px;
    }

    .reticle::before {
      left: 8px;
      top: 1px;
      width: 2px;
      height: 16px;
    }

    .reticle::after {
      left: 1px;
      top: 8px;
      width: 16px;
      height: 2px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    document.addEventListener(
      'pointerlockchange',
      this.handlePointerLockChange
    );
    document.addEventListener('mousemove', this.handleMouseMove);
    this.initialize();
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange
    );
    document.removeEventListener(
      'pointerlockchange',
      this.handlePointerLockChange
    );
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.disposeScene();
    super.disconnectedCallback();
  }

  protected firstUpdated() {
    if (this.pendingStart) {
      this.pendingStart = false;
      this.startScene();
    }
  }

  private async initialize() {
    try {
      const { getSettings } = await import('../services/settings');
      const settings = await getSettings();
      this.featureEnabled = settings.experimental_3d_timeline === true;
      this.reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (!this.featureEnabled || this.reducedMotion) {
        this.loading = false;
        return;
      }

      this.lowPowerWarning = this.shouldWarnLowPower();
      const { getPaginatedHomeTimeline } = await import('../services/timeline');
      this.posts = await getPaginatedHomeTimeline('home');
      this.loading = false;

      if (this.posts.length > 0 && !this.lowPowerWarning) {
        this.pendingStart = true;
        await this.updateComplete;
        this.startScene();
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
      this.loading = false;
    }
  }

  private async startScene() {
    if (!this.canvas || this.scene || this.posts.length === 0) {
      return;
    }

    const [{ WarpScene }, { WarpCardPool }] = await Promise.all([
      import('../utils/warp/scene'),
      import('../utils/warp/card-pool'),
    ]);

    const theme = this.readTheme();
    this.scene = new WarpScene(this.canvas, this, theme);
    this.cardPool = new WarpCardPool(
      this.posts,
      this.scene.scene,
      this.scene.curve,
      theme
    );
    this.cardPool.update(this.progress, this.scene.camera);
    this.scene.render();
    this.sceneReady = true;
    this.lastInputAt = performance.now();
    this.startLoop();
  }

  private readTheme(): WarpTheme {
    const styles = getComputedStyle(this);
    const value = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;

    return {
      surface: value('--md-sys-color-surface-container-high', '#25252b'),
      onSurface: value('--md-sys-color-on-surface', '#f5f5f5'),
      onSurfaceVariant: value('--md-sys-color-on-surface-variant', '#c8c5cc'),
      primary: value('--md-sys-color-primary', '#9ecaff'),
      outline: value('--md-sys-color-outline', '#8f8d96'),
    };
  }

  private shouldWarnLowPower(): boolean {
    const hardwareConcurrency = navigator.hardwareConcurrency || 8;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;

    return (
      hardwareConcurrency < 4 ||
      (deviceMemory !== undefined && deviceMemory < 4)
    );
  }

  private startLoop() {
    if (this.animationFrame || !this.scene || !this.cardPool) {
      return;
    }

    this.lastFrameTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  private tick = (time: number) => {
    this.animationFrame = 0;

    if (!this.scene || !this.cardPool || document.hidden) {
      return;
    }

    const delta = Math.min((time - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = time;

    const maxProgress = Math.max(0, this.posts.length - 1);
    const targetVelocity = this.inputDirection * this.keyboardTravelSpeed;

    if (this.inputDirection !== 0) {
      const acceleration = Math.min(1, this.travelAcceleration * delta);
      this.travelVelocity +=
        (targetVelocity - this.travelVelocity) * acceleration;
    } else {
      this.travelVelocity *= Math.max(0, 1 - this.travelFriction * delta);
    }

    if (Math.abs(this.travelVelocity) < 0.01) {
      this.travelVelocity = 0;
    }

    if (!this.hasMorePosts && this.travelVelocity > 0) {
      const distanceToEnd = maxProgress - this.progress;
      if (distanceToEnd < 2.2) {
        this.travelVelocity *= Math.max(0.08, distanceToEnd / 2.2);
      }
    }

    this.travelVelocity = clamp(
      this.travelVelocity,
      -this.maxTravelVelocity,
      this.maxTravelVelocity
    );
    this.progress += this.travelVelocity * delta;
    if (this.progress < 0) {
      this.progress = 0;
      this.travelVelocity = Math.max(0, this.travelVelocity);
    }
    if (this.progress > maxProgress) {
      this.progress = maxProgress;
      this.travelVelocity = Math.min(0, this.travelVelocity);
    }

    if (!this.pointerLocked && time - this.lastLookAt > 1200) {
      const returnEase = Math.max(0, 1 - delta * 1.8);
      this.targetLookYaw *= returnEase;
      this.targetLookPitch *= returnEase;
    }

    const lookEase = Math.min(1, delta * 9);
    this.lookYaw += (this.targetLookYaw - this.lookYaw) * lookEase;
    this.lookPitch += (this.targetLookPitch - this.lookPitch) * lookEase;

    this.loadMorePostsIfNeeded();
    this.reachedEnd =
      !this.hasMorePosts &&
      !this.loadingMore &&
      this.progress >= maxProgress - 0.04 &&
      Math.abs(this.travelVelocity) < 0.04;

    this.scene.setCameraProgressWithLook(
      this.progress,
      this.lookYaw,
      this.lookPitch
    );
    this.cardPool.update(this.progress, this.scene.camera);
    this.scene.render();

    const isRecentlyActive = time - this.lastInputAt < 2000;
    const isMoving = Math.abs(this.travelVelocity) > 0.01;
    const isLooking =
      Math.abs(this.targetLookYaw - this.lookYaw) > 0.001 ||
      Math.abs(this.targetLookPitch - this.lookPitch) > 0.001;
    if (
      isMoving ||
      isLooking ||
      this.inputDirection !== 0 ||
      isRecentlyActive
    ) {
      this.animationFrame = requestAnimationFrame(this.tick);
    }
  };

  private handleWheel(event: WheelEvent) {
    event.preventDefault();
    this.travelVelocity = clamp(
      this.travelVelocity + event.deltaY * this.wheelImpulse,
      -this.maxTravelVelocity,
      this.maxTravelVelocity
    );

    if (Math.abs(event.deltaX) > 0.5) {
      this.targetLookYaw = clamp(
        this.targetLookYaw + event.deltaX * 0.003,
        -this.maxLookYaw,
        this.maxLookYaw
      );
      this.lastLookAt = performance.now();
    }

    this.lastInputAt = performance.now();
    this.startLoop();
  }

  private handleTouchStart(event: TouchEvent) {
    this.touchStartY = event.touches[0]?.clientY ?? 0;
    this.touchStartX = event.touches[0]?.clientX ?? 0;
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    const currentY = event.touches[0]?.clientY ?? this.touchStartY;
    const currentX = event.touches[0]?.clientX ?? this.touchStartX;
    const deltaY = this.touchStartY - currentY;
    const deltaX = currentX - this.touchStartX;

    this.travelVelocity = clamp(
      this.travelVelocity + deltaY * 0.045,
      -this.maxTravelVelocity,
      this.maxTravelVelocity
    );
    this.targetLookYaw = clamp(
      this.targetLookYaw - deltaX * 0.004,
      -this.maxLookYaw,
      this.maxLookYaw
    );

    this.touchStartY = currentY;
    this.touchStartX = currentX;
    this.lastInputAt = performance.now();
    this.lastLookAt = performance.now();
    this.startLoop();
  }

  private handlePointerMove(event: PointerEvent) {
    if (
      !this.canvas ||
      this.pointerLocked ||
      this.shouldIgnorePointerEvent(event)
    ) {
      return;
    }

    const bounds = this.canvas.getBoundingClientRect();
    const normalizedX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    const normalizedY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    this.targetLookYaw = clamp(
      normalizedX * this.maxLookYaw,
      -this.maxLookYaw,
      this.maxLookYaw
    );
    this.targetLookPitch = clamp(
      -normalizedY * this.maxLookPitch,
      -this.maxLookPitch,
      this.maxLookPitch
    );
    this.lastInputAt = performance.now();
    this.lastLookAt = performance.now();
    this.startLoop();
  }

  private handlePointerLeave() {
    if (this.pointerLocked) {
      return;
    }

    this.targetLookYaw = 0;
    this.targetLookPitch = 0;
    this.lastInputAt = performance.now();
    this.startLoop();
  }

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement !== null;
    this.lastInputAt = performance.now();
    this.lastLookAt = performance.now();
    this.startLoop();
  };

  private handleMouseMove = (event: MouseEvent) => {
    if (document.pointerLockElement === null) {
      return;
    }

    this.pointerLocked = true;
    this.targetLookYaw = clamp(
      this.targetLookYaw + event.movementX * this.mouseLookSensitivity,
      -this.maxLookYaw,
      this.maxLookYaw
    );
    this.targetLookPitch = clamp(
      this.targetLookPitch - event.movementY * this.mouseLookSensitivity,
      -this.maxLookPitch,
      this.maxLookPitch
    );
    this.lookYaw = this.targetLookYaw;
    this.lookPitch = this.targetLookPitch;

    if (this.scene && this.cardPool) {
      this.scene.setCameraProgressWithLook(
        this.progress,
        this.lookYaw,
        this.lookPitch
      );
      this.cardPool.update(this.progress, this.scene.camera);
      this.scene.render();
    }

    this.lastInputAt = performance.now();
    this.lastLookAt = performance.now();
    this.startLoop();
  };

  private requestCanvasPointerLock() {
    this.canvas?.requestPointerLock?.();
  }

  private handlePointerDown(event: PointerEvent) {
    if (this.shouldIgnorePointerEvent(event)) {
      return;
    }

    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.pointerStartAt = performance.now();
  }

  private handlePointerUp(event: PointerEvent) {
    if (this.shouldIgnorePointerEvent(event)) {
      return;
    }

    const deltaX = event.clientX - this.pointerStartX;
    const deltaY = event.clientY - this.pointerStartY;
    const moved = !this.pointerLocked && Math.hypot(deltaX, deltaY) > 14;
    const held = performance.now() - this.pointerStartAt > 650;
    if (moved || held) {
      return;
    }

    if (!this.canvas || !this.scene || !this.cardPool) {
      return;
    }

    if (!this.pointerLocked) {
      this.requestCanvasPointerLock();
      return;
    }

    const bounds = this.canvas.getBoundingClientRect();
    const pickX = bounds.left + bounds.width / 2;
    const pickY = bounds.top + bounds.height / 2;
    const result = this.cardPool.pick(pickX, pickY, bounds, this.scene.camera);
    if (!result) {
      return;
    }

    if (!result.action) {
      this.travelVelocity *= 0.35;
      this.lastInputAt = performance.now();
      this.startLoop();
      return;
    }

    if (result.action === 'open' || result.action === 'reply') {
      router.navigate(`/home/post/${result.post.id}`, {
        state: { post: result.post },
      });
      return;
    }

    this.handlePostAction(result.postIndex, result.action);
  }

  private shouldIgnorePointerEvent(event: PointerEvent) {
    return event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          (target.closest('.top-bar') || target.closest('.status-panel'))
      );
  }

  private async handlePostAction(postIndex: number, action: 'boost' | 'like') {
    const post = this.posts[postIndex];
    if (!post) {
      return;
    }

    const previousPost = { ...post };
    const nextPost = { ...post };
    const targetId = post.reblog?.id || post.id;

    if (action === 'like') {
      nextPost.favourited = !post.favourited;
      nextPost.favourites_count = Math.max(
        0,
        post.favourites_count + (nextPost.favourited ? 1 : -1)
      );
    } else {
      nextPost.reblogged = !post.reblogged;
      nextPost.reblogs_count = Math.max(
        0,
        post.reblogs_count + (nextPost.reblogged ? 1 : -1)
      );
    }

    this.replacePost(postIndex, nextPost);

    try {
      const timeline = await import('../services/timeline');
      if (action === 'like') {
        if (nextPost.favourited) {
          await timeline.boostPost(targetId);
        } else {
          await timeline.unboostPost(targetId);
        }
        return;
      }

      if (nextPost.reblogged) {
        await timeline.reblogPost(targetId);
      } else {
        await timeline.unreblogPost(targetId);
      }
    } catch (error) {
      console.error(`Failed to ${action} warp post`, error);
      this.replacePost(postIndex, previousPost);
    }
  }

  private replacePost(postIndex: number, post: Post) {
    this.posts = this.posts.map((candidate, index) =>
      index === postIndex ? post : candidate
    );
    this.cardPool?.updatePost(postIndex, post);
    this.lastInputAt = performance.now();
    this.startLoop();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      router.navigate('/home');
      return;
    }

    if (this.isTravelKey(event.key)) {
      event.preventDefault();
      this.pressedKeys.add(event.key.toLowerCase());
      this.updateInputDirection();
      this.lastInputAt = performance.now();
      this.startLoop();
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    if (this.isTravelKey(event.key)) {
      event.preventDefault();
      this.pressedKeys.delete(event.key.toLowerCase());
      this.updateInputDirection();
      this.lastInputAt = performance.now();
      this.startLoop();
    }
  };

  private isTravelKey(key: string): boolean {
    const normalizedKey = key.toLowerCase();
    return (
      normalizedKey === 'arrowup' ||
      normalizedKey === 'arrowdown' ||
      normalizedKey === 'w' ||
      normalizedKey === 's' ||
      normalizedKey === ' '
    );
  }

  private updateInputDirection() {
    const forward =
      this.pressedKeys.has('arrowup') ||
      this.pressedKeys.has('w') ||
      this.pressedKeys.has(' ');
    const backward =
      this.pressedKeys.has('arrowdown') || this.pressedKeys.has('s');

    this.inputDirection = forward === backward ? 0 : forward ? 1 : -1;
  }

  private handleVisibilityChange = () => {
    if (document.hidden) {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
      }
      return;
    }

    this.lastInputAt = performance.now();
    this.startLoop();
  };

  private async loadMorePostsIfNeeded(force = false) {
    if (this.loadingMore || !this.hasMorePosts || this.posts.length === 0) {
      return;
    }

    const remainingPosts = this.posts.length - 1 - Math.floor(this.progress);
    if (!force && remainingPosts > 8) {
      return;
    }

    this.loadingMore = true;

    try {
      const { getPaginatedHomeTimeline } = await import('../services/timeline');
      const lastPost = this.posts[this.posts.length - 1];
      const nextPosts = await getPaginatedHomeTimeline('home', lastPost.id);
      const existingIds = new Set(this.posts.map((post) => post.id));
      const uniqueNextPosts = nextPosts.filter(
        (post) => !existingIds.has(post.id)
      );

      if (uniqueNextPosts.length === 0) {
        this.hasMorePosts = false;
        return;
      }

      this.posts = [...this.posts, ...uniqueNextPosts];
      this.cardPool?.updatePosts(this.posts);
      this.reachedEnd = false;
      this.lastInputAt = performance.now();
      this.startLoop();
    } catch (error) {
      console.error('Failed to load more warp timeline posts', error);
      this.hasMorePosts = false;
    } finally {
      this.loadingMore = false;
    }
  }

  private disposeScene() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
    this.cardPool?.dispose();
    this.cardPool = null;
    this.scene?.dispose();
    this.scene = null;
  }

  private async enableFeatureAndGoHome() {
    const { setSettings } = await import('../services/settings');
    await setSettings({ experimental_3d_timeline: true });
    router.navigate('/home');
  }

  render() {
    return html`
      <main
        class="warp-shell"
        role="application"
        aria-label="${msg('3D timeline prototype')}"
        @wheel="${this.handleWheel}"
        @touchstart="${this.handleTouchStart}"
        @touchmove="${this.handleTouchMove}"
        @pointerdown="${this.handlePointerDown}"
        @pointermove="${this.handlePointerMove}"
        @pointerleave="${this.handlePointerLeave}"
        @pointerup="${this.handlePointerUp}"
      >
        <canvas></canvas>
        <div class="reticle" aria-hidden="true"></div>

        <div class="top-bar">
          <md-button variant="tonal" @click="${() => router.navigate('/home')}">
            ${msg('Exit')}
          </md-button>
        </div>

        ${this.loading
          ? html`<div class="loader">
              <md-skeleton height="56px"></md-skeleton>
            </div>`
          : nothing}
        ${this.loadingMore
          ? html`<div class="loader">
              <md-skeleton height="56px"></md-skeleton>
            </div>`
          : nothing}
        ${this.renderStatusPanel()}
      </main>
    `;
  }

  private renderStatusPanel() {
    if (this.loading || (this.sceneReady && !this.reachedEnd)) {
      return nothing;
    }

    if (!this.featureEnabled) {
      return html`
        <section class="status-panel">
          <h2>${msg('Warp timeline is off')}</h2>
          <p>
            ${msg(
              'Enable the experimental 3D timeline from Settings to try this prototype.'
            )}
          </p>
          <div class="actions">
            <md-button
              variant="text"
              @click="${() => router.navigate('/home')}"
            >
              ${msg('Back')}
            </md-button>
            <md-button
              variant="filled"
              @click="${() => this.enableFeatureAndGoHome()}"
            >
              ${msg('Enable')}
            </md-button>
          </div>
        </section>
      `;
    }

    if (this.reducedMotion) {
      return html`
        <section class="status-panel">
          <h2>${msg('Motion preference respected')}</h2>
          <p>
            ${msg(
              'The 3D timeline is paused because reduced motion is enabled on this device.'
            )}
          </p>
          <div class="actions">
            <md-button
              variant="filled"
              @click="${() => router.navigate('/home')}"
            >
              ${msg('Open Home')}
            </md-button>
          </div>
        </section>
      `;
    }

    if (this.lowPowerWarning && !this.sceneReady) {
      return html`
        <section class="status-panel">
          <h2>${msg('This may be demanding')}</h2>
          <p>
            ${msg(
              'This prototype uses WebGL and may be less smooth on this device.'
            )}
          </p>
          <div class="actions">
            <md-button
              variant="text"
              @click="${() => router.navigate('/home')}"
            >
              ${msg('Back')}
            </md-button>
            <md-button
              variant="filled"
              @click="${() => {
                this.lowPowerWarning = false;
                this.startScene();
              }}"
            >
              ${msg('Continue')}
            </md-button>
          </div>
        </section>
      `;
    }

    if (this.error) {
      return html`
        <section class="status-panel">
          <h2>${msg('Could not load the warp')}</h2>
          <p>${this.error}</p>
          <div class="actions">
            <md-button
              variant="filled"
              @click="${() => router.navigate('/home')}"
            >
              ${msg('Back')}
            </md-button>
          </div>
        </section>
      `;
    }

    if (this.posts.length === 0) {
      return html`
        <section class="status-panel">
          <h2>${msg('No posts to warp through')}</h2>
          <p>
            ${msg(
              'Your home timeline did not return any posts for this prototype run.'
            )}
          </p>
          <div class="actions">
            <md-button
              variant="filled"
              @click="${() => router.navigate('/home')}"
            >
              ${msg('Back')}
            </md-button>
          </div>
        </section>
      `;
    }

    if (this.reachedEnd) {
      return html`
        <section class="status-panel">
          <h2>${msg('End of warp')}</h2>
          <p>${msg('That is the end of the loaded prototype timeline.')}</p>
          <div class="actions">
            <md-button
              variant="text"
              @click="${() => {
                this.progress = 0;
                this.travelVelocity = 0;
                this.lookYaw = 0;
                this.lookPitch = 0;
                this.targetLookYaw = 0;
                this.targetLookPitch = 0;
                this.reachedEnd = false;
                this.lastInputAt = performance.now();
                this.startLoop();
              }}"
            >
              ${msg('Restart')}
            </md-button>
            <md-button
              variant="filled"
              @click="${() => router.navigate('/home')}"
            >
              ${msg('Exit')}
            </md-button>
          </div>
        </section>
      `;
    }

    return nothing;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

declare global {
  interface HTMLElementTagNameMap {
    'app-warp': AppWarp;
  }
}
