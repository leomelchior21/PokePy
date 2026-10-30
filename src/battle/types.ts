import type { OwnedPyxie } from '../types'
import type { Area, TrainerDef } from '../world/types'

export type BattleSpec =
  | { kind: 'wild'; enemy: OwnedPyxie; canRun: boolean; canCatch: boolean; bg: Area; legendary?: boolean }
  | { kind: 'trainer'; trainer: TrainerDef; name: string; team: OwnedPyxie[]; bg: Area }

export type BattleOutcome = 'win' | 'lose' | 'run' | 'caught'
