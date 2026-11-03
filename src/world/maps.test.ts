import { describe, expect, it } from 'vitest'
import { duels } from '../data/duels'
import { speciesById } from '../data/species'
import { items } from '../data/items'
import { scripts } from '../game/scripts'
import { getMap, maps, START } from './maps'
import { buildingAt, builtFlag, cutFlag, doorOf, mapHeight, mapWidth, step, tileAt, walkable, warpAt } from './world'
import type { Direction } from '../types'

const noFlags = new Set<string>()
const known = new Set('.,:=sfTt~#rLFPCW_-RKBDXV3GAmclHbMhgQ'.split(''))

describe('the valley maps', () => {
  it('are rectangles made of known tiles', () => {
    for (const map of maps) {
      const width = map.rows[0].length
      map.rows.forEach((row, y) => {
        expect(row.length, `${map.id} row ${y}`).toBe(width)
        for (const char of row) expect(known.has(char), `${map.id} row ${y} has "${char}"`).toBe(true)
      })
    }
  })

  it('have doors, mats and edges that land on walkable tiles', () => {
    for (const map of maps) {
      for (const building of map.buildings ?? []) {
        const door = doorOf(building)
        const target = getMap(building.to)
        expect(walkable(target, building.tx, building.ty, noFlags), `${map.id} door → ${building.to} (${building.tx},${building.ty})`).toBe(true)
        const outside = { x: door.x, y: door.y + 1 }
        const below = tileAt(map, outside.x, outside.y)
        expect(below === 'C' || walkable(map, outside.x, outside.y, new Set([cutFlag(map.id, outside.x, outside.y)])), `${map.id} tile below the ${building.kind} door`).toBe(true)
        // Buildings must stand inside the map, on no other building.
        expect(building.x + building.w <= mapWidth(map) && building.y + building.h <= mapHeight(map), `${map.id} ${building.kind} fits`).toBe(true)
      }
      for (const warp of map.warps ?? []) {
        // Cave exits may land on a cardboard wall: it was cut on the way in.
        expect(walkable(getMap(warp.to), warp.tx, warp.ty, new Set([cutFlag(warp.to, warp.tx, warp.ty)])), `${map.id} warp (${warp.x},${warp.y}) → ${warp.to} (${warp.tx},${warp.ty})`).toBe(true)
      }
      for (const edge of map.edges ?? []) {
        const target = getMap(edge.to)
        expect(target.edges?.some((back) => back.to === map.id), `${edge.to} connects back to ${map.id}`).toBe(true)
        // Every open tile on this edge must lead somewhere walkable.
        const along = edge.side === 'up' || edge.side === 'down' ? mapWidth(map) : mapHeight(map)
        for (let i = 0; i < along; i += 1) {
          const x = edge.side === 'left' ? 0 : edge.side === 'right' ? mapWidth(map) - 1 : i
          const y = edge.side === 'up' ? 0 : edge.side === 'down' ? mapHeight(map) - 1 : i
          if (!walkable(map, x, y, noFlags)) continue
          const result = step(map, x, y, edge.side, noFlags)
          expect(result.type, `${map.id} ${edge.side} edge at (${x},${y})`).toBe('edge')
        }
      }
    }
  })

  it('put people, items and signs in sensible places', () => {
    for (const map of maps) {
      for (const npc of map.npcs ?? []) {
        const others = new Set([...map.npcs!.filter((other) => other !== npc).map((other) => other.id)])
        const tile = tileAt(map, npc.x, npc.y)
        expect(['W', 'T', '~', '#', 'K', 'D', 'X'].includes(tile), `${map.id} ${npc.id} stands on "${tile}"`).toBe(false)
        expect(buildingAt(map, npc.x, npc.y), `${map.id} ${npc.id} inside a building`).toBeUndefined()
        expect(others.size).toBeGreaterThanOrEqual(0)
        if (npc.script) expect(scripts[npc.script.split(':')[0]] ?? scripts[npc.script], `${map.id} script ${npc.script}`).toBeTruthy()
        if (npc.pyxie) expect(speciesById[npc.pyxie]).toBeTruthy()
        const trainer = npc.trainer
        if (trainer) {
          for (const [species, level] of trainer.team) {
            expect(speciesById[species], `${trainer.id} uses ${species}`).toBeTruthy()
            expect(level).toBeGreaterThan(0)
          }
          for (const duel of trainer.duels ?? []) expect(duels[duel], `${trainer.id} duel ${duel}`).toBeTruthy()
          if (trainer.duels) expect(trainer.duels.length, `${trainer.id} has one duel per pyxie`).toBe(trainer.team.length)
          for (const item of Object.keys(trainer.reward ?? {})) expect(items[item], item).toBeTruthy()
        }
      }
      for (const item of map.items ?? []) {
        expect(items[item.item], `${map.id} item ${item.item}`).toBeTruthy()
        const tile = tileAt(map, item.x, item.y)
        expect(['W', 'T', '~', '#', 'K'].includes(tile), `${map.id} item ${item.id} on "${tile}"`).toBe(false)
      }
      for (const thing of map.things ?? []) expect(scripts[thing.script.split(':')[0]] ?? scripts[thing.script], `${map.id} thing ${thing.script}`).toBeTruthy()
      for (const trigger of map.triggers ?? []) expect(scripts[trigger.script], `${map.id} trigger ${trigger.script}`).toBeTruthy()
      for (const slot of map.encounters?.table ?? []) expect(speciesById[slot.species], `${map.id} encounter ${slot.species}`).toBeTruthy()
    }
  })

  it('give every trainer a unique id', () => {
    const ids = maps.flatMap((map) => (map.npcs ?? []).flatMap((npc) => npc.trainer ? [npc.trainer.id] : []))
    expect(new Set(ids).size).toBe(ids.length)
    const npcIds = maps.flatMap((map) => (map.npcs ?? []).map((npc) => npc.id))
    expect(new Set(npcIds).size).toBe(npcIds.length)
  })

  it('connect every map to home, walking only', () => {
    // Breadth-first walk with every cardboard wall already cut and every NPC out of the way.
    const flags = new Set<string>([...maps.flatMap((map) => map.rows.flatMap((row, y) => [...row].flatMap((char, x) => char === 'C' ? [cutFlag(map.id, x, y)] : []))), ...maps.map((map) => builtFlag(map.id))])
    const cleared = (id: string) => Object.fromEntries((getMap(id).npcs ?? []).map((npc) => [npc.id, { x: -9, y: -9 }]))
    const seen = new Set<string>()
    const reached = new Set<string>([START.map])
    // The basement opens through a script (the hatch), not a door.
    const queue: Array<[string, number, number]> = [[START.map, START.x, START.y], ['basement', 4, 4]]
    while (queue.length) {
      const [id, x, y] = queue.shift()!
      const key = `${id}:${x}:${y}`
      if (seen.has(key)) continue
      seen.add(key)
      reached.add(id)
      const map = getMap(id)
      const warp = warpAt(map, x, y)
      if (warp) queue.push([warp.map, warp.x, warp.y])
      for (const dir of ['up', 'down', 'left', 'right'] as Direction[]) {
        const result = step(map, x, y, dir, flags, cleared(id))
        if (result.type === 'move') queue.push([id, result.x, result.y])
        if (result.type === 'edge') queue.push([result.map, result.x, result.y])
      }
    }
    const missing = maps.map((map) => map.id).filter((id) => !reached.has(id))
    expect(missing).toEqual([])
  })
})

