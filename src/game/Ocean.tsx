import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { GLSL_WAVES } from './oceanWaves'

/**
 * Realistic tropical ocean surface.
 *
 * A single large plane driven by the shared multi-Gerstner wave field with:
 *  - multi-octave swell displacement + analytic normals
 *  - depth / view-dependent colour (turquoise shallows -> deep blue -> dark horizon)
 *  - fresnel sky/reflection blend
 *  - a long shimmering sun glare trail on the water
 *  - crest foam and breakup
 *
 * Quality presets scale the tessellation and switch off the brightest effects
 * on weak devices while keeping the ocean identity intact.
 */

const SIZE = 1600

export function Ocean() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const quality = useGraphics((s) => s.quality)
  const segments = useGraphics((s) => s.settings.waterSegments)
  const caustics = useGraphics((s) => s.settings.caustics)

  const seg = quality === 'low' ? [96, 96] : segments

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCameraPos: { value: new THREE.Vector3(0, 6, 0) },
      uSunDir: { value: new THREE.Vector3(0.35, 0.72, 0.6).normalize() },
      uSunColor: { value: new THREE.Color('#fff2d0') },
      uColorShallow: { value: new THREE.Color('#2fd0c8') },
      uColorMid: { value: new THREE.Color('#0f7fae') },
      uColorDeep: { value: new THREE.Color('#04335e') },
      uColorHorizon: { value: new THREE.Color('#7fb6d8') },
      uSkyColor: { value: new THREE.Color('#bcdcf2') },
      uFoamColor: { value: new THREE.Color('#f2fbff') },
      uFogColor: { value: new THREE.Color('#cfe3f0') },
      uFogNear: { value: 250 },
      uFogFar: { value: 1350 },
      uSparkle: { value: caustics ? 1 : 0 },
      uWaveScale: { value: 1 },
    }),
    [caustics],
  )

  const vertexShader = `
    uniform float uTime;
    uniform float uWaveScale;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vHeight;

    ${GLSL_WAVES}

    void main() {
      vec3 pos = position;
      // scaled wave sampling (fewer high-freq waves on low quality)
      float h = oceanWaveHeight(pos.xz, uTime);
      pos.y += h * uWaveScale;
      vHeight = h;

      // analytic normal via finite differences on the same field
      float e = 0.6;
      float hL = oceanWaveHeight(pos.xz - vec2(e, 0.0), uTime);
      float hR = oceanWaveHeight(pos.xz + vec2(e, 0.0), uTime);
      float hD = oceanWaveHeight(pos.xz - vec2(0.0, e), uTime);
      float hU = oceanWaveHeight(pos.xz + vec2(0.0, e), uTime);
      vNormal = normalize(vec3((hL - hR) * uWaveScale, 2.0 * e, (hD - hU) * uWaveScale));

      vec4 world = modelMatrix * vec4(pos, 1.0);
      vWorldPos = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uCameraPos;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform vec3 uColorShallow;
    uniform vec3 uColorMid;
    uniform vec3 uColorDeep;
    uniform vec3 uColorHorizon;
    uniform vec3 uSkyColor;
    uniform vec3 uFoamColor;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform float uSparkle;
    uniform float uWaveScale;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying float vHeight;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
                 mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
    }

    void main() {
      vec3 V = normalize(uCameraPos - vWorldPos);
      vec3 N = normalize(vNormal);

      float dist = length(uCameraPos.xz - vWorldPos.xz);

      // view/depth-based colour: turquoise near the boat, deep blue, hazy horizon
      float depthMix = smoothstep(4.0, 220.0, dist);
      vec3 col = mix(uColorShallow, uColorMid, smoothstep(0.0, 0.45, depthMix));
      col = mix(col, uColorDeep, smoothstep(0.4, 1.0, depthMix));
      // fade toward atmospheric horizon colour at extreme distance
      col = mix(col, uColorHorizon, smoothstep(0.55, 1.0, dist / 700.0) * 0.75);

      // fresnel reflection of the sky
      float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 4.0);
      float grazing = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
      col = mix(col, uSkyColor, fresnel * 0.6 + grazing * 0.25);

      // sun specular + long glitter trail toward the horizon
      vec3 H = normalize(uSunDir + V);
      float spec = pow(max(dot(N, H), 0.0), 320.0);
      col += uSunColor * spec * 2.4;

      if (uSparkle > 0.5) {
        // glitter: granular sparkle along the sun azimuth
        vec2 g = vWorldPos.xz * 1.6 + vec2(uTime * 0.15);
        float sp = noise(g) * noise(g * 2.7 + 3.1) * noise(g * 5.3 - 1.7);
        vec3 sunFlat = normalize(vec3(uSunDir.x, 0.0, uSunDir.z));
        vec3 toSun = normalize(vec3((uCameraPos.x - vWorldPos.x), 0.0, (uCameraPos.z - vWorldPos.z)));
        float align = pow(max(dot(toSun, sunFlat), 0.0), 8.0);
        col += uSunColor * pow(sp, 3.0) * align * 1.4;
      }

      // crest foam: peaks plus surface breakup noise
      float crest = smoothstep(0.22, 0.5, vHeight * uWaveScale);
      float breakup = smoothstep(0.6, 0.95, noise(vWorldPos.xz * 0.35 + uTime * 0.1));
      float foam = clamp(crest * (0.5 + breakup * 0.6), 0.0, 1.0);
      // thin foam far away to avoid shimmer aliasing
      foam *= 1.0 - smoothstep(120.0, 300.0, dist) * 0.85;
      col = mix(col, uFoamColor, foam * 0.55);

      // distance fog toward the horizon so the sea meets the sky softly
      float fog = smoothstep(uFogNear, uFogFar, dist);
      col = mix(col, uFogColor, fog);

      gl_FragColor = vec4(col, 1.0);
    }
  `

  useFrame((state) => {
    if (!materialRef.current) return
    const u = materialRef.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uCameraPos.value.copy(state.camera.position)
    // keep the sun azimuth slowly drifting for life
    const t = state.clock.elapsedTime
    u.uSunDir.value.set(0.35 + Math.sin(t * 0.01) * 0.05, 0.72, 0.6).normalize()
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[SIZE, SIZE, seg[0], seg[1]]} />
      <shaderMaterial
        ref={materialRef}
        key={quality}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
