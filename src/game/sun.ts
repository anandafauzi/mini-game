import * as THREE from 'three'

/**
 * Single mutable record of the current sun, written once per frame by
 * DayNight and read by every surface shader (water sheen, wet paddies),
 * so specular highlights always agree with the actual light direction.
 */
export const sunDirection = new THREE.Vector3(0.5, 0.55, -0.67).normalize()
export const sunColor = new THREE.Color('#ffe9c8')
