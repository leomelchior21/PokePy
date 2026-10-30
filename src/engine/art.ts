// Every sprite in the game, drawn as text. Pyxies are 16×16 and mirrored from their left half.
import type { Direction } from '../types'
import type { Look } from '../world/types'
import { dataUrl, gridFrom, outline, renderGrid, shade, type Palette } from './pixels'

interface PyxieArt { rows: string[]; palette: Palette; overrides?: Array<[x: number, y: number, c: string]> }

const base: Palette = { w: '#ffffff', p: '#1b1626', m: '#5a1a2a', t: '#ffffff' }

const art: Record<string, PyxieArt> = {
  sparkit: { palette: { b: '#ffd23f', d: '#d99a00', l: '#fff3a8', a: '#ffb000', c: '#bfe9ff', y: '#fff7c2', m: '#7a3b00' }, rows: [
    '........', '.....a..', '......a.', '....bbbb', '...bbbbb', '..blbbbb', '..bwwbbb', '..bwpbbb',
    '..bbbbbm', 'ccdbbbbb', 'ccddbbbb', '.c.ddbbb', '....dddd', '......yy', '.......y', '........'] },
  sparkoon: { palette: { b: '#ffc93c', d: '#d48a00', l: '#fff0a0', a: '#ff7a2f', c: '#ffe680', y: '#fff6b0' }, rows: [
    '......a.', '.....aa.', '....bbbb', '...bbbbb', '...bwwbb', '...bwpbb', '...bbbaa', 'cc..bbbb',
    'ccc.bbbb', '.ccclbbb', '..ccdbbb', '...cddbb', '....dddd', '.....yyy', '....y..y', '...y....'] },
  lumiprint: { palette: { b: '#fff1a8', d: '#e0b400', l: '#ffffff', a: '#ff8a00', c: '#ffd23f', y: '#ff9f1c' }, rows: [
    '...y..y.', '...yy.yy', '....bbbb', '...bbbbb', 'c..bwwbb', 'cc.bwpbb', 'ccc.bbaa', 'cccc.bbb',
    'ccccclbb', '.ccccbbb', '..cccdbb', '...ccddb', '....yddd', '...yy.yy', '..yy..y.', '.y......'] },
  boxlet: { palette: { b: '#d9a35b', d: '#a8743a', l: '#f0c88a', a: '#f7f2e4', m: '#5a3a1a' }, rows: [
    '........', '........', '...ddddd', '..dbbbbb', '.dbbbbbb', '.lbbbbbb', '.lbwwbbb', '.lbwpbbb',
    '.lbbbbmm', '.lbbbbbb', '.lbbaaaa', '.lbbaaaa', '.dbbbbbb', '..dddddd', '...d...d', '........'] },
  cratebit: { palette: { b: '#b97a3e', d: '#7d4f22', l: '#d9a35b', a: '#e8d3a2' }, rows: [
    '........', '.....ddd', '.....dbb', '.....daa', '..dddddd', '.dbbbbbb', '.dbwwbbb', '.dbwpbbb',
    '.dbbbbmm', '.dbbbbbb', '.dlaaaaa', '.dlbbbbb', '.dbbbbbb', '..dddddd', '..aa..aa', '..aa..aa'] },
  vaultron: { palette: { b: '#8ea2b8', d: '#5a6b80', l: '#cdd9e6', a: '#ffd23f', c: '#3b4a5c' }, rows: [
    '......a.', '......a.', '..dddddd', '.dllllll', '.dlbbbbb', '.dlwwbbb', '.dlwpbbb', '.dlbbbbb',
    '.dbbbccc', '.dbbbcac', '.dbbbccc', 'ddbbbbbb', 'ddbbbbbb', '.ddddddd', '..aa..aa', '..aa..aa'] },
  plusling: { palette: { b: '#ff8b3d', d: '#c95a14', l: '#ffd0a8', a: '#ffffff', c: '#ffc04d', m: '#6a2a0a' }, rows: [
    '........', '.......a', '......aa', '....bbba', '...bbbbb', '..bbwwbb', '..bbwpbb', '..bbbbbb',
    '...bbbmm', 'c..dbbbb', 'cc.dbbll', '.ccdbbll', '...dbbbb', '....dd..', '........', '........'] },
  sumflare: { palette: { b: '#ff6b2c', d: '#b8400c', l: '#ffc08a', a: '#fff1c2', c: '#ff9f3d', y: '#ffd23f' }, rows: [
    '...a....', '...aa...', '....bbbb', '...bbbbb', '..bbwwbb', '..bbwpbb', '..bbbbbb', '...bbmmm',
    'cc.dbbbb', 'ccc.dbll', '.cccdbll', '..ccdbbb', '...dbbbb', 'y..ddd.d', 'yy......', '.y......'] },
  calcudrake: { palette: { b: '#e8481e', d: '#9c2a0a', l: '#ffad80', a: '#ffd23f', c: '#ff7a2f', y: '#ffe14d' }, rows: [
    '..a..a..', '..aa.aa.', '...bbbbb', '..bbbbbb', 'c.bwwbbb', 'cc.bwpbb', 'ccc.bbbb', 'cccc.mmm',
    'ccccdbbb', '.cccdbll', '..ccdbll', '...dbbbb', '..ddbbbb', 'y.ddd.dd', 'yy.dd.dd', '.y......'] },
  echobat: { palette: { b: '#8a6bd6', d: '#5b3fa8', a: '#ffd23f', c: '#b39cf0', m: '#2a1550' }, rows: [
    '........', '....a...', '....ab..', '....bbbb', 'c..bbbbb', 'cc.bwwbb', 'cccbwpbb', 'ccccbbmm',
    'cccccbbb', 'c.cc.bbb', '....dbbb', '.....ddd', '......d.', '........', '........', '........'] },
  shoutbat: { palette: { b: '#6a48c8', d: '#3d2590', a: '#ffd23f', c: '#9f84ee', m: '#1a0b40' }, rows: [
    '...a....', '...aa...', '...abbbb', 'c..bbbbb', 'cc.bwwbb', 'cccbwpbb', 'ccccbbbb', 'cccccmmm',
    'ccccbmtm', 'cccc.bbb', 'cc.c.bbb', 'c...dbbb', '.....ddd', '.....d.d', '........', '........'] },
  quotie: { palette: { b: '#ff6fae', d: '#c23d7e', l: '#ffc2dd' }, rows: [
    '........', '........', '...bbb..', '..bbbbb.', '..bwpbb.', '..blbbb.', '...bbbb.', '....dbb.',
    '....db..', '...db...', '..dd....', '........', '........', '........', '........', '........'] },
  stringra: { palette: { b: '#e84a8f', d: '#a1255d', l: '#ffb0d0', a: '#fff1f7' }, rows: [
    '........', '....bbbb', '...bbbbb', '...bwwbb', '...bwpbb', '....bbaa', '.....bbb', '...bbbb.',
    '..bbab..', '.bbbb...', '.bab....', '..bbbb..', '....bbbb', '.....bab', '....ddd.', '........'] },
  memoth: { palette: { b: '#9fb4d9', d: '#5f7aa8', l: '#d6e2f5', t: '#fffaf0' }, rows: [
    '........', '...dddd.', '..dbbbbb', '.ddbbbbb', 'dddbwwbb', 'dddbwpbb', 'dd.bbbbb', 'd..bbtbb',
    '...btbbb', '...bb.bb', '...bb..b', '...dd..b', '........', '........', '........', '........'] },
  memammoth: { palette: { b: '#6f8fc8', d: '#3f5f98', l: '#b7c9ea', t: '#fffaf0', a: '#ffd23f' }, rows: [
    '...llll.', '..lllll.', '.ddbbbbb', 'dddbbbbb', 'dddbwwbb', 'dddbwpbb', 'dd.bbbbb', 'd..bbtbb',
    '..bbtbbb', '..atbbbb', '..ab.bbb', '..bb..bb', '..bb...b', '..dd...b', '........', '........'] },
  modmole: { palette: { b: '#a07a5a', d: '#6b4a33', l: '#e2c6a5', a: '#ff8fb0', t: '#f2efe6', c: '#ff8b3d' }, rows: [
    '........', '........', '....dddd', '...dbbbb', '..dbbbbb', '..dbpbbb', '..dbbbaa', '..dbbbbb',
    '.ddbllll', 'tddbllcl', 'tt.dbllb', '...dbbbb', '....dd.d', '........', '........', '........'] },
  divimole: { palette: { b: '#7d5a3e', d: '#4a3222', l: '#d1ad85', a: '#ff8fb0', t: '#ffffff', y: '#ffd23f' }, rows: [
    '......yy', '....dddd', '...dbbbb', '..dbbbbb', '..dbwpbb', '..dbbbaa', '..dbbbbb', '.ddbllll',
    'tddbllll', 'ttdbllll', 'ttt.dbll', 'tt..dbbb', '....dbbb', '...ddd.d', '........', '........'] },
  booly: { palette: { b: '#7fd88f', d: '#3f9b55', l: '#d6f5dc', a: '#ffb84d', g: '#2fd06a', r: '#ff4d4d' }, overrides: [[11, 6, 'r']], rows: [
    '........', '....a...', '....aa..', '...bbbbb', '..bbbbbb', '.bbwwwbb', '.bbwgwbb', '.bbwwwbb',
    '.bbbbbaa', '.dbbbbba', '.dbllllb', '.ddbllll', '..dddbbb', '....a..a', '........', '........'] },
  truthowl: { palette: { b: '#4fb86a', d: '#256b3a', l: '#c9efd2', a: '#ffd23f', g: '#2fd06a', r: '#ff4d4d' }, overrides: [[11, 6, 'r']], rows: [
    '..a...a.', '..aa..aa', '..abbbbb', '.dbbbbbb', 'dbbwwwbb', 'dbbwwwbb', 'dbbwgwbb', 'dbbwwwbb',
    'ddbbbbaa', 'dddbbbba', '.ddlllll', '.ddlllll', '..ddllll', '...dddbb', '...aa.aa', '........'] },
  forkit: { palette: { b: '#c9a4ff', d: '#8a5fd6', a: '#5fd17a', c: '#8a6a4a' }, rows: [
    '..a.....', '.aaa....', '..a.c...', '....c...', '.....c..', '......cc', '....bbbb', '...bbbbb',
    '...bwwbb', '...bwpbb', '...bbbmm', '...dbbbb', '....dddd', '....d..d', '...dd.dd', '........'] },
  splitroot: { palette: { b: '#8f68d8', d: '#5a3aa0', a: '#4fb86a', c: '#7a5a3a' }, rows: [
    '.aa...aa', 'aaaa.aaa', '.ac..aac', '..c...cc', '...c.ccc', '....cccc', '...bbbbb', '..bbbbbb',
    '..bwwbbb', '..bwpbbb', '..bbbmmm', '..dbbbbb', '.ddbbbbb', 'dd.dbbbb', 'd..dd.dd', '...d...d'] },
  arduinix: { palette: { b: '#29a19c', d: '#176b68', a: '#ffd23f', c: '#1f7a3a', y: '#ffd23f', r: '#ff3b3b' }, rows: [
    '......a.', '.....aa.', '....bbbb', '...bbbbb', 'c..bwwbb', 'cc.bwpbb', 'cyc.bbaa', 'cccy.bbb',
    'cycccbbr', '.cyccbbr', '..cycdbb', '...ccddb', '....dddd', '....y..y', '...yy.yy', '........'] },
  nullwing: { palette: { b: '#2b2140', d: '#140e22', a: '#ff3bd4', c: '#3d2a66', p: '#ff3bd4', m: '#ff3bd4' }, rows: [
    '.a....a.', '..a..aa.', '....bbbb', '...bbbbb', 'c..bppbb', 'cc.bppbb', 'ccc.bbbb', 'cccc.bmm',
    'ccccdbbb', 'a.ccdbbb', '.a.cdbbb', '....ddbb', 'a...dddd', '....a..a', '...a..a.', '..a.....'] },
}

