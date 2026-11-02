// A bird's-eye picture of a whole map, for the "new place" card: the painted ground with its
// buildings, every tree and bush, and an arrow over the building the story is talking about.
import type { GameMap } from '../world/types'
import { mapHeight, mapWidth, tileAt } from '../world/world'
import { objectCanvas } from './art'
import { hasCanvas, makeCanvas } from './pixels'
import { boulderCanvas, bushCanvas, drawFence, tallGrassCanvas, treeCanvas, treeKindFor, TREE_SIZE } from './props'
import { buildGround, hash, isOutdoor } from './terrain'
import { drawTile } from './tiles'

const cache = new Map<string, HTMLCanvasElement>()

export function placePreview(map: GameMap, flags: ReadonlySet<string>, building?: string): HTMLCanvasElement | null {
  if (!hasCanvas()) return null
  const key = `${map.id}:${building ?? ''}`
  const cached = cache.get(key)
  if (cached) return cached
  const w = mapWidth(map)
  const h = mapHeight(map)
  let canvas: HTMLCanvasElement
  if (isOutdoor(map)) {
    const ground = buildGround(map, flags, 0)
    canvas = makeCanvas(ground.width, ground.height)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(ground, 0, 0)
    // Things that stand, painted from the back row to the front.
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const t = tileAt(map, x, y)
      if (t === 'T') {
        const art = treeCanvas(treeKindFor(map.area, hash(x, y, 51)), map.area, Math.floor(hash(x, y, 55) * 4))
        if (art) ctx.drawImage(art, x * 16 + 8 - TREE_SIZE / 2 + Math.round((hash(x, y, 52) - 0.5) * 4), y * 16 + 17 - TREE_SIZE)
      } else if (t === 't') {
        const art = bushCanvas(hash(x, y, 53) < 0.25 ? 1 : 0)
        if (art) ctx.drawImage(art, x * 16 - 2, y * 16 - 3)
      } else if (t === 'r') {
        const art = boulderCanvas()
        if (art) ctx.drawImage(art, x * 16 - 1, y * 16 - 2)
      } else if (t === ',') {
        const art = tallGrassCanvas(hash(x, y, 54) < 0.5 ? 0 : 1, 0, map.area)
        if (art) ctx.drawImage(art, x * 16, y * 16 - 2)
      } else if (t === 'F') {
        const f = (a: number, b: number) => tileAt(map, a, b) === 'F'
        drawFence(ctx, x * 16, y * 16, f(x - 1, y), f(x + 1, y), f(x, y - 1), f(x, y + 1))
      }
    }
    // Gathering spots and other objects, so students see what to look for.
    for (const thing of map.things ?? []) {
      if (!thing.sprite || thing.sprite.startsWith('pod')) continue
      const art = objectCanvas(thing.sprite)
      if (art) ctx.drawImage(art, thing.x * 16, thing.y * 16)
    }
  } else {
    canvas = makeCanvas(w * 16, h * 16)
    const ctx = canvas.getContext('2d')!
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) drawTile(ctx, map, x, y, x * 16, y * 16, 0, flags)
  }
  const target = map.buildings?.find((item) => item.to === building)
  if (target) {
    // A thick yellow frame around the building and a big arrow pointing down at it.
    const ctx = canvas.getContext('2d')!
    const bx = target.x * 16 - 3
    const by = target.y * 16 - 12
    const bw = target.w * 16 + 6
    const bh = target.h * 16 + 15
    ctx.strokeStyle = '#1b1626'
    ctx.lineWidth = 6
    ctx.strokeRect(bx, by, bw, bh)
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 3
    ctx.strokeRect(bx, by, bw, bh)
    const cx = bx + bw / 2
    const top = Math.max(2, by - 26)
    ctx.fillStyle = '#1b1626'
    ctx.beginPath(); ctx.moveTo(cx - 8, top - 1); ctx.lineTo(cx + 8, top - 1); ctx.lineTo(cx + 8, top + 11); ctx.lineTo(cx + 15, top + 11); ctx.lineTo(cx, top + 25); ctx.lineTo(cx - 15, top + 11); ctx.lineTo(cx - 8, top + 11); ctx.fill()
    ctx.fillStyle = '#ffd23f'
    ctx.beginPath(); ctx.moveTo(cx - 6, top + 1); ctx.lineTo(cx + 6, top + 1); ctx.lineTo(cx + 6, top + 13); ctx.lineTo(cx + 11, top + 13); ctx.lineTo(cx, top + 22); ctx.lineTo(cx - 11, top + 13); ctx.lineTo(cx - 6, top + 13); ctx.fill()
  }
  cache.set(key, canvas)
  return canvas
}
