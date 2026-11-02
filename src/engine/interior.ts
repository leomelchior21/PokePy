// Indoor rooms: wallpaper with wainscoting and windows, plank and tile floors, rugs, a doorway
// full of daylight, and furniture tall enough to stand against the wall. Every room type
// (home, charging station, mart, lab, hackathon hall) gets its own palette and props.
import type { GameMap } from '../world/types'
import { tileAt } from '../world/world'
import { shade } from './pixels'
import { hash } from './terrain'

type Ctx = CanvasRenderingContext2D
type Room = 'home' | 'station' | 'mart' | 'lab' | 'hall'

const INK = '#1b1626'

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

export function roomOf(map: GameMap): Room {
  if (map.id.endsWith('-station')) return 'station'
  if (map.id.endsWith('-mart')) return 'mart'
  if (map.area === 'academy') return 'hall'
  if (map.area === 'lab') return 'lab'
  return 'home'
}

const walls: Record<Room, { paper: string; stripe: string; wains: string; trim: string; cap: string; floor: 'wood' | 'tile' }> = {
  home: { paper: '#f6e4c6', stripe: '#ecd5ae', wains: '#b9804a', trim: '#fff3dc', cap: '#6e4c3a', floor: 'wood' },
  station: { paper: '#e6f3ff', stripe: '#d3e8fb', wains: '#5fb8dc', trim: '#ffffff', cap: '#4a6a8a', floor: 'tile' },
  mart: { paper: '#fff1d2', stripe: '#f6e0b0', wains: '#4fae6a', trim: '#ffffff', cap: '#5a6a48', floor: 'wood' },
  lab: { paper: '#e4ecf6', stripe: '#d6e0ee', wains: '#94a3ba', trim: '#f6f9ff', cap: '#59647a', floor: 'tile' },
  hall: { paper: '#5a26a0', stripe: '#4f2190', wains: '#ffd23f', trim: '#ffe680', cap: '#2a1450', floor: 'tile' },
}

const isWall = (t: string) => t === 'W' || t === ' '

/** The back wall: wallpaper, wainscoting, a crown molding and the odd window, frame or clock. */
function backWall(ctx: Ctx, map: GameMap, room: Room, ox: number, oy: number, tx: number) {
  const s = walls[room]
  px(ctx, s.paper, ox, oy, 16, 16)
  for (let x = 0; x < 16; x += 1) if ((tx * 16 + x) % 6 < 2) px(ctx, s.stripe, ox + x, oy + 2, 1, 8)
  px(ctx, shade(s.paper, -0.25), ox, oy, 16, 1)
  px(ctx, s.trim, ox, oy + 1, 16, 1)
  px(ctx, s.wains, ox, oy + 10, 16, 6)
  px(ctx, s.trim, ox, oy + 10, 16, 1)
  px(ctx, shade(s.wains, -0.18), ox, oy + 15, 16, 1)
  for (let x = 0; x < 16; x += 1) if ((tx * 16 + x) % 8 === 0) px(ctx, shade(s.wains, -0.14), ox + x, oy + 11, 1, 4)
  const roll = hash(tx, 0, 404)
  if (tx % 4 === 2) windowPane(ctx, room, ox, oy)
  else if (room === 'hall' && tx % 4 === 0) banner(ctx, ox, oy, tx)
  else if (roll < 0.22) frame(ctx, ox, oy, tx)
  else if (roll > 0.88 && room !== 'mart') clock(ctx, ox, oy)
  else if (room === 'mart' && tx % 4 === 0) sign(ctx, ox, oy, '#e8483f')
  else if (room === 'station' && tx % 4 === 0) sign(ctx, ox, oy, '#36b26b')
  void map
}