function shinyPalette(palette: Palette): Palette {
  // Golden pyxies: body colors become warm metallic tones.
  const golds = ['#ffe36e', '#e0a92a', '#fff6c4', '#ffcf3f']
  const out: Palette = { ...palette }
  for (const [i, key] of ['b', 'd', 'l', 'c'].entries()) if (out[key]) out[key] = golds[i]
  return out
}

export function pyxieCanvas(species: string, shiny = false) {
  const design = art[species]
  if (!design) return null
  const grid = gridFrom(design.rows, true)
  for (const [x, y, c] of design.overrides ?? []) grid[y][x] = c
  const palette = { ...base, ...design.palette }
  return renderGrid(`pyx:${species}:${shiny}`, outline(grid), shiny ? shinyPalette(palette) : palette)
}

export function pyxieUrl(species: string, shiny = false): string {
  return dataUrl(`pyx:${species}:${shiny}`, pyxieCanvas(species, shiny))
}

export const hasArt = (species: string) => Boolean(art[species])

// ---------------------------------------------------------------- PEOPLE

const people: Record<'down' | 'up' | 'right', string[][]> = {
  down: [[
    '................', '................', '.....HHHHHH.....', '....HHHHHHHH....', '....HHHHHHHH....', '....HSSSSSSH....', '....SSESSESS....', '....SSSSSSSS....',
    '.....SSSSSS.....', '....CCCCCCCC....', '...SCCCCCCCCS...', '...SCCCCCCCCS...', '....PPPPPPPP....', '....PPP..PPP....', '....BBB..BBB....', '................',
  ], [
    '................', '................', '.....HHHHHH.....', '....HHHHHHHH....', '....HHHHHHHH....', '....HSSSSSSH....', '....SSESSESS....', '....SSSSSSSS....',
    '.....SSSSSS.....', '....CCCCCCCC....', '...SCCCCCCCC....', '...SCCCCCCCCS...', '....PPPPPPPPS...', '....PPP..PPP....', '....BBB.........', '................',
  ]],
  up: [[
    '................', '................', '.....HHHHHH.....', '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '....SHHHHHHS....',
    '.....SSSSSS.....', '....CCCCCCCC....', '...SCCCCCCCCS...', '...SCCCCCCCCS...', '....PPPPPPPP....', '....PPP..PPP....', '....BBB..BBB....', '................',
  ], [
    '................', '................', '.....HHHHHH.....', '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '....SHHHHHHS....',
    '.....SSSSSS.....', '....CCCCCCCC....', '....CCCCCCCCS...', '...SCCCCCCCCS...', '...SPPPPPPPP....', '....PPP..PPP....', '.........BBB....', '................',
  ]],
  right: [[
    '................', '................', '.....HHHHH......', '....HHHHHHH.....', '....HHHHHHHH....', '....HHHSSSSS....', '....HHSSSSES....', '....HSSSSSSS....',
    '.....SSSSSS.....', '.....CCCCCC.....', '.....CCSCCC.....', '.....CCSCCC.....', '.....PPPPPP.....', '......PPPP......', '......BBBB......', '................',
  ], [
    '................', '................', '.....HHHHH......', '....HHHHHHH.....', '....HHHHHHHH....', '....HHHSSSSS....', '....HHSSSSES....', '....HSSSSSSS....',
    '.....SSSSSS.....', '.....CCCCCC.....', '.....CCCSCC.....', '.....CCCSCC.....', '.....PPPPPP.....', '.....PP..PP.....', '.....BB..BB.....', '................',
  ]],
}

