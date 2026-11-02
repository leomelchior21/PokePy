// Battle math: stats, damage, experience, levels, evolution and catching. No UI here, so the
// long-run simulation tests can play thousands of battles in a second.
import { effectiveness } from '../data/concepts'
import { getMove } from '../data/moves'
import { getSpecies, speciesList, type Species } from '../data/species'
import type { Rng } from '../lib/rng'
import type { OwnedPyxie } from '../types'

export const MAX_LEVEL = 50
export const TEAM_SIZE = 4

export interface Stats { maxHp: number; atk: number; def: number; spd: number }

export function statsFor(speciesId: string, level: number): Stats {
  const { base } = getSpecies(speciesId)
  return {
    maxHp: Math.floor((base.hp * level) / 22) + level + 14,
    atk: Math.floor((base.atk * level) / 28) + 6,
    def: Math.floor((base.def * level) / 28) + 6,
    spd: Math.floor((base.spd * level) / 28) + 6,
  }
}

/** Total experience needed to reach a level. */
export function xpForLevel(level: number): number {
  return Math.floor(level ** 3 * 0.6)
}

export function levelProgress(pyxie: OwnedPyxie): number {
  if (pyxie.level >= MAX_LEVEL) return 1
  const from = xpForLevel(pyxie.level)
  const to = xpForLevel(pyxie.level + 1)
  return Math.max(0, Math.min(1, (pyxie.xp - from) / (to - from)))
}

/** Every move a species can learn, including what its earlier forms learned. */
export function fullLearnset(speciesId: string): Array<[number, string]> {
  const before = speciesList.find((species) => species.evolves?.to === speciesId)
  const own = getSpecies(speciesId).learnset
  return before ? [...fullLearnset(before.id), ...own].sort((a, b) => a[0] - b[0]) : own
}

/** The moves a pyxie knows at a level: the newest four it has learned. */
export function movesAtLevel(speciesId: string, level: number): string[] {
  const learned: string[] = []
  for (const [at, move] of fullLearnset(speciesId)) {
    if (at <= level && !learned.includes(move)) learned.push(move)
  }
  // A wild pyxie met below its first level still knows its first move.
  if (!learned.length) learned.push(fullLearnset(speciesId)[0][1])
  return learned.slice(-4)
}

let uidCounter = 0
export function makeUid(rng: Rng): string {
  uidCounter += 1
  return `${Date.now().toString(36)}${uidCounter.toString(36)}${Math.floor(rng.next() * 1e6).toString(36)}`
}

export function createPyxie(speciesId: string, level: number, rng: Rng, caughtAt = 'wild'): OwnedPyxie {
  const species = getSpecies(speciesId)
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)))
  return {
    uid: makeUid(rng),
    species: species.id,
    nickname: null,
    level: clamped,
    xp: xpForLevel(clamped),
    hp: statsFor(species.id, clamped).maxHp,
    moves: movesAtLevel(species.id, clamped),
    caughtAt,
    // One in 64: a golden pyxie. Pure bragging rights.
    shiny: rng.chance(1 / 64),
  }
}

export function displayName(pyxie: OwnedPyxie): string {
  return pyxie.nickname || getSpecies(pyxie.species).name
}

export interface DamageResult { damage: number; multiplier: number; combo: boolean }

/**
 * Damage from a landed move. Combos (three right answers in a row) hit harder, and so does a
 * mini-game played well: skill goes from 0 to 1 and adds up to 30%.
 */
export function moveDamage(attacker: OwnedPyxie, defender: OwnedPyxie, moveId: string, streak: number, rng: Rng, skill = 0): DamageResult {
  const move = getMove(moveId)
  const a = statsFor(attacker.species, attacker.level)
  const d = statsFor(defender.species, defender.level)
  const multiplier = effectiveness(move.concept, getSpecies(defender.species).concept)
  const sameConcept = getSpecies(attacker.species).concept === move.concept ? 1.2 : 1
  const combo = streak >= 3
  const raw = (((2 * attacker.level) / 5 + 2) * move.power * (a.atk / d.def)) / 17 + 3
  const damage = Math.max(1, Math.floor(raw * multiplier * sameConcept * (combo ? 1.3 : 1) * (1 + 0.3 * Math.max(0, Math.min(1, skill))) * (0.9 + rng.next() * 0.2)))
  return { damage, multiplier, combo }
}

/** Damage a wild or trainer pyxie deals. A good dodge cuts it to a quarter. */
export function enemyDamage(attacker: OwnedPyxie, defender: OwnedPyxie, moveId: string, dodged: boolean, rng: Rng): DamageResult {
  const move = getMove(moveId)
  const a = statsFor(attacker.species, attacker.level)
  const d = statsFor(defender.species, defender.level)
  const multiplier = effectiveness(move.concept, getSpecies(defender.species).concept)
  // Enemies hit a little softer than students: battles are about the code, not about grinding.
  const raw = (((2 * attacker.level) / 5 + 2) * move.power * 0.78 * (a.atk / d.def)) / 28 + 2
  const damage = Math.max(1, Math.floor(raw * multiplier * (dodged ? 0.25 : 1) * (0.9 + rng.next() * 0.2)))
  return { damage, multiplier, combo: false }
}

