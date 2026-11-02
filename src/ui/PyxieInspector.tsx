import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { displayName, statsFor } from '../battle/engine'
import { screen } from '../battle/challenges'
import { miniLabel, isMini } from '../battle/minigames'
import { PythonCode } from '../components/PythonCode'
import { concepts } from '../data/concepts'
import { getMove } from '../data/moves'
import { getSpecies, speciesList } from '../data/species'
import { pyxieUrl } from '../engine/art'
import { audio } from '../engine/audio'
import type { OwnedPyxie } from '../types'
import { ConceptTag, PyxieImg } from './Sprite'

interface Props {
  species: string
  shiny?: boolean
  /** An owned pyxie shows its own level, HP and moves. */
  pyxie?: OwnedPyxie
  /** Codex entries for pyxies only seen, never caught, stay a mystery. */
  mystery?: boolean
  /** A banner over the stage: NEW PYXIE!, CHOOSE YOUR PARTNER… */
  banner?: string
  onClose: () => void
  actions?: Array<{ label: string; primary?: boolean; onClick: () => void }>
}

const kindName: Record<string, string> = { predict: 'quiz', trace: 'quiz', fill: 'quiz', truefalse: 'quiz', build: 'builder', fix: 'debug', order: 'order', path: 'path' }

/** The whole evolution line of a species, in order. */
function line(species: string): Array<{ id: string; level?: number }> {
  let first = species
  for (let guard = 0; guard < 4; guard += 1) {
    const parent = speciesList.find((s) => s.evolves?.to === first)
    if (!parent) break
    first = parent.id
  }
  const out: Array<{ id: string; level?: number }> = [{ id: first }]
  for (let guard = 0; guard < 4; guard += 1) {
    const evolves = getSpecies(out[out.length - 1].id).evolves
    if (!evolves) break
    out.push({ id: evolves.to, level: evolves.level })
  }
  return out
}

/**
 * The big look at a pyxie: a spotlit stage where it breathes and blinks, a pixel grid to study
 * the art, stats, its evolution line, its moves, and the pyxie written as Python variables.
 */