function set(grid: string[][], x: number, y: number, c: string) {
  if (grid[y] && grid[y][x] !== undefined) grid[y][x] = c
}

function styled(look: Look, dir: 'down' | 'up' | 'right', frame: number): string[][] {
  const grid = people[dir][frame].map((row) => [...row])
  const side = dir === 'right'
  if (look.style === 'bald') for (let y = 2; y <= 4; y += 1) for (let x = 0; x < 16; x += 1) if (grid[y][x] === 'H') grid[y][x] = 'S'
  if (look.style === 'cap') {
    for (let y = 2; y <= 4; y += 1) for (let x = 0; x < 16; x += 1) if (grid[y][x] === 'H') grid[y][x] = 'K'
    if (dir === 'down') for (let x = 3; x <= 12; x += 1) set(grid, x, 4, 'K')
    if (side) for (let x = 9; x <= 12; x += 1) set(grid, x, 4, 'K')
  }
  if (look.style === 'spiky') {
    for (const x of side ? [5, 7, 9] : [5, 7, 9, 11]) set(grid, x - (side ? 0 : 1), 1, 'H')
    if (!side) { set(grid, 4, 2, 'H'); set(grid, 11, 2, 'H') }
  }
  if (look.style === 'bun') { if (side) { set(grid, 4, 2, 'H'); set(grid, 3, 3, 'H') } else { set(grid, 7, 1, 'H'); set(grid, 8, 1, 'H') } }
  if (look.style === 'long') {
    for (let y = 5; y <= 10; y += 1) {
      if (dir === 'down') { set(grid, 3, y, 'H'); set(grid, 12, y, 'H') }
      if (dir === 'up') for (let x = 4; x <= 11; x += 1) if (y <= 9) set(grid, x, y, 'H')
      if (side) { set(grid, 4, y, 'H') }
    }
  }
  if (look.extra === 'glasses') {
    if (dir === 'down') { for (const x of [5, 7, 8, 10]) set(grid, x, 6, 'g'); set(grid, 6, 6, 'q'); set(grid, 9, 6, 'q') }
    if (side) { set(grid, 9, 6, 'g'); set(grid, 10, 6, 'q'); set(grid, 11, 6, 'g') }
  }
  if (look.extra === 'goggles') {
    if (dir !== 'right') for (let x = 4; x <= 11; x += 1) set(grid, x, 4, 'k')
    if (dir === 'down') { set(grid, 5, 4, 'q'); set(grid, 6, 4, 'q'); set(grid, 9, 4, 'q'); set(grid, 10, 4, 'q') }
    if (side) { for (let x = 5; x <= 11; x += 1) set(grid, x, 4, 'k'); set(grid, 10, 4, 'q'); set(grid, 11, 4, 'q') }
  }
  if (look.extra === 'beard') {
    if (dir === 'down') for (let y = 7; y <= 8; y += 1) for (let x = 5; x <= 10; x += 1) set(grid, x, y, 'H')
    if (side) for (let y = 7; y <= 8; y += 1) for (let x = 7; x <= 11; x += 1) set(grid, x, y, 'H')
  }
  if (look.extra === 'apron') {
    if (dir === 'down') for (let y = 10; y <= 12; y += 1) for (let x = 5; x <= 10; x += 1) set(grid, x, y, 'Y')
    if (side) for (let y = 10; y <= 12; y += 1) for (let x = 8; x <= 10; x += 1) set(grid, x, y, 'Y')
  }
  return grid
}

