// Shared types for Pyxies. The Python runner types come first because the copied runner needs them.

export interface ScriptRunResult {
  stdout: string
  variables: Record<string, string | number | boolean | null>
}

export type RuntimeState = 'booting' | 'ready' | 'unavailable'

/** The six Python concepts students know. Every pyxie and every move belongs to one. */
export type Concept = 'print' | 'var' | 'text' | 'math' | 'logic' | 'branch'

export type Direction = 'up' | 'down' | 'left' | 'right'

/** How a challenge is played. Each one is a different little game. */
export type ChallengeKind = 'predict' | 'trace' | 'build' | 'truefalse' | 'fix' | 'order' | 'path' | 'fill'
  /** Arcade mini-games, each one driven by real Python. */
  | 'catch' | 'jump' | 'flappy' | 'sling' | 'match' | 'blocks'

export type Tier = 1 | 2 | 3

export interface OwnedPyxie {
  uid: string
  species: string
  nickname: string | null
  level: number
  xp: number
  hp: number
  /** Moves the pyxie knows, by id, at most four. */
  moves: string[]
  caughtAt: string
  shiny: boolean
}

export interface SaveState {
  version: 1
  username: string
  displayName: string
  avatar: AvatarChoice
  createdAt: number
  playMs: number
  map: string
  x: number
  y: number
  facing: Direction
  team: OwnedPyxie[]
  box: OwnedPyxie[]
  bag: Record<string, number>
  bits: number
  trainerXp: number
  badges: string[]
  flags: string[]
  seen: string[]
  caught: string[]
  defeated: string[]
  /** Last charging station: where the player wakes up after every pyxie faints. */
  respawn: { map: string; x: number; y: number }
  stats: GameStats
  settings: { music: boolean; sfx: boolean; textSpeed: 'slow' | 'normal' | 'fast' }
}

export interface GameStats {
  battles: number
  wins: number
  challenges: number
  correct: number
  bestStreak: number
  streak: number
  steps: number
  catches: number
  codeDuels: number
  codeTestsPassed: number
}

export interface AvatarChoice {
  hair: number
  skin: number
  outfit: number
  style: 'cap' | 'short' | 'long' | 'spiky'
}
