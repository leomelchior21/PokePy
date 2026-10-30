/** A tiny seeded random generator, so tests can replay any battle or challenge exactly. */
export interface Rng {
  next: () => number
  int: (min: number, max: number) => number
  pick: <T>(items: readonly T[]) => T
  shuffle: <T>(items: readonly T[]) => T[]
  chance: (probability: number) => boolean
}

export function createRng(seed = Date.now()): Rng {
  let state = (seed >>> 0) || 0x9e3779b9
  const next = () => {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)]
  const shuffle = <T,>(items: readonly T[]): T[] => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  return { next, int, pick, shuffle, chance: (probability) => next() < probability }
}

export const randomRng = () => createRng(Math.floor(Math.random() * 2 ** 31))