function windowPane(ctx: Ctx, room: Room, ox: number, oy: number) {
  px(ctx, INK, ox + 2, oy + 1, 12, 10)
  px(ctx, room === 'hall' ? '#ffd23f' : '#f4efe6', ox + 3, oy + 2, 10, 8)
  px(ctx, '#8fd3ff', ox + 4, oy + 3, 8, 6)
  px(ctx, '#bfe8ff', ox + 4, oy + 3, 8, 2)
  px(ctx, '#ffffff', ox + 5, oy + 4, 3, 1)
  px(ctx, '#7cc86a', ox + 4, oy + 8, 8, 1)
  px(ctx, room === 'hall' ? '#ffd23f' : '#f4efe6', ox + 7, oy + 3, 2, 6)
  // Curtains, tied back.
  const curtain = room === 'home' ? '#d9535c' : room === 'mart' ? '#4fae6a' : room === 'hall' ? '#8a4fe0' : '#5fb8dc'
  px(ctx, curtain, ox + 1, oy + 1, 2, 10); px(ctx, curtain, ox + 13, oy + 1, 2, 10)
  px(ctx, shade(curtain, -0.25), ox + 2, oy + 2, 1, 9); px(ctx, shade(curtain, -0.25), ox + 13, oy + 2, 1, 9)
  px(ctx, shade(curtain, 0.3), ox + 1, oy + 6, 2, 1); px(ctx, shade(curtain, 0.3), ox + 13, oy + 6, 2, 1)
  px(ctx, '#7a5236', ox + 1, oy, 14, 1)
  px(ctx, INK, ox + 2, oy + 11, 12, 1)
  px(ctx, '#e8dcc8', ox + 2, oy + 10, 12, 1)
}

function frame(ctx: Ctx, ox: number, oy: number, tx: number) {
  const art = ['#ffd23f', '#5fb8dc', '#7cc86a', '#ff8fb8'][tx % 4]
  px(ctx, INK, ox + 4, oy + 2, 8, 7)
  px(ctx, '#c9944a', ox + 5, oy + 3, 6, 5)
  px(ctx, '#fff8e8', ox + 6, oy + 4, 4, 3)
  px(ctx, art, ox + 7, oy + 5, 2, 2)
  px(ctx, shade(art, -0.3), ox + 6, oy + 6, 1, 1)
}

function clock(ctx: Ctx, ox: number, oy: number) {
  px(ctx, INK, ox + 5, oy + 2, 6, 7); px(ctx, INK, ox + 4, oy + 3, 8, 5)
  px(ctx, '#fff8e8', ox + 5, oy + 3, 6, 5)
  px(ctx, INK, ox + 8, oy + 4, 1, 2); px(ctx, INK, ox + 8, oy + 5, 2, 1)
}

function sign(ctx: Ctx, ox: number, oy: number, color: string) {
  px(ctx, INK, ox + 3, oy + 2, 10, 7)
  px(ctx, color, ox + 4, oy + 3, 8, 5)
  px(ctx, '#ffffff', ox + 7, oy + 4, 2, 3); px(ctx, '#ffffff', ox + 6, oy + 5, 4, 1)
}

function banner(ctx: Ctx, ox: number, oy: number, tx: number) {
  const color = tx % 8 === 0 ? '#ffd23f' : '#ffffff'
  px(ctx, INK, ox + 4, oy + 1, 8, 13)
  px(ctx, color, ox + 5, oy + 1, 6, 11)
  px(ctx, color, ox + 5, oy + 12, 2, 1); px(ctx, color, ox + 9, oy + 12, 2, 1)
  px(ctx, '#6a2fb8', ox + 6, oy + 4, 4, 4)
  px(ctx, color, ox + 7, oy + 5, 2, 2)
}

