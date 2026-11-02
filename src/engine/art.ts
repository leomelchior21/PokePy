// Every sprite in the game. Pyxies are vector designs rasterized to pixel art (creatures.ts);
// people, objects and icons are drawn as text.
import type { Direction } from '../types'
import type { Look } from '../world/types'
import { creatures } from './creatures'
import { dataUrl, gridFrom, outline, renderGrid, shade, type Palette } from './pixels'
import { rasterize } from './raster'

const golds: Record<string, string> = { b: '#ffe36e', d: '#d99a1a', l: '#fff6c4', c: '#ffcf3f' }

/** Golden pyxies: the body colors turn to warm metal. */
function shinyPalette(palette: Palette): Palette {
  const out: Palette = { ...palette }
  for (const key of Object.keys(golds)) if (out[key]) out[key] = golds[key]
  return out
}

/** A pyxie as pixel art. Sizes: 24 in the overworld, 48 in menus, 64 to 96 in battles and the inspector. */
export function pyxieCanvas(species: string, shiny = false, size = 48, blink = false) {
  const design = creatures[species]
  if (!design) return null
  return rasterize(`pyx:${species}:${shiny}`, design, { size, blink, shiny: shiny ? shinyPalette : undefined })
}

export function pyxieUrl(species: string, shiny = false, size = 48, blink = false): string {
  return dataUrl(`pyx:${species}:${shiny}:${size}:${blink}`, pyxieCanvas(species, shiny, size, blink))
}

export const hasArt = (species: string) => Boolean(creatures[species])

// ---------------------------------------------------------------- PEOPLE

// Chibi people, 16×24: a big head, a small body. Frames: 0 stand, 1 left step, 2 stand, 3 right step.
const head = {
  down: [
    '................', '.....HHHHHH.....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '.HHHHHHHHHHHHHH.',
    '.HHHHSHHHHSHHHH.', '.HHSSSSSSSSSSHH.', '.HSSSSSSSSSSSSH.', '.HSSEwSSSSEwSSH.', '.HSSEESSSSEESSH.', '..SRSSSSSSSSRS..',
    '...SSSSSSSSSS...', '....SSSSSSSS....',
  ],
  up: [
    '................', '.....HHHHHH.....', '...HHHHHHHHHH...', '..HHHHHHHHHHHH..', '..HHHHHHHHHHHH..', '.HHHHHHHHHHHHHH.',
    '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '.HHHHHHHHHHHHHH.', '..HHHHHHHHHHHH..',
    '...HHHHHHHHHH...', '....SSSSSSSS....',
  ],
  right: [
    '................', '.....HHHHHH.....', '...HHHHHHHHH....', '..HHHHHHHHHHH...', '..HHHHHHHHHHHH..', '.HHHHHHHHHHHHH..',
    '.HHHHHHHHSHHHHH.', '.HHHHHHSSSSSSHH.', '.HHHHHSSSSSSSSH.', '.HHHHHSSSSSEwSS.', '.HHHHHSSSSSEESS.', '..HHHSSSSSSSRSS.',
    '...HHSSSSSSSSS..', '.....SSSSSSSS...',
  ],
}

const body = {
  down: [
    ['.....CCCCCC.....', '...CCCCCCCCCC...', '..SCCCCCCCCCCS..', '..SCCCCCCCCCCS..', '..SSCCCCCCCCSS..', '....PPPPPPPP....', '....PPP..PPP....', '....PPP..PPP....', '....BBB..BBB....', '................'],
    ['.....CCCCCC.....', '...CCCCCCCCCC...', '..SCCCCCCCCCCS..', '..SCCCCCCCCCCSS.', '..SSCCCCCCCC....', '....PPPPPPPP....', '....PPP..PPP....', '....PPP..BBB....', '....BBB.........', '................'],
    ['.....CCCCCC.....', '...CCCCCCCCCC...', '..SCCCCCCCCCCS..', '.SSCCCCCCCCCCS..', '....CCCCCCCCSS..', '....PPPPPPPP....', '....PPP..PPP....', '....BBB..PPP....', '.........BBB....', '................'],
  ],
  right: [
    ['......CCCCCC....', '.....CCCCCCCC...', '.....CCCSCCCC...', '.....CCCSCCCC...', '.....CCCSSCCC...', '.....PPPPPPP....', '......PPPPP.....', '......PPPPP.....', '......BBBBBB....', '................'],
    ['......CCCCCC....', '.....CCCCCCCC...', '.....CCCCCSCC...', '.....CCCCCSSC...', '.....CCCCCCCC...', '.....PPPPPPP....', '.....PP...PP....', '....PP.....PP...', '...BBB.....BBB..', '................'],
    ['......CCCCCC....', '.....CCCCCCCC...', '.....CSCCCCCC...', '.....SSCCCCCC...', '.....CCCCCCCC...', '.....PPPPPPP....', '......PP.PP.....', '......PP.PP.....', '.....BBB.BBB....', '................'],
  ],
}