export function PyxieInspector({ species, shiny = false, pyxie, mystery = false, banner, onClose, actions }: Props) {
  const info = getSpecies(species)
  const concept = concepts[info.concept]
  const [blink, setBlink] = useState(false)
  const [grid, setGrid] = useState(false)
  const [flip, setFlip] = useState(false)
  const [zoom, setZoom] = useState(1)
  const level = pyxie?.level ?? 10
  const stats = statsFor(species, level)
  const name = pyxie ? displayName(pyxie) : info.name
  const moves = pyxie?.moves ?? info.learnset.filter(([lv]) => lv <= Math.max(level, 1)).slice(-4).map(([, id]) => id)
  const chain = useMemo(() => line(species), [species])

  useEffect(() => {
    audio.sfx('select')
    let timer = 0
    const loop = () => {
      timer = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 140); loop() }, 2200 + Math.random() * 2600)
    }
    loop()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const code = [
    `name = "${name}"`,
    `concept = "${concept.label}"`,
    `level = ${level}`,
    `hp = ${pyxie ? pyxie.hp : stats.maxHp}`,
    'print(name, "is a", concept, "pyxie")',
    'print("Level", level, "with", hp, "HP")',
  ]
  const output = useMemo(() => { try { return screen(code) } catch { return '' } }, [code.join('\n')]) // eslint-disable-line react-hooks/exhaustive-deps
  const art = pyxieUrl(species, shiny, 96)
  const artBlink = pyxieUrl(species, shiny, 96, true)
  const bars: Array<[string, number, number]> = [['HP', stats.maxHp, 220], ['ATK', stats.atk, 110], ['DEF', stats.def, 110], ['SPD', stats.spd, 110]]

  // A portal, so menus and battle panels never clip it.
  return createPortal(<div className="inspector" role="dialog" aria-label={`${info.name} up close`} style={{ '--c': concept.color, '--cd': concept.dark } as CSSProperties} onClick={onClose}>
    <div className="inspector__card" onClick={(event) => event.stopPropagation()}>
      <header className="inspector__head">
        <span className="inspector__dex">#{String(info.dex).padStart(3, '0')}</span>
        <h2>{mystery ? '???' : name}{shiny && ' ✨'}</h2>
        {!mystery && <ConceptTag concept={info.concept} />}
        {info.legendary && !mystery && <span className="inspector__legend">★ LEGENDARY</span>}
        <button className="inspector__close" onClick={onClose} aria-label="Close">✕</button>
      </header>
      <div className="inspector__body">
        <section className={`inspector__stage ${mystery ? 'is-mystery' : ''}`}>
          {banner && <div className="inspector__banner">{banner}</div>}
          <div className="inspector__rays" aria-hidden="true" />
          {!mystery && Array.from({ length: 8 }, (_, i) => <i key={i} className="inspector__spark" style={{ '--i': i } as CSSProperties}>{concept.glyph}</i>)}
          <div className="inspector__platform" aria-hidden="true" />
          <div className="inspector__mon" style={{ '--zoom': zoom } as CSSProperties}>
            <img src={blink && !mystery ? artBlink : art} alt={info.name} draggable={false} className={flip ? 'is-flip' : ''} />
            {grid && <span className="inspector__grid" aria-hidden="true" />}
          </div>
          {!mystery && <div className="inspector__tools">
            <button className={grid ? 'is-on' : ''} onClick={() => setGrid(!grid)} title="Show the pixel grid">▦ PIXELS</button>
            <button className={zoom > 1 ? 'is-on' : ''} onClick={() => setZoom(zoom > 1 ? 1 : 1.6)} title="Zoom in">🔍 ZOOM</button>
            <button className={flip ? 'is-on' : ''} onClick={() => setFlip(!flip)} title="Turn around">↔ TURN</button>
          </div>}
        </section>
        <section className="inspector__info">
          {mystery ? <>
            <p className="inspector__entry">You have seen this pyxie, but not caught it yet. Catch it to study it up close!</p>
            <p className="inspector__habitat">📍 {info.habitat}</p>
          </> : <>
            <p className="inspector__entry">{info.entry}</p>
            <p className="inspector__habitat">📍 {info.habitat}</p>
            <div className="inspector__stats">
              {pyxie && <small>LEVEL {level}</small>}
              {!pyxie && <small>AT LEVEL {level}</small>}
              {bars.map(([label, value, max]) => <div key={label} className="inspector__stat"><b>{label}</b><span><i style={{ width: `${Math.min(100, (value / max) * 100)}%` }} /></span><em>{value}</em></div>)}
            </div>
            {chain.length > 1 && <div className="inspector__chain">
              {chain.map((step, i) => <span key={step.id} className={step.id === species ? 'is-here' : ''}>
                {i > 0 && <small>Lv {step.level} →</small>}
                <PyxieImg species={step.id} size={52} />
                <b>{getSpecies(step.id).name}</b>
              </span>)}
            </div>}
            <ul className="inspector__moves">
              {moves.map((id) => {
                const move = getMove(id)
                const c = concepts[move.concept]
                return <li key={id} style={{ '--mc': c.color } as CSSProperties}>
                  <b>{move.name}</b>
                  <small>{c.glyph} {c.label} · {isMini(move.kind) ? `🎮 ${miniLabel[move.kind]}` : kindName[move.kind]?.toUpperCase() ?? move.kind}</small>
                </li>
              })}
            </ul>
            <div className="inspector__python">
              <small>THIS PYXIE, AS PYTHON</small>
              <div className="cv-code">{code.map((l, i) => <div key={i} className="cv-code__line"><span className="cv-code__n">{i + 1}</span><PythonCode code={l} /></div>)}</div>
              <pre className="inspector__out">{output}</pre>
            </div>
          </>}
        </section>
      </div>
      {actions && <footer className="inspector__actions">{actions.map((action) => <button key={action.label} className={`btn ${action.primary ? 'btn--primary' : ''}`} autoFocus={action.primary} onClick={action.onClick}>{action.label}</button>)}</footer>}
    </div>
  </div>, document.body)
}
