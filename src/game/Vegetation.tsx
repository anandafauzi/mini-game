import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGraphics } from '../lib/graphics'
import { seededRandom } from './noise'
import { riverCenterX, riverHalfWidth, sampleLand } from './landscape'
import { blob, crossCard, mergeGeometries, bladeTexture } from './geom'

/**
 * Everything that grows in the valley, all instanced:
 * trees on the slopes, bamboo clumps on the banks, rice cards standing in the
 * flooded paddies, grass tufts on open ground and reeds at the waterline.
 *
 * Placement is deterministic and rule-driven off the shared terrain function,
 * so nothing ever lands in the river or floats above a terrace. A density mask
 * thins everything out in the corridor the angler looks down, which keeps the
 * river itself the clear centre of the frame.
 */

interface Spot {
  x: number
  y: number
  z: number
  rot: number
  sx: number
  sy: number
  sz: number
  color?: string
}

const UP = new THREE.Vector3(0, 1, 0)

/** Thinning mask: 1 = normal growth, 0 = keep clear. */
function viewMask(x: number, z: number): number {
  if (z > -80 && z < 8 && Math.abs(x) < 15) return 0.2
  if (z > -30 && z < 4 && Math.abs(x) < 22) return 0.45
  return 1
}

function scatter(
  count: number,
  seed: number,
  range: number,
  place: (x: number, z: number, rnd: number) => Spot | null,
): Spot[] {
  const out: Spot[] = []
  const maxAttempts = count * 14
  for (let a = 0; a < maxAttempts && out.length < count; a++) {
    const ang = seededRandom(seed + a * 1.13) * Math.PI * 2
    const r = Math.pow(seededRandom(seed + a * 2.71), 0.62) * range
    const x = Math.cos(ang) * r
    const z = Math.sin(ang) * r
    if (seededRandom(seed + a * 3.97) > viewMask(x, z)) continue
    const spot = place(x, z, seededRandom(seed + a * 5.31))
    if (spot) out.push(spot)
  }
  return out
}

function InstancedField({
  geometry,
  material,
  spots,
  castShadow = false,
  receiveShadow = true,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  spots: Spot[]
  castShadow?: boolean
  receiveShadow?: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    for (let i = 0; i < spots.length; i++) {
      const sp = spots[i]
      p.set(sp.x, sp.y, sp.z)
      q.setFromAxisAngle(UP, sp.rot)
      s.set(sp.sx, sp.sy, sp.sz)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
      if (sp.color) mesh.setColorAt(i, c.set(sp.color))
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [spots])

  if (spots.length === 0) return null
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, spots.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={false}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

function trunkGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.11, 0.26, 3.6, 7, 1)
  g.translate(0, 1.8, 0)
  return g
}

/** A taller, slimmer trunk for the second tree archetype. */
function trunkTallGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.08, 0.22, 5.2, 7, 1)
  g.translate(0, 2.6, 0)
  return g
}

function canopyGeometry(seed: number, radius: number, y: number): THREE.BufferGeometry {
  const g = blob(radius, 1, seed, 0.78)
  g.translate(0, y, 0)
  return g
}

function bambooClump(seed: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 6; i++) {
    const h = 4.0 + seededRandom(seed + i) * 2.8
    const stalk = new THREE.CylinderGeometry(0.026, 0.05, h, 5, 1)
    stalk.translate(0, h / 2, 0)
    const leanX = (seededRandom(seed + i * 3.1) - 0.5) * 0.45
    const leanZ = (seededRandom(seed + i * 5.7) - 0.5) * 0.45
    stalk.rotateX(leanZ)
    stalk.rotateZ(leanX)
    const bx = (seededRandom(seed + i * 7.3) - 0.5) * 0.8
    const bz = (seededRandom(seed + i * 9.1) - 0.5) * 0.8
    stalk.translate(bx, 0, bz)
    parts.push(stalk)

    for (let t = 0; t < 2; t++) {
      const tuft = new THREE.IcosahedronGeometry(0.36, 0)
      tuft.scale(1.5, 0.4, 1.5)
      tuft.translate(bx + leanX * h * 0.42, h * (0.82 + t * 0.13), bz + leanZ * h * 0.42)
      parts.push(tuft)
    }
  }
  const merged = mergeGeometries(parts)
  parts.forEach((p) => p.dispose())
  return merged
}

