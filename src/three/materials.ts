import * as THREE from 'three';
import type { DecalId } from '../game/customization';
import { createChibiCraftTextures } from './botChibiCraft';

export function detectSoftwareGl(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function scheduleAfterDraw(
  renderer: THREE.WebGLRenderer,
  isSoftware: boolean,
  fn: () => void
): { cancel: () => void } {
  let cancelled = false;
  let rafId = 0;
  let timerId = 0;

  if (!isSoftware) {
    rafId = requestAnimationFrame(() => {
      if (!cancelled) fn();
    });
    return {
      cancel: () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
      }
    };
  }

  const gl = renderer.getContext() as WebGL2RenderingContext | WebGLRenderingContext;
  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const sync = isWebGL2 && typeof gl.fenceSync === 'function' ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
  if (sync && isWebGL2) {
    gl.flush();
    const poll = () => {
      if (cancelled) {
        try {
          gl.deleteSync(sync);
        } catch {}
        return;
      }
      const st = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (st === gl.UNSIGNALED) {
        timerId = window.setTimeout(poll, 6);
      } else {
        try {
          gl.deleteSync(sync);
        } catch {}
        timerId = window.setTimeout(() => {
          if (!cancelled) fn();
        }, 36);
      }
    };
    timerId = window.setTimeout(poll, 6);
  } else {
    timerId = window.setTimeout(() => {
      if (!cancelled) fn();
    }, 44);
  }

  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(timerId);
      cancelAnimationFrame(rafId);
    }
  };
}

