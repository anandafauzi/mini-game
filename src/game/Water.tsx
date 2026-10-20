import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { fbm } from './noise'

/**
 * River surface + riverbed in one shader-driven component.
 *
 * The water is a single plane whose material blends:
 *  - layered directional wave displacement (natural ripples + current)
 *  - depth-based colour (clear turquoise shallow -> dark teal deep)
 *  - fresnel sky reflection
 *  - sun specular highlights
 *  - animated caustics & flowing streaks
 *  - bank/crest foam and a soft shoreline fade
 *
 * The riverbed depth is sampled from a matching function so shallow water is
 * visibly clearer than the deep channel, and passing fish/bobbers interact
 * visually through ripples.
 */

/** Riverbed height for a given world x/z (matches Riverbed.tsx). */
function bedDepth(x: number, z: number): number {
  const n = fbm(x * 0.35 + 20, z * 0.35 + 20, 3)
  const bed = -0.42 + (n - 0.5) * 0.14
  // deeper toward the river centre
  const centre = 1 - Math.min(1, Math.abs(x) / 8)
  return bed - centre * 0.9
}

export function Water() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const quality = useGraphics((s) => s.quality)
  const caustics = useGraphics((s) => s.settings.caustics)
  const segments = useGraphics((s) => s.settings.waterSegments)

  // sample the bed depth into a texture so the shader knows the water depth
  const depthTexture = useMemo(() => {
    const W = 128
    const H = 256
    const data = new Uint8Array(W * H)
    // plane spans x[-8.25,8.25], z[-28,12] around position [0,0,-8]
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const x = (i / (W - 1) - 0.5) * 16.5
        const z = (j / (H - 1) - 0.5) * 40 - 8
        const waterY = 0.02
        const depth = Math.max(0, waterY - bedDepth(x, z))
        data[j * W + i] = Math.min(255, Math.floor((depth / 1.6) * 255))
      }
    }
    const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat)
    tex.needsUpdate = true
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.wrapS = THREE.ClampToEdgeWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color('#0a3f57') },
      uColorMid: { value: new THREE.Color('#12718f') },
      uColorShallow: { value: new THREE.Color('#5fc0c4') },
      uColorSky: { value: new THREE.Color('#cfe9fb') },
      uColorFoam: { value: new THREE.Color('#eefaff') },
      uCameraPos: { value: new THREE.Vector3(0, 1.6, 3) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.85, 0.3).normalize() },
      uSunColor: { value: new THREE.Color('#fff3d8') },
      uDepthMap: { value: depthTexture },
      uCaustics: { value: caustics ? 1 : 0 },
    }),
    [depthTexture, caustics],
  )

  const vertexShader = `
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vNormal;

    float wave(vec3 p, vec2 dir, float freq, float speed, float t) {
      return sin(dot(p.xz, dir) * freq + t * speed);
    }

    void main() {
      vUv = uv;
      vec3 pos = position;

      float w1 = wave(pos, normalize(vec2(0.15, 1.0)), 0.9, 1.1, uTime) * 0.075;
      float w2 = wave(pos, normalize(vec2(-0.25, 1.0)), 2.0, 1.6, uTime) * 0.045;
      float w3 = wave(pos, normalize(vec2(0.4, 1.0)), 4.1, 2.3, uTime) * 0.024;
      float w4 = wave(pos, normalize(vec2(-0.6, 1.0)), 8.2, 3.2, uTime) * 0.011;
      float h = w1 + w2 + w3 + w4;

      float dx = wave(pos + vec3(0.08,0.0,0.0), normalize(vec2(0.15,1.0)), 0.9, 1.1, uTime) * 0.075
               + wave(pos + vec3(0.08,0.0,0.0), normalize(vec2(-0.25,1.0)), 2.0, 1.6, uTime) * 0.045
               - w1 - w2;
      float dz = wave(pos + vec3(0.0,0.0,0.08), normalize(vec2(0.15,1.0)), 0.9, 1.1, uTime) * 0.075
               + wave(pos + vec3(0.0,0.0,0.08), normalize(vec2(-0.25,1.0)), 2.0, 1.6, uTime) * 0.045
               - w1 - w2;
      vNormal = normalize(vec3(-dx * 10.0, 1.0, -dz * 10.0));

      pos.z += h;
      vHeight = h;

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `

  const fragmentShader = `
    uniform vec3 uColorDeep;
    uniform vec3 uColorMid;
    uniform vec3 uColorShallow;
    uniform vec3 uColorSky;
    uniform vec3 uColorFoam;
    uniform vec3 uCameraPos;
    uniform vec3 uSunDir;
    uniform vec3 uSunColor;
    uniform sampler2D uDepthMap;
    uniform float uCaustics;
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vNormal;

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

      // water depth sampled from the bed texture (0..1)
      float depth = texture2D(uDepthMap, vUv).r;

      // fresnel
      float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
      float flatFresnel = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.2);

      // depth-based colour: shallow turquoise -> mid -> deep teal
      vec3 col = mix(uColorShallow, uColorMid, smoothstep(0.0, 0.55, depth));
      col = mix(col, uColorDeep, smoothstep(0.5, 1.0, depth));

      // sky reflection
      col = mix(col, uColorSky, fresnel * 0.55 + flatFresnel * 0.15);

      // sun specular glints
      vec3 H = normalize(uSunDir + V);
      float spec = pow(max(dot(N, H), 0.0), 240.0);
      col += uSunColor * spec * 1.8;

      // animated caustics (fade with depth so deep water is opaque)
      if (uCaustics > 0.5) {
        vec2 cUV = vWorldPos.xz * 0.7 + vec2(uTime * 0.12, uTime * 0.3);
        float caust = noise(cUV) * noise(cUV * 2.2 + 4.0);
        col += vec3(0.4, 0.75, 0.7) * pow(caust, 3.0) * (1.0 - depth) * 0.6;
      }

      // flowing streaks along the current
      float flow = sin(vWorldPos.z * 2.6 + uTime * 2.0 + vWorldPos.x * 1.4) * 0.5 + 0.5;
      col += vec3(0.12, 0.22, 0.22) * pow(flow, 6.0) * 0.35;

      // foam near banks and on wave crests
      float bankFoam = smoothstep(5.5, 7.6, abs(vWorldPos.x));
      float shoreFoam = smoothstep(7.4, 8.1, abs(vWorldPos.x));
      float crestFoam = smoothstep(0.06, 0.11, vHeight);
      float foam = clamp(bankFoam * 0.35 + shoreFoam * 0.6 + crestFoam, 0.0, 1.0);
      col = mix(col, uColorFoam, foam * 0.7);

      // transparency: shallow = clearer, deep = opaque
      float alpha = mix(0.55, 0.94, depth);
      alpha = mix(alpha, 0.97, fresnel);
      alpha = mix(alpha, 1.0, foam * 0.6);

      gl_FragColor = vec4(col, alpha);
    }
  `

  useFrame((state) => {
    if (!materialRef.current) return
    const u = materialRef.current.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uCameraPos.value.copy(state.camera.position)
    const t = state.clock.elapsedTime
    u.uSunDir.value.set(0.4 + Math.sin(t * 0.02) * 0.08, 0.85, 0.3).normalize()
    u.uCaustics.value = caustics ? 1 : 0
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -8]} receiveShadow>
      <planeGeometry args={[16.5, 40, segments[0], segments[1]]} />
      <shaderMaterial
        ref={materialRef}
        key={quality}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}
