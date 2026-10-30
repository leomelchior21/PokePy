import { describe, expect, it } from 'vitest'
import { statsFor } from '../battle/engine'
import { getMap, maps } from '../world/maps'
import { walkable } from '../world/world'
import { chapters, chapterSave, spawnPoint } from './chapters'
import { newSave, repairSave } from './state'

describe('teacher chapter jumps', () => {
  const from = newSave('leleomaker', 'Leo', { hair: 0, skin: 0, outfit: 0, style: 'cap' })
  for (const chapter of chapters) {
    it(`builds a playable save for ${chapter.label}`, () => {
      const save = chapterSave(chapter, from)
      expect(walkable(getMap(save.map), save.x, save.y, new Set(save.flags)), `${chapter.id} spawn`).toBe(true)
      if (chapter.level) expect(save.team.length).toBeGreaterThan(0)
      for (const pyxie of save.team) {
        expect(pyxie.moves.length).toBeGreaterThan(0)
        expect(pyxie.hp).toBe(statsFor(pyxie.species, pyxie.level).maxHp)
      }
      expect(repairSave(JSON.parse(JSON.stringify(save)), save.username, save.displayName)).toEqual(save)
    })
  }
  it('finds a walkable spawn point in every map', () => {
    for (const map of maps) {
      const at = spawnPoint(map.id)
      expect(walkable(map, at.x, at.y, new Set()), map.id).toBe(true)
    }
  })
})