/** Side and front walls: a thick cap with a lit edge where it meets the floor, no tile seams. */
function wallCap(ctx: Ctx, map: GameMap, room: Room, ox: number, oy: number, tx: number, ty: number) {
  const s = walls[room]
  px(ctx, s.cap, ox, oy, 16, 16)
  // A faint texture laid in world coordinates, so neighboring tiles join without seams.
  for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) if (hash(tx * 16 + x, ty * 16 + y, 12) > 0.94) px(ctx, shade(s.cap, -0.12), ox + x, oy + y)
  const open = (x: number, y: number) => !isWall(tileAt(map, x, y))
  const lit = shade(s.cap, 0.35)
  if (open(tx + 1, ty)) { px(ctx, lit, ox + 13, oy, 3, 16); px(ctx, shade(s.cap, 0.6), ox + 15, oy, 1, 16) }
  if (open(tx - 1, ty)) { px(ctx, lit, ox, oy, 3, 16); px(ctx, shade(s.cap, 0.6), ox, oy, 1, 16) }
  if (open(tx, ty - 1)) { px(ctx, lit, ox, oy, 16, 3); px(ctx, shade(s.cap, 0.6), ox, oy, 16, 1) }
  // The doorway: daylight pours in where the mat meets the front wall.
  if (tileAt(map, tx, ty - 1) === 'm') {
    px(ctx, '#fff1c4', ox, oy, 16, 16)
    px(ctx, '#ffe39a', ox, oy + 8, 16, 8)
    px(ctx, '#ffd36a', ox, oy + 13, 16, 3)
    if (tileAt(map, tx - 1, ty - 1) !== 'm') { px(ctx, INK, ox, oy, 3, 16); px(ctx, '#8a5a32', ox + 1, oy, 1, 16) }
    if (tileAt(map, tx + 1, ty - 1) !== 'm') { px(ctx, INK, ox + 13, oy, 3, 16); px(ctx, '#8a5a32', ox + 14, oy, 1, 16) }
  }
}

function woodFloor(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, warm: boolean) {
  const tones = warm ? ['#c98a4a', '#d29455', '#bf8143'] : ['#d9a868', '#e2b273', '#cf9f60']
  const seam = warm ? '#8e5a2c' : '#a87a44'
  for (let r = 0; r < 4; r += 1) {
    const row = ty * 4 + r
    const offset = Math.floor(hash(row, 3, 71) * 22)
    for (let x = 0; x < 16; x += 1) {
      const wx = tx * 16 + x + offset
      const plank = Math.floor(wx / 22)
      const tone = tones[Math.floor(hash(plank, row, 72) * tones.length)]
      px(ctx, tone, ox + x, oy + r * 4, 1, 4)
      if (wx % 22 === 0) px(ctx, seam, ox + x, oy + r * 4, 1, 4)
      else if (hash(wx, row, 73) > 0.93) px(ctx, shade(tone, -0.1), ox + x, oy + r * 4 + 1 + Math.floor(hash(wx, row, 74) * 2), 2, 1)
    }
    px(ctx, shade(tones[0], 0.18), ox, oy + r * 4, 16, 1)
    px(ctx, seam, ox, oy + r * 4 + 3, 16, 1)
  }
}

function tileFloor(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, tint: string) {
  const odd = (tx + ty) % 2 === 1
  const base = odd ? shade(tint, -0.05) : tint
  px(ctx, base, ox, oy, 16, 16)
  px(ctx, shade(tint, -0.16), ox, oy, 16, 1)
  px(ctx, shade(tint, -0.16), ox, oy, 1, 16)
  px(ctx, shade(tint, 0.35), ox + 1, oy + 1, 15, 1)
  // A polished glint that drifts across the room.
  const k = (tx * 5 + ty * 3) % 7
  if (k < 3) { px(ctx, shade(base, 0.45), ox + 3 + k * 2, oy + 3, 4, 1); px(ctx, shade(base, 0.45), ox + 2 + k * 2, oy + 4, 2, 1) }
}

export function floorOf(ctx: Ctx, map: GameMap, ox: number, oy: number, tx: number, ty: number, tint: string) {
  const room = roomOf(map)
  if (walls[room].floor === 'wood' && map.area !== 'lab') woodFloor(ctx, ox, oy, tx, ty, room === 'home')
  else tileFloor(ctx, ox, oy, tx, ty, room === 'station' ? '#eef6fb' : tint)
}

