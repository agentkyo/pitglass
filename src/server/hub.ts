// The hub polls every source and keeps one current frame: the first game that is sending data.
import { EventEmitter } from 'node:events'
import { derive, type Frame } from '../shared/channels.ts'
import type { SourceStatus } from '../shared/types.ts'
import type { Source } from './sources/source.ts'

export const TICK_MS = 33

/** Keys whose value changed between two frames (removed keys come back as null). */
export function diff(prev: Frame, next: Frame): Frame | null {
  let out: Frame | null = null
  for (const k in next) if (next[k] !== prev[k]) (out ??= {})[k] = next[k]
  for (const k in prev) if (!(k in next)) (out ??= {})[k] = null
  return out
}

export class Hub extends EventEmitter {
  frame: Frame = {}
  game: string | null = null
  private timer: NodeJS.Timeout | null = null

  private sources: Source[]
  private inputs: Source | null

  /** `sources` in priority order; `inputs` only fills in what the game does not send. */
  constructor(sources: Source[], inputs: Source | null = null) {
    super()
    this.sources = sources
    this.inputs = inputs
  }

  start() {
    this.timer = setInterval(() => this.tick(), TICK_MS)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    for (const s of [...this.sources, ...(this.inputs ? [this.inputs] : [])]) s.stop()
  }

  tick(now = Date.now()) {
    let next: Frame | null = null
    for (const s of this.sources) {
      try {
        next = s.poll(now)
      } catch {
        next = null
      }
      if (next) break
    }
    const wheel = this.inputs?.poll(now)
    if (wheel) {
      if (next) for (const k of ['steer', 'throttle', 'brake', 'clutch']) next[k] ??= wheel[k]
      else next = { ...wheel }
    }
    const game = next ? String(next.game) : null
    const frame = next ? derive(next) : {}
    if (game !== this.game) {
      this.game = game
      this.frame = frame
      this.emit('game', game)
      return
    }
    const d = diff(this.frame, frame)
    this.frame = frame
    if (d) this.emit('diff', d)
  }

  status(): SourceStatus[] {
    return [...this.sources, ...(this.inputs ? [this.inputs] : [])].map((s) => s.status())
  }
}
