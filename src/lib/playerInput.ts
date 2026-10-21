/**
 * Shared player input: keyboard (WASD), virtual joystick vector, and
 * mouse-look deltas. The FishingScene camera controller consumes this.
 */
export interface PlayerInput {
  /** -1..1 strafe (x) and forward (y, +1 = forward) */
  move: { x: number; y: number }
  /** accumulated look deltas in radians, consumed each frame */
  look: { yaw: number; pitch: number }
  pointerLocked: boolean
}

export const playerInput: PlayerInput = {
  move: { x: 0, y: 0 },
  look: { yaw: 0, pitch: 0 },
  pointerLocked: false,
}

const keys = new Set<string>()

export function initKeyboard() {
  const down = (e: KeyboardEvent) => {
    keys.add(e.code)
  }
  const up = (e: KeyboardEvent) => {
    keys.delete(e.code)
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
  }
}

/** Read WASD/arrow keys into a normalized move vector. */
export function readKeyboardMove() {
  let x = 0
  let y = 0
  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1
  const len = Math.hypot(x, y)
  if (len > 1) {
    x /= len
    y /= len
  }
  return { x, y }
}

/** Merge keyboard + look input into playerInput. */
export function combineInput() {
  const kb = readKeyboardMove()
  playerInput.move.x = kb.x
  playerInput.move.y = kb.y
}
