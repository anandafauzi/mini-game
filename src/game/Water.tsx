import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Water() {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color('#1673b8') },
      uColorShallow: { value: new THREE.Color('#5cc6e6') },
      uColorSky: { value: new THREE.Color('#cdeafc') },
      uCameraPos: { value: new THREE.Vector3(0, 1.6, 3) },
    }),
    [],
  )

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;
    varying vec3 vWorldPos;

    float wave(vec2 p, float freq, float speed, float t) {
      return sin(p.x * freq + t * speed) * cos(p.y * freq * 0.7 - t * speed * 0.8);
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      float w1 = wave(pos.xy, 1.2, 1.1, uTime) * 0.07;
      float w2 = wave(pos.xy * 1.7, 3.1, 1.6, uTime) * 0.035;
      float w3 = wave(pos.xy * 2.3, 6.4, 2.2, uTime) * 0.018;
      float w4 = wave(pos.xy * 0.6, 8.7, 2.8, uTime) * 0.012;
      pos.z += w1 + w2 + w3 + w4;
      vWave = w1 + w2 + w3 + w4;

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `

  const fragmentShader = `
    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    uniform vec3 uColorSky;
    uniform vec3 uCameraPos;
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;
    varying vec3 vWorldPos;

    void main() {
      vec3 viewDir = normalize(uCameraPos - vWorldPos);
      float fresnel = pow(1.0 - clamp(viewDir.y, 0.0, 1.0), 2.2);

      float shimmer = sin(vWorldPos.x * 5.0 + uTime * 2.0) * sin(vWorldPos.z * 6.0 - uTime * 1.6) * 0.5 + 0.5;
      float ripple = sin(vWorldPos.x * 14.0 + vWorldPos.z * 9.0 + uTime * 3.5) * 0.5 + 0.5;

      float depthMix = clamp(vUv.y + vWave * 3.0, 0.0, 1.0);
      vec3 base = mix(uColorShallow, uColorDeep, depthMix);

      vec3 color = mix(base, uColorSky, fresnel * 0.5);
      color += vec3(0.35) * pow(shimmer, 3.0) * 0.5;
      color += vec3(0.15) * pow(ripple, 6.0);

      float spec = pow(max(0.0, sin(shimmer * 3.14159 + uTime)), 12.0);
      color += vec3(1.0, 0.98, 0.9) * spec * 0.25;

      gl_FragColor = vec4(color, 0.82);
    }
  `

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position)
    }
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]} receiveShadow>
      <planeGeometry args={[16, 22, 160, 160]} />
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