function rug(ctx: Ctx, map: GameMap, room: Room, ox: number, oy: number, tx: number, ty: number) {
  const same = (x: number, y: number) => tileAt(map, x, y) === 'R'
  const [main, dark, border] = room === 'hall' ? ['#7b3fd6', '#5a26a0', '#ffd23f'] : room === 'station' ? ['#3d8fd0', '#2a6aa8', '#ffffff'] : room === 'mart' ? ['#4fae6a', '#3a8a52', '#fff1d2'] : room === 'lab' ? ['#5a6a8a', '#46536e', '#ffd23f'] : ['#c8424e', '#a8323e', '#ffd23f']
  px(ctx, main, ox, oy, 16, 16)
  // A diamond lattice woven in world coordinates, so it runs across tiles.
  for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) {
    const wx = tx * 16 + x
    const wy = ty * 16 + y
    if ((wx + wy) % 8 === 0 || (wx - wy + 800) % 8 === 0) px(ctx, dark, ox + x, oy + y)
  }
  if (!same(tx, ty - 1)) { px(ctx, border, ox, oy + 1, 16, 2); px(ctx, dark, ox, oy + 3, 16, 1) }
  if (!same(tx, ty + 1)) { px(ctx, border, ox, oy + 13, 16, 2); px(ctx, dark, ox, oy + 12, 16, 1) }
  if (!same(tx - 1, ty)) { px(ctx, border, ox + 1, oy, 2, 16); for (let y = 1; y < 16; y += 2) px(ctx, '#fff8e8', ox, oy + y, 1, 1) }
  if (!same(tx + 1, ty)) { px(ctx, border, ox + 13, oy, 2, 16); for (let y = 1; y < 16; y += 2) px(ctx, '#fff8e8', ox + 15, oy + y, 1, 1) }
}

function mat(ctx: Ctx, ox: number, oy: number, left: boolean) {
  px(ctx, INK, ox + (left ? 1 : 0), oy + 4, left ? 15 : 15, 11)
  px(ctx, '#a0703e', ox + (left ? 2 : 0), oy + 5, 13, 9)
  for (let y = 6; y < 14; y += 2) px(ctx, '#86592e', ox + (left ? 2 : 0), oy + y, 13, 1)
  // An arrow that points out of the door.
  const cx = ox + (left ? 15 : 0)
  px(ctx, '#ffe9b0', cx - 3, oy + 7, 6, 1); px(ctx, '#ffe9b0', cx - 2, oy + 8, 4, 1); px(ctx, '#ffe9b0', cx - 1, oy + 9, 2, 1)
}

/** Books, binders, a trophy and a little plant; marts stock pyxie supplies instead. */
function shelf(ctx: Ctx, room: Room, ox: number, oy: number, tx: number) {
  const top = oy - 7
  px(ctx, INK, ox, top, 16, 23)
  const wood = room === 'mart' ? '#c8d0dc' : room === 'lab' ? '#8a6a52' : '#8a5a32'
  px(ctx, wood, ox + 1, top + 1, 14, 21)
  px(ctx, shade(wood, 0.25), ox + 1, top + 1, 14, 1)
  const inside = room === 'mart' ? '#7a8496' : '#4a2e1a'
  for (let k = 0; k < 3; k += 1) {
    const y = top + 2 + k * 7
    px(ctx, inside, ox + 2, y, 12, 5)
    px(ctx, shade(wood, -0.2), ox + 1, y + 5, 14, 2)
    if (room === 'mart') {
      for (let i = 0; i < 4; i += 1) {
        const item = Math.floor(hash(tx * 4 + i, k, 88) * 3)
        const x = ox + 2 + i * 3
        if (item === 0) { px(ctx, '#7b3fd6', x, y + 1, 3, 2); px(ctx, '#ffd23f', x, y + 3, 3, 2) }
        else if (item === 1) { px(ctx, '#36b26b', x, y + 1, 2, 4); px(ctx, '#ffffff', x, y + 1, 2, 1) }
        else { px(ctx, '#e8483f', x, y + 2, 3, 3); px(ctx, '#ffffff', x + 1, y + 3, 1, 1) }
      }
      px(ctx, '#ffd23f', ox + 3, y + 5, 3, 1)
      continue
    }
    let x = ox + 2
    let i = 0
    while (x < ox + 14) {
      const roll = hash(tx * 9 + i, k, 89)
      const w = roll > 0.8 ? 3 : 2
      if (roll < 0.08 && k === 0) { px(ctx, '#ffd23f', x, y + 1, 2, 3); px(ctx, '#c99a2a', x, y + 4, 2, 1); x += 3; i += 1; continue }
      if (roll > 0.94) { x += 2; i += 1; continue }
      const h = 3 + Math.floor(hash(tx, i * 3 + k, 90) * 3)
      const color = ['#e8483f', '#3d7be0', '#36b26b', '#ffd23f', '#9b59d0', '#f28c28', '#fff8e8'][Math.floor(hash(i, tx + k, 91) * 7)]
      px(ctx, color, x, y + 5 - h, Math.min(w, ox + 14 - x), h)
      px(ctx, shade(color, 0.3), x, y + 5 - h, 1, h)
      x += w
      i += 1
    }
  }
}