/* ------------------------------------------------------------------ */
/*  Textures & materials                                               */
/* ------------------------------------------------------------------ */

function useMaterials() {
  return useMemo(() => {
    const grassCard = bladeTexture({
      count: 9,
      spread: 0.85,
      height: 0.92,
      base: '#3d5c1f',
      tip: '#7fa53c',
      seed: 4,
    })
    const riceCard = bladeTexture({
      count: 7,
      spread: 0.35,
      height: 0.98,
      base: '#4a6b22',
      tip: '#9bbf4a',
      seed: 11,
    })
    const reedCard = bladeTexture({
      count: 6,
      spread: 0.28,
      height: 1,
      base: '#3c5524',
      tip: '#6f8f3a',
      seed: 19,
    })
    const card = (map: THREE.Texture) =>
      new THREE.MeshStandardMaterial({
        map,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.92,
        metalness: 0,
      })

    return {
      trunk: new THREE.MeshStandardMaterial({ color: '#6a5136', roughness: 0.9 }),
      canopy: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }),
      bamboo: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }),
      bush: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
      grass: card(grassCard),
      rice: card(riceCard),
      reed: card(reedCard),
    }
  }, [])
}

/* ------------------------------------------------------------------ */
/*  Placement                                                          */
/* ------------------------------------------------------------------ */

function useVegetation(density: number) {
  return useMemo(() => {
    const d = density

    const trees = scatter(Math.round(120 * d), 21, 210, (x, z, rnd) => {
      const s = sampleLand(x, z)
      if (s.t < 1.4 || s.paddy > 0.35) return null
      if (s.h < 0.5 || s.h > 46) return null
      if (rnd > 0.55) return null
      const scale = 0.75 + rnd * 1.1
      return {
        x,
        y: s.h - 0.15,
        z,
        rot: rnd * Math.PI * 2,
        sx: scale * (0.85 + rnd * 0.3),
        sy: scale,
        sz: scale * (0.85 + rnd * 0.3),
        color: ['#3f6b2a', '#4c7a30', '#355c24', '#568438', '#2f5220', '#4a7d3a', '#3a6636'][
          Math.floor(rnd * 7)
        ],
      }
    })

    // A second, taller tree archetype so the treeline never repeats one shape.
    const treesTall = scatter(Math.round(60 * d), 33, 190, (x, z, rnd) => {
      const s = sampleLand(x, z)
      if (s.t < 1.6 || s.paddy > 0.3 || s.h < 1 || s.h > 40) return null
      if (rnd < 0.35) return null
      const scale = 0.8 + rnd * 1.0
      return {
        x,
        y: s.h - 0.15,
        z,
        rot: rnd * Math.PI * 2,
        sx: scale * (0.8 + rnd * 0.3),
        sy: scale * (0.95 + rnd * 0.35),
        sz: scale * (0.8 + rnd * 0.3),
        color: ['#2f5220', '#3a6636', '#456f2c', '#2c4a1c', '#547f3a'][Math.floor(rnd * 5)],
      }
    })

    const bamboo = scatter(Math.round(80 * d), 47, 140, (x, z, rnd) => {
      const s = sampleLand(x, z)
      if (s.t < 1.5 || s.t > 30 || s.paddy > 0.4) return null
      if (s.h < 0.4 || s.h > 14) return null
      if (rnd > 0.4) return null
      const scale = 0.7 + rnd * 0.7
      return {
        x,
        y: s.h - 0.1,
        z,
        rot: rnd * Math.PI * 2,
        sx: scale,
        sy: scale * (0.85 + rnd * 0.4),
        sz: scale,
        color: rnd > 0.5 ? '#6f9440' : '#87a64d',
      }
    })

    const rice = scatter(Math.round(2600 * d), 73, 120, (x, z, rnd) => {
      const s = sampleLand(x, z)
      if (s.paddy < 0.55) return null
      const which = rnd
      const color =
        which < 0.35 ? '#7fa83c' : which < 0.62 ? '#9dbd4a' : which < 0.85 ? '#c2c259' : '#6f9440'
      return {
        x,
        y: s.h + 0.01,
        z,
        rot: rnd * Math.PI * 2,
        sx: 0.5 + rnd * 0.35,
        sy: 0.42 + rnd * 0.3,
        sz: 0.5 + rnd * 0.35,
        color,
      }
    })

    const grass = scatter(Math.round(800 * d), 97, 95, (x, z, rnd) => {
      const s = sampleLand(x, z)
      if (s.t < 0.9 || s.paddy > 0.35 || s.h > 14) return null
      if (rnd > 0.6) return null
      return {
        x,
        y: s.h,
        z,
        rot: rnd * Math.PI * 2,
        sx: 0.55 + rnd * 0.7,
        sy: 0.4 + rnd * 0.55,
        sz: 0.55 + rnd * 0.7,
        color: rnd > 0.5 ? '#6d9440' : '#87a34c',
      }
    })

    const reeds = scatter(Math.round(320 * d), 131, 110, (x, z, rnd) => {
      const s = sampleLand(x, z)
      // right at the waterline, on both banks
      if (s.t > 1.1 || s.t < -0.6) return null
      if (Math.abs(x - riverCenterX(z)) > riverHalfWidth(z) + 1.2) return null
      return {
        x,
        y: Math.min(s.h, 0) - 0.05,
        z,
        rot: rnd * Math.PI * 2,
        sx: 0.45 + rnd * 0.4,
        sy: 0.75 + rnd * 0.75,
        sz: 0.45 + rnd * 0.4,
        color: rnd > 0.5 ? '#5d7f34' : '#7a9844',
      }
    })

    const bushes = scatter(Math.round(170 * d), 157, 150, (x, z, rnd) => {
      const s = sampleLand(x, z)
      if (s.t < 1.6 || s.paddy > 0.35 || s.h > 22) return null
      if (rnd > 0.5) return null
      const scale = 0.5 + rnd * 0.9
      return {
        x,
        y: s.h - scale * 0.25,
        z,
        rot: rnd * Math.PI * 2,
        sx: scale,
        sy: scale * 0.8,
        sz: scale,
        color: ['#3a5e26', '#476d2c', '#2f5220', '#527a33'][Math.floor(rnd * 4)],
      }
    })

    return { trees, treesTall, bamboo, rice, grass, reeds, bushes }
  }, [density])
}

