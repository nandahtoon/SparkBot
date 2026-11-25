import * as THREE from 'three';

const TEXTURE_SLOTS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap'
] as const;

export interface DisposeStats {
  geometries: number;
  materials: number;
  textures: number;
}

/**
 * Recursively disposes geometries, materials, and non-shared textures under a Three.js Object3D.
 * Safely skips any texture present in `sharedTextures` (such as app-wide ProceduralTextures atlases)
 * and deduplicates shared geometries/materials within the subtree.
 */
export function disposeObject3D(
  root: THREE.Object3D,
  sharedTextures?: ReadonlySet<THREE.Texture | null | undefined>
): DisposeStats {
  const disposedGeos = new Set<THREE.BufferGeometry>();
  const disposedMats = new Set<THREE.Material>();
  const disposedTex = new Set<THREE.Texture>();

  root.traverse((obj) => {
    const meshLike = obj as THREE.Object3D & {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };

    if (meshLike.geometry && !disposedGeos.has(meshLike.geometry)) {
      disposedGeos.add(meshLike.geometry);
      meshLike.geometry.dispose();
    }

    if (meshLike.material) {
      const matList = Array.isArray(meshLike.material) ? meshLike.material : [meshLike.material];
      for (const mat of matList) {
        if (!mat || disposedMats.has(mat)) continue;
        disposedMats.add(mat);

        const record = mat as unknown as Record<string, unknown>;
        for (const slot of TEXTURE_SLOTS) {
          const val = record[slot];
          if (val instanceof THREE.Texture) {
            if (sharedTextures?.has(val) || disposedTex.has(val)) continue;
            disposedTex.add(val);
            val.dispose();
          }
        }
        mat.dispose();
      }
    }
  });

  return {
    geometries: disposedGeos.size,
    materials: disposedMats.size,
    textures: disposedTex.size
  };
}

/**
 * Removes and disposes all children of a Group except any explicitly preserved child objects.
 * Prevents GPU buffer/material leaks when tracks, circuits, or dynamic props are rebuilt.
 */
export function clearAndDisposeGroup(
  group: THREE.Group,
  sharedTextures?: ReadonlySet<THREE.Texture | null | undefined>,
  preserve?: ReadonlySet<THREE.Object3D>
): DisposeStats {
  const totals: DisposeStats = { geometries: 0, materials: 0, textures: 0 };
  const children = [...group.children];
  for (const child of children) {
    if (preserve?.has(child)) continue;
    group.remove(child);
    const stats = disposeObject3D(child, sharedTextures);
    totals.geometries += stats.geometries;
    totals.materials += stats.materials;
    totals.textures += stats.textures;
  }
  return totals;
}
