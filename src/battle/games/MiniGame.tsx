import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { PythonCode } from '../../components/PythonCode'
import { concepts } from '../../data/concepts'
import { pyxieCanvas } from '../../engine/art'
import { audio } from '../../engine/audio'
import { miniLabel, type MiniChallenge } from '../minigames'
import { BlocksGame } from './BlocksGame'
import { CatchGame } from './CatchGame'
import { FlappyGame } from './FlappyGame'
import { JumpGame } from './JumpGame'
import { MatchGame } from './MatchGame'
import { SlingGame } from './SlingGame'
import type { Controls } from './types'
import './games.css'

const howTo: Record<MiniChallenge['kind'], { icon: string; lines: string[]; keys: string }> = {
  catch: { icon: '🧺', lines: ['Read the code first.', 'Values fall from the sky: catch only what the code prints. Three catches win!'], keys: 'Move: drag, mouse, or ← →' },
  sling: { icon: '🎯', lines: ['Work out the output.', 'Pull your pyxie back and launch it at the tower with the right output.'], keys: 'Drag back from the slingshot and let go' },
  flappy: { icon: '🪽', lines: ['Each gate runs one line of code.', 'Fly through the opening with the variable\'s NEW value.'], keys: 'Flap: tap, click, or Space' },
  jump: { icon: '⬆️', lines: ['Each platform is a condition.', 'Land on the True ones to climb. False ones crumble!'], keys: 'Steer: drag, mouse, or ← →' },
  match: { icon: '💎', lines: ['Every tile is a Python expression.', 'Swap two neighbors to line up 3 with the same value.'], keys: 'Tap two neighbors, or swipe' },
  blocks: { icon: '🧩', lines: ['Build the program block by block.', 'RUN it: every test must show what it expects.'], keys: 'Tap a block to place it, tap a line to remove it' },
}

const canvasGames = new Set(['catch', 'sling', 'flappy', 'jump'])

interface Props {
  challenge: MiniChallenge
  title: string
  hero?: { species: string; shiny: boolean }
  ducks: number
  onDuck: () => void
  onFinish: (correct: boolean, score: number) => void
}

export function MiniGame({ challenge, title, hero, ducks, onDuck, onFinish }: Props) {
  const info = concepts[challenge.concept]
  const needsStart = challenge.kind !== 'blocks'
  const [started, setStarted] = useState(!needsStart)
  const startedRef = useRef(!needsStart)
  const controls = useRef<Controls>({ left: false, right: false, pointerX: null, pointerY: null, down: false, taps: 0 })
  const [trace, setTrace] = useState<{ line: number | null; notes: Record<number, string> }>({ line: challenge.kind === 'flappy' ? 0 : null, notes: {} })
  const finished = useRef(false)
  const onFinishRef = useRef(onFinish)
  useEffect(() => { onFinishRef.current = onFinish })
  const finish = useCallback((correct: boolean, score: number) => {
    if (finished.current) return
    finished.current = true
    onFinishRef.current(correct, score)
  }, [])
  const heroArt = useMemo(() => (hero ? pyxieCanvas(hero.species, hero.shiny, 48) : null), [hero])
  const start = () => { if (startedRef.current) return; audio.unlock(); audio.sfx('select'); startedRef.current = true; setStarted(true) }

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const c = controls.current
      if (event.key === 'ArrowLeft' || event.key === 'a') { c.left = true; event.preventDefault() }
      if (event.key === 'ArrowRight' || event.key === 'd') { c.right = true; event.preventDefault() }
      if ([' ', 'ArrowUp', 'w', 'Enter'].includes(event.key)) {
        event.preventDefault()
        if (!startedRef.current) start()
        else if (!event.repeat) c.taps += 1
      }
    }
    const up = (event: KeyboardEvent) => {
      const c = controls.current
      if (event.key === 'ArrowLeft' || event.key === 'a') c.left = false
      if (event.key === 'ArrowRight' || event.key === 'd') c.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  const point = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    controls.current.pointerX = event.clientX - rect.left
    controls.current.pointerY = event.clientY - rect.top
  }

  const props = { accent: info.color, hero: heroArt, started: startedRef, controls, onFinish: finish }
  const game = (() => {
    switch (challenge.kind) {
      case 'catch': return <CatchGame challenge={challenge} {...props} />
      case 'sling': return <SlingGame challenge={challenge} {...props} />
      case 'flappy': return <FlappyGame challenge={challenge} {...props} onTrace={(line, notes) => setTrace({ line, notes })} />
      case 'jump': return <JumpGame challenge={challenge} {...props} />
      case 'match': return <MatchGame challenge={challenge} {...props} />
      case 'blocks': return <BlocksGame challenge={challenge} {...props} />
    }
  })()

  const code = challenge.kind === 'catch' || challenge.kind === 'sling' || challenge.kind === 'flappy' ? challenge.code : challenge.kind === 'jump' ? challenge.setup : []
  const how = howTo[challenge.kind]
  return <div className={`mini mini--${challenge.kind}`} style={{ '--c': info.color, '--cd': info.dark } as CSSProperties}>
    <header className="cv-head mini__head">
      <span className="cv-kind">{miniLabel[challenge.kind]}</span>
      <b>{title}</b>
      <p>{challenge.prompt}</p>
    </header>
    <div className={`mini__body ${code.length || challenge.kind === 'jump' ? 'has-code' : ''}`}>
      {(code.length > 0 || challenge.kind === 'jump') && <aside className="mini__code" aria-label="The code">
        <small>{challenge.kind === 'jump' ? 'VARIABLES' : 'THE CODE'}</small>
        {code.length ? <div className="cv-code">
          {code.map((line, i) => <div key={i} className={`cv-code__line ${trace.line === i ? 'is-hot' : ''} ${trace.notes[i] ? 'is-done' : ''}`}>
            <span className="cv-code__n">{i + 1}</span><PythonCode code={line} />
            {trace.notes[i] && <span className="mini__note"># {trace.notes[i]}</span>}
          </div>)}
        </div> : <p className="mini__legend">No variables: just compare the values.</p>}
        {challenge.kind === 'jump' && <p className="mini__legend"><code>==</code> equal · <code>!=</code> not equal · <code>&gt;=</code> includes the number</p>}
      </aside>}
      <div className="mini__stage"
        onPointerMove={point}
        onPointerDown={(event) => { if (!canvasGames.has(challenge.kind)) return; point(event); controls.current.down = true; if (startedRef.current) controls.current.taps += 1 }}
        onPointerUp={() => { controls.current.down = false }}
        onPointerLeave={() => { controls.current.pointerX = null; controls.current.down = false }}
        onPointerCancel={() => { controls.current.down = false }}>
        {game}
        {!started && <div className="mini__start">
          <span className="mini__icon">{how.icon}</span>
          <h3>{miniLabel[challenge.kind]}</h3>
          {how.lines.map((line) => <p key={line}>{line}</p>)}
          <small>{how.keys}</small>
          <button className="btn btn--primary" autoFocus onClick={(event) => { event.stopPropagation(); start() }}>▶ START</button>
        </div>}
      </div>
    </div>
    <div className="cv-items">
      <button className="btn btn--small" disabled={ducks <= 0} onClick={() => { finished.current = true; onDuck() }}>🦆 Debug Duck ({ducks})</button>
    </div>
  </div>
}
