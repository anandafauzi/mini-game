import { useMemo } from 'react'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { sampleLand, terrainPaint, TERRAIN_RADIUS } from './landscape'

/**
 * The whole valley as one vertex-coloured height field.
 *
 * The grid is uniform in parameter space but warped (`|u|^1.9`) so vertices
 * crowd around the player — sub-metre cells along the river banks, coarse
 * cells out on the mountain flanks. A single draw call covers 1.1 km².
 *
 * A custom attribute carries surface wetness: flooded rice paddies and the
 * muddy shoreline get a much lower roughness than dry grass, so they catch
 * the sky and read as wet without any extra geometry.
 */

const WARP = 1.9

function warp(u: number, limit: number): number {
  return (u < 0 ? -1 : 1) * Math.pow(Math.abs(u), WARP) * limit
}

function buildTerrain(n: number) {
  const L = TERRAIN_RADIUS
  const side = n + 1
  const total = side * side
  const positions = new Float32Array(total * 3)
  const colors = new Float32Array(total * 3)
  const wet = new Float32Array(total)
  // h, d, t, paddy packed for the second pass
  const meta = new Float32Array(total * 4)

  for (let i = 0; i < side; i++) {
    const v = (i / n) * 2 - 1
    const z = warp(v, L)
    for (let j = 0; j < side; j++) {
      const u = (j / n) * 2 - 1
      const x = warp(u, L)
      const k = i * side + j
      const s = sampleLand(x, z)
      positions[k * 3] = x
      positions[k * 3 + 1] = s.h
      positions[k * 3 + 2] = z
      meta[k * 4] = s.h
      meta[k * 4 + 1] = s.d
      meta[k * 4 + 2] = s.t
      meta[k * 4 + 3] = s.paddy
    }
  }

  // second pass: slope from neighbouring heights, then paint
  for (let i = 0; i < side; i++) {
    for (let j = 0; j < side; j++) {
      const k = i * side + j
      const iL = Math.max(0, i - 1)
      const iR = Math.min(side - 1, i + 1)
      const jL = Math.max(0, j - 1)
      const jR = Math.min(side - 1, j + 1)
      const kl = i * side + jL
      const kr = i * side + jR
      const ku = iL * side + j
      const kd = iR * side + j
      const dzp = positions[kd * 3 + 2] - positions[ku * 3 + 2] || 1
      const dzx = positions[kr * 3] - positions[kl * 3] || 1
      const gx = (meta[kr * 4] - meta[kl * 4]) / dzx
      const gz = (meta[kd * 4] - meta[ku * 4]) / dzp
      const ny = 1 / Math.sqrt(gx * gx + gz * gz + 1)
      const slope = 1 - ny

      const paint = terrainPaint(
        {
          h: meta[k * 4],
          d: meta[k * 4 + 1],
          w: 0,
          t: meta[k * 4 + 2],
          r: Math.hypot(positions[k * 3], positions[k * 3 + 2]),
          paddy: meta[k * 4 + 3],
        },
        slope,
      )
      colors[k * 3] = paint.r
      colors[k * 3 + 1] = paint.g
      colors[k * 3 + 2] = paint.b
      wet[k] = paint.wet
    }
  }

  const indices = new Uint32Array(n * n * 6)
  let ptr = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * side + j
      const b = a + 1
      const c = a + side
      const d = c + 1
      indices[ptr++] = a
      indices[ptr++] = c
      indices[ptr++] = b
      indices[ptr++] = b
      indices[ptr++] = c
      indices[ptr++] = d
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setAttribute('aWet', new THREE.BufferAttribute(wet, 1))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

function useTerrainMaterial() {
  return useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0,
    })
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        'attribute float aWet;\nvarying float vWet;\n' +
        shader.vertexShader.replace('void main() {', 'void main() {\n\tvWet = aWet;')
      shader.fragmentShader =
        'varying float vWet;\n' +
        shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\n\troughnessFactor = mix(roughnessFactor, 0.14, clamp(vWet, 0.0, 1.0));',
        )
    }
    mat.customProgramCacheKey = () => 'terrain-wet'
    return mat
  }, [])
}

export function Terrain() {
  const segments = useGraphics((s) => s.settings.terrainSegments)
  const geometry = useMemo(() => buildTerrain(segments), [segments])
  const material = useTerrainMaterial()

  return <mesh geometry={geometry} material={material} receiveShadow />
}
