import type { RefObject } from 'react'

/** Input the shell collects for every game: keys, the pointer over the stage, and taps. */
export interface Controls {
  left: boolean
  right: boolean
  pointerX: number | null
  pointerY: number | null
  down: boolean
  /** Counts every tap or Space press, so a game can react to each one once. */
  taps: number
}

export interface GameProps<C> {
  challenge: C
  /** The concept color: baskets, platforms and trails wear it. */
  accent: string
  /** The player's pyxie, drawn as the bird, the projectile or the jumper. */
  hero: HTMLCanvasElement | null
  started: RefObject<boolean>
  controls: RefObject<Controls>
  onFinish: (correct: boolean, score: number) => void
  /** Lets the code panel follow the game: the line in play and values learned so far. */
  onTrace?: (line: number | null, notes: Record<number, string>) => void
}
