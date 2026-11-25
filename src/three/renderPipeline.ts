import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { GraphicsQualityBudget } from '../game/graphicsConfig';

/**
 * Modular rendering and selective HDR bloom post-processing pipeline.
 *
 * Uses a single HDR EffectComposer pass (`RenderPass` -> scaled `UnrealBloomPass` -> `OutputPass`)
 * with a calibrated luminance threshold (> 1.0) so only glowing eyes, cores, lasers, plasma plumes,
 * and holographic rings bloom while keeping Pixar toy-ceramic shells crisp and vibrant.
 *
 * Automatically bypasses EffectComposer on Software WebGL or Eco tier for direct single-pass speed.
 */
export class RenderPipeline {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly isSoftwareGl: boolean;

  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private outputPass: OutputPass | null = null;

  private width: number;
  private height: number;
  private bloomActive = false;
  private bloomSuppressed = false;
  private bloomResolutionScale = 0.5;
  private disposed = false;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    isSoftwareGl: boolean,
    initialBudget: GraphicsQualityBudget
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.width = Math.max(320, width);
    this.height = Math.max(240, height);
    this.isSoftwareGl = isSoftwareGl;

    this.applyBudget(initialBudget);
  }

  private ensureComposer(): void {
    if (this.composer || this.isSoftwareGl || this.disposed) return;

    const rt = new THREE.WebGLRenderTarget(this.width, this.height, {
      type: THREE.HalfFloatType,
      samples: this.renderer.capabilities.isWebGL2 ? 4 : 0
    });

    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.width, this.height);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    const bw = Math.max(128, Math.round(this.width * this.bloomResolutionScale));
    const bh = Math.max(96, Math.round(this.height * this.bloomResolutionScale));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(bw, bh), 0.14, 0.18, 1.8);
    this.composer.addPass(this.bloomPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
  }

  public setBloomSuppressed(suppressed: boolean): void {
    this.bloomSuppressed = suppressed;
  }

  public applyBudget(budget: GraphicsQualityBudget): void {
    if (this.disposed) return;

    const targetDpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, budget.maxPixelRatio);
    this.renderer.setPixelRatio(targetDpr);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && budget.shadowsEnabled;

    const shouldBloom = !this.isSoftwareGl && budget.bloomEnabled;
    this.bloomActive = shouldBloom;
    this.bloomResolutionScale = budget.bloomResolutionScale;

    if (shouldBloom) {
      this.ensureComposer();
      if (this.composer && this.bloomPass) {
        this.composer.setPixelRatio(targetDpr);
        this.composer.setSize(this.width, this.height);
        this.bloomPass.strength = budget.bloomStrength;
        this.bloomPass.radius = budget.bloomRadius;
        this.bloomPass.threshold = budget.bloomThreshold;
        this.bloomPass.resolution.set(
          Math.max(128, Math.round(this.width * this.bloomResolutionScale)),
          Math.max(96, Math.round(this.height * this.bloomResolutionScale))
        );
      }
    }
  }

  public resize(width: number, height: number): void {
    if (this.disposed) return;
    this.width = Math.max(320, width);
    this.height = Math.max(240, height);
    this.renderer.setSize(this.width, this.height);

    if (this.composer && this.bloomPass) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(this.width, this.height);
      this.bloomPass.resolution.set(
        Math.max(128, Math.round(this.width * this.bloomResolutionScale)),
        Math.max(96, Math.round(this.height * this.bloomResolutionScale))
      );
    }
  }

  public rebuildAfterContextRestore(budget: GraphicsQualityBudget): void {
    this.disposeComposerOnly();
    this.applyBudget(budget);
  }

  public render(): void {
    if (this.disposed) return;
    if (this.bloomActive && !this.bloomSuppressed && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private disposeComposerOnly(): void {
    if (this.bloomPass) {
      this.bloomPass.dispose();
      this.bloomPass = null;
    }
    if (this.outputPass) {
      this.outputPass.dispose();
      this.outputPass = null;
    }
    this.renderPass = null;
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.disposeComposerOnly();
  }
}
