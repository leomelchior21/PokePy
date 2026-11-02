import { useState, type CSSProperties } from 'react'
import { PythonCode } from '../../components/PythonCode'
import { audio } from '../../engine/audio'
import { run } from '../challenges'
import { assemble, runBlocks, type BlockResult, type BlocksChallenge } from '../minigames'
import type { GameProps } from './types'

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/**
 * Code Builder: snap blocks into the program's slots (the indentation is part of the slot), then
 * RUN. Every test plays line by line, like the classroom tracer, and must print what it expects.
 */
export function BlocksGame({ challenge, accent, onFinish }: GameProps<BlocksChallenge>) {
  const open = challenge.slots.filter((slot) => !slot.fixed).length
  const [placed, setPlaced] = useState<Array<number | null>>(() => Array(open).fill(null))
  const [focus, setFocus] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [hot, setHot] = useState<number | null>(null)
  const [console_, setConsole] = useState<string[]>([])
  const [results, setResults] = useState<BlockResult[] | null>(null)
  const [runsLeft, setRunsLeft] = useState(challenge.runs)
  const [done, setDone] = useState(false)
  const used = new Set(placed.filter((i): i is number => i !== null))
  const texts = placed.map((i) => (i === null ? null : challenge.pieces[i]))

  const put = (piece: number) => {
    if (running || done) return
    audio.sfx('blip')
    const slot = focus !== null && placed[focus] === null ? focus : placed.indexOf(null)
    if (slot < 0) return
    const next = [...placed]
    next[slot] = piece
    setPlaced(next)
    setFocus(null)
    setResults(null)
  }

  const take = (slot: number) => {
    if (running || done) return
    if (placed[slot] === null) { setFocus(focus === slot ? null : slot); return }
    audio.sfx('back')
    const next = [...placed]
    next[slot] = null
    setPlaced(next)
    setResults(null)
  }

  const runAll = async () => {
    if (running || done || placed.includes(null)) return
    setRunning(true)
    setResults(null)
    const program = assemble(challenge, texts)
    const outcome = runBlocks(challenge, texts)
    const shown: BlockResult[] = []
    for (const result of outcome) {
      const lines = result.test.setup.length ? [...result.test.setup, ...program.slice(result.test.setup.length)] : program
      const trace = run(lines)
      setConsole([`▶ ${result.test.label}`])
      // Light up each line as Python reaches it.
      const visited = [...new Set(trace.events.map((event) => event.line))]
      for (const event of trace.events) {
        setHot(event.line)
        audio.sfx('type')
        if (event.kind === 'print' && event.output !== undefined) setConsole((lines) => [...lines, event.output!])
        await wait(visited.length > 6 ? 260 : 380)
      }
      if (result.error) setConsole((lines) => [...lines, `⚠ ${result.error}`])
      setHot(null)
      shown.push(result)
      setResults([...shown])
      audio.sfx(result.pass ? 'right' : 'wrong')
      await wait(650)
    }
    setRunning(false)
    const passed = outcome.every((r) => r.pass)
    const left = runsLeft - 1
    setRunsLeft(left)
    if (passed) { setDone(true); audio.sfx('catch'); window.setTimeout(() => onFinish(true, left === challenge.runs - 1 ? 1 : 0.7), 700) }
    else if (left <= 0) { setDone(true); window.setTimeout(() => onFinish(false, 0), 900) }
  }

  let k = 0
  return <div className="blocks" style={{ '--c': accent } as CSSProperties}>
    <div className="blocks__program" aria-label="Your program">
      {challenge.slots.map((slot, line) => {
        if (slot.fixed) return <div key={line} className={`blocks__line is-fixed ${hot === line ? 'is-hot' : ''}`}><span className="blocks__n">{line + 1}</span><span className="blocks__indent" style={{ width: `${slot.indent * 2}ch` }} /><PythonCode code={slot.fixed} /></div>
        const index = k++
        const text = texts[index]
        return <button key={line} className={`blocks__line is-slot ${text ? 'is-filled' : ''} ${focus === index ? 'is-focus' : ''} ${hot === line ? 'is-hot' : ''}`} onClick={() => take(index)} aria-label={text ? `Line ${line + 1}: ${text}. Tap to remove.` : `Empty line ${line + 1}`}>
          <span className="blocks__n">{line + 1}</span>
          <span className="blocks__indent" style={{ width: `${slot.indent * 2}ch` }}>{slot.indent ? '⇥' : ''}</span>
          {text ? <PythonCode code={text} /> : <em>{slot.indent ? 'indented block…' : 'drop a block…'}</em>}
        </button>
      })}
    </div>
    <div className="blocks__tray" aria-label="Blocks">
      {challenge.pieces.map((piece, i) => <button key={i} className={`blocks__piece ${used.has(i) ? 'is-used' : ''}`} disabled={used.has(i) || running || done} onClick={() => put(i)}><PythonCode code={piece} /></button>)}
    </div>
    <div className="blocks__tests">
      {challenge.tests.map((test, i) => {
        const result = results?.[i]
        return <div key={i} className={`blocks__test ${result ? (result.pass ? 'is-pass' : 'is-fail') : ''}`}>
          <b>{result ? (result.pass ? '✓' : '✗') : '○'} TEST {i + 1}</b>
          <span>{test.label} → must show <code>{test.expect.replace(/\n/g, ' ⏎ ')}</code></span>
          {result && !result.pass && <small>{result.error ? result.error : `showed ${result.output ? result.output.replace(/\n/g, ' ⏎ ') : '(nothing)'}`}</small>}
        </div>
      })}
    </div>
    <div className="blocks__bottom">
      <pre className="blocks__console" aria-live="polite">{console_.join('\n') || 'Output appears here when you RUN.'}</pre>
      <div className="blocks__actions">
        <small>{runsLeft} run{runsLeft === 1 ? '' : 's'} left</small>
        <button className="btn btn--small" disabled={running || done || !used.size} onClick={() => { setPlaced(Array(open).fill(null)); setResults(null) }}>CLEAR</button>
        <button className="btn btn--primary" disabled={running || done || placed.includes(null)} onClick={() => void runAll()}>▶ RUN</button>
      </div>
    </div>
  </div>
}
