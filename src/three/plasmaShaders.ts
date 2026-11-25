import * as THREE from 'three';

export interface PlasmaPlumeShaderUniforms {
  uTime: { value: number };
  uIntensity: { value: number };
  uCoreColor: { value: THREE.Color };
  uOuterColor: { value: THREE.Color };
}

/**
 * Volumetric animated GLSL thruster / afterburner plasma plume shader.
 * Renders glowing Mach-diamond shock nodes, scrolling plasma turbulence,
 * and soft Fresnel silhouette falloff with HDR emissive boost for selective bloom.
 */
export function createPlasmaPlumeMaterial(options: {
  coreHex: number;
  outerHex: number;
}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
      uCoreColor: { value: new THREE.Color(options.coreHex) },
      uOuterColor: { value: new THREE.Color(options.outerHex) }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Subtle high-frequency plasma flutter increasing toward plume tip (uv.y -> 0)
        float tipFactor = clamp(1.0 - uv.y, 0.0, 1.0);
        float flutter = sin(uTime * 42.0 + pos.y * 14.0 + pos.x * 10.0) * 0.022 * tipFactor * uIntensity;
        pos.x += flutter;
        pos.z += cos(uTime * 37.0 + pos.y * 12.0) * 0.022 * tipFactor * uIntensity;

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uCoreColor;
      uniform vec3 uOuterColor;
      varying vec2 vUv;
      varying vec3 vNormalView;
      varying vec3 vViewPos;

      void main() {
        // Cone UV: vUv.y = 1 near nozzle root, 0 at sharp tip
        float rootToTip = clamp(vUv.y, 0.0, 1.0);
        vec3 viewDir = normalize(vViewPos);
        float facing = abs(dot(normalize(vNormalView), viewDir));

        // Scrolling turbulence & Mach-diamond shock bands
        float scroll = vUv.y * 9.0 + uTime * 22.0;
        float waveA = sin(scroll + sin(vUv.x * 18.84955 + uTime * 9.0) * 0.65);
        float waveB = cos(vUv.y * 16.0 + uTime * 31.0 - vUv.x * 12.566);
        float turbulence = 0.5 + 0.32 * waveA + 0.18 * waveB;
        float machDiamonds = pow(0.5 + 0.5 * sin(vUv.y * 18.5 + uTime * 16.0), 3.0) * 0.45;

        // Hot white-core center fading into saturated plasma outer shell
        float coreMask = smoothstep(0.28, 0.92, facing) * smoothstep(0.15, 0.85, rootToTip);
        vec3 col = mix(uOuterColor, uCoreColor, clamp(coreMask + machDiamonds * 0.65, 0.0, 1.0));

        // HDR boost (> 1.0) so selective bloom wraps plumes in a crisp studio glow
        float hdrGain = (1.15 + 0.55 * coreMask + 0.35 * turbulence) * uIntensity;
        float alpha = smoothstep(0.02, 0.38, rootToTip) * smoothstep(0.05, 0.65, facing) * (0.62 + 0.38 * turbulence);

        gl_FragColor = vec4(col * hdrGain, clamp(alpha * uIntensity, 0.0, 0.96));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false
  });
}

/**
 * Fresnel holographic energy shield shader for turbo/shield bubble with
 * subtle hexagonal-feel scan bands and zero center occlusion.
 */
export function createEnergyShieldMaterial(colorHex = 0x38bdf8): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(colorHex) }
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vLocalPos = position;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vLocalPos;

      void main() {
        vec3 viewDir = normalize(vViewPos);
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalView), viewDir)), 2.2);
        float scan = 0.5 + 0.5 * sin(vLocalPos.y * 18.0 - uTime * 6.5);
        float pulse = 0.85 + 0.15 * sin(uTime * 5.0);
        float alpha = (fresnel * 0.88 + scan * 0.14) * uOpacity * pulse;
        vec3 col = uColor * (1.1 + fresnel * 0.95);
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false
  });
}
