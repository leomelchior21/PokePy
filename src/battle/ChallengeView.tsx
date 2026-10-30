import { useEffect, useMemo, useRef, useState } from 'react'
import { PythonCode } from '../components/PythonCode'
import { audio } from '../engine/audio'
import { buildWorks, joinTokens, orderWorks, produces, withLine, type Challenge } from './challenges'
import { devState } from '../game/chapters'

export interface ChallengeResult { correct: boolean; aided: 'none' | 'lens' | 'duck' }

interface Props {
  challenge: Challenge
  title: string
  lenses: number
  ducks: number
  onUseItem: (item: 'hintlens' | 'debugduck') => void
  onDone: (result: ChallengeResult) => void
  /** Quick challenges (dodges, compiling a cube) continue on their own after the result. */
  quick?: boolean
}

const kindLabel: Record<Challenge['kind'], string> = {
  predict: 'PREDICT THE OUTPUT', trace: 'TRACE THE VARIABLE', fill: 'FILL THE GAP', truefalse: 'TRUE OR FALSE', build: 'BUILD THE LINE', fix: 'FIND AND FIX', order: 'ORDER THE LINES', path: 'PICK THE PATH',
}

function Code({ lines, highlight, onLine, marks = {} }: { lines: string[]; highlight?: number; onLine?: (index: number) => void; marks?: Record<number, 'good' | 'bad' | 'pick'> }) {
  return <div className="cv-code" role={onLine ? 'list' : undefined}>
    {lines.map((line, index) => {
      const content = <><span className="cv-code__n">{index + 1}</span><PythonCode code={line || ' '} /></>
      const cls = `cv-code__line ${highlight === index ? 'is-hot' : ''} ${marks[index] ? `is-${marks[index]}` : ''}`
      return onLine
        ? <button key={index} className={`${cls} is-tappable`} onClick={() => onLine(index)} aria-label={`Line ${index + 1}: ${line.trim()}`}>{content}</button>
        : <div key={index} className={cls}>{content}</div>
    })}
  </div>
}

/** Shows the gap of a fill challenge as a glowing slot. */
function FillCode({ lines, value }: { lines: string[]; value: string | null }) {
  return <div className="cv-code">
    {lines.map((line, index) => {
      const [before, after] = line.split('___')
      return <div key={index} className="cv-code__line"><span className="cv-code__n">{index + 1}</span>
        {after === undefined ? <PythonCode code={line} /> : <code><PythonCode code={before} /><span className={`cv-slot ${value ? 'is-filled' : ''}`}>{value ?? '?'}</span><PythonCode code={after} /></code>}
      </div>
    })}
  </div>
}

