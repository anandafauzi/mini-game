import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { TERRAIN_RADIUS, waterDepth } from './landscape'
import { GLSL_WATER_WAVES } from './waterWaves'
import { sunColor, sunDirection } from './sun'

/**
 * The river surface.
 *
 * One strip of water covering the whole channel. Bed depth is baked into a
 * texture straight from the shared terrain function, so the shader can:
 *   - discard wherever the ground is above water (no separate shoreline mesh)
 *   - blend from silty shallows to dark teal with the real depth
 *   - damp the long swells in the shallows so the waterline never flickers
 * Fine ripples, sky fresnel, a soft sun sheen and a thin foam edge live in
 * the fragment shader — they carry no height, so the boat and bobber stay put.
 */

const HALF_W = 34
const HALF_L = TERRAIN_RADIUS
const DEPTH_ENCODE = 3.2
const TEX_W = 160
const TEX_H = 640

function buildDepthTexture(): THREE.DataTexture {
  const data = new Uint8Array(TEX_W * TEX_H)
  for (let j = 0; j < TEX_H; j++) {
    const z = -HALF_L + (j / (TEX_H - 1)) * HALF_L * 2
    for (let i = 0; i < TEX_W; i++) {
      const x = -HALF_W + (i / (TEX_W - 1)) * HALF_W * 2
      const d = waterDepth(x, z)
      data[j * TEX_W + i] = Math.max(0, Math.min(255, Math.round((d / DEPTH_ENCODE) * 255)))
    }
  }
  const tex = new THREE.DataTexture(data, TEX_W, TEX_H, THREE.RedFormat, THREE.UnsignedByteType)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.colorSpace = THREE.NoColorSpace
  tex.needsUpdate = true
  return tex
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uDepthTex;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vDepth;

  ${GLSL_WATER_WAVES}

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 duv = vec2((world.x + ${HALF_W.toFixed(1)}) / ${(HALF_W * 2).toFixed(1)},
                    (world.z + ${HALF_L.toFixed(1)}) / ${(HALF_L * 2).toFixed(1)});
    float depth = texture2D(uDepthTex, duv).r * ${DEPTH_ENCODE.toFixed(2)};
    vDepth = depth;

    // long swells flatten out towards the banks, exactly like real shallows
    float h = waterWaveHeight(world.xz, uTime) * smoothstep(0.0, 0.4, depth);
    world.y += h;

    float e = 0.4;
    float hx = waterWaveHeight(world.xz + vec2(e, 0.0), uTime);
    float hz = waterWaveHeight(world.xz + vec2(0.0, e), uTime);
    vNormalW = normalize(vec3(h - hx, e, h - hz));
    vWorld = world.xyz;

    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform sampler2D uDepthTex;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSkyColor;
  uniform vec3 uColorShallow;
  uniform vec3 uColorMid;
  uniform vec3 uColorDeep;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uSparkle;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying float vDepth;

  // Fine ripple field with an analytic gradient: (height, dh/dx, dh/dz).
  vec3 ripple(vec2 p, float t) {
    p += vec2(sin(p.y * 0.09 + t * 0.3) * 1.4, t * 0.55);
    vec2 d0 = vec2(0.21, 0.98);
    vec2 d1 = vec2(-0.44, 0.90);
    vec2 d2 = vec2(0.72, 0.69);
    float f0 = 0.72, f1 = 1.45, f2 = 2.35;
    float a0 = 0.030, a1 = 0.014, a2 = 0.006;
    float s0 = 0.80, s1 = 1.35, s2 = 2.20;
    float p0 = dot(p, d0) * f0 + t * s0;
    float p1 = dot(p, d1) * f1 + t * s1;
    float p2 = dot(p, d2) * f2 + t * s2;
    float h = a0 * sin(p0) + a1 * sin(p1) + a2 * sin(p2);
    float gx = a0 * f0 * d0.x * cos(p0) + a1 * f1 * d1.x * cos(p1) + a2 * f2 * d2.x * cos(p2);
    float gz = a0 * f0 * d0.y * cos(p0) + a1 * f1 * d1.y * cos(p1) + a2 * f2 * d2.y * cos(p2);
    return vec3(h, gx, gz);
  }

  void main() {
    vec2 duv = vec2((vWorld.x + ${HALF_W.toFixed(1)}) / ${(HALF_W * 2).toFixed(1)},
                    (vWorld.z + ${HALF_L.toFixed(1)}) / ${(HALF_L * 2).toFixed(1)});
    // sampled per-pixel so the shoreline traces the real bed contour
    float depth = texture2D(uDepthTex, duv).r * ${DEPTH_ENCODE.toFixed(2)};
    if (depth < 0.015) discard;

    vec3 rf = ripple(vWorld.xz, uTime);
    vec2 grad = vec2(vNormalW.x, vNormalW.z) / max(vNormalW.y, 0.25);
    grad += vec2(rf.y, rf.z) * 1.5;
    vec3 N = normalize(vec3(-grad.x, 1.0, -grad.y));
    vec3 V = normalize(cameraPosition - vWorld);

    // colour follows the real bed depth: silt-green shallows, teal, dark green
    vec3 col = mix(uColorShallow, uColorMid, smoothstep(0.06, 0.65, depth));
    col = mix(col, uColorDeep, smoothstep(0.65, 2.0, depth));
    float alpha = mix(0.58, 0.96, smoothstep(0.0, 1.1, depth));

    // sky reflection takes over at grazing angles
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
    col = mix(col, uSkyColor, fres * 0.72);
    alpha = mix(alpha, 0.97, fres * 0.7);

    // sun sheen: a broad soft glow plus one tight highlight
    vec3 H = normalize(uSunDir + V);
    float ndh = max(dot(N, H), 0.0);
    col += uSunColor * pow(ndh, 24.0) * 0.09;
    col += uSunColor * pow(ndh, 220.0) * 1.05;
    if (uSparkle > 0.5) {
      col += uSunColor * pow(ndh, 1400.0) * 2.6;
    }

    // thin broken foam right at the waterline
    float shore = 1.0 - smoothstep(0.02, 0.3, depth);
    float foamN = 0.5 + 0.5 * sin(rf.x * 44.0 + vWorld.x * 2.3 + vWorld.z * 1.7);
    float foam = shore * (0.35 + 0.65 * foamN);
    col = mix(col, vec3(0.88, 0.92, 0.90), clamp(foam, 0.0, 1.0) * 0.65);
    alpha = max(alpha, shore * 0.9);

    float fogDist = length(cameraPosition - vWorld);
    col = mix(col, uFogColor, smoothstep(uFogNear, uFogFar, fogDist));

    gl_FragColor = vec4(col, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export function RiverWater() {
  const settings = useGraphics((s) => s.settings)
  const quality = useGraphics((s) => s.quality)
  const { scene } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const depthTex = useMemo(() => buildDepthTexture(), [])
  const segments = settings.waterSegments

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDepthTex: { value: depthTex },
      uSunDir: { value: new THREE.Vector3(0.4, 0.55, -0.73).normalize() },
      uSunColor: { value: new THREE.Color('#ffe9c8') },
      uSkyColor: { value: new THREE.Color('#b9d4e6') },
      uColorShallow: { value: new THREE.Color('#4f7f72') },
      uColorMid: { value: new THREE.Color('#2f6a6b') },
      uColorDeep: { value: new THREE.Color('#1b4650') },
      uFogColor: { value: new THREE.Color('#c8dae6') },
      uFogNear: { value: settings.fogNear },
      uFogFar: { value: settings.fogFar },
      uSparkle: { value: settings.caustics ? 1 : 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [depthTex],
  )

  useFrame((state) => {
    if (!materialRef.current) return
    const u = materialRef.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    ;(u.uSunDir.value as THREE.Vector3).copy(sunDirection)
    ;(u.uSunColor.value as THREE.Color).copy(sunColor)
    u.uFogNear.value = settings.fogNear
    u.uFogFar.value = settings.fogFar
    const fog = scene.fog as THREE.Fog | THREE.FogExp2 | null
    if (fog && 'color' in fog) (u.uFogColor.value as THREE.Color).copy(fog.color)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[HALF_W * 2, HALF_L * 2, segments[0], segments[1]]} />
      <shaderMaterial
        ref={materialRef}
        key={quality}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  )
}
