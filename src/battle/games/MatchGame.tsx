import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { PythonCode } from '../../components/PythonCode'
import { audio } from '../../engine/audio'
import type { MatchChallenge, Tile } from '../minigames'
import type { GameProps } from './types'

interface Cell { id: number; tile: Tile; state: 'idle' | 'pop' | 'new' }

/** Value Crush: swap neighbors so three expressions with the same value line up, then they pop. */
export function MatchGame({ challenge, accent, started, onFinish }: GameProps<MatchChallenge>) {
  const n = challenge.size
  const nextId = useRef(0)
  const random = () => challenge.pool[Math.floor(Math.random() * challenge.pool.length)]
  const make = (tile: Tile, state: Cell['state'] = 'idle'): Cell => ({ id: nextId.current++, tile, state })
  const [cells, setCells] = useState<Cell[]>(() => freshBoard(n, random, make))
  const [selected, setSelected] = useState<number | null>(null)
  const [reveal, setReveal] = useState<number[]>([])
  const [moves, setMoves] = useState(challenge.moves)
  const [groups, setGroups] = useState(0)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<number[]>([])
  const [flash, setFlash] = useState<string | null>(null)
  const done = useRef(false)
  const swipe = useRef<{ index: number; x: number; y: number } | null>(null)
  const lastAction = useRef(performance.now())

  // A gentle hint after a while without a move.
  useEffect(() => {
    if (!started.current) return
    const id = window.setInterval(() => {
      if (busy || done.current || performance.now() - lastAction.current < 9000) return
      setHint(findMove(cells, n) ?? [])
    }, 1000)
    return () => window.clearInterval(id)
  }, [busy, cells, n, started])

  const finish = (won: boolean, left: number) => {
    if (done.current) return
    done.current = true
    window.setTimeout(() => onFinish(won, won ? Math.min(1, 0.5 + left / challenge.moves) : 0), 900)
  }

  /** Pops matches, drops tiles, refills and repeats until the board settles. */
  const resolve = async (board: Cell[], made: number, left: number) => {
    let current = board
    let total = made
    for (let chain = 0; chain < 8; chain += 1) {
      const matched = findMatches(current, n)
      if (!matched.size) break
      total += countGroups(current, n)
      audio.sfx(chain ? 'super' : 'right')
      const values = [...new Set([...matched].map((i) => current[i].tile.value))]
      setFlash(values.map((v) => `= ${v}`).join('   '))
      current = current.map((cell, i) => (matched.has(i) ? { ...cell, state: 'pop' } : cell))
      setCells(current)
      setGroups(total)
      await wait(520)
      current = gravity(current, n, matched, () => make(random(), 'new'))
      setCells(current)
      await wait(330)
      current = current.map((cell) => ({ ...cell, state: 'idle' }))
    }
    if (!findMove(current, n)) current = freshBoard(n, random, make)
    setCells(current)
    setFlash(null)
    setBusy(false)
    if (total >= challenge.goal) { audio.sfx('catch'); finish(true, left) } else if (left <= 0) finish(false, 0)
  }

  const trySwap = async (a: number, b: number) => {
    if (busy || done.current || !started.current) return
    if (!adjacent(a, b, n)) { setSelected(b); return }
    lastAction.current = performance.now()
    setHint([])
    setSelected(null)
    setBusy(true)
    const swapped = [...cells]
    ;[swapped[a], swapped[b]] = [swapped[b], swapped[a]]
    setCells(swapped)
    const left = moves - 1
    setMoves(left)
    await wait(240)
    if (!findMatches(swapped, n).size) {
      // No match: show both values so the swap still teaches something, then swap back.
      audio.sfx('wrong')
      setReveal([a, b])
      await wait(1100)
      setReveal([])
      setCells(cells)
      setBusy(false)
      if (left <= 0) finish(false, 0)
      return
    }
    await resolve(swapped, groups, left)
  }

  const pick = (index: number) => {
    audio.sfx('blip')
    if (selected === null) setSelected(index)
    else if (selected === index) setSelected(null)
    else void trySwap(selected, index)
  }

  const onDown = (index: number, event: PointerEvent) => { swipe.current = { index, x: event.clientX, y: event.clientY } }
  const onUp = (event: PointerEvent) => {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.hypot(dx, dy) < 18) { pick(start.index); return }
    const col = start.index % n
    const row = Math.floor(start.index / n)
    const target = Math.abs(dx) > Math.abs(dy) ? (dx > 0 && col < n - 1 ? start.index + 1 : dx < 0 && col > 0 ? start.index - 1 : -1) : (dy > 0 && row < n - 1 ? start.index + n : dy < 0 && row > 0 ? start.index - n : -1)
    if (target >= 0) void trySwap(start.index, target)
  }

  // The board fits the space left under the HUD, up to 116 px a tile, so iPads get big tiles.
  const wrap = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(48)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => setCellSize(Math.max(40, Math.floor(Math.min(116, (el.clientWidth - (n + 1) * 6) / n, (el.clientHeight - (n + 1) * 6) / n))))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [n])
  // One text size for the whole board, from its longest expression: every tile reads the same.
  const longest = Math.max(...cells.map((cell) => cell.tile.expr.length))
  const font = Math.max(13, Math.min(26, (cellSize - 14) / (longest * 0.62)))
  return <div className="match" style={{ '--c': accent, '--cell': `${cellSize}px`, '--n': n } as CSSProperties}>
    <div className="match__hud">
      <span>{Array.from({ length: challenge.goal }, (_, i) => <b key={i} className={i < groups ? 'is-on' : ''}>★</b>)}</span>
      <span className="match__moves">{moves} moves</span>
    </div>
    {challenge.setup.length > 0 && <div className="match__setup"><PythonCode code={challenge.setup.join('\n')} /></div>}
    <div className="match__wrap" ref={wrap}>
      <div className="match__board" role="grid" aria-label="Value Crush board">
        {cells.map((cell, i) => {
          const x = i % n
          const y = Math.floor(i / n)
          return <button key={cell.id} className={`match__tile is-${cell.state} ${selected === i ? 'is-selected' : ''} ${hint.includes(i) ? 'is-hint' : ''}`}
            style={{ '--x': x, '--y': y } as CSSProperties}
            onPointerDown={(event) => onDown(i, event)} onPointerUp={onUp}
            aria-label={`${cell.tile.expr}, row ${y + 1}, column ${x + 1}`}>
            <code style={{ fontSize: `${font}px` }}>{cell.tile.expr}</code>
            {(reveal.includes(i) || cell.state === 'pop') && <em>= {cell.tile.value}</em>}
          </button>
        })}
      </div>
    </div>
    {flash && <div className="match__flash">{flash}</div>}
  </div>
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function adjacent(a: number, b: number, n: number): boolean {
  const ax = a % n; const ay = Math.floor(a / n); const bx = b % n; const by = Math.floor(b / n)
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1
}