function bed(ctx: Ctx, map: GameMap, ox: number, oy: number, tx: number, ty: number) {
  const head = tileAt(map, tx, ty - 1) !== 'B'
  const foot = tileAt(map, tx, ty + 1) !== 'B'
  const blanket = map.id.includes('brian') ? '#e8483f' : ['#3d7be0', '#7b3fd6', '#36b26b'][Math.floor(hash(map.id.length, 1, 9) * 3)]
  if (head) {
    px(ctx, INK, ox + 1, oy - 6, 14, 22)
    px(ctx, '#8a5a32', ox + 2, oy - 5, 12, 6)
    px(ctx, '#b07a44', ox + 2, oy - 5, 12, 1)
    px(ctx, '#fff8e8', ox + 2, oy + 1, 12, 15)
    px(ctx, '#ffffff', ox + 3, oy + 2, 10, 5)
    px(ctx, '#e0d8ec', ox + 3, oy + 6, 10, 1)
    px(ctx, blanket, ox + 2, oy + 9, 12, 7)
    px(ctx, shade(blanket, 0.3), ox + 2, oy + 9, 12, 2)
  } else {
    px(ctx, INK, ox + 1, oy, 14, foot ? 16 : 16)
    px(ctx, blanket, ox + 2, oy, 12, foot ? 13 : 16)
    for (let y = 2; y < 13; y += 5) for (let x = 2; x < 14; x += 5) px(ctx, shade(blanket, 0.25), ox + x + 1, oy + y, 2, 2)
    px(ctx, shade(blanket, -0.2), ox + 2, oy, 1, 13); px(ctx, shade(blanket, -0.2), ox + 13, oy, 1, 13)
    if (foot) { px(ctx, '#8a5a32', ox + 2, oy + 13, 12, 3); px(ctx, '#b07a44', ox + 2, oy + 13, 12, 1) }
  }
}

function plant(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  const kind = Math.floor(hash(tx, ty, 77) * 3)
  px(ctx, 'rgba(30, 16, 40, 0.22)', ox + 3, oy + 14, 10, 2)
  // The pot.
  const pot = kind === 1 ? '#f4f1ea' : '#c4683a'
  px(ctx, INK, ox + 3, oy + 8, 10, 8)
  px(ctx, pot, ox + 4, oy + 9, 8, 6)
  px(ctx, shade(pot, 0.25), ox + 4, oy + 9, 8, 1)
  px(ctx, shade(pot, -0.2), ox + 10, oy + 10, 2, 5)
  if (kind === 2) {
    // A tall cactus with a flower.
    px(ctx, INK, ox + 6, oy - 5, 5, 14)
    px(ctx, '#4fae6a', ox + 7, oy - 4, 3, 13)
    px(ctx, '#7fd18a', ox + 7, oy - 4, 1, 13)
    px(ctx, INK, ox + 3, oy - 1, 4, 5); px(ctx, '#4fae6a', ox + 4, oy, 2, 3)
    px(ctx, '#ff8fb8', ox + 8, oy - 6, 2, 2)
    return
  }
  // Big leaves fanning up and out.
  const leaf = kind === 1 ? '#36a052' : '#2e8546'
  const light = kind === 1 ? '#7fd18a' : '#6cc06a'
  const blobs: Array<[number, number, number, number]> = [[2, -4, 5, 6], [9, -5, 5, 6], [5, -8, 6, 6], [0, 1, 5, 5], [11, 0, 5, 5], [6, -1, 4, 9]]
  for (const [x, y, w, h] of blobs) px(ctx, INK, ox + x - 1, oy + y - 1, w + 2, h + 2)
  for (const [x, y, w, h] of blobs) { px(ctx, leaf, ox + x, oy + y, w, h); px(ctx, light, ox + x + 1, oy + y + 1, Math.max(1, w - 3), 1) }
  px(ctx, shade(leaf, -0.25), ox + 7, oy - 2, 1, 10)
}

