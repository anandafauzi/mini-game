import * as THREE from 'three'
import { fbm, seededRandom } from './noise'

/**
 * Small geometry helpers used to build organic-looking foliage, rocks and
 * props out of primitives — merged, deformed and squashed so nothing reads
 * as a plain sphere / cone / box.
 */

/** Concatenates indexed primitives (position + normal + uv) into one geometry. */
export function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vertexCount = 0
  let indexCount = 0
  for (const g of list) {
    vertexCount += g.attributes.position.count
    indexCount += g.index ? g.index.count : g.attributes.position.count
  }

  const pos = new Float32Array(vertexCount * 3)
  const nor = new Float32Array(vertexCount * 3)
  const uv = new Float32Array(vertexCount * 2)
  const idx = new Uint32Array(indexCount)

  let vo = 0
  let io = 0
  for (const g of list) {
    const p = g.attributes.position as THREE.BufferAttribute
    const n = g.attributes.normal as THREE.BufferAttribute | undefined
    const t = g.attributes.uv as THREE.BufferAttribute | undefined
    const count = p.count

    pos.set(p.array as Float32Array, vo * 3)
    if (n) nor.set(n.array as Float32Array, vo * 3)
    if (t) uv.set(t.array as Float32Array, vo * 2)

    if (g.index) {
      const src = g.index.array
      for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo
      io += src.length
    } else {
      for (let i = 0; i < count; i++) idx[io + i] = vo + i
      io += count
    }
    vo += count
  }

  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  out.setIndex(new THREE.BufferAttribute(idx, 1))
  out.computeVertexNormals()
  return out
}

/** Move every vertex with a callback (local space). */
export function displace(
  geo: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number, i: number) => THREE.Vector3,
): void {
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    const out = fn(pos.getX(i), pos.getY(i), pos.getZ(i), i)
    v.copy(out)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
}

/**
 * Irregular organic blob — an icosahedron pushed around by layered noise so
 * tree canopies and bushes never look like spheres.
 */
export function blob(radius: number, detail: number, seed: number, squashY = 1): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, detail)
  displace(geo, (x, y, z) => {
    const n = fbm(x * 0.9 + seed * 7.3, (y * 0.6 + z * 0.8) * 0.9 + seed * 3.1, 3)
    const k = 0.68 + n * 0.72
    return new THREE.Vector3(x * k, y * k * squashY, z * k)
  })
  return geo
}

/** Two crossed quads, base at y = 0 — a foliage / grass card. */
export function crossCard(width: number, height: number): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(width, height)
  a.translate(0, height / 2, 0)
  const b = a.clone()
  b.rotateY(Math.PI / 2)
  return mergeGeometries([a, b])
}

/* ------------------------------------------------------------------ */
/*  Procedural canvas textures                                         */
/* ------------------------------------------------------------------ */

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  return [canvas, ctx]
}

function finish(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

/**
 * A fan of tapered grass blades. `spread` controls how much the blades splay,
 * `count` how many there are — the same generator drives both ground tufts
 * and the rice plants of the sawah.
 */
export function bladeTexture(opts: {
  count: number
  spread: number
  height: number
  base: string
  tip: string
  seed?: number
}): THREE.CanvasTexture {
  const S = 128
  const [canvas, ctx] = makeCanvas(S)
  const seed = opts.seed ?? 1
  ctx.lineCap = 'round'

  for (let i = 0; i < opts.count; i++) {
    const s = seededRandom(seed + i * 13.7)
    const s2 = seededRandom(seed + i * 7.3 + 5)
    const x0 = S * 0.5 + (s - 0.5) * S * 0.42
    const lean = (s2 - 0.5) * 2 * opts.spread
    const h = S * opts.height * (0.6 + s2 * 0.55)
    const x1 = x0 + lean * S * 0.4
    const y1 = S - h
    const cx = x0 + lean * S * 0.12
    const cy = S - h * 0.55

    const grad = ctx.createLinearGradient(x0, S, x1, y1)
    grad.addColorStop(0, opts.base)
    grad.addColorStop(1, opts.tip)
    ctx.strokeStyle = grad

    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(x0, S)
    ctx.quadraticCurveTo(cx, cy, x1, y1)
    ctx.stroke()

    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.quadraticCurveTo((cx + x1) / 2, (cy + y1) / 2, x1, y1)
    ctx.stroke()
  }

  return finish(canvas)
}

/** Soft round puff used for bushes / distant canopy cards. */
export function puffTexture(color: string, seed: number): THREE.CanvasTexture {
  const S = 128
  const [canvas, ctx] = makeCanvas(S)
  for (let i = 0; i < 26; i++) {
    const a = seededRandom(seed + i * 3.1) * Math.PI * 2
    const r = seededRandom(seed + i * 5.7) * S * 0.3
    const x = S / 2 + Math.cos(a) * r
    const y = S / 2 + Math.sin(a) * r * 0.75
    const rad = S * (0.12 + seededRandom(seed + i * 9.1) * 0.16)
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
    g.addColorStop(0, color)
    g.addColorStop(0.55, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, rad, 0, Math.PI * 2)
    ctx.fill()
  }
  return finish(canvas)
}

/** Soft radial ring — shoreline foam, ripples around rocks, boat wake. */
export function ringTexture(inner: number, outer: number, color = '255,255,255'): THREE.CanvasTexture {
  const S = 128
  const [canvas, ctx] = makeCanvas(S)
  const g = ctx.createRadialGradient(S / 2, S / 2, S * inner, S / 2, S / 2, S * outer)
  g.addColorStop(0, `rgba(${color},0)`)
  g.addColorStop(0.7, `rgba(${color},0.85)`)
  g.addColorStop(1, `rgba(${color},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return finish(canvas)
}