/* ------------------------------------------------------------------ */

export function Vegetation() {
  const density = useGraphics((s) => s.settings.instancingDensity)
  const mats = useMaterials()
  const geo = useMemo(
    () => ({
      trunk: trunkGeometry(),
      trunkTall: trunkTallGeometry(),
      canopyLow: canopyGeometry(2.4, 1.6, 3.2),
      canopyHigh: canopyGeometry(7.9, 1.15, 4.5),
      canopyTallLow: canopyGeometry(4.9, 1.5, 4.6),
      canopyTallHigh: canopyGeometry(12.3, 1.05, 5.6),
      bamboo: bambooClump(31),
      bush: blob(1, 1, 53, 0.62),
      grass: crossCard(1, 1),
      rice: crossCard(1, 1),
      reed: crossCard(1, 1),
    }),
    [],
  )

  const v = useVegetation(density)

  return (
    <group>
      {/* trees: shared trunk plus two canopy layers on the same transform */}
      <InstancedField geometry={geo.trunk} material={mats.trunk} spots={v.trees} castShadow />
      <InstancedField geometry={geo.canopyLow} material={mats.canopy} spots={v.trees} castShadow />
      <InstancedField geometry={geo.canopyHigh} material={mats.canopy} spots={v.trees} castShadow />

      {/* tall tree archetype */}
      <InstancedField geometry={geo.trunkTall} material={mats.trunk} spots={v.treesTall} castShadow />
      <InstancedField geometry={geo.canopyTallLow} material={mats.canopy} spots={v.treesTall} castShadow />
      <InstancedField geometry={geo.canopyTallHigh} material={mats.canopy} spots={v.treesTall} castShadow />

      <InstancedField geometry={geo.bamboo} material={mats.bamboo} spots={v.bamboo} castShadow />
      <InstancedField geometry={geo.bush} material={mats.bush} spots={v.bushes} castShadow />

      <InstancedField geometry={geo.grass} material={mats.grass} spots={v.grass} />
      <InstancedField geometry={geo.rice} material={mats.rice} spots={v.rice} />
      <InstancedField geometry={geo.reed} material={mats.reed} spots={v.reeds} />
    </group>
  )
}