function table(ctx: Ctx, map: GameMap, room: Room, ox: number, oy: number, tx: number, ty: number) {
  const left = tileAt(map, tx - 1, ty) !== 'D'
  const right = tileAt(map, tx + 1, ty) !== 'D'
  const top = room === 'lab' || room === 'hall' ? '#e8ecf4' : '#b07a44'
  const side = room === 'lab' || room === 'hall' ? '#9aa6ba' : '#7a4e2a'
  px(ctx, 'rgba(30, 16, 40, 0.22)', ox, oy + 14, 16, 2)
  px(ctx, INK, ox + (left ? 0 : 0), oy + 2, 16, 11)
  px(ctx, top, ox + (left ? 1 : 0), oy + 3, 16 - (left ? 1 : 0) - (right ? 1 : 0), 7)
  px(ctx, shade(top, 0.25), ox + (left ? 1 : 0), oy + 3, 16 - (left ? 1 : 0) - (right ? 1 : 0), 1)
  px(ctx, side, ox + (left ? 1 : 0), oy + 10, 16 - (left ? 1 : 0) - (right ? 1 : 0), 2)
  if (left) { px(ctx, INK, ox + 1, oy + 12, 2, 4); px(ctx, side, ox + 1, oy + 12, 1, 3) }
  if (right) { px(ctx, INK, ox + 13, oy + 12, 2, 4); px(ctx, side, ox + 13, oy + 12, 1, 3) }
  // Something on every table: a laptop, a mug, books, a circuit board, papers.
  const item = Math.floor(hash(tx, ty, 3) * 6)
  if (item === 0) { px(ctx, INK, ox + 4, oy - 1, 8, 6); px(ctx, '#2a3a5a', ox + 5, oy, 6, 4); px(ctx, '#72dcff', ox + 6, oy + 1, 3, 1); px(ctx, '#5fd17a', ox + 6, oy + 2, 4, 1); px(ctx, '#c9ced8', ox + 3, oy + 5, 10, 2) }
  else if (item === 1) { px(ctx, INK, ox + 6, oy + 2, 5, 5); px(ctx, '#f4f1ea', ox + 7, oy + 3, 3, 3); px(ctx, '#7a4e2a', ox + 7, oy + 3, 3, 1); px(ctx, INK, ox + 10, oy + 4, 2, 2) }
  else if (item === 2) { px(ctx, '#3d7be0', ox + 3, oy + 5, 7, 2); px(ctx, '#e8483f', ox + 4, oy + 3, 7, 2); px(ctx, '#ffd23f', ox + 3, oy + 1, 6, 2) }
  else if (item === 3 && room !== 'home') { px(ctx, '#1e7a46', ox + 4, oy + 3, 8, 5); px(ctx, '#2a9a5a', ox + 4, oy + 3, 8, 1); px(ctx, '#ffd23f', ox + 5, oy + 5, 1, 1); px(ctx, '#e8483f', ox + 9, oy + 4, 1, 1); px(ctx, INK, ox + 7, oy + 5, 3, 2) }
  else if (item === 4) { px(ctx, '#ffffff', ox + 5, oy + 3, 6, 5); px(ctx, '#c9ced8', ox + 6, oy + 4, 4, 1); px(ctx, '#c9ced8', ox + 6, oy + 6, 3, 1) }
}

