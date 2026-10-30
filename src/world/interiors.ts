// Room templates shared by every town: homes, charging stations, marts and labs.
import type { Direction } from '../types'
import { kid, looks } from './looks'
import type { GameMap, NpcDef, Requirement, Thing, TrainerDef } from './types'

interface Exit { map: string; x: number; y: number }

function mats(xs: number[], y: number, exit: Exit) {
  return xs.map((x) => ({ x, y, to: exit.map, tx: exit.x, ty: exit.y, facing: 'down' as Direction }))
}

export function house(id: string, name: string, exit: Exit, npcs: NpcDef[] = [], things: Thing[] = []): GameMap {
  return {
    id, name, area: 'house', music: 'home', outside: 'void',
    rows: [
      'WWWWWWWWWWWW',
      'WKK__V____BW',
      'W_________BW',
      'W___RRRR___W',
      'WG__RDDR__GW',
      'W___RRRR___W',
      'W__________W',
      'W____mm____W',
      'WWWWWWWWWWWW',
    ],
    warps: mats([5, 6], 7, exit),
    npcs, things,
  }
}

export function station(id: string, town: string, exit: Exit, visitor?: NpcDef): GameMap {
  return {
    id, name: `${town} Charging Station`, area: 'house', music: 'station', outside: 'void',
    rows: [
      'WWWWWWWWWWWW',
      'WG________GW',
      'W_XXXXXXXX_W',
      'W__________W',
      'WV___RR____W',
      'W____RR____W',
      'W__________W',
      'W____mm____W',
      'WWWWWWWWWWWW',
    ],
    warps: mats([5, 6], 7, exit),
    npcs: [
      { id: `${id}-tina`, name: 'Tech Tina', look: looks.nurse, x: 5, y: 1, facing: 'down', script: 'heal' },
      ...(visitor ? [visitor] : []),
    ],
    things: [{ x: 1, y: 4, script: 'pc' }],
  }
}

export function mart(id: string, town: string, exit: Exit, tier: number, visitor?: NpcDef): GameMap {
  return {
    id, name: `${town} Maker Mart`, area: 'house', music: 'station', outside: 'void',
    rows: [
      'WWWWWWWWWWWW',
      'WKKKK__KKKKW',
      'W__________W',
      'W_X________W',
      'W_X___RR___W',
      'W_X___RR___W',
      'W__________W',
      'W____mm____W',
      'WWWWWWWWWWWW',
    ],
    warps: mats([5, 6], 7, exit),
    npcs: [
      { id: `${id}-clerk`, name: 'Clerk', look: looks.clerk, x: 1, y: 4, facing: 'right', script: `shop:${tier}` },
      ...(visitor ? [visitor] : []),
    ],
  }
}

export interface LabSpec {
  id: string
  name: string
  exit: Exit
  floor: string
  master: { name: string; look: NpcDef['look']; trainer: TrainerDef }
  trainers: Array<{ name: string; n: number; trainer: TrainerDef }>
  helper: string[]
}

export function lab(spec: LabSpec): GameMap {
  return {
    id: spec.id, name: spec.name, area: 'lab', music: 'lab', outside: 'void', battleBg: 'lab', tint: spec.floor,
    rows: [
      'WWWWWWWWWWWWWW',
      'WKK___VV___KKW',
      'W------------W',
      'W------------W',
      'WGG--DD--DD-GW',
      'W------------W',
      'W--DD----DD--W',
      'W------------W',
      'WG----------GW',
      'W---DD--DD---W',
      'W------------W',
      'W------------W',
      'W-----mm-----W',
      'WWWWWWWWWWWWWW',
    ],
    warps: mats([6, 7], 12, spec.exit),
    npcs: [
      { id: `${spec.id}-master`, name: spec.master.name, look: spec.master.look, x: 6, y: 2, facing: 'down', trainer: spec.master.trainer },
      { id: `${spec.id}-t1`, name: spec.trainers[0].name, look: kid(spec.trainers[0].n), x: 3, y: 7, facing: 'right', trainer: spec.trainers[0].trainer },
      { id: `${spec.id}-t2`, name: spec.trainers[1].name, look: kid(spec.trainers[1].n), x: 10, y: 10, facing: 'left', trainer: spec.trainers[1].trainer },
      { id: `${spec.id}-helper`, name: 'Lab Assistant', look: kid(spec.trainers[1].n + 5), x: 2, y: 11, facing: 'right', talk: spec.helper },
    ],
  }
}

export const labGate = (xp: number, master: string): Requirement => ({
  xp, message: `${master} only accepts challengers with ${xp} Trainer XP. Win battles on the routes to earn more!`,
})