function makeCanvasTexture(
  size: number,
  drawFn: (ctx: CanvasRenderingContext2D, s: number) => void,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextures {
  hazard: THREE.CanvasTexture;
  floorDeck: THREE.CanvasTexture;
  floorBump: THREE.CanvasTexture;
  magWall: THREE.CanvasTexture;
  metalBump: THREE.CanvasTexture;
  ceramicNormal: THREE.CanvasTexture;
  ceramicRoughness: THREE.CanvasTexture;
  brushedMetalNormal: THREE.CanvasTexture;
  chassisPanel: THREE.CanvasTexture;
  solarCells: THREE.CanvasTexture;
  mudTex: THREE.CanvasTexture;
  rampTex: THREE.CanvasTexture;
  shadowBlob: THREE.CanvasTexture;
  skyDome: THREE.CanvasTexture;
  turntableGlow: THREE.CanvasTexture;
  chibiIris: THREE.CanvasTexture;
  chestCore: THREE.CanvasTexture;
  decals: Record<DecalId, THREE.CanvasTexture>;
  dispose: () => void;
}

export function getSharedTextureSet(tex: ProceduralTextures): Set<THREE.Texture> {
  const set = new Set<THREE.Texture>([
    tex.hazard,
    tex.floorDeck,
    tex.floorBump,
    tex.magWall,
    tex.metalBump,
    tex.ceramicNormal,
    tex.ceramicRoughness,
    tex.brushedMetalNormal,
    tex.chassisPanel,
    tex.solarCells,
    tex.mudTex,
    tex.rampTex,
    tex.shadowBlob,
    tex.skyDome,
    tex.turntableGlow,
    tex.chibiIris,
    tex.chestCore
  ]);
  (Object.keys(tex.decals) as DecalId[]).forEach((k) => {
    set.add(tex.decals[k]);
  });
  return set;
}

export function createProceduralTextures(maxAniso: number): ProceduralTextures {
  const hazard = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#111827';
      for (let i = -s; i < s * 2; i += 48) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 24, 0);
        ctx.lineTo(i - s + 24, s);
        ctx.lineTo(i - s, s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, 0, s, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let i = 0; i < 64; i++) {
        ctx.fillRect((i * 73) % s, (i * 137) % s, 6, 3);
      }
    },
    maxAniso
  );

  const floorDeck = makeCanvasTexture(
    512,
    (ctx, s) => {
      const baseGrad = ctx.createLinearGradient(0, 0, s, s);
      baseGrad.addColorStop(0, '#1e293b');
      baseGrad.addColorStop(0.5, '#253348');
      baseGrad.addColorStop(1, '#1b2638');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, s, s);

      // Subtle diagonal machined micro-grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= s; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }

      // Recessed architectural deck panel seams with inner highlight
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
      for (let x = 0; x <= s; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }
      for (let y = 0; y <= s; y += 128) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
      ctx.lineWidth = 2;
      for (let x = 4; x < s; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }

      // Illuminated sky-cyan magnetic track lanes
      [86, 256, 426].forEach((cx) => {
        const laneGrad = ctx.createLinearGradient(cx - 12, 0, cx + 12, 0);
        laneGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        laneGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.42)');
        laneGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = laneGrad;
        ctx.fillRect(cx - 12, 0, 24, s);
        ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.fillRect(cx - 2, 0, 4, s);
      });

      // Precision machined rivets
      for (let x = 16; x < s; x += 64) {
        for (let y = 16; y < s; y += 64) {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(x + 1, y + 1, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(x, y, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
    maxAniso,
    1,
    1,
    true
  );

  const floorBump = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#787878';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#303030';
      ctx.lineWidth = 4;
      for (let x = 0; x <= s; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }
      for (let y = 0; y <= s; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
      ctx.fillStyle = '#dcdcdc';
      for (let x = 10; x < s; x += 32) {
        for (let y = 10; y < s; y += 32) {
          ctx.fillRect(x, y, 3, 3);
        }
      }
    },
    maxAniso,
    1,
    1,
    false
  );

  const magWall = makeCanvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = '#293548';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 32) {
        ctx.fillStyle = y % 64 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.22)';
        ctx.fillRect(0, y, s, 14);
      }
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.lineWidth = 4;
      for (let x = 0; x <= s; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, s);
        ctx.stroke();
      }
      ctx.fillStyle = '#0ea5e9';
      ctx.fillRect(0, 140, s, 16);
      ctx.fillRect(0, 340, s, 16);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(0, 146, s, 4);
      ctx.fillRect(0, 346, s, 4);
    },
    maxAniso,
    2,
    1,
    true
  );

  const metalBump = makeCanvasTexture(
    256,
    (ctx, s) => {
      // Silky micro-satin ceramic bump map (smooth with ultra-delicate seam)
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#6c6c6c';
      ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, s - 28, s - 28);
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (let i = 0; i < 64; i++) {
        ctx.fillRect(0, (i * 4) % s, s, 1);
      }
    },
    maxAniso,
    1,
    1,
    false
  );

  // Tangent-space normal map converter from a 2D grayscale height canvas
  const heightToNormalTexture = (
    size: number,
    drawHeight: (ctx: CanvasRenderingContext2D, s: number) => void,
    strength: number
  ): THREE.CanvasTexture => {
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = size;
    srcCanvas.height = size;
    const srcCtx = srcCanvas.getContext('2d')!;
    drawHeight(srcCtx, size);
    const srcData = srcCtx.getImageData(0, 0, size, size).data;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = size;
    outCanvas.height = size;
    const outCtx = outCanvas.getContext('2d')!;
    const outImg = outCtx.createImageData(size, size);
    const dst = outImg.data;

    const sampleH = (x: number, y: number): number => {
      const wx = (x + size) % size;
      const wy = (y + size) % size;
      return srcData[(wy * size + wx) * 4] / 255;
    };

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (sampleH(x + 1, y) - sampleH(x - 1, y)) * strength;
        const dy = (sampleH(x, y + 1) - sampleH(x, y - 1)) * strength;
        const nx = -dx;
        const ny = -dy;
        const nz = 1.0;
        const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        const idx = (y * size + x) * 4;
        dst[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
        dst[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
        dst[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
        dst[idx + 3] = 255;
      }
    }
    outCtx.putImageData(outImg, 0, 0);
    const tex = new THREE.CanvasTexture(outCanvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = maxAniso;
    tex.needsUpdate = true;
    return tex;
  };

  // Pixar toy-ceramic tangent-space normal map: smooth shell with recessed panel seams & flush bolt dimples
  const ceramicNormal = heightToNormalTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(0, 0, s, s);
      // Soft beveled outer seam channel
      ctx.strokeStyle = '#686868';
      ctx.lineWidth = 5;
      ctx.strokeRect(12, 12, s - 24, s - 24);
      ctx.strokeStyle = '#383838';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, s - 24, s - 24);
      // Subtle horizontal toy assembly split line
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, s * 0.5);
      ctx.lineTo(s - 14, s * 0.5);
      ctx.stroke();
      // Recessed miniature corner fastener dimples
      const pts: Array<[number, number]> = [
        [24, 24],
        [s - 24, 24],
        [24, s - 24],
        [s - 24, s - 24]
      ];
      for (const [px, py] of pts) {
        const g = ctx.createRadialGradient(px, py, 1, px, py, 6);
        g.addColorStop(0, '#505050');
        g.addColorStop(0.65, '#8c8c8c');
        g.addColorStop(1, '#c8c8c8');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    1.85
  );

  // Paired roughness map: silky glossy ceramic face with subtly more matte seam grooves
  const ceramicRoughness = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#303030'; // ~0.19 roughness base
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#888888'; // ~0.53 roughness inside seam grooves
      ctx.lineWidth = 4;
      ctx.strokeRect(12, 12, s - 24, s - 24);
      ctx.beginPath();
      ctx.moveTo(14, s * 0.5);
      ctx.lineTo(s - 14, s * 0.5);
      ctx.stroke();
      // Micro satin variation
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 48; i++) {
        ctx.fillRect(0, (i * 5) % s, s, 2);
      }
    },
    maxAniso,
    1,
    1,
    false
  );

  // Directional brushed machined metal normal map for titanium, gunmetal, and copper joints
  const brushedMetalNormal = heightToNormalTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y++) {
        const tone = 112 + ((y * 37 + (y % 5) * 19) % 32);
        ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
        ctx.fillRect(0, y, s, 1);
      }
      ctx.strokeStyle = '#585858';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, s - 16, s - 16);
    },
    1.35
  );

  const chassisPanel = makeCanvasTexture(
    512,
    (ctx, s) => {
      // Clean silky toy-ceramic sheen (no brown rust blotches or gritty noise)
      const grad = ctx.createLinearGradient(0, 0, 0, s);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.55, '#fbfdff');
      grad.addColorStop(1, '#eef3f9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, s, s);

      // Soft delicate ceramic panel seam
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.09)';
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, s - 36, s - 36);

      // Subtle glossy top highlight band
      const shine = ctx.createLinearGradient(0, 0, 0, s * 0.35);
      shine.addColorStop(0, 'rgba(255,255,255,0.35)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shine;
      ctx.fillRect(0, 0, s, s * 0.35);
    },
    maxAniso,
    1,
    1,
    true
  );

  const solarCells = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, s, s);
      ctx.fillStyle = '#1d4ed8';
      for (let x = 10; x < s - 10; x += 38) {
        for (let y = 10; y < s - 10; y += 38) {
          ctx.fillRect(x, y, 32, 32);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(x + 2, y + 15, 28, 2);
          ctx.fillStyle = '#1d4ed8';
        }
      }
    },
    maxAniso,
    1,
    1,
    true
  );

  const mudTex = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#452814';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 36; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#5c361c' : '#2e1a0d';
        ctx.beginPath();
        ctx.ellipse((i * 67) % s, (i * 97) % s, 18 + (i % 14), 12 + (i % 10), i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
      for (let i = 0; i < 14; i++) {
        ctx.beginPath();
        ctx.arc((i * 83) % s, (i * 47) % s, 5 + (i % 5), 0, Math.PI * 2);
        ctx.fill();
      }
    },
    maxAniso,
    1,
    1,
    true
  );

  const rampTex = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = '#3b1c4a';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let y = 44; y < s; y += 84) {
        ctx.beginPath();
        ctx.moveTo(46, y + 36);
        ctx.lineTo(s / 2, y);
        ctx.lineTo(s - 46, y + 36);
        ctx.stroke();
      }
    },
    maxAniso,
    1,
    1,
    true
  );

  const shadowBlob = makeCanvasTexture(
    128,
    (ctx, s) => {
      const g = ctx.createRadialGradient(s / 2, s / 2, 8, s / 2, s / 2, s * 0.46);
      g.addColorStop(0, 'rgba(0,0,0,0.68)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    1,
    1,
    1,
    true
  );

  const drawPanelBase = (ctx: CanvasRenderingContext2D, s: number) => {
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, '#fbfdff');
    grad.addColorStop(1, '#eef3f9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.08)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, s - 20, s - 20);
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, rOut: number, rIn: number) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? rOut : rIn;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const decals: Record<DecalId, THREE.CanvasTexture> = {
    none: chassisPanel,
    stripes: makeCanvasTexture(
      512,
      (ctx, s) => {
        drawPanelBase(ctx, s);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(s * 0.35, 0, s * 0.1, s);
        ctx.fillRect(s * 0.55, 0, s * 0.1, s);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillRect(s * 0.47, 0, s * 0.06, s);
      },
      maxAniso
    ),
    stars: makeCanvasTexture(
      512,
      (ctx, s) => {
        drawPanelBase(ctx, s);
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = 'rgba(255,255,255,0.94)';
        ctx.lineWidth = 8;
        ctx.lineJoin = 'round';
        drawStar(ctx, s * 0.5, s * 0.48, 96, 44);
        ctx.fillStyle = '#334155';
        drawStar(ctx, s * 0.22, s * 0.24, 40, 18);
        drawStar(ctx, s * 0.78, s * 0.72, 44, 20);
      },
      maxAniso
    ),
    lightning: makeCanvasTexture(
      256,
      (ctx, s) => {
        drawPanelBase(ctx, s);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(s * 0.58, s * 0.1);
        ctx.lineTo(s * 0.26, s * 0.54);
        ctx.lineTo(s * 0.48, s * 0.54);
        ctx.lineTo(s * 0.38, s * 0.9);
        ctx.lineTo(s * 0.76, s * 0.42);
        ctx.lineTo(s * 0.52, s * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      },
      maxAniso
    ),
    flames: makeCanvasTexture(
      256,
      (ctx, s) => {
        drawPanelBase(ctx, s);
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.lineTo(0, s * 0.58);
        ctx.quadraticCurveTo(s * 0.15, s * 0.22, s * 0.28, s * 0.52);
        ctx.quadraticCurveTo(s * 0.45, s * 0.12, s * 0.58, s * 0.46);
        ctx.quadraticCurveTo(s * 0.76, s * 0.16, s * 0.88, s * 0.5);
        ctx.quadraticCurveTo(s * 0.95, s * 0.36, s, s * 0.48);
        ctx.lineTo(s, s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 5;
        ctx.stroke();
      },
      maxAniso
    ),
    leaf: makeCanvasTexture(
      256,
      (ctx, s) => {
        drawPanelBase(ctx, s);
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = 'rgba(255,255,255,0.92)';
        ctx.lineWidth = 5;
        // Twin eco sprout leaves
        ctx.beginPath();
        ctx.ellipse(s * 0.38, s * 0.44, 34, 20, -0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(s * 0.62, s * 0.44, 34, 20, 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * 0.5, s * 0.5);
        ctx.lineTo(s * 0.5, s * 0.82);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.stroke();
      },
      maxAniso
    ),
    hearts: makeCanvasTexture(
      256,
      (ctx, s) => {
        drawPanelBase(ctx, s);
        const drawHeart = (cx: number, cy: number, sc: number) => {
          ctx.beginPath();
          ctx.moveTo(cx, cy + 28 * sc);
          ctx.bezierCurveTo(cx - 46 * sc, cy - 4 * sc, cx - 44 * sc, cy - 44 * sc, cx, cy - 18 * sc);
          ctx.bezierCurveTo(cx + 44 * sc, cy - 44 * sc, cx + 46 * sc, cy - 4 * sc, cx, cy + 28 * sc);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 4;
        drawHeart(s * 0.5, s * 0.52, 1.35);
        drawHeart(s * 0.22, s * 0.25, 0.52);
        drawHeart(s * 0.78, s * 0.25, 0.52);
      },
      maxAniso
    ),
    checker: makeCanvasTexture(
      256,
      (ctx, s) => {
        drawPanelBase(ctx, s);
        const cell = 32;
        ctx.fillStyle = '#0f172a';
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < s / cell; c++) {
            if ((r + c) % 2 === 0) {
              ctx.fillRect(c * cell, s * 0.34 + r * cell, cell, cell);
            }
          }
        }
      },
      maxAniso
    )
  };

  // 11. Procedural Twilight Skyport Sky Dome (1024x512 equirectangular horizon gradient, stars & twilight clouds)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d')!;
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0.0, '#070f21');
  skyGrad.addColorStop(0.24, '#0f2144');
  skyGrad.addColorStop(0.42, '#1a3869');
  skyGrad.addColorStop(0.51, '#315482');
  skyGrad.addColorStop(0.56, '#7b6280');
  skyGrad.addColorStop(0.6, '#b46f58');
  skyGrad.addColorStop(0.66, '#273a5e');
  skyGrad.addColorStop(0.8, '#101c36');
  skyGrad.addColorStop(1.0, '#081022');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 1024, 512);

  // Warm setting solar glow centered along horizon
  const sunGlow = skyCtx.createRadialGradient(512, 294, 8, 512, 294, 240);
  sunGlow.addColorStop(0, 'rgba(253, 224, 140, 0.55)');
  sunGlow.addColorStop(0.28, 'rgba(245, 158, 11, 0.24)');
  sunGlow.addColorStop(0.65, 'rgba(56, 189, 248, 0.08)');
  sunGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  skyCtx.fillStyle = sunGlow;
  skyCtx.fillRect(0, 0, 1024, 512);

  // Subtle deterministic starfield in upper sky dome
  for (let i = 0; i < 150; i++) {
    const sx = ((i * 197 + 43) % 1024);
    const sy = ((i * 89 + 17) % 210);
    const r = i % 9 === 0 ? 1.7 : i % 3 === 0 ? 1.15 : 0.75;
    const alpha = 0.28 + ((i * 31) % 60) / 100;
    skyCtx.fillStyle = i % 7 === 0 ? `rgba(186,230,253,${alpha})` : `rgba(248,250,252,${alpha})`;
    skyCtx.beginPath();
    skyCtx.arc(sx, sy, r, 0, Math.PI * 2);
    skyCtx.fill();
  }

  // Soft twilight cloud bands near horizon
  for (let i = 0; i < 18; i++) {
    const cx = ((i * 173 + 60) % 1024);
    const cy = 225 + (i % 5) * 16;
    const rx = 70 + (i % 4) * 32;
    const ry = 9 + (i % 3) * 5;
    const cg = skyCtx.createRadialGradient(cx, cy, 4, cx, cy, rx);
    cg.addColorStop(0, i % 2 === 0 ? 'rgba(186, 230, 253, 0.16)' : 'rgba(253, 211, 155, 0.15)');
    cg.addColorStop(1, 'rgba(15, 23, 42, 0)');
    skyCtx.fillStyle = cg;
    skyCtx.beginPath();
    skyCtx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    skyCtx.fill();
  }

  const skyDome = new THREE.CanvasTexture(skyCanvas);
  skyDome.colorSpace = THREE.SRGBColorSpace;
  skyDome.wrapS = THREE.RepeatWrapping;
  skyDome.wrapT = THREE.ClampToEdgeWrapping;
  skyDome.needsUpdate = true;

  // 12. Radial Studio Turntable Spotlight Glow
  const turntableGlow = makeCanvasTexture(
    256,
    (ctx, s) => {
      ctx.clearRect(0, 0, s, s);
      const rg = ctx.createRadialGradient(s / 2, s / 2, 8, s / 2, s / 2, s * 0.48);
      rg.addColorStop(0, 'rgba(125, 211, 252, 0.55)');
      rg.addColorStop(0.45, 'rgba(56, 189, 248, 0.22)');
      rg.addColorStop(0.82, 'rgba(14, 165, 233, 0.08)');
      rg.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, s, s);

      // Subtle concentric tech calibration ring
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    },
    1
  );
  turntableGlow.wrapS = THREE.ClampToEdgeWrapping;
  turntableGlow.wrapT = THREE.ClampToEdgeWrapping;

  const chibiCraft = createChibiCraftTextures(maxAniso);

  return {
    hazard,
    floorDeck,
    floorBump,
    magWall,
    metalBump,
    ceramicNormal,
    ceramicRoughness,
    brushedMetalNormal,
    chassisPanel,
    solarCells,
    mudTex,
    rampTex,
    shadowBlob,
    skyDome,
    turntableGlow,
    chibiIris: chibiCraft.irisTex,
    chestCore: chibiCraft.chestCoreTex,
    decals,
    dispose: () => {
      hazard.dispose();
      floorDeck.dispose();
      floorBump.dispose();
      magWall.dispose();
      metalBump.dispose();
      ceramicNormal.dispose();
      ceramicRoughness.dispose();
      brushedMetalNormal.dispose();
      chassisPanel.dispose();
      solarCells.dispose();
      mudTex.dispose();
      rampTex.dispose();
      shadowBlob.dispose();
      skyDome.dispose();
      turntableGlow.dispose();
      chibiCraft.dispose();
      (Object.keys(decals) as DecalId[]).forEach((k) => {
        if (k !== 'none') decals[k].dispose();
      });
    }
  };
}
