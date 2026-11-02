// World rules: what blocks, where doors lead, edges, ledges, trainer sight. Pure functions,
// so a bot can walk the whole valley in tests without a screen.
import type { Direction } from '../types'
import { getMap, mapById } from './maps'
import type { Building, GameMap, NpcDef, Thing } from './types'

export const TILE = 16

const blockingTiles = new Set(['T', 't', '~', '#', 'r', 'F', 'W', 'K', 'B', 'D', 'X', 'V', '3', 'G', 'A', 'l', 'C', ' '])
const outsideChar: Record<GameMap['outside'], string> = { tree: 'T', water: '~', void: ' ', rock: '#' }

export const delta: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

export function mapWidth(map: GameMap): number { return map.rows[0].length }
export function mapHeight(map: GameMap): number { return map.rows.length }

export function tileAt(map: GameMap, x: number, y: number): string {
  if (y < 0 || y >= map.rows.length || x < 0 || x >= map.rows[0].length) return outsideChar[map.outside]
  return map.rows[y][x]
}

export function doorOf(building: Building): { x: number; y: number } {
  return { x: building.x + Math.floor(building.w / 2), y: building.y + building.h - 1 }
}

export function buildingAt(map: GameMap, x: number, y: number): Building | undefined {
  return map.buildings?.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)
}

export type Flags = ReadonlySet<string>

export function visible(entity: { showIf?: string; hideIf?: string }, flags: Flags): boolean {
  if (entity.showIf && !flags.has(entity.showIf)) return false
  if (entity.hideIf && flags.has(entity.hideIf)) return false
  return true
}

export const cutFlag = (map: string, x: number, y: number) => `cut:${map}:${x}:${y}`
export const itemFlag = (id: string) => `item:${id}`
/** Set once the player builds the bridge site ('b' tiles) on a map. */
export const builtFlag = (map: string) => `built:${map}`

export interface Occupant { kind: 'npc' | 'thing' | 'sign' | 'item'; id: string }

/** NPCs can move, so callers pass where each one stands now. */
export type NpcPositions = Record<string, { x: number; y: number }>

export function npcsIn(map: GameMap, flags: Flags): NpcDef[] {
  return (map.npcs ?? []).filter((npc) => visible(npc, flags))
}

export function thingsIn(map: GameMap, flags: Flags): Thing[] {
  return (map.things ?? []).filter((thing) => visible(thing, flags))
}

/** Is a tile free to stand on? Ignores the player. */
export function walkable(map: GameMap, x: number, y: number, flags: Flags, positions: NpcPositions = {}): boolean {
  const tile = tileAt(map, x, y)
  if (tile === 'C' && flags.has(cutFlag(map.id, x, y))) return !occupied(map, x, y, flags, positions)
  if (tile === 'b') return flags.has(builtFlag(map.id)) && !occupied(map, x, y, flags, positions)
  if (blockingTiles.has(tile)) return false
  const building = buildingAt(map, x, y)
  if (building) {
    const door = doorOf(building)
    if (door.x !== x || door.y !== y) return false
  }
  return !occupied(map, x, y, flags, positions)
}

function occupied(map: GameMap, x: number, y: number, flags: Flags, positions: NpcPositions): boolean {
  if (map.signs?.some((sign) => sign.x === x && sign.y === y)) return true
  if (map.items?.some((item) => !item.hidden && item.x === x && item.y === y && !flags.has(itemFlag(item.id)))) return true
  if (thingsIn(map, flags).some((thing) => thing.x === x && thing.y === y && thing.sprite)) return true
  return npcsIn(map, flags).some((npc) => {
    const at = positions[npc.id] ?? npc
    return at.x === x && at.y === y
  })
}

export function inBounds(map: GameMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < mapWidth(map) && y < mapHeight(map)
}

export type StepResult =
  | { type: 'blocked' }
  | { type: 'move'; x: number; y: number; jump?: boolean }
  | { type: 'edge'; map: string; x: number; y: number }

/** Where one step in a direction leads. */
export function step(map: GameMap, x: number, y: number, dir: Direction, flags: Flags, positions: NpcPositions = {}): StepResult {
  const [dx, dy] = delta[dir]
  const nx = x + dx
  const ny = y + dy
  if (!inBounds(map, nx, ny)) {
    const edge = map.edges?.find((item) => item.side === dir)
    if (!edge) return { type: 'blocked' }
    const target = getMap(edge.to)
    const tx = dir === 'left' ? mapWidth(target) - 1 : dir === 'right' ? 0 : nx + edge.offset
    const ty = dir === 'up' ? mapHeight(target) - 1 : dir === 'down' ? 0 : ny + edge.offset
    if (!walkable(target, tx, ty, flags)) return { type: 'blocked' }
    return { type: 'edge', map: target.id, x: tx, y: ty }
  }
  const tile = tileAt(map, nx, ny)
  if (tile === 'L') {
    // Ledges: hop down over them, never climb up.
    if (dir !== 'down') return { type: 'blocked' }
    if (inBounds(map, nx, ny + 1) && walkable(map, nx, ny + 1, flags, positions)) return { type: 'move', x: nx, y: ny + 1, jump: true }
    return { type: 'blocked' }
  }
  if (!walkable(map, nx, ny, flags, positions)) return { type: 'blocked' }
  return { type: 'move', x: nx, y: ny }
}

export interface Arrival { map: string; x: number; y: number; facing: Direction; requires?: Building['requires'] }

/** A door or exit mat under the player's feet, if any. */
export function warpAt(map: GameMap, x: number, y: number): Arrival | null {
  const warp = map.warps?.find((item) => item.x === x && item.y === y)
  if (warp) return { map: warp.to, x: warp.tx, y: warp.ty, facing: warp.facing ?? 'down', requires: warp.requires }
  const building = buildingAt(map, x, y)
  if (building) {
    const door = doorOf(building)
    if (door.x === x && door.y === y) return { map: building.to, x: building.tx, y: building.ty, facing: 'up', requires: building.requires }
  }
  return null
}

export function isGrass(map: GameMap, x: number, y: number): boolean {
  return tileAt(map, x, y) === ','
}

/** The trainer who can see the player from where they stand, if any. */
export function spottedBy(map: GameMap, px: number, py: number, flags: Flags, positions: NpcPositions, facings: Record<string, Direction>, defeated: ReadonlySet<string>): NpcDef | null {
  for (const npc of npcsIn(map, flags)) {
    const trainer = npc.trainer
    if (!trainer || trainer.sight <= 0 || defeated.has(trainer.id)) continue
    const at = positions[npc.id] ?? npc
    const facing = facings[npc.id] ?? npc.facing
    const [dx, dy] = delta[facing]
    for (let i = 1; i <= trainer.sight; i += 1) {
      const x = at.x + dx * i
      const y = at.y + dy * i
      if (x === px && y === py) return npc
      if (!walkable(map, x, y, flags, positions)) break
    }
  }
  return null
}

/** Faces that look at a target: used when a trainer walks up to the player. */
export function facingToward(from: { x: number; y: number }, to: { x: number; y: number }): Direction {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

export const opposite: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

export function allMapIds(): string[] {
  return Object.keys(mapById)
}
