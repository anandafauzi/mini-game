import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Physically-inspired river surface.
 * - Layered Gerstner-like waves for natural ripples
 * - Directional current flow (streaming down the river)
 * - Fresnel sky reflection + depth-based colour
 * - Sun specular glints and animated caustic sparkle
 * - Soft bank foam
 */
export function Water() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color('#0d4f6b') },
      uColorMid: { value: new THREE.Color('#1f8ab0') },
      uColorShallow: { value: new THREE.Color('#7fd3d8') },
      uColorSky: { value: new THREE.Color('#cfeefc') },
      uColorFoam: { value: new THREE.Color('#eafaff') },
      uCameraPos: { value: new THREE.Vector3(0, 1.6, 3) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
    }),
    [],
  )

  const vertexShader = `
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vNormal;

    // layered directional waves
    float wave(vec3 p, vec2 dir, float freq, float speed, float t) {
      return sin(dot(p.xz, dir) * freq + t * speed);
    }

    void main() {
      vUv = uv;
      vec3 pos = position;

      // current flows along -Z (downstream)
      float w1 = wave(pos, normalize(vec2(0.15, 1.0)), 0.9, 1.2, uTime) * 0.10;
      float w2 = wave(pos, normalize(vec2(-0.25, 1.0)), 2.1, 1.7, uTime) * 0.055;
      float w3 = wave(pos, normalize(vec2(0.4, 1.0)), 4.2, 2.4, uTime) * 0.028;
      float w4 = wave(pos, normalize(vec2(-0.6, 1.0)), 8.5, 3.4, uTime) * 0.012;
      float h = w1 + w2 + w3 + w4;

      // compute approximate normal from wave derivatives
      float dx = wave(pos + vec3(0.08, 0.0, 0.0), normalize(vec2(0.15, 1.0)), 0.9, 1.2, uTime) * 0.10
               + wave(pos + vec3(0.08, 0.0, 0.0), normalize(vec2(-0.25, 1.0)), 2.1, 1.7, uTime) * 0.055
               - w1 - w2;
      float dz = wave(pos + vec3(0.0, 0.0, 0.08), normalize(vec2(0.15, 1.0)), 0.9, 1.2, uTime) * 0.10
               + wave(pos + vec3(0.0, 0.0, 0.08), normalize(vec2(-0.25, 1.0)), 2.1, 1.7, uTime) * 0.055
               - w1 - w2;
      vNormal = normalize(vec3(-dx * 8.0, 1.0, -dz * 8.0));

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
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vNormal;

    // cheap hash + noise for caustics
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

      // fresnel
      float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);
      float flatFresnel = pow(1.0 - clamp(V.y, 0.0, 1.0), 2.0);

      // depth from uv (near camera = shallow)
      float depth = clamp(vUv.y * 0.7 + 0.4, 0.0, 1.0);
      vec3 base = mix(uColorShallow, uColorMid, depth * 0.8);
      base = mix(base, uColorDeep, depth * depth * 0.6);

      // sky reflection on flat viewing angle
      vec3 sky = uColorSky;
      vec3 col = mix(base, sky, fresnel * 0.55 + flatFresnel * 0.15);

      // sun specular glints
      vec3 H = normalize(uSunDir + V);
      float spec = pow(max(dot(N, H), 0.0), 220.0);
      col += vec3(1.0, 0.97, 0.9) * spec * 1.6;

      // animated caustic sparkle
      vec2 cUV = vWorldPos.xz * 0.6 + vec2(uTime * 0.15, uTime * 0.35);
      float caust = noise(cUV) * noise(cUV * 2.3 + 4.0);
      col += vec3(0.4, 0.7, 0.7) * pow(caust, 3.0) * 0.5;

      // flowing streaks along the current
      float flow = sin(vWorldPos.z * 3.0 + uTime * 2.2 + vWorldPos.x * 1.5) * 0.5 + 0.5;
      col += vec3(0.15, 0.25, 0.25) * pow(flow, 6.0) * 0.4;

      // foam near the banks (|x| large) and on wave crests
      float bankFoam = smoothstep(6.0, 8.0, abs(vWorldPos.x));
      float crestFoam = smoothstep(0.09, 0.14, vHeight);
      float foam = clamp(bankFoam * 0.7 + crestFoam, 0.0, 1.0);
      col = mix(col, uColorFoam, foam * 0.7);

      // transparency: clearer near camera, more reflective far
      float alpha = mix(0.62, 0.92, depth);
      alpha = mix(alpha, 0.97, fresnel);
      alpha = mix(alpha, 1.0, foam * 0.6);

      gl_FragColor = vec4(col, alpha);
    }
  `

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position)
      // keep sun direction aligned with the day cycle (approx)
      const t = state.clock.elapsedTime
      materialRef.current.uniforms.uSunDir.value.set(0.4 + Math.sin(t * 0.02) * 0.1, 0.85, 0.3).normalize()
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -8]} receiveShadow>
      <planeGeometry args={[16.5, 40, 120, 170]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  )
}
