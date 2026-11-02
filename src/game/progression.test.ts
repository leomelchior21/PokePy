// A robot student plays the whole game with the real battle math: every trainer, wild battles
// until each Lab door opens, catches, rivals and the champion. It checks the game never breaks
// in a late save, and that the adventure lasts about three hours.
import { describe, expect, it } from 'vitest'
import { createPyxie, enemyDamage, gainXp, healPyxie, isFainted, moveDamage, pickEnemyMove, statsFor, trainerXpReward, xpReward, catchChance, wildLevel } from '../battle/engine'
import { isMini } from '../battle/minigames'
import { effectiveness } from '../data/concepts'
import { getMove } from '../data/moves'
import { labGates } from '../data/progression'
import { getSpecies } from '../data/species'
import { createRng, type Rng } from '../lib/rng'
import type { OwnedPyxie, SaveState } from '../types'
import { getMap } from '../world/maps'
import { addBadge, addPyxie, newSave, repairSave } from './state'
import { rivalTeam } from './scripts'

const challengeSeconds: Record<string, number> = { predict: 22, trace: 22, fill: 20, truefalse: 9, build: 38, fix: 42, order: 40, path: 16, catch: 28, sling: 22, flappy: 34, jump: 38, match: 55, blocks: 55 }

interface Clock { seconds: number; battles: number; lost: number; turns?: number; foes?: number }

function bestMove(attacker: OwnedPyxie, defender: OwnedPyxie): string {
  const concept = getSpecies(defender.species).concept
  return [...attacker.moves].sort((a, b) => getMove(b).power * effectiveness(getMove(b).concept, concept) - getMove(a).power * effectiveness(getMove(a).concept, concept))[0]
}

/** One battle with the real damage and XP rules. Returns true on a win. */
function battle(save: SaveState, enemies: OwnedPyxie[], trainer: boolean, accuracy: number, rng: Rng, clock: Clock): { save: SaveState; won: boolean } {
  let team = save.team.map((p) => ({ ...p }))
  let trainerXp = save.trainerXp
  let streak = 0
  clock.battles += 1
  clock.seconds += 12
  for (const original of enemies) {
    let foe = { ...original }
    while (!isFainted(foe)) {
      const index = team.findIndex((p) => !isFainted(p))
      if (index < 0) { clock.lost += 1; return { save: { ...save, team: team.map((p) => healPyxie(p)), trainerXp }, won: false } }
      const me = team[index]
      const moveId = bestMove(me, foe)
      clock.turns = (clock.turns ?? 0) + 1
      clock.seconds += challengeSeconds[getMove(moveId).kind] + 5
      if (rng.chance(accuracy)) {
        streak += 1
        // A mini-game played fairly well (about 80%) adds its skill bonus.
        const skill = isMini(getMove(moveId).kind) ? 0.8 : 0
        foe = { ...foe, hp: Math.max(0, foe.hp - moveDamage(me, foe, moveId, streak, rng, skill).damage) }
      } else streak = 0
      if (isFainted(foe)) break
      clock.seconds += 11
      const dodged = rng.chance(accuracy * 0.9)
      team[index] = { ...me, hp: Math.max(0, me.hp - enemyDamage(foe, me, pickEnemyMove(foe, rng), dodged, rng).damage) }
    }
    clock.foes = (clock.foes ?? 0) + 1
    const amount = xpReward(foe, trainer)
    trainerXp += trainerXpReward(foe, trainer)
    const active = team.findIndex((p) => !isFainted(p))
    team = team.map((p, i) => isFainted(p) ? p : gainXp(p, i === active ? amount : Math.floor(amount / 2)).pyxie)
  }
  return { save: { ...save, team, trainerXp }, won: true }
}

function trainersOf(mapIds: string[]) {
  return mapIds.flatMap((id) => (getMap(id).npcs ?? []).flatMap((npc) => npc.trainer && !npc.trainer.duels ? [npc.trainer] : []))
}

function heal(save: SaveState): SaveState {
  return { ...save, team: save.team.map((p) => healPyxie(p)) }
}

function teamFrom(list: Array<[string, number]>, rng: Rng) {
  return list.map(([species, level]) => ({ ...createPyxie(species, level, rng), shiny: false }))
}

const chapters: Array<{ grind: string; maps: string[]; gate: number; badge: string; masterLevel: number; rival?: 1 | 2 | 3 | 4 }> = [
  { grind: 'route1', maps: ['route1'], gate: labGates.echo, badge: 'echo', masterLevel: 10 },
  { grind: 'route2', maps: ['harbor-lab', 'route2'], gate: labGates.box, badge: 'box', masterLevel: 16 },
  { grind: 'route3', maps: ['boxford-lab', 'route3'], gate: labGates.quote, badge: 'quote', masterLevel: 21, rival: 2 },
  { grind: 'route4', maps: ['stringhaven-lab', 'route4', 'lasercave'], gate: labGates.sum, badge: 'sum', masterLevel: 26 },
  { grind: 'route5', maps: ['abacus-lab', 'route5'], gate: labGates.truth, badge: 'truth', masterLevel: 31, rival: 3 },
  { grind: 'route6', maps: ['veritas-lab', 'route6'], gate: labGates.fork, badge: 'fork', masterLevel: 36 },
  { grind: 'hackroad', maps: ['branchwood-lab', 'hackroad'], gate: 0, badge: '', masterLevel: 44, rival: 4 },
]

