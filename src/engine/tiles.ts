// Procedural tile art. Every tile is painted with rectangles, so the whole valley ships with no images.
import type { Building, GameMap } from '../world/types'
import { doorOf, tileAt } from '../world/world'
import { shade } from './pixels'

type Ctx = CanvasRenderingContext2D

const C = {
  grass: '#8ccf63', grassDark: '#6fb54e', grassLight: '#a8e07a',
  tall: '#4f9e3c', tallDark: '#357a2a', tallLight: '#76c35a',
  dirt: '#d9b47a', dirtDark: '#b88f55', dirtLight: '#ecd09e',
  pave: '#d6cbb8', paveDark: '#b3a68f', paveLight: '#ece4d4',
  sand: '#f1dc9a', sandDark: '#d6bd73',
  water: '#4aa3df', waterDark: '#2f7bbf', waterLight: '#9ad6ff',
  tree: '#2f8a46', treeDark: '#1f5e30', treeLight: '#52b062', trunk: '#7a4f2a',
  rock: '#9a8f86', rockDark: '#6f655d', rockLight: '#c2b8ae',
  wood: '#c98a4a', woodDark: '#9c6430', woodLight: '#e2ad6e',
  wall: '#efe6d4', wallDark: '#cdbfa6',
  cave: '#4a3a32', caveDark: '#33271f', caveLight: '#62503f',
}

const font: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000', '!': '010010010000010',
}

/** Crisp 3×5 pixel letters, so signs stay sharp at any zoom. */
export function pixelText(ctx: Ctx, text: string, x: number, y: number, color: string, size = 1): number {
  let cx = x
  for (const raw of text.toUpperCase()) {
    const glyph = font[raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')] ?? font[' ']
    for (let i = 0; i < 15; i += 1) if (glyph[i] === '1') px(ctx, color, cx + (i % 3) * size, y + Math.floor(i / 3) * size, size, size)
    cx += 4 * size
  }
  return cx - x - size
}

function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function grass(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  px(ctx, C.grass, ox, oy, 16, 16)
  for (let i = 0; i < 6; i += 1) {
    const x = Math.floor(hash(tx, ty, i) * 15)
    const y = Math.floor(hash(tx, ty, i + 9) * 14)
    px(ctx, i % 2 ? C.grassDark : C.grassLight, ox + x, oy + y, 1, 2)
  }
}

function tallGrass(ctx: Ctx, ox: number, oy: number, frame: number) {
  px(ctx, C.tall, ox, oy, 16, 16)
  const sway = frame % 2
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const bx = ox + col * 4 + (row ? 2 : 0)
      const by = oy + row * 8 + 1
      px(ctx, C.tallDark, bx, by + 2, 3, 5)
      px(ctx, C.tallLight, bx + 1 + (sway && col % 2 ? 1 : 0), by, 1, 4)
      px(ctx, C.tallLight, bx + (sway && col % 2 ? 0 : 1) , by + 1, 1, 1)
    }
  }
}

function water(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, frame: number, map: GameMap) {
  px(ctx, C.water, ox, oy, 16, 16)
  const wave = (frame + tx + ty) % 3
  px(ctx, C.waterLight, ox + 2 + wave * 3, oy + 4, 4, 1)
  px(ctx, C.waterLight, ox + 9 - wave * 2, oy + 10, 4, 1)
  px(ctx, C.waterDark, ox + 5, oy + 13, 6, 1)
  // Foam where water meets land.
  const isWater = (x: number, y: number) => ['~', 'P'].includes(tileAt(map, x, y))
  if (!isWater(tx, ty - 1)) px(ctx, '#d8f2ff', ox, oy, 16, 2)
  if (!isWater(tx, ty + 1)) px(ctx, '#d8f2ff', ox, oy + 14, 16, 2)
  if (!isWater(tx - 1, ty)) px(ctx, '#d8f2ff', ox, oy, 2, 16)
  if (!isWater(tx + 1, ty)) px(ctx, '#d8f2ff', ox + 14, oy, 2, 16)
}

function tree(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  px(ctx, C.grassDark, ox, oy, 16, 16)
  px(ctx, C.trunk, ox + 6, oy + 11, 4, 5)
  px(ctx, C.treeDark, ox + 1, oy + 2, 14, 10)
  px(ctx, C.treeDark, ox + 3, oy, 10, 13)
  px(ctx, C.tree, ox + 2, oy + 2, 12, 8)
  px(ctx, C.tree, ox + 4, oy + 1, 8, 10)
  px(ctx, C.treeLight, ox + 4, oy + 2, 4, 3)
  px(ctx, C.treeLight, ox + 9, oy + 5, 3, 2)
  if (hash(tx, ty) > 0.7) px(ctx, '#e8483f', ox + 10, oy + 3, 2, 2)
}