export function ChallengeView({ challenge, title, lenses, ducks, onUseItem, onDone, quick = false }: Props) {
  const [result, setResult] = useState<ChallengeResult | null>(null)
  const [hidden, setHidden] = useState<number[]>([])
  const [aid, setAid] = useState<ChallengeResult['aided']>('none')
  const [picked, setPicked] = useState<number | null>(null)
  const [built, setBuilt] = useState<string[]>([])
  const [order, setOrder] = useState<number[]>([])
  const [bugGuess, setBugGuess] = useState<number | null>(null)
  const [bugMisses, setBugMisses] = useState(0)
  const [time, setTime] = useState(challenge.kind === 'truefalse' ? challenge.seconds : 0)
  const shuffledOrder = useMemo(() => challenge.kind === 'order' ? shuffleIndices(challenge.lines.length) : [], [challenge])
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])
  useEffect(() => {
    if (!result || !quick) return
    const id = window.setTimeout(() => onDoneRef.current(result), result.correct ? 1100 : 2200)
    return () => window.clearTimeout(id)
  }, [result, quick])

  const finish = (correct: boolean, how: ChallengeResult['aided'] = aid) => {
    if (doneRef.current) return
    doneRef.current = true
    audio.sfx(correct ? 'right' : 'wrong')
    setResult({ correct, aided: how })
  }

  useEffect(() => {
    if (challenge.kind !== 'truefalse' || result) return
    if (time <= 0) { finish(false); return }
    const id = window.setTimeout(() => setTime((value) => Math.round((value - 0.1) * 10) / 10), 100)
    return () => window.clearTimeout(id)
  })

  const applyLens = () => {
    if (lenses <= 0 || aid !== 'none' || result) return
    onUseItem('hintlens')
    setAid('lens')
    audio.sfx('item')
    if (challenge.kind === 'predict' || challenge.kind === 'trace' || challenge.kind === 'fill') {
      const wrong = challenge.options.map((_, i) => i).filter((i) => i !== challenge.answer)
      setHidden(wrong.slice(0, 2))
    }
    if (challenge.kind === 'fix') setBugGuess(challenge.bugLine)
    if (challenge.kind === 'build') setBuilt([challenge.solution[0]])
  }

  const askDuck = () => {
    if (ducks <= 0 || result) return
    onUseItem('debugduck')
    finish(true, 'duck')
  }

  const answerText = (): string => {
    switch (challenge.kind) {
      case 'predict': case 'trace': case 'fill': return challenge.options[challenge.answer]
      case 'truefalse': return challenge.answer ? 'True' : 'False'
      case 'build': return joinTokens(challenge.solution)
      case 'fix': return `Line ${challenge.bugLine + 1}: ${challenge.options[challenge.answer]}`
      case 'order': return challenge.lines.join('\n')
      case 'path': return `Line ${challenge.answerLine + 1}: ${challenge.code[challenge.answerLine].trim()}`
    }
  }

  if (result) {
    return <div className={`cv cv--result ${result.correct ? 'is-right' : 'is-wrong'}`}>
      <div className="cv-result__badge">{result.correct ? (result.aided === 'duck' ? '🦆 QUACK! SOLVED' : '✓ CORRECT!') : '✗ NOT QUITE'}</div>
      {!result.correct && <div className="cv-result__answer"><small>THE ANSWER</small><pre>{answerText()}</pre></div>}
      <p className="cv-result__explain">{challenge.explain}</p>
      <button className="btn btn--primary" autoFocus onClick={() => onDone(result)}>CONTINUE ▶</button>
    </div>
  }

  const items = <div className="cv-items">
    {challenge.kind !== 'truefalse' && challenge.kind !== 'order' && challenge.kind !== 'path' && <button className="btn btn--small" disabled={lenses <= 0 || aid !== 'none'} onClick={applyLens}>🔍 Hint Lens ({lenses})</button>}
    <button className="btn btn--small" disabled={ducks <= 0} onClick={askDuck}>🦆 Debug Duck ({ducks})</button>
  </div>

  const header = <header className="cv-head"><span className="cv-kind">{kindLabel[challenge.kind]}</span><b>{title}</b><p>{challenge.prompt}</p>
    {devState.reveal && <pre className="cv-reveal">TEACHER · ANSWER: {answerText()}</pre>}</header>

  if (challenge.kind === 'predict' || challenge.kind === 'trace' || challenge.kind === 'fill') {
    return <div className="cv">
      {header}
      {challenge.kind === 'fill' ? <FillCode lines={challenge.code} value={picked !== null ? challenge.options[picked] : null} /> : <Code lines={challenge.code} />}
      <div className="cv-options">
        {challenge.options.map((option, index) => <button key={option} className={`cv-option ${hidden.includes(index) ? 'is-hidden' : ''} ${picked === index ? 'is-picked' : ''}`} disabled={hidden.includes(index)}
          onClick={() => { setPicked(index); finish(index === challenge.answer) }}><pre>{option}</pre></button>)}
      </div>
      {items}
    </div>
  }

  if (challenge.kind === 'truefalse') {
    return <div className="cv cv--tf">
      {header}
      <Code lines={challenge.code} />
      {challenge.claim !== undefined && <div className="cv-claim"><small>CLAIMED OUTPUT</small><pre>{challenge.claim}</pre></div>}
      <div className="cv-timer"><i style={{ width: `${(time / challenge.seconds) * 100}%` }} /></div>
      <div className="cv-tf">
        <button className="cv-tf__btn is-true" onClick={() => finish(challenge.answer === true)}>TRUE</button>
        <button className="cv-tf__btn is-false" onClick={() => finish(challenge.answer === false)}>FALSE</button>
      </div>
      {items}
    </div>
  }

  if (challenge.kind === 'build') {
    const preview = joinTokens(built)
    return <div className="cv">
      {header}
      {challenge.before.length > 0 && <Code lines={challenge.before} />}
      <div className="cv-target"><small>THE SCREEN MUST SHOW</small><pre>{challenge.target}</pre></div>
      <div className="cv-build" aria-label="Your line">
        {built.length ? built.map((token, index) => <button key={index} className="token is-placed" onClick={() => setBuilt(built.filter((_, i) => i !== index))}><PythonCode code={token} /></button>) : <em>Tap the pieces in order…</em>}
      </div>
      {built.length > 0 && <p className="cv-preview">Python reads: <code>{preview}</code></p>}
      <div className="cv-tray">{challenge.tokens.map((token, index) => <button key={`${token}-${index}`} className="token" onClick={() => { audio.sfx('blip'); setBuilt([...built, token]) }}><PythonCode code={token} /></button>)}</div>
      <div className="cv-actions">
        <button className="btn btn--small" disabled={!built.length} onClick={() => setBuilt([])}>CLEAR</button>
        <button className="btn btn--primary" disabled={!built.length} onClick={() => finish(buildWorks(challenge, built))}>▶ RUN</button>
      </div>
      {items}
    </div>
  }

  if (challenge.kind === 'order') {
    const placed = order.map((index) => challenge.lines[index])
    return <div className="cv">
      {header}
      <div className="cv-target"><small>THE SCREEN MUST SHOW</small><pre>{challenge.target}</pre></div>
      <div className="cv-code cv-order">
        {placed.length ? placed.map((line, i) => <button key={i} className="cv-code__line is-tappable" onClick={() => setOrder(order.filter((_, j) => j !== i))}><span className="cv-code__n">{i + 1}</span><PythonCode code={line} /></button>) : <em>Tap the lines below, top to bottom…</em>}
      </div>
      <div className="cv-tray cv-tray--lines">{shuffledOrder.filter((index) => !order.includes(index)).map((index) => <button key={index} className="token token--line" onClick={() => { audio.sfx('blip'); setOrder([...order, index]) }}><PythonCode code={challenge.lines[index]} /></button>)}</div>
      <div className="cv-actions">
        <button className="btn btn--small" disabled={!order.length} onClick={() => setOrder([])}>CLEAR</button>
        <button className="btn btn--primary" disabled={order.length !== challenge.lines.length} onClick={() => finish(orderWorks(challenge, placed))}>▶ RUN</button>
      </div>
      {items}
    </div>
  }

  if (challenge.kind === 'path') {
    return <div className="cv">
      {header}
      <Code lines={challenge.code} onLine={(index) => {
        if (!challenge.code[index].trim().startsWith('print(')) { audio.sfx('bump'); return }
        finish(index === challenge.answerLine)
      }} />
      <p className="cv-hint">Only print lines can be tapped.</p>
      {items}
    </div>
  }

  // Fix: tap the broken line, then choose the repair.
  const fixing = challenge as Extract<Challenge, { kind: 'fix' }>
  const marks: Record<number, 'good' | 'bad' | 'pick'> = bugGuess !== null ? { [bugGuess]: 'pick' } : {}
  return <div className="cv">
    {header}
    <div className="cv-target"><small>IT SHOULD SHOW</small><pre>{fixing.target.join('\n') || '(nothing)'}</pre></div>
    <Code lines={fixing.code} marks={marks} onLine={bugGuess === null ? (index) => {
      if (index === fixing.bugLine) { audio.sfx('select'); setBugGuess(index); return }
      audio.sfx('wrong')
      if (bugMisses >= 1) finish(false)
      else setBugMisses(1)
    } : undefined} />
    {bugGuess === null
      ? <p className="cv-hint">{bugMisses ? 'That line is fine. One more try!' : 'Which line has the bug?'} The program crashes or prints {produces(fixing.code).startsWith('!') ? 'an error' : 'the wrong thing'}.</p>
      : <div className="cv-options">{fixing.options.map((option) => <button key={option} className="cv-option" onClick={() => finish(produces(withLine(fixing.code, fixing.bugLine, option)) === fixing.target.join('\n'))}><pre>{option}</pre></button>)}</div>}
    {items}
  </div>
}

function shuffleIndices(n: number): number[] {
  const list = Array.from({ length: n }, (_, i) => i)
  for (let attempt = 0; attempt < 10; attempt += 1) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
    if (list.some((value, index) => value !== index)) break
  }
  return list
}
