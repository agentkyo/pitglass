import type { Frame } from '../../shared/channels.ts'
import type { SourceStatus } from '../../shared/types.ts'

/** One game (or family of games). The hub calls poll() about 30 times a second. */
export interface Source {
  id: string
  /** latest frame, or null while the game is not sending anything. `game` in the frame names the game. */
  poll(now: number): Frame | null
  status(): SourceStatus
  stop(): void
}

export const clamp01 = (v: number) => (v > 1 ? 1 : v > 0 ? v : 0)
export const round = (v: number, dec = 0) => {
  const m = 10 ** dec
  return Math.round(v * m) / m
}