/** One frame of a person: 0 standing, 1 and 2 walking. Left is the right frame mirrored. */
export function personCanvas(look: Look, dir: Direction, frame: number) {
  const source = dir === 'left' ? 'right' : dir
  const pose = frame === 0 ? 0 : 1
  let grid = styled(look, source, pose)
  // The second walking frame swaps legs by mirroring the whole sprite (front and back views).
  if (frame === 2 && source !== 'right') grid = grid.map((row) => [...row].reverse())
  if (dir === 'left') grid = grid.map((row) => [...row].reverse())
  const palette: Palette = {
    H: look.hair, S: look.skin, E: '#1b1626', C: look.shirt, P: look.pants, B: '#3a2a2a', K: look.cap ?? look.shirt,
    Y: '#6b4a2a', g: '#2b2230', q: '#bfe8ff', k: '#3a3a48',
  }
  const key = `p:${JSON.stringify(look)}:${dir}:${frame}`
  return renderGrid(key, outline(grid), palette)
}

export function personUrl(look: Look, dir: Direction = 'down', frame = 0): string {
  return dataUrl(`p:${JSON.stringify(look)}:${dir}:${frame}`, personCanvas(look, dir, frame))
}

// ---------------------------------------------------------------- OBJECTS AND ICONS

const objects: Record<string, { rows: string[]; palette: Palette }> = {
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
  codex: { palette: { a: '#7b3fd6', b: '#ffd23f', w: '#ffffff' }, rows: ['............', '..aaaaaaaa..', '..abbbbbba..', '..abwwwwba..', '..abbbbbba..', '..aaaaaaaa..', '..aawwwwaa..', '..aaaaaaaa..', '..aawwwaaa..', '..aaaaaaaa..', '............', '............'] },
}

export function iconUrl(name: string): string {
  const icon = icons[name]
  if (!icon) return ''
  return dataUrl(`icon:${name}`, renderGrid(`icon:${name}`, outline(gridFrom(icon.rows)), icon.palette))
}

export { shade }