function set(grid: string[][], x: number, y: number, c: string) {
  if (grid[y] && grid[y][x] !== undefined) grid[y][x] = c
}

function styled(look: Look, dir: 'down' | 'up' | 'right', pose: number): string[][] {
  const bodyRows = dir === 'right' ? body.right[pose] : body.down[pose]
  const grid = [...head[dir], ...bodyRows].map((row) => [...row])
  const side = dir === 'right'
  const front = dir === 'down'
  const hairRows = (from: number, to: number, swap: string) => { for (let y = from; y <= to; y += 1) for (let x = 0; x < 16; x += 1) if (grid[y][x] === 'H') grid[y][x] = swap }
  if (look.style === 'bald') { hairRows(1, 5, 'S'); if (front) hairRows(6, 6, 'S') }
  if (look.style === 'cap') {
    hairRows(1, 5, 'K')
    if (front) for (let x = 1; x <= 14; x += 1) set(grid, x, 6, 'K')
    if (side) for (let x = 7; x <= 15; x += 1) set(grid, x, 6, 'K')
    if (dir === 'up') for (let x = 2; x <= 13; x += 1) set(grid, x, 6, 'K')
    set(grid, 7, 3, 'k'); set(grid, 8, 3, 'k')
  }
  if (look.style === 'spiky') {
    for (const x of side ? [3, 6, 9] : [3, 6, 9, 12]) { set(grid, x, 0, 'H'); set(grid, x + 1, 0, 'H') }
    set(grid, side ? 1 : 2, 2, 'H'); set(grid, side ? 12 : 13, 2, 'H')
  }
  if (look.style === 'bun') {
    if (side) for (const [x, y] of [[0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [1, 5], [0, 5]]) set(grid, x, y, 'H')
    else for (let x = 6; x <= 9; x += 1) set(grid, x, 0, 'H')
  }
  if (look.style === 'long') {
    for (let y = 11; y <= 17; y += 1) {
      if (front) { set(grid, 1, y, 'H'); set(grid, 14, y, 'H'); if (y < 16) { set(grid, 2, y, 'H'); set(grid, 13, y, 'H') } }
      if (dir === 'up' && y <= 16) for (let x = 2; x <= 13; x += 1) set(grid, x, y, 'H')
      if (side) for (let x = 1; x <= 4; x += 1) set(grid, x, y, 'H')
    }
  }
  if (look.extra === 'glasses') {
    if (front) { for (const x of [3, 6, 9, 12]) { set(grid, x, 9, 'g'); set(grid, x, 10, 'g') } for (const x of [4, 5, 10, 11]) set(grid, x, 8, 'g'); set(grid, 7, 9, 'g'); set(grid, 8, 9, 'g') }
    if (side) { set(grid, 10, 9, 'g'); set(grid, 13, 9, 'g'); set(grid, 11, 8, 'g'); set(grid, 12, 8, 'g'); for (let x = 6; x <= 9; x += 1) set(grid, x, 9, 'g') }
  }
  if (look.extra === 'goggles') {
    if (!side) for (let x = 1; x <= 14; x += 1) set(grid, x, 5, 'k')
    if (front) for (const x of [4, 5, 10, 11]) set(grid, x, 5, 'q')
    if (side) { for (let x = 2; x <= 13; x += 1) set(grid, x, 5, 'k'); set(grid, 11, 5, 'q'); set(grid, 12, 5, 'q') }
  }
  if (look.extra === 'beard') {
    const [a, b] = side ? [7, 14] : [3, 12]
    for (let y = 11; y <= 13; y += 1) for (let x = a; x <= b; x += 1) if (grid[y][x] === 'S' || grid[y][x] === 'R') set(grid, x, y, 'H')
  }
  if (look.extra === 'apron' && dir !== 'up') {
    const [a, b] = side ? [9, 12] : [5, 10]
    for (let y = 15; y <= 19; y += 1) for (let x = a; x <= b; x += 1) if (grid[y][x] === 'C' || grid[y][x] === 'P') set(grid, x, y, 'Y')
  }
  if (look.extra === 'coat') for (let y = 15; y <= 20; y += 1) for (let x = 0; x < 16; x += 1) if (grid[y][x] === 'C' || (y >= 19 && grid[y][x] === 'P' && (x <= 4 || x >= 11))) set(grid, x, y, 'Z')
  return grid
}

/** One frame of a person: 0 or 2 standing, 1 and 3 walking. Left is the right frame mirrored. */
export function personCanvas(look: Look, dir: Direction, frame: number) {
  const source = dir === 'left' ? 'right' : dir
  const f = ((frame % 4) + 4) % 4
  const pose = f === 1 ? 1 : f === 3 ? 2 : 0
  let grid = styled(look, source, pose)
  if (source === 'up' && pose) grid = grid.map((row, y) => (y >= 14 ? [...row].reverse() : row))
  if (dir === 'left') grid = grid.map((row) => [...row].reverse())
  const cap = look.cap ?? look.shirt
  const palette: Palette = {
    H: look.hair, S: look.skin, E: '#2a1d3a', w: '#ffffff', R: '#ff9a9a', C: look.shirt, P: look.pants, B: '#3a2a2a', K: cap,
    k: look.extra === 'goggles' ? '#3a3a48' : shade(cap, 0.4), Y: '#f1e3c8', g: '#2b2230', q: '#bfe8ff', Z: '#f4f1ea',
  }
  const key = `p:${JSON.stringify(look)}:${dir}:${f}`
  return renderGrid(key, outline(grid), palette, true)
}

export function personUrl(look: Look, dir: Direction = 'down', frame = 0): string {
  return dataUrl(`p:${JSON.stringify(look)}:${dir}:${((frame % 4) + 4) % 4}`, personCanvas(look, dir, frame))
}

// ---------------------------------------------------------------- OBJECTS AND ICONS

const objects: Record<string, { rows: string[]; palette: Palette }> = {
  // Gathering spots: a fallen log (wood) and a clump of river reeds (fiber).
  log: { palette: { w: '#8a5a32', d: '#5e3a20', l: '#b07a44', r: '#e2b67a', c: '#c4925a', g: '#5aa646' }, rows: [
    '................', '................', '................', '................', '......g.........', '.....ggg........', '..llllllllllrr..', '.lwwwwwwwwwrccr.',
    '.wwwdwwwwdwrcdcr', '.wwwwwwdwwwrccr.', '.ddwwwwwwwwdrr..', '..dddddddddd....', '................', '................', '................', '................'] },
  reeds: { palette: { g: '#4f9a48', l: '#86cb5e', b: '#8a5a32', d: '#2f7a34' }, rows: [
    '................', '................', '....b.....b.....', '....b..b..b.....', '....b..b..b.....', '....g..b..g..b..', '...lg..g..g..b..', '...lg.lg.lg..g..',
    '..l.g.lg.l.g.g..', '..l.glg..l.glg..', '.l..gdg.l..gdg..', '....gdg....gdg..', '...ddddd..ddddd.', '................', '................', '................'] },
  capsule: { palette: { a: '#7b3fd6', b: '#ffd23f', l: '#fff4b0', d: '#4a1f8f' }, rows: [
    '................', '................', '................', '.....aaaaaa.....', '....aaaaaaaa....', '....aallaaaa....', '....aaaaaaaa....', '....dddddddd....',
    '....bbbbbbbb....', '....bblbbbbb....', '....bbbbbbbb....', '.....bbbbbb.....', '................', '................', '................', '................'] },
  sign: { palette: { w: '#c98a4a', d: '#8a5a2a', l: '#e6b67a', s: '#5a3a1a' }, rows: [
    '................', '................', '..dddddddddddd..', '..dwwwwwwwwwwd..', '..dwlllllllwwd..', '..dwwwwwwwwwwd..', '..dwllllllwwwd..', '..dwwwwwwwwwwd..',
    '..dddddddddddd..', '.......ss.......', '.......ss.......', '.......ss.......', '.......ss.......', '......ssss......', '................', '................'] },
  board: { palette: { w: '#f2eadb', d: '#5a5a6a', l: '#c84a4a', s: '#3a3a48' }, rows: [
    '................', '..dddddddddddd..', '..dwwwwwwwwwwd..', '..dwllwwwwwwwd..', '..dwwwwwlllwwd..', '..dwlllwwwwwwd..', '..dwwwwwwllwwd..', '..dwwlllwwwwwd..',
    '..dwwwwwwwwwwd..', '..dddddddddddd..', '...s........s...', '...s........s...', '...s........s...', '..sss......sss..', '................', '................'] },
  statue: { palette: { w: '#d8d4cc', d: '#8a8478', l: '#f4f1ea', s: '#6a6458' }, rows: [
    '................', '......dddd......', '.....dwwwwd.....', '.....dwllwd.....', '.....dwwwwd.....', '......dwwd......', '.....dwwwwd.....', '....dwwwwwwd....',
    '....dwwllwwd....', '.....dwwwwd.....', '...ssssssssss...', '...swwwwwwwws...', '...swwwwwwwws...', '...ssssssssss...', '................', '................'] },
  hatch: { palette: { w: '#8a5a2a', d: '#5a3a1a', l: '#c98a4a', y: '#ffd23f' }, rows: [
    '................', '................', '..dddddddddddd..', '..dwwwwwwwwwwd..', '..dwlwwwwwwlwd..', '..dddddddddddd..', '..dwwwwwwwwwwd..', '..dwwwwyywwwwd..',
    '..dwwwwyywwwwd..', '..dwwwwwwwwwwd..', '..dddddddddddd..', '..dwlwwwwwwlwd..', '..dwwwwwwwwwwd..', '..dddddddddddd..', '................', '................'] },
  pod: { palette: { g: '#bfe9ff', l: '#ffffff', d: '#5a6b80', s: '#8ea2b8' }, rows: [
    '................', '.....dddddd.....', '....dggggggd....', '...dgglggggd....', '...dglgggggd....', '...dggggggggd...', '...dggggggggd...', '...dggggggggd...',
    '...dggggggggd...', '...dggggggggd...', '...dggggggggd...', '....dggggggd....', '...ssssssssss...', '...sddddddddds..', '....ssssssss....', '................'] },
}

export function objectCanvas(name: string) {
  const object = objects[name]
  if (!object) return null
  return renderGrid(`obj:${name}`, outline(gridFrom(object.rows)), object.palette)
}

const icons: Record<string, { rows: string[]; palette: Palette }> = {
  patch: { palette: { a: '#f2d1a8', b: '#ff8fb0', w: '#ffffff' }, rows: ['............', '.......aa...', '......aaaa..', '.....aabaa..', '....aabwba..', '...aabwba...', '..aabwba....', '..aabaa.....', '..aaaa......', '...aa.......', '............', '............'] },
  bigpatch: { palette: { a: '#ffd23f', b: '#ff5f7e', w: '#ffffff' }, rows: ['............', '..aaaaaaaa..', '.aaaaaaaaaa.', '.aaabbbbaaa.', '.aaabwwbaaa.', '.abbbwwbbba.', '.abwwwwwwba.', '.abbbwwbbba.', '.aaabwwbaaa.', '.aaabbbbaaa.', '..aaaaaaaa..', '............'] },
  chip: { palette: { a: '#2b2f3a', b: '#5fd17a', y: '#ffd23f' }, rows: ['............', '..y.y.y.y...', '.aaaaaaaaa..', 'yabbbbbbbay.', '.abaaaaaba..', 'yabayyyabay.', '.abaaaaaba..', 'yabbbbbbbay.', '.aaaaaaaaa..', '..y.y.y.y...', '............', '............'] },
  cube: { palette: { a: '#7b3fd6', b: '#ffd23f', l: '#fff4b0', d: '#4a1f8f' }, rows: ['............', '...aaaaaa...', '..aaaaaaaa..', '..aallaaaa..', '..aaaaaaaa..', '..dddddddd..', '..bbbbbbbb..', '..bblbbbbb..', '..bbbbbbbb..', '...bbbbbb...', '............', '............'] },
  supercube: { palette: { a: '#2f7ad8', b: '#ff5f7e', l: '#ffffff', d: '#1a4a8f' }, rows: ['............', '...aaaaaa...', '..aaaaaaaa..', '..aallaaaa..', '..aaaaaaaa..', '..dddddddd..', '..bbbbbbbb..', '..bblbbbbb..', '..bbbbbbbb..', '...bbbbbb...', '............', '............'] },
  makercube: { palette: { a: '#f28c28', b: '#3a3f55', l: '#ffffff', d: '#a8560a' }, rows: ['............', '...aaaaaa...', '..aalaalaa..', '..aaaaaaaa..', '..alaaaala..', '..dddddddd..', '..bbbbbbbb..', '..blbblbbb..', '..bbbbbbbb..', '...bbbbbb...', '............', '............'] },
  lens: { palette: { a: '#5a6b80', g: '#bfe9ff', l: '#ffffff', h: '#8a5a2a' }, rows: ['............', '...aaaa.....', '..aggggga...', '.aglgggga...', '.agggggga...', '.agggggga...', '..aggggga...', '...aaaaah...', '........hh..', '.........hh.', '..........h.', '............'] },
  duck: { palette: { y: '#ffd23f', o: '#ff8b3d', p: '#1b1626', w: '#ffffff' }, rows: ['............', '.....yyy....', '....yyyyy...', '....ypyyyoo.', '....yyyyyoo.', '.....yyyy...', '..y.yyyyyy..', '..yyyyyyyyy.', '..yyyyyyyyy.', '...yyyyyyy..', '....yyyyy...', '............'] },
  cutter: { palette: { a: '#ffd23f', b: '#3a3a48', s: '#d8dde6' }, rows: ['............', '.........ss.', '........sss.', '.......sss..', '......sss...', '.....aaa....', '....aaaa....', '...aaab.....', '..aaab......', '.aaab.......', '.aab........', '............'] },
  arduino: { palette: { a: '#1f6fb8', w: '#ffffff', y: '#ffd23f', r: '#ff3b3b' }, rows: ['............', '.aaaaaaaaaa.', '.awawawawaa.', '.aaaaaaaaaa.', '.aayyaaaaaa.', '.aayyaaarar.', '.aaaaaaaaaa.', '.awawawawaa.', '.aaaaaaaaaa.', '............', '............', '............'] },
  wood: { palette: { a: '#8a5a32', d: '#5e3a20', r: '#e2b67a', l: '#b07a44' }, rows: ['............', '............', '............', '...aaaaaarr.', '..aaaaaaarlr', '..adaaaadrlr', '..aaaaaaarlr', '...dddddddr.', '............', '............', '............', '............'] },
  fiber: { palette: { g: '#5aa646', l: '#9ad874', y: '#ffd23f' }, rows: ['............', '....l..l....', '...lg.lg.l..', '...gl.gl.g..', '....gglgg...', '.....ggg....', '....yyyyy...', '.....ggg....', '....gglgg...', '...gl.g.lg..', '..g..g...g..', '............'] },
  codex: { palette: { a: '#7b3fd6', b: '#ffd23f', w: '#ffffff' }, rows: ['............', '..aaaaaaaa..', '..abbbbbba..', '..abwwwwba..', '..abbbbbba..', '..aaaaaaaa..', '..aawwwwaa..', '..aaaaaaaa..', '..aawwwaaa..', '..aaaaaaaa..', '............', '............'] },
}

export function iconUrl(name: string): string {
  const icon = icons[name]
  if (!icon) return ''
  return dataUrl(`icon:${name}`, renderGrid(`icon:${name}`, outline(gridFrom(icon.rows)), icon.palette))
}

export { shade }
