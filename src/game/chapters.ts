// Teacher tools: jump to any chapter with a believable save, without playing three hours.
import { createPyxie } from '../battle/engine'
import { labGates } from '../data/progression'
import { getSpecies } from '../data/species'
import { createRng } from '../lib/rng'
import type { OwnedPyxie, SaveState } from '../types'
import { getMap, maps } from '../world/maps'
import { walkable } from '../world/world'
import { newSave } from './state'

export interface Chapter {
  id: string
  label: string
  note: string
  map: string
  x: number
  y: number
  level: number
  badges: string[]
  flags: string[]
  defeated: string[]
  xp: number
}

const B = ['echo', 'box', 'quote', 'sum', 'truth', 'fork']
const base = ['intro_done', 'lab_intro', 'got_starter', 'rival1']

export const chapters: Chapter[] = [
  { id: 'start', label: 'New adventure', note: 'Wake up at home. Leo Maker is waiting.', map: 'home', x: 8, y: 3, level: 0, badges: [], flags: [], defeated: [], xp: 0 },
  { id: 'starter', label: 'Choose a starter', note: 'The Makerspace, right before the three pods.', map: 'makerspace', x: 7, y: 5, level: 0, badges: [], flags: ['intro_done', 'lab_intro'], defeated: [], xp: 0 },
  { id: 'route1', label: 'Route 1', note: 'Starter in hand, first wild pyxies.', map: 'route1', x: 9, y: 25, level: 6, badges: [], flags: base, defeated: [], xp: 30 },
  { id: 'echo', label: 'Lab 1 · Marina Echo (print)', note: 'Inside Echo Harbor Lab, gate already open.', map: 'harbor-lab', x: 6, y: 11, level: 11, badges: [], flags: base, defeated: ['r1-tom', 'r1-bia'], xp: labGates.echo },
  { id: 'box', label: 'Lab 2 · Otto Box (variables)', note: 'Inside Boxford Lab.', map: 'boxford-lab', x: 6, y: 11, level: 16, badges: B.slice(0, 1), flags: base, defeated: [], xp: labGates.box },
  { id: 'rival2', label: 'Brian on Quote Coast', note: 'Right below the rival battle.', map: 'route3', x: 10, y: 6, level: 18, badges: B.slice(0, 2), flags: base, defeated: [], xp: labGates.box + 300 },
  { id: 'quote', label: 'Lab 3 · Lia Quote (text)', note: 'Inside Stringhaven Lab.', map: 'stringhaven-lab', x: 6, y: 11, level: 21, badges: B.slice(0, 2), flags: [...base, 'rival2'], defeated: [], xp: labGates.quote },
  { id: 'cave', label: 'Laser Cutter Cave · Dr. Segfault', note: 'Box Cutter in the bag, cardboard already cut.', map: 'lasercave', x: 20, y: 9, level: 24, badges: B.slice(0, 3), flags: [...base, 'rival2', 'cut:route4:20:4'], defeated: [], xp: labGates.quote + 500 },
  { id: 'sum', label: 'Lab 4 · Rafa Sum (math)', note: 'Inside Abacus City Lab.', map: 'abacus-lab', x: 6, y: 11, level: 26, badges: B.slice(0, 3), flags: [...base, 'rival2', 'cut:route4:20:4', 'segfault1'], defeated: ['segfault1'], xp: labGates.sum },
  { id: 'truth', label: 'Lab 5 · Bruna Bool (logic)', note: 'Inside Veritas Peak Lab.', map: 'veritas-lab', x: 6, y: 11, level: 31, badges: B.slice(0, 4), flags: [...base, 'rival2', 'rival3', 'cut:route4:20:4', 'segfault1'], defeated: ['segfault1'], xp: labGates.truth },
  { id: 'fork', label: 'Lab 6 · Igor Fork (if/else)', note: 'Inside Branchwood Lab.', map: 'branchwood-lab', x: 6, y: 11, level: 36, badges: B.slice(0, 5), flags: [...base, 'rival2', 'rival3', 'cut:route4:20:4', 'segfault1'], defeated: ['segfault1'], xp: labGates.fork },
  { id: 'road', label: 'Hackathon Road', note: 'All six badges, heading to the Academy.', map: 'hackroad', x: 10, y: 27, level: 38, badges: B, flags: [...base, 'rival2', 'rival3', 'cut:route4:20:4', 'segfault1'], defeated: ['segfault1'], xp: labGates.fork + 2000 },
  { id: 'finals', label: 'Grand Hackathon finals', note: 'Inside the hall: Segfault, Brian, then Leo Maker.', map: 'hall', x: 7, y: 13, level: 42, badges: B, flags: [...base, 'rival2', 'rival3', 'cut:route4:20:4', 'segfault1'], defeated: ['segfault1'], xp: 14000 },
  { id: 'post', label: 'Post-game · legends', note: 'Champion: the basement hatch and Nullwing are open.', map: 'makerspace', x: 13, y: 8, level: 46, badges: B, flags: [...base, 'rival2', 'rival3', 'rival4', 'segfault1', 'segfault2', 'champion', 'cut:route4:20:4'], defeated: ['segfault1', 'segfault2', 'rival4', 'champion'], xp: 16000 },
]

