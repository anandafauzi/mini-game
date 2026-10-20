import { useEffect, useState } from 'react'

export type FishingUiState = 'idle' | 'casting' | 'waiting' | 'approaching' | 'bite' | 'reeling' | 'caught' | 'escaped'

const STATE_EVENT = 'fishing-state'

export function emitFishingState(state: FishingUiState) {
  window.dispatchEvent(new CustomEvent<FishingUiState>(STATE_EVENT, { detail: state }))
}

export function useFishingAction() {
  const [state, setState] = useState<FishingUiState>('idle')

  useEffect(() => {
    const handler = (e: Event) => setState((e as CustomEvent<FishingUiState>).detail)
    window.addEventListener(STATE_EVENT, handler)
    return () => window.removeEventListener(STATE_EVENT, handler)
  }, [])

  const trigger = () => {
    window.dispatchEvent(new CustomEvent('fishing-action'))
  }

  return { state, trigger }
}