function counter(ctx: Ctx, map: GameMap, room: Room, ox: number, oy: number, tx: number, ty: number) {
  const join = (x: number, y: number) => tileAt(map, x, y) === 'X'
  const [L, R, U, D] = [join(tx - 1, ty), join(tx + 1, ty), join(tx, ty - 1), join(tx, ty + 1)]
  const body = room === 'station' ? '#ffffff' : '#b07a44'
  const trim = room === 'station' ? '#5fb8dc' : '#7a4e2a'
  // One outline around the whole counter, however many tiles it spans.
  px(ctx, INK, ox, oy + (U ? 0 : 1), 16, 16 - (U ? 0 : 1))
  const x0 = ox + (L ? 0 : 1)
  const x1 = ox + 16 - (R ? 0 : 1)
  const y0 = oy + (U ? 0 : 2)
  const y1 = oy + 16 - (D ? 0 : 1)
  px(ctx, body, x0, y0, x1 - x0, y1 - y0)
  if (!U) px(ctx, shade(body, 0.2), x0, y0, x1 - x0, 1)
  if (!D) {
    // The front face, with a glass case of stock in a mart.
    px(ctx, trim, x0, y1 - 7, x1 - x0, 2)
    px(ctx, shade(body, -0.1), x0, y1 - 5, x1 - x0, 5)
    if (room === 'mart') { px(ctx, '#bfe6ff', x0 + 1, y1 - 5, x1 - x0 - 2, 4); px(ctx, '#7b3fd6', x0 + 2, y1 - 4, 3, 2); px(ctx, '#36b26b', x0 + 7, y1 - 4, 2, 3); px(ctx, '#ffffff', x1 - 3, y1 - 5, 1, 4) }
  } else if (!L) px(ctx, trim, x0, y0, 2, y1 - y0)
  if (room !== 'mart' && hash(tx, ty, 6) > 0.7) { px(ctx, '#e8483f', ox + 6, oy + 3, 4, 4); px(ctx, '#ffffff', ox + 7, oy + 4, 2, 2) }
}