function rock(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, cave = false) {
  px(ctx, cave ? '#2b1f1a' : C.rock, ox, oy, 16, 16)
  px(ctx, cave ? '#3d2e26' : C.rockLight, ox, oy, 16, 2)
  for (let i = 0; i < 4; i += 1) px(ctx, cave ? '#1a120e' : C.rockDark, ox + Math.floor(hash(tx, ty, i) * 12), oy + 3 + i * 3, 4, 1)
  px(ctx, cave ? '#140e0a' : C.rockDark, ox, oy + 15, 16, 1)
}

function caveFloor(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  px(ctx, C.cave, ox, oy, 16, 16)
  for (let i = 0; i < 3; i += 1) px(ctx, i % 2 ? C.caveDark : C.caveLight, ox + Math.floor(hash(tx, ty, i) * 14), oy + Math.floor(hash(tx, ty, i + 4) * 14), 2, 1)
}

function floorWood(ctx: Ctx, ox: number, oy: number, ty: number) {
  px(ctx, C.wood, ox, oy, 16, 16)
  for (let row = 0; row < 4; row += 1) px(ctx, C.woodDark, ox, oy + row * 4 + 3, 16, 1)
  px(ctx, C.woodLight, ox + ((ty * 5) % 12), oy + 1, 3, 1)
}

function floorLab(ctx: Ctx, ox: number, oy: number, tint: string) {
  px(ctx, tint, ox, oy, 16, 16)
  px(ctx, shade(tint, -0.12), ox, oy, 16, 1)
  px(ctx, shade(tint, -0.12), ox, oy, 1, 16)
  px(ctx, shade(tint, 0.4), ox + 2, oy + 2, 3, 1)
}

