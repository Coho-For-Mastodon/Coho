import * as THREE from 'three';
import type { WarpTheme } from './post-card-texture';

export const WARP_POST_SPACING = 7.5;
export const WARP_POST_LEAD = 0.72;

export class WarpScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
  readonly renderer: THREE.WebGLRenderer;
  readonly curve: THREE.CatmullRomCurve3;

  private readonly tube: THREE.Mesh;
  private readonly curveLength: number;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly host: HTMLElement,
    theme: WarpTheme
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const points = Array.from(
      { length: 80 },
      (_, index) =>
        new THREE.Vector3(
          Math.sin(index * 0.72) * 1.45,
          Math.cos(index * 0.43) * 0.48,
          index * -8
        )
    );
    points[0].set(0, 0, 0);
    this.curve = new THREE.CatmullRomCurve3(points);
    this.curveLength = this.curve.getLength();

    const tubeGeometry = new THREE.TubeGeometry(
      this.curve,
      512,
      4.4,
      24,
      false
    );
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme.primary),
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    this.tube.renderOrder = 0;
    this.scene.add(this.tube);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1));
    this.setCameraT(0);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  setCameraT(t: number) {
    const clampedT = THREE.MathUtils.clamp(t, 0, 0.985);
    const position = this.curve.getPointAt(clampedT);
    const lookAt = this.curve.getPointAt(Math.min(clampedT + 0.025, 1));

    this.camera.position.copy(position);
    this.camera.lookAt(lookAt);
  }

  setCameraProgressWithLook(progress: number, yaw: number, pitch: number) {
    const t = (progress * WARP_POST_SPACING) / this.curveLength;
    const clampedT = THREE.MathUtils.clamp(t, 0, 0.985);
    const position = this.curve.getPointAt(clampedT);
    const forward = this.curve.getTangentAt(clampedT).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3()
      .crossVectors(forward, worldUp)
      .normalize();

    if (right.lengthSq() < 0.001) {
      right.set(1, 0, 0);
    }

    const lookDirection = forward
      .clone()
      .add(right.multiplyScalar(yaw))
      .add(worldUp.multiplyScalar(pitch))
      .normalize();

    this.camera.position.copy(position);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(position.clone().add(lookDirection));
  }

  setCameraProgress(progress: number) {
    this.setCameraProgressWithLook(progress, 0, 0);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.scene.remove(this.tube);
    this.tube.geometry.dispose();
    (this.tube.material as THREE.Material).dispose();
    this.renderer.dispose();
  }

  private resize() {
    const rect = this.host.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