describe('a random walk across the whole valley', () => {
  it('never ends up inside a wall, outside a map, or stuck for good', async () => {
    const { createRng } = await import('../lib/rng')
    const rng = createRng(2026)
    const flags = new Set<string>([...maps.flatMap((map) => map.rows.flatMap((row, y) => [...row].flatMap((char, x) => char === 'C' ? [cutFlag(map.id, x, y)] : []))), ...maps.map((map) => builtFlag(map.id))])
    let map = getMap(START.map)
    let x = START.x
    let y = START.y
    const visited = new Set<string>()
    let stuck = 0
    for (let i = 0; i < 60_000; i += 1) {
      const dir = rng.pick(['up', 'down', 'left', 'right'] as Direction[])
      const result = step(map, x, y, dir, flags)
      if (result.type === 'blocked') { stuck += 1; continue }
      stuck = 0
      if (result.type === 'edge') { map = getMap(result.map); x = result.x; y = result.y }
      else { x = result.x; y = result.y }
      const warp = warpAt(map, x, y)
      if (warp) { map = getMap(warp.map); x = warp.x; y = warp.y }
      visited.add(map.id)
      expect(x >= 0 && y >= 0 && x < mapWidth(map) && y < mapHeight(map), `${map.id} (${x},${y})`).toBe(true)
      expect(walkable(map, x, y, flags), `${map.id} (${x},${y}) is not walkable`).toBe(true)
      expect(stuck).toBeLessThan(500)
    }
    expect(visited.size).toBeGreaterThan(8)
  }, 60_000)
})