/** Paints the static part of one tile. Animated tiles change with the frame number. */
export function drawTile(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number, frame: number, flags: ReadonlySet<string>) {
  const tile = tileAt(map, tx, ty)
  const tint = map.tint ?? (map.id === 'hall' ? '#e9ddff' : '#e6eef7')
  switch (tile) {
    case '.': grass(ctx, ox, oy, tx, ty); break
    case ',': tallGrass(ctx, ox, oy, frame); break
    case ':':
      px(ctx, C.dirt, ox, oy, 16, 16)
      for (let i = 0; i < 4; i += 1) px(ctx, i % 2 ? C.dirtDark : C.dirtLight, ox + Math.floor(hash(tx, ty, i) * 14), oy + Math.floor(hash(tx, ty, i + 3) * 14), 2, 1)
      break
    case '=':
      px(ctx, C.pave, ox, oy, 16, 16)
      px(ctx, C.paveDark, ox, oy + 7, 16, 1); px(ctx, C.paveDark, ox, oy + 15, 16, 1)
      px(ctx, C.paveDark, ox + ((ty % 2) ? 4 : 11), oy, 1, 7); px(ctx, C.paveDark, ox + ((ty % 2) ? 11 : 4), oy + 8, 1, 7)
      px(ctx, C.paveLight, ox + 1, oy + 1, 3, 1)
      break
    case 's':
      px(ctx, C.sand, ox, oy, 16, 16)
      for (let i = 0; i < 5; i += 1) px(ctx, C.sandDark, ox + Math.floor(hash(tx, ty, i) * 15), oy + Math.floor(hash(tx, ty, i + 5) * 15), 1, 1)
      break
    case 'f': {
      grass(ctx, ox, oy, tx, ty)
      const colors = ['#ff5f7e', '#ffd23f', '#ffffff', '#b77bff']
      const c = colors[Math.floor(hash(tx, ty, 7) * colors.length)]
      const bob = frame % 2
      for (const [fx, fy] of [[3, 3], [10, 9]]) {
        px(ctx, C.grassDark, ox + fx + 1, oy + fy + 3, 1, 3)
        px(ctx, c, ox + fx, oy + fy + bob, 3, 3)
        px(ctx, '#ffe14d', ox + fx + 1, oy + fy + 1 + bob, 1, 1)
      }
      break
    }
    case 'T': tree(ctx, ox, oy, tx, ty); break
    case 't':
      grass(ctx, ox, oy, tx, ty)
      px(ctx, C.treeDark, ox + 1, oy + 5, 14, 10); px(ctx, C.tree, ox + 2, oy + 5, 12, 8); px(ctx, C.treeLight, ox + 4, oy + 6, 4, 2)
      break
    case '~': water(ctx, ox, oy, tx, ty, frame, map); break
    case '#': rock(ctx, ox, oy, tx, ty, map.area === 'cave'); break
    case 'r':
      if (map.area === 'cave') caveFloor(ctx, ox, oy, tx, ty)
      else grass(ctx, ox, oy, tx, ty)
      px(ctx, C.rockDark, ox + 2, oy + 4, 12, 11); px(ctx, C.rock, ox + 3, oy + 4, 10, 9); px(ctx, C.rockLight, ox + 5, oy + 5, 4, 2)
      break
    case 'L':
      grass(ctx, ox, oy, tx, ty)
      px(ctx, C.dirtDark, ox, oy + 10, 16, 3); px(ctx, C.dirtLight, ox, oy + 9, 16, 1); px(ctx, C.grassDark, ox, oy + 13, 16, 1)
      break
    case 'F':
      grass(ctx, ox, oy, tx, ty)
      px(ctx, C.woodDark, ox, oy + 6, 16, 2); px(ctx, C.woodDark, ox, oy + 11, 16, 2)
      px(ctx, C.wood, ox + 2, oy + 3, 3, 12); px(ctx, C.wood, ox + 11, oy + 3, 3, 12)
      px(ctx, C.woodLight, ox + 2, oy + 3, 3, 1); px(ctx, C.woodLight, ox + 11, oy + 3, 3, 1)
      break
    case 'P':
      px(ctx, C.wood, ox, oy, 16, 16)
      for (let row = 0; row < 4; row += 1) px(ctx, C.woodDark, ox, oy + row * 4 + 3, 16, 1)
      px(ctx, C.woodDark, ox, oy, 1, 16); px(ctx, C.woodDark, ox + 15, oy, 1, 16)
      break
    case 'C':
      if (flags.has(`cut:${map.id}:${tx}:${ty}`)) { grass(ctx, ox, oy, tx, ty); px(ctx, '#b88f55', ox + 3, oy + 11, 4, 2); px(ctx, '#b88f55', ox + 9, oy + 12, 3, 2); break }
      grass(ctx, ox, oy, tx, ty)
      px(ctx, '#8a5a2a', ox + 1, oy + 1, 14, 15); px(ctx, '#c4925a', ox + 2, oy + 2, 12, 6); px(ctx, '#b88050', ox + 2, oy + 9, 12, 6)
      px(ctx, '#e8d3a2', ox + 2, oy + 4, 12, 2); px(ctx, '#e8d3a2', ox + 2, oy + 11, 12, 2)
      break
    case 'W':
      px(ctx, C.wall, ox, oy, 16, 16)
      px(ctx, C.wallDark, ox, oy + 12, 16, 4)
      px(ctx, shade(C.wallDark, -0.2), ox, oy + 15, 16, 1)
      if (ty > 0 && tileAt(map, tx, ty - 1) !== 'W' && tileAt(map, tx, ty + 1) === 'W') px(ctx, C.wallDark, ox, oy, 16, 16)
      break
    case '_': floorWood(ctx, ox, oy, ty); break
    case '-': floorLab(ctx, ox, oy, tint); break
    case 'R':
      px(ctx, '#c8463c', ox, oy, 16, 16); px(ctx, '#e8685a', ox + 2, oy + 2, 12, 12); px(ctx, '#ffd23f', ox + 7, oy + 7, 2, 2)
      break
    case 'm':
      if (map.area === 'cave') caveFloor(ctx, ox, oy, tx, ty)
      else floorWood(ctx, ox, oy, ty)
      if (map.area === 'cave') { px(ctx, '#140e0a', ox + 2, oy + 4, 12, 12); break }
      px(ctx, '#3d6fd0', ox + 1, oy + 4, 14, 10); px(ctx, '#5f8fe8', ox + 2, oy + 5, 12, 2)
      break
    case 'c': caveFloor(ctx, ox, oy, tx, ty); break
    case 'K':
      px(ctx, C.woodDark, ox, oy, 16, 16)
      for (let shelf = 0; shelf < 3; shelf += 1) {
        px(ctx, C.wood, ox + 1, oy + 1 + shelf * 5, 14, 4)
        for (let b = 0; b < 4; b += 1) px(ctx, ['#e8483f', '#3d7be0', '#36b26b', '#ffd23f', '#9b59d0'][(b + shelf + tx) % 5], ox + 2 + b * 3, oy + 1 + shelf * 5, 2, 4)
      }
      break
    case 'B': {
      floorWood(ctx, ox, oy, ty)
      const top = tileAt(map, tx, ty - 1) !== 'B'
      px(ctx, '#3d7be0', ox + 1, oy, 14, 16)
      if (top) { px(ctx, '#ffffff', ox + 3, oy + 2, 10, 5); px(ctx, '#3d7be0', ox + 1, oy, 14, 1) }
      px(ctx, '#5f8fe8', ox + 2, oy + (top ? 8 : 0), 12, 2)
      break
    }
    case 'D':
      floorBase(ctx, map, ox, oy, ty, tint)
      px(ctx, C.woodDark, ox, oy + 3, 16, 11); px(ctx, C.woodLight, ox, oy + 3, 16, 3); px(ctx, C.woodDark, ox + 1, oy + 14, 2, 2); px(ctx, C.woodDark, ox + 13, oy + 14, 2, 2)
      break
    case 'X':
      floorBase(ctx, map, ox, oy, ty, tint)
      px(ctx, '#e8e2f0', ox, oy + 2, 16, 12); px(ctx, '#ffffff', ox, oy + 2, 16, 3); px(ctx, '#b8acd0', ox, oy + 12, 16, 2)
      break
    case 'V': {
      floorBase(ctx, map, ox, oy, ty, tint)
      px(ctx, '#2b2f3a', ox + 1, oy + 1, 14, 11)
      const glow = ['#5fd17a', '#72dcff', '#ffd23f'][frame % 3]
      px(ctx, '#0e1a2a', ox + 2, oy + 2, 12, 8)
      px(ctx, glow, ox + 3, oy + 3, 6, 1); px(ctx, '#ffffff', ox + 3, oy + 5, 8, 1); px(ctx, glow, ox + 3, oy + 7, 4, 1)
      px(ctx, '#2b2f3a', ox + 6, oy + 12, 4, 3)
      break
    }
    case '3':
      floorBase(ctx, map, ox, oy, ty, tint)
      px(ctx, '#3a3f55', ox + 1, oy + 1, 14, 14); px(ctx, '#d8dde6', ox + 3, oy + 3, 10, 9)
      px(ctx, '#f28c28', ox + 4 + (frame % 3) * 2, oy + 4, 3, 2); px(ctx, '#7b3fd6', ox + 5, oy + 9, 6, 3)
      break
    case 'G':
      floorBase(ctx, map, ox, oy, ty, tint)
      px(ctx, '#b8643a', ox + 4, oy + 10, 8, 6); px(ctx, C.treeDark, ox + 2, oy + 1, 12, 10); px(ctx, C.treeLight, ox + 4, oy + 2, 4, 4)
      break
    case 'A': {
      floorBase(ctx, map, ox, oy, ty, tint)
      px(ctx, C.woodDark, ox, oy + 4, 16, 12); px(ctx, '#1f6fb8', ox + 2, oy + 5, 12, 7)
      px(ctx, '#d8dde6', ox + 3, oy + 6, 4, 2)
      px(ctx, frame % 2 ? '#ff3b3b' : '#5a1a1a', ox + 11, oy + 6, 2, 2)
      break
    }
    case 'l':
      if (map.area !== 'cave') {
        floorBase(ctx, map, ox, oy, ty, tint)
        px(ctx, '#3a3f55', ox, oy + 1, 16, 14); px(ctx, '#d8dde6', ox + 1, oy + 2, 14, 4); px(ctx, '#ff3b3b', ox + 2 + (frame * 4) % 12, oy + 7, 2, 2); px(ctx, '#7a8396', ox + 1, oy + 10, 14, 4)
        break
      }
      rock(ctx, ox, oy, tx, ty, true)
      if (map.id === 'lasercave' && flags.has('segfault1')) break
      px(ctx, frame % 2 ? '#ff3b3b' : '#ff7a7a', ox, oy + 7, 16, 2)
      px(ctx, '#ffd0d0', ox, oy + 7 + (frame % 2), 16, 1)
      break
    default:
      px(ctx, '#0b0912', ox, oy, 16, 16)
  }
}