function findMatches(cells: Cell[], n: number): Set<number> {
  const out = new Set<number>()
  const value = (x: number, y: number) => cells[y * n + x]?.tile.value
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      let run = 1
      while (x + run < n && value(x + run, y) === value(x, y)) run += 1
      if (run >= 3) for (let k = 0; k < run; k += 1) out.add(y * n + x + k)
      let down = 1
      while (y + down < n && value(x, y + down) === value(x, y)) down += 1
      if (down >= 3) for (let k = 0; k < down; k += 1) out.add((y + k) * n + x)
    }
  }
  return out
}

/** How many separate lines of three (or more) are on the board. */
function countGroups(cells: Cell[], n: number): number {
  let count = 0
  const value = (x: number, y: number) => cells[y * n + x]?.tile.value
  for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) {
    if ((x === 0 || value(x - 1, y) !== value(x, y)) && x + 2 < n && value(x + 1, y) === value(x, y) && value(x + 2, y) === value(x, y)) count += 1
    if ((y === 0 || value(x, y - 1) !== value(x, y)) && y + 2 < n && value(x, y + 1) === value(x, y) && value(x, y + 2) === value(x, y)) count += 1
  }
  return count
}

function findMove(cells: Cell[], n: number): number[] | null {
  for (let i = 0; i < cells.length; i += 1) {
    for (const j of [i + 1, i + n]) {
      if (j >= cells.length || !adjacent(i, j, n)) continue
      const swapped = [...cells]
      ;[swapped[i], swapped[j]] = [swapped[j], swapped[i]]
      if (findMatches(swapped, n).size) return [i, j]
    }
  }
  return null
}

function gravity(cells: Cell[], n: number, removed: Set<number>, spawn: () => Cell): Cell[] {
  const out = [...cells]
  for (let x = 0; x < n; x += 1) {
    const column: Cell[] = []
    for (let y = n - 1; y >= 0; y -= 1) if (!removed.has(y * n + x)) column.push(cells[y * n + x])
    for (let y = n - 1, k = 0; y >= 0; y -= 1, k += 1) out[y * n + x] = column[k] ?? spawn()
  }
  return out
}

function freshBoard(n: number, random: () => Tile, make: (tile: Tile) => Cell): Cell[] {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const cells = Array.from({ length: n * n }, () => make(random()))
    if (!findMatches(cells, n).size && findMove(cells, n)) return cells
  }
  return Array.from({ length: n * n }, () => make(random()))
}