/** Wooden stairs against the back wall, with an arrow that says which way they go. */
function stairs(ctx: Ctx, ox: number, oy: number, down: boolean) {
  const top = oy - 6
  px(ctx, INK, ox + 1, top, 14, 22)
  const tones = ['#6e4526', '#7e5230', '#8e5f38', '#a06d40', '#b47c48', '#c68c52']
  for (let k = 0; k < 5; k += 1) {
    // Going up, the far steps catch the light; going down, they sink into shadow.
    const tone = down ? tones[k] : tones[5 - k]
    const y = top + 1 + k * 4
    px(ctx, tone, ox + 3, y, 10, 4)
    px(ctx, shade(tone, 0.3), ox + 3, y, 10, 1)
    px(ctx, shade(tone, -0.3), ox + 3, y + 3, 10, 1)
  }
  px(ctx, '#5a3a1a', ox + 2, top + 1, 1, 20); px(ctx, '#5a3a1a', ox + 13, top + 1, 1, 20)
  px(ctx, '#c68c52', ox + 2, top + 1, 1, 1); px(ctx, '#c68c52', ox + 13, top + 1, 1, 1)
  // The arrow: up for the bedroom, down for the ground floor.
  const ax = ox + 8
  const ay = oy + 7
  const arrow = down ? [[0, 3], [-1, 2], [0, 2], [1, 2], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [0, 0], [0, -1], [0, -2]] : [[0, -3], [-1, -2], [0, -2], [1, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [0, 0], [0, 1], [0, 2]]
  for (const [x, y] of arrow) px(ctx, INK, ax + x - 1, ay + y, 3, 1)
  for (const [x, y] of arrow) px(ctx, '#ffd23f', ax + x, ay + y, 1, 1)
}

/** Draws an indoor tile and returns true, or returns false for tiles the outdoor painter owns. */
export function drawInteriorTile(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number, tint: string): boolean {
  if (map.area === 'cave') return false
  const room = roomOf(map)
  const t = tileAt(map, tx, ty)
  switch (t) {
    case 'W': {
      const below = tileAt(map, tx, ty + 1)
      if (ty <= 1 && !isWall(below)) backWall(ctx, map, room, ox, oy, tx)
      else wallCap(ctx, map, room, ox, oy, tx, ty)
      return true
    }
    case '_': case '-': floorOf(ctx, map, ox, oy, tx, ty, tint); return true
    case 'R': rug(ctx, map, room, ox, oy, tx, ty); return true
    case 'm': floorOf(ctx, map, ox, oy, tx, ty, tint); mat(ctx, ox, oy, tileAt(map, tx + 1, ty) === 'm'); return true
    case 'K': floorOf(ctx, map, ox, oy, tx, ty, tint); shelf(ctx, room, ox, oy, tx); return true
    case 'B': floorOf(ctx, map, ox, oy, tx, ty, tint); bed(ctx, map, ox, oy, tx, ty); return true
    case 'G': floorOf(ctx, map, ox, oy, tx, ty, tint); plant(ctx, ox, oy, tx, ty); return true
    case 'D': floorOf(ctx, map, ox, oy, tx, ty, tint); table(ctx, map, room, ox, oy, tx, ty); return true
    case 'X': floorOf(ctx, map, ox, oy, tx, ty, tint); counter(ctx, map, room, ox, oy, tx, ty); return true
    case 'H': floorOf(ctx, map, ox, oy, tx, ty, tint); stairs(ctx, ox, oy, map.id.endsWith('-2f')); return true
    default: return false
  }
}

/** A TV in a home, a code terminal anywhere else: drawn every frame so the screen moves. */
export function drawScreenTile(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number, tint: string, time: number) {
  floorOf(ctx, map, ox, oy, tx, ty, tint)
  const room = roomOf(map)
  if (room === 'home') {
    px(ctx, INK, ox + 1, oy + 7, 14, 9); px(ctx, '#8a5a32', ox + 2, oy + 8, 12, 7); px(ctx, '#b07a44', ox + 2, oy + 8, 12, 1)
    px(ctx, INK, ox + 1, oy - 4, 14, 11)
    const channel = (Math.floor(time / 2600) % 3 + 3) % 3
    const glow = ['#5fb8dc', '#7cc86a', '#ffb85a'][channel]
    px(ctx, glow, ox + 2, oy - 3, 12, 8)
    px(ctx, shade(glow, 0.35), ox + 2, oy - 3, 12, 2)
    // A pyxie cartoon is on.
    const bob = Math.floor(time / 300) % 2
    px(ctx, '#ffd23f', ox + 6, oy - bob, 4, 3); px(ctx, INK, ox + 7, oy + 1 - bob, 1, 1); px(ctx, INK, ox + 9, oy + 1 - bob, 1, 1)
    return
  }
  const left = tileAt(map, tx - 1, ty) !== 'V'
  px(ctx, INK, ox, oy - 5, 16, 15)
  px(ctx, '#0e1a2a', ox + (left ? 1 : 0), oy - 4, left ? 15 : 15, 12)
  // Scrolling code, one colored line at a time, with a blinking cursor.
  const scroll = Math.floor(time / 380)
  for (let k = 0; k < 5; k += 1) {
    const line = scroll + k + tx * 3
    const w = 3 + Math.floor(hash(line, tx, 17) * 9)
    const color = ['#5fd17a', '#72dcff', '#ffd23f', '#ff8fb8', '#ffffff'][line % 5]
    px(ctx, color, ox + 2 + (line % 3 === 0 ? 2 : 0), oy - 3 + k * 2, Math.min(w, 12), 1)
  }
  if (Math.floor(time / 450) % 2 === 0) px(ctx, '#ffffff', ox + 3, oy + 7, 2, 1)
  px(ctx, INK, ox + 6, oy + 10, 4, 4); px(ctx, '#9aa6ba', ox + 4, oy + 13, 8, 2)
}

/** Sunbeams from every window, laid over the floor once when the room is built. */
export function drawSunbeams(ctx: Ctx, map: GameMap, pad: number) {
  if (map.area === 'cave') return
  const w = map.rows[0].length
  for (let tx = 0; tx < w; tx += 1) {
    if (tx % 4 !== 2 || tileAt(map, tx, 0) !== 'W' || isWall(tileAt(map, tx, 1))) continue
    const x = (tx + pad) * 16 + 3
    const y = pad * 16 + 16
    const length = 46
    for (let k = 0; k < length; k += 1) {
      const fade = 1 - k / length
      ctx.fillStyle = `rgba(255, 236, 170, ${0.22 * fade})`
      ctx.fillRect(x + Math.round(k * 0.45), y + k, 10, 1)
    }
  }
}