function evolvedAt(species: string, level: number): string {
  let current = species
  for (let guard = 0; guard < 3; guard += 1) {
    const evolution = getSpecies(current).evolves
    if (!evolution || level < evolution.level) break
    current = evolution.to
  }
  return current
}

/** A save for a chapter: a team at the right level, badges, story flags and supplies. */
export function chapterSave(chapter: Chapter, from: SaveState): SaveState {
  const rng = createRng(chapter.id.length * 977)
  const fresh = newSave(from.username, from.displayName, from.avatar)
  const team: OwnedPyxie[] = chapter.level
    ? ['sparkit', 'memoth', 'quotie', 'booly'].slice(0, Math.min(4, 1 + Math.floor(chapter.level / 10))).map((species, i) => ({
      ...createPyxie(evolvedAt(species, chapter.level - i * 2), Math.max(3, chapter.level - i * 2), rng, 'chapter'), shiny: false,
    }))
    : []
  const caught = [...new Set(team.flatMap((p) => [p.species]))]
  const visited = maps.filter((map) => !map.id.includes('-')).map((map) => `visited:${map.id}`)
  return {
    ...fresh,
    createdAt: Date.now(),
    settings: from.settings,
    map: chapter.map, x: chapter.x, y: chapter.y, facing: 'up',
    team,
    badges: chapter.badges,
    flags: [...new Set([...chapter.flags, ...(team.length ? ['starter:sparkit'] : []), ...chapter.badges.map((b) => `badge-${b}`), ...(chapter.level ? visited : [])])],
    defeated: chapter.defeated,
    trainerXp: chapter.xp,
    bits: 500 + chapter.level * 80,
    bag: chapter.level ? { patch: 5, bigpatch: 3, revivechip: 2, bytecube: 10, supercube: 5, ...(chapter.id === 'post' ? { makercube: 3 } : {}), hintlens: 5, debugduck: 3, codex: 1, ...(chapter.badges.includes('quote') ? { boxcutter: 1 } : {}) } : {},
    seen: caught,
    caught,
    respawn: { map: chapter.map, x: chapter.x, y: chapter.y },
  }
}

/** A safe place to stand in any map, for the teleport tool. */
export function spawnPoint(mapId: string): { x: number; y: number } {
  const map = getMap(mapId)
  const h = map.rows.length
  const w = map.rows[0].length
  const cx = Math.floor(w / 2)
  const cy = Math.floor(h / 2)
  for (let r = 0; r < Math.max(w, h); r += 1) {
    for (let y = cy - r; y <= cy + r; y += 1) for (let x = cx - r; x <= cx + r; x += 1) {
      if (x >= 0 && y >= 0 && x < w && y < h && walkable(map, x, y, new Set())) return { x, y }
    }
  }
  return { x: 1, y: 1 }
}

/** Dev switch: show the right answer in every challenge, for quick flow testing. */
export const devState = { reveal: false }

export function canUseDevTools(username: string): boolean {
  return username === 'leleomaker' || import.meta.env.DEV
}
