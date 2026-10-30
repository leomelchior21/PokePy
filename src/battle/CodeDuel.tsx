import { useRef, useState } from 'react'
import { CodeEditor } from '../components/CodeEditor'
import { audio } from '../engine/audio'
import { cleanOutput, lineHits, outputMatches, promptParts, shieldsFor, type CodeDuel as Duel } from '../data/duels'
import { runGuidedPython } from '../lib/guidedPython'
import { PythonRunError, pythonRunner } from '../lib/pythonRunner'

export interface DuelRun { broken: number; total: number; failed: number; error: string | null; report: TestReport[] }
export interface TestReport { inputs: string[]; expected: string; got: string; pass: boolean }

export function PromptText({ prompt }: { prompt: string }) {
  return <>{promptParts(prompt).map((part, i) => part.kind === 'say'
    ? <code key={i} className="say">{Number.isFinite(Number(part.text)) ? part.text : `"${part.text}"`}</code>
    : part.kind === 'rule' ? <mark key={i} className="rule">{part.text}</mark>
    : part.kind === 'task' ? <strong key={i} className="task">{part.text}</strong>
    : part.text)}</>
}

/** Runs the student's program against every hidden test. */
export async function runDuel(duel: Duel, code: string, onTest?: (index: number, pass: boolean) => void): Promise<DuelRun> {
  const report: TestReport[] = []
  let broken = 0
  let error: string | null = null
  const total = shieldsFor(duel)
  for (let i = 0; i < duel.tests.length; i += 1) {
    const test = duel.tests[i]
    let got = ''
    try {
      // While real Python is still downloading, the classroom runner answers right away.
      const result = pythonRunner.getState() === 'booting' ? runGuidedPython(code, test.inputs) : await pythonRunner.runScript(code, test.inputs)
      got = cleanOutput(code, result.stdout)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Python could not run this code.'
      error = cause instanceof PythonRunError && cause.line ? `Line ${cause.line}: ${message}` : message
    }
    if (duel.scoring === 'lines') {
      const hits = error ? 0 : lineHits(got, test.expected)
      broken += hits
      report.push({ inputs: test.inputs, expected: test.expected, got: error ?? got, pass: hits === total })
      for (let j = 0; j < total; j += 1) onTest?.(j, j < hits)
    } else {
      const pass = !error && outputMatches(got, test.expected)
      if (pass) broken += 1
      report.push({ inputs: test.inputs, expected: test.expected, got: error ? `💥 ${error}` : got || '(nothing)', pass })
      onTest?.(i, pass)
    }
    if (error && /SyntaxError|IndentationError|indent/i.test(error)) {
      // A program Python cannot read fails every test the same way.
      for (let j = i + 1; j < duel.tests.length; j += 1) { report.push({ inputs: duel.tests[j].inputs, expected: duel.tests[j].expected, got: `💥 ${error}`, pass: false }); onTest?.(j, false) }
      break
    }
  }
  return { broken, total, failed: total - broken, error, report }
}

interface Props {
  duel: Duel
  busy: boolean
  /** Attack: the parent animates shields and damage from the run. */
  onAttack: (code: string) => Promise<DuelRun>
  footer?: React.ReactNode
}

export function DuelPanel({ duel, busy, onAttack, footer }: Props) {
  const [code, setCode] = useState(duel.starter)
  const [hints, setHints] = useState(0)
  const [last, setLast] = useState<DuelRun | null>(null)
  const running = useRef(false)

  const attack = async () => {
    if (running.current || busy) return
    running.current = true
    audio.sfx('select')
    const run = await onAttack(code)
    setLast(run)
    running.current = false
  }

  const failing = last?.report.find((item) => !item.pass)
  return <div className="duel">
    <header className="duel__head">
      <span className="cv-kind">CODE DUEL · {duel.title.toUpperCase()}</span>
      <p className="duel__prompt"><PromptText prompt={duel.prompt} /></p>
      {duel.inputNames.length > 0 && <p className="duel__inputs">Inputs arrive in order: {duel.inputNames.map((name) => <code key={name}>{name}</code>)}</p>}
    </header>
    <div className="duel__editor"><CodeEditor value={code} onChange={setCode} readOnly={busy} minHeight="150px" label={`Code for ${duel.title}`} /></div>
    {failing && !busy && <div className="duel__report">
      <small>A TEST FAILED</small>
      {failing.inputs.length > 0 && <p>Input: <code>{failing.inputs.join(', ')}</code></p>}
      <p>Expected <b className="is-good">{failing.expected.replace(/\n/g, ' / ')}</b></p>
      <p>Your code printed <b className="is-bad">{failing.got.replace(/\n/g, ' / ')}</b></p>
    </div>}
    {hints > 0 && <ul className="duel__hints">{duel.hints.slice(0, hints).map((hint) => <li key={hint}>💡 {hint}</li>)}</ul>}
    <div className="duel__actions">
      <button className="btn btn--small" disabled={hints >= duel.hints.length || busy} onClick={() => { setHints(hints + 1); audio.sfx('blip') }}>HINT ({duel.hints.length - hints})</button>
      <button className="btn btn--small" disabled={busy} onClick={() => setCode(duel.starter)}>RESET</button>
      {footer}
      <button className="btn btn--primary btn--attack" disabled={busy} onClick={attack}>⚔ ATTACK</button>
    </div>
  </div>
}

export { outputMatches }
