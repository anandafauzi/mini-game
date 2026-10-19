import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Water() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorDeep: { value: new THREE.Color('#1e5f74') },
      uColorShallow: { value: new THREE.Color('#3d9eae') },
    }),
    [],
  )

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;
    void main() {
      vUv = uv;
      vec3 pos = position;
      float wave1 = sin(pos.x * 1.5 + uTime * 1.2) * 0.06;
      float wave2 = sin(pos.y * 2.3 - uTime * 0.9) * 0.04;
      float wave3 = sin((pos.x + pos.y) * 1.1 + uTime * 1.7) * 0.03;
      pos.z += wave1 + wave2 + wave3;
      vWave = wave1 + wave2 + wave3;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `

  const fragmentShader = `
    uniform vec3 uColorDeep;
    uniform vec3 uColorShallow;
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;
    void main() {
      float shimmer = sin(vUv.x * 40.0 + uTime * 2.0) * sin(vUv.y * 40.0 - uTime * 1.5) * 0.08;
      vec3 color = mix(uColorDeep, uColorShallow, vUv.y + vWave * 2.0 + shimmer);
      color += vec3(shimmer * 0.5);
      gl_FragColor = vec4(color, 0.92);
    }
  `

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]} receiveShadow>
      <planeGeometry args={[14, 20, 64, 64]} />
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