export function pickEnemyMove(pyxie: OwnedPyxie, rng: Rng): string {
  return rng.pick(pyxie.moves.length ? pyxie.moves : movesAtLevel(pyxie.species, pyxie.level))
}

/** Experience for beating a pyxie. Trainer battles pay half again. */
export function xpReward(defeated: OwnedPyxie, trainer: boolean): number {
  const species = getSpecies(defeated.species)
  return Math.floor((species.xpYield * defeated.level) / 5 * (trainer ? 1.5 : 1))
}

/** Trainer XP: what opens the Lab doors. */
export function trainerXpReward(defeated: OwnedPyxie, trainer: boolean): number {
  return Math.floor((getSpecies(defeated.species).xpYield * defeated.level) / 16 * (trainer ? 1.6 : 1)) + 4
}

export interface LevelEvent {
  type: 'level' | 'move' | 'forgot' | 'evolve'
  level?: number
  move?: string
  forgot?: string
  from?: string
  to?: string
}

/** Adds experience and returns every level, move and evolution it caused, in order. */
export function gainXp(pyxie: OwnedPyxie, amount: number): { pyxie: OwnedPyxie; events: LevelEvent[] } {
  let next: OwnedPyxie = { ...pyxie, moves: [...pyxie.moves], xp: pyxie.xp + Math.max(0, Math.floor(amount)) }
  const events: LevelEvent[] = []
  while (next.level < MAX_LEVEL && next.xp >= xpForLevel(next.level + 1)) {
    const before = statsFor(next.species, next.level)
    const level = next.level + 1
    const after = statsFor(next.species, level)
    // Leveling up heals by however much max HP grew.
    next = { ...next, level, hp: Math.min(after.maxHp, next.hp + (after.maxHp - before.maxHp)) }
    events.push({ type: 'level', level })
    for (const [at, move] of getSpecies(next.species).learnset) {
      if (at !== level || next.moves.includes(move)) continue
      if (next.moves.length >= 4) {
        // Forget the weakest move to make room.
        const weakest = [...next.moves].sort((a, b) => getMove(a).power - getMove(b).power)[0]
        next = { ...next, moves: next.moves.filter((item) => item !== weakest) }
        events.push({ type: 'forgot', forgot: weakest })
      }
      next = { ...next, moves: [...next.moves, move] }
      events.push({ type: 'move', move })
    }
    const evolution = getSpecies(next.species).evolves
    if (evolution && level >= evolution.level) {
      events.push({ type: 'evolve', from: next.species, to: evolution.to })
      next = evolve(next)
    }
  }
  if (next.level >= MAX_LEVEL) next = { ...next, xp: Math.min(next.xp, xpForLevel(MAX_LEVEL)) }
  return { pyxie: next, events }
}

export function evolve(pyxie: OwnedPyxie): OwnedPyxie {
  const evolution = getSpecies(pyxie.species).evolves
  if (!evolution) return pyxie
  const before = statsFor(pyxie.species, pyxie.level)
  const after = statsFor(evolution.to, pyxie.level)
  let movesNow = [...pyxie.moves]
  for (const [at, move] of getSpecies(evolution.to).learnset) {
    if (at <= pyxie.level && !movesNow.includes(move)) movesNow = [...movesNow, move].slice(-4)
  }
  return { ...pyxie, species: evolution.to, moves: movesNow, hp: Math.max(1, Math.min(after.maxHp, pyxie.hp + after.maxHp - before.maxHp)) }
}

export function healPyxie(pyxie: OwnedPyxie, amount = Infinity): OwnedPyxie {
  const { maxHp } = statsFor(pyxie.species, pyxie.level)
  return { ...pyxie, hp: Math.min(maxHp, pyxie.hp + amount) }
}

export function isFainted(pyxie: OwnedPyxie): boolean {
  return pyxie.hp <= 0
}

export const cubes: Record<string, number> = { bytecube: 1, supercube: 1.7, makercube: 2.6 }

/** Chance a cube holds the pyxie. Low HP and a solved compile challenge help. */
export function catchChance(species: Species, hp: number, maxHp: number, cube: string, compiled: boolean): number {
  if (species.id === 'nullwing' && cube !== 'makercube') return 0.02
  const hpFactor = 1 - (hp / maxHp) * 0.75
  const chance = species.catchRate * (cubes[cube] ?? 1) * hpFactor * (compiled ? 1.6 : 0.6) + 0.04
  return Math.max(0.02, Math.min(0.97, chance))
}

/** Wild levels drift a little around the area's range. */
export function wildLevel(range: [number, number], rng: Rng): number {
  return rng.int(range[0], range[1])
}