function floorBase(ctx: Ctx, map: GameMap, ox: number, oy: number, ty: number, tint: string) {
  if (map.area === 'lab' || map.area === 'academy') floorLab(ctx, ox, oy, tint)
  else floorWood(ctx, ox, oy, ty)
}

/** Buildings are painted whole, over the tiles they stand on. */
export function drawBuilding(ctx: Ctx, building: Building, ox: number, oy: number, frame: number) {
  const w = building.w * 16
  const h = building.h * 16
  const door = doorOf(building)
  const dx = ox + (door.x - building.x) * 16
  if (building.kind === 'cave') {
    px(ctx, C.rockDark, ox, oy + 6, w, h - 6)
    px(ctx, C.rock, ox + 2, oy + 2, w - 4, h - 8)
    px(ctx, C.rockLight, ox + 6, oy + 4, w - 18, 4)
    px(ctx, '#140e0a', dx + 2, oy + h - 14, 12, 14)
    px(ctx, '#2b1d14', dx + 4, oy + h - 12, 8, 2)
    return
  }
  const academy = building.kind === 'academy'
  const roofH = Math.min(h - 18, Math.max(16, Math.floor(h * 0.45)))
  const wallColor = academy ? '#fff4c2' : '#f5ecd8'
  // Walls.
  px(ctx, shade(wallColor, -0.25), ox, oy + roofH, w, h - roofH)
  px(ctx, wallColor, ox + 1, oy + roofH, w - 2, h - roofH - 1)
  // Roof with ridge stripes.
  px(ctx, shade(building.roof, -0.35), ox - 1, oy, w + 2, roofH + 2)
  px(ctx, building.roof, ox, oy, w, roofH)
  for (let y = 3; y < roofH; y += 4) px(ctx, shade(building.roof, -0.15), ox, oy + y, w, 1)
  px(ctx, shade(building.roof, 0.3), ox, oy, w, 2)
  if (academy) {
    // Purple roof, yellow trim: the school colors.
    px(ctx, '#ffd23f', ox, oy + roofH - 2, w, 3)
    px(ctx, '#ffd23f', ox + w / 2 - 10, oy - 6, 20, 10)
    px(ctx, '#6a2fb8', ox + w / 2 - 7, oy - 3, 14, 6)
    px(ctx, '#ffffff', ox + w / 2 - 1, oy - 2, 2, 4)
    for (let x = 6; x < w - 6; x += 16) px(ctx, '#e8dcff', ox + x, oy + roofH + 3, 3, h - roofH - 4)
  }
  // Windows.
  const windows = Math.max(1, Math.floor(building.w / 2))
  for (let i = 0; i < windows; i += 1) {
    const wx = ox + 4 + i * ((w - 8) / windows)
    if (Math.abs(wx + 4 - (dx + 8)) < 10) continue
    px(ctx, '#3a3f55', wx, oy + roofH + 4, 9, 8)
    px(ctx, frame % 6 === i % 6 ? '#fff7c2' : '#ffe680', wx + 1, oy + roofH + 5, 7, 6)
    px(ctx, '#3a3f55', wx + 4, oy + roofH + 4, 1, 8)
  }
  // Door.
  px(ctx, '#3a2a20', dx + 2, oy + h - 13, 12, 13)
  px(ctx, building.kind === 'station' ? '#e8483f' : building.kind === 'mart' ? '#3d7be0' : building.kind === 'lab' ? building.roof : '#8a5a2a', dx + 3, oy + h - 12, 10, 12)
  px(ctx, '#ffd23f', dx + 11, oy + h - 6, 1, 1)
  // Signs above the door.
  if (building.kind === 'station') { px(ctx, '#ffffff', dx + 3, oy + roofH - 9, 10, 8); px(ctx, '#e8483f', dx + 7, oy + roofH - 8, 2, 6); px(ctx, '#e8483f', dx + 5, oy + roofH - 6, 6, 2) }
  if (building.kind === 'mart') { px(ctx, '#ffffff', dx + 2, oy + roofH - 9, 12, 8); px(ctx, '#3d7be0', dx + 4, oy + roofH - 7, 8, 4) }
  if (building.label) {
    const size = academy ? 2 : 1
    const textW = building.label.length * 4 * size - size
    const ly = academy ? oy + roofH - 16 : oy + roofH - 9
    px(ctx, academy ? '#6a2fb8' : '#2b2230', ox + Math.floor((w - textW) / 2) - 3, ly - 2, textW + 6, 5 * size + 4)
    if (academy) px(ctx, '#ffd23f', ox + Math.floor((w - textW) / 2) - 3, ly + 5 * size + 2, textW + 6, 1)
    pixelText(ctx, building.label, ox + Math.floor((w - textW) / 2), ly, academy ? '#ffd23f' : '#ffffff', size)
  }
  if (building.kind === 'makerspace') {
    // A big gear on the roof.
    const gx = ox + 12
    const gy = oy + 4
    px(ctx, '#ffd23f', gx, gy + 2, 8, 4); px(ctx, '#ffd23f', gx + 2, gy, 4, 8); px(ctx, '#f28c28', gx + 3, gy + 3, 2, 2)
  }
}