function playthrough(accuracy: number, seed: number) {
  const rng = createRng(seed)
  const clock: Clock = { seconds: 0, battles: 0, lost: 0 }
  let save = newSave('robot', 'Robot Student', { hair: 0, skin: 0, outfit: 0, style: 'cap' })
  save = addPyxie(save, { ...createPyxie('sparkit', 5, rng), shiny: false }).save
  save = { ...save, flags: ['starter:sparkit'] }
  // Rival 1 in the Makerspace.
  ;({ save } = battle(save, teamFrom(rivalTeam(1, save), rng), true, accuracy, rng, clock))
  save = heal(save)
  const log: string[] = []
  for (const chapter of chapters) {
    clock.seconds += 5 * 60 // walking, talking, story scenes
    for (const trainer of trainersOf(chapter.maps)) {
      let result = battle(save, teamFrom(trainer.team, rng), true, accuracy, rng, clock)
      // Lose? Heal at the station and try again, like a real student.
      while (!result.won) { save = heal(result.save); result = battle(save, teamFrom(trainer.team, rng), true, accuracy, rng, clock) }
      save = heal(result.save)
    }
    if (chapter.rival) {
      let result = battle(save, teamFrom(rivalTeam(chapter.rival, save), rng), true, accuracy, rng, clock)
      if (!result.won) { save = heal(result.save); result = battle(save, teamFrom(rivalTeam(chapter.rival, save), rng), true, accuracy, rng, clock) }
      save = heal(result.save)
    }
    const table = getMap(chapter.grind).encounters!.table
    const lead = () => Math.max(...save.team.map((p) => p.level))
    let guard = 0
    while ((save.trainerXp < chapter.gate || lead() < chapter.masterLevel - 3) && guard++ < 400) {
      const slot = table[rng.int(0, table.length - 1)]
      const foe = createPyxie(slot.species, wildLevel([slot.min, slot.max], rng), rng)
      // Walking through grass until something appears.
      clock.seconds += 14
      const result = battle(save, [foe], false, accuracy, rng, clock)
      save = result.save
      if (save.team.length < 4 && !save.caught.includes(foe.species) && rng.chance(catchChance(getSpecies(foe.species), foe.hp * 0.3, statsFor(foe.species, foe.level).maxHp, 'bytecube', true))) {
        clock.seconds += 25
        save = addPyxie(save, { ...foe, hp: 1 }).save
      }
      if (save.team.some((p) => p.hp < statsFor(p.species, p.level).maxHp * 0.35)) { clock.seconds += 40; save = heal(save) }
    }
    // The Master: three code duels, about four minutes each for a student.
    clock.seconds += chapter.badge ? 3 * 4 * 60 : 4 * 4.5 * 60
    if (chapter.badge) save = addBadge(save, chapter.badge)
    save = heal(save)
    log.push(`${chapter.grind}: ${Math.round(clock.seconds / 60)} min · XP ${save.trainerXp} · lead Lv ${lead()} · battles ${clock.battles} · lost ${clock.lost} · turns/foe ${((clock.turns ?? 0) / (clock.foes ?? 1)).toFixed(1)} · foes ${clock.foes}`)
  }
  return { save, clock, log }
}

describe('the whole adventure, played by a robot student', () => {
  it('lasts about three to four hours, and less for students who answer well', () => {
    const average = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length
    const runs = [1, 2, 3].map((seed) => playthrough(0.75, seed))
    const minutes = runs.map((run) => run.clock.seconds / 60)
    const sharp = [1, 2, 3].map((seed) => playthrough(0.92, seed).clock.seconds / 60)
    console.log(runs[0].log.join('\n'))
    console.log('75% right, minutes:', minutes.map(Math.round), '· 92% right, minutes:', sharp.map(Math.round))
    expect(average(minutes)).toBeGreaterThan(160)
    expect(average(minutes)).toBeLessThan(300)
    expect(average(sharp)).toBeLessThan(average(minutes))
  })

  it('never breaks a late save: numbers stay sane and it survives a save and load', () => {
    for (const accuracy of [0.5, 0.9]) {
      const { save } = playthrough(accuracy, 7)
      const everyone = [...save.team, ...save.box]
      for (const pyxie of everyone) {
        const max = statsFor(pyxie.species, pyxie.level).maxHp
        expect(Number.isFinite(pyxie.hp) && pyxie.hp >= 0 && pyxie.hp <= max).toBe(true)
        expect(Number.isFinite(pyxie.xp)).toBe(true)
        expect(pyxie.moves.length).toBeGreaterThan(0)
        expect(pyxie.moves.length).toBeLessThanOrEqual(4)
      }
      expect(save.badges).toHaveLength(6)
      const json = JSON.stringify(save)
      expect(json.length).toBeLessThan(200_000)
      const loaded = repairSave(JSON.parse(json), save.username, save.displayName)
      expect(loaded).toEqual(save)
    }
  })

  it('lets a careful student beat Brian at the finals', () => {
    let wins = 0
    for (let seed = 1; seed <= 6; seed += 1) {
      const { save } = playthrough(0.8, seed * 31)
      const clock: Clock = { seconds: 0, battles: 0, lost: 0 }
      if (battle(save, teamFrom(rivalTeam(4, save), createRng(seed)), true, 0.8, createRng(seed + 99), clock).won) wins += 1
    }
    expect(wins).toBeGreaterThanOrEqual(4)
  })
})
