import { useState, type CSSProperties } from 'react'
import { displayName, levelProgress, statsFor, xpForLevel } from '../battle/engine'
import { conceptOrder, concepts } from '../data/concepts'
import { items } from '../data/items'
import { getMove } from '../data/moves'
import { badges, labGates } from '../data/progression'
import { getSpecies, speciesList } from '../data/species'
import { audio } from '../engine/audio'
import { moveToFront, replacePyxie, takeItem } from '../game/state'
import { saveCloud } from '../save/cloud'
import type { OwnedPyxie, SaveState } from '../types'
import { avatarLook } from '../world/looks'
import { mapById } from '../world/maps'
import { BadgeIcon } from './Badge'
import { PyxieInspector } from './PyxieInspector'
import { Bar, ConceptTag, ItemIcon, PersonImg, PyxieImg } from './Sprite'

type Tab = 'team' | 'codex' | 'bag' | 'card' | 'map' | 'options'

interface Props {
  get: () => SaveState
  set: (update: (s: SaveState) => SaveState) => void
  onClose: () => void
  onQuit: () => void
  onSaved: () => void
}

const tabs: Array<[Tab, string]> = [['team', 'PYXIES'], ['codex', 'CODEX'], ['bag', 'BAG'], ['card', 'TRAINER'], ['map', 'MAP'], ['options', 'OPTIONS']]

export function Menu({ get, set, onClose, onQuit, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('team')
  const [, force] = useState(0)
  const save = get()
  const change = (update: (s: SaveState) => SaveState) => { set(update); force((n) => n + 1) }
  return <div className="overlay overlay--menu" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
    <div className="menu">
      <nav className="menu__tabs">
        {tabs.map(([id, label]) => <button key={id} className={tab === id ? 'is-on' : ''} onClick={() => { setTab(id); audio.sfx('blip') }}>{label}</button>)}
        <button className="menu__close" onClick={onClose} aria-label="Close menu">✕</button>
      </nav>
      <div className="menu__body">
        {tab === 'team' && <TeamTab save={save} change={change} />}
        {tab === 'codex' && <CodexTab save={save} />}
        {tab === 'bag' && <BagTab save={save} change={change} />}
        {tab === 'card' && <CardTab save={save} />}
        {tab === 'map' && <MapTab save={save} />}
        {tab === 'options' && <OptionsTab save={save} change={change} onQuit={onQuit} onSave={() => { saveCloud(get(), true); onSaved() }} />}
      </div>
    </div>
  </div>
}

function TeamTab({ save, change }: { save: SaveState; change: (u: (s: SaveState) => SaveState) => void }) {
  const [open, setOpen] = useState<string | null>(save.team[0]?.uid ?? null)
  const pyxie = save.team.find((p) => p.uid === open)
  if (!save.team.length) return <p className="menu__empty">You don't have any pyxies yet. Leo Maker is waiting at the Makerspace!</p>
  return <div className="team-tab">
    <ul className="team-list">{save.team.map((p, i) => {
      const st = statsFor(p.species, p.level)
      return <li key={p.uid}><button className={open === p.uid ? 'is-on' : ''} onClick={() => setOpen(p.uid)}>
        <PyxieImg species={p.species} shiny={p.shiny} size={52} />
        <span><b>{displayName(p)}{i === 0 && <em> LEAD</em>}</b><small>Lv{p.level} · {p.hp}/{st.maxHp} HP</small><Bar value={p.hp} max={st.maxHp} /></span>
      </button></li>
    })}</ul>
    {pyxie && <PyxieDetail pyxie={pyxie} lead={save.team[0].uid === pyxie.uid} change={change} />}
  </div>
}

function PyxieDetail({ pyxie, lead, change }: { pyxie: OwnedPyxie; lead: boolean; change: (u: (s: SaveState) => SaveState) => void }) {
  const species = getSpecies(pyxie.species)
  const st = statsFor(pyxie.species, pyxie.level)
  const rename = () => {
    const name = window.prompt(`Nickname for ${species.name} (up to 12 letters, empty to reset):`, pyxie.nickname ?? '')
    if (name === null) return
    const clean = name.replace(/[^\p{L}\p{N} !?-]/gu, '').trim().slice(0, 12)
    change((s) => replacePyxie(s, { ...pyxie, nickname: clean || null }))
  }
  const [inspect, setInspect] = useState(false)
  return <div className="pyxie-detail">
    {inspect && <PyxieInspector species={pyxie.species} shiny={pyxie.shiny} pyxie={pyxie} onClose={() => setInspect(false)} />}
    <div className="pyxie-detail__hero" style={{ '--c': concepts[species.concept].color } as CSSProperties}>
      <button className="pyxie-detail__look" onClick={() => setInspect(true)} aria-label={`Look at ${displayName(pyxie)} up close`}>
        <PyxieImg species={pyxie.species} shiny={pyxie.shiny} size={150} />
        <span>🔍 LOOK CLOSER</span>
      </button>
      <div>
        <h3>{displayName(pyxie)} {pyxie.shiny && <span title="Golden pyxie">✨</span>}</h3>
        <p>#{String(species.dex).padStart(3, '0')} {species.name} · Lv{pyxie.level}</p>
        <ConceptTag concept={species.concept} />
        <dl className="stats"><div><dt>HP</dt><dd>{pyxie.hp}/{st.maxHp}</dd></div><div><dt>ATK</dt><dd>{st.atk}</dd></div><div><dt>DEF</dt><dd>{st.def}</dd></div><div><dt>SPD</dt><dd>{st.spd}</dd></div></dl>
        <div className="xp-line"><small>XP to next level: {Math.max(0, xpForLevel(pyxie.level + 1) - pyxie.xp)}</small><Bar value={levelProgress(pyxie)} max={1} kind="xp" /></div>
        {species.evolves && <small className="evolve-hint">Evolves into {getSpecies(species.evolves.to).name} at Lv{species.evolves.level}</small>}
      </div>
    </div>
    <ul className="move-list">{pyxie.moves.map((id) => {
      const move = getMove(id)
      return <li key={id} style={{ '--c': concepts[move.concept].color } as CSSProperties}><b>{move.name}</b><small>{concepts[move.concept].glyph} {concepts[move.concept].label} · {move.kind.toUpperCase()} · PWR {move.power}</small><p>{move.text}</p></li>
    })}</ul>
    <p className="pyxie-detail__entry">{species.entry}</p>
    <div className="pyxie-detail__actions">
      <button className="btn btn--small" disabled={lead} onClick={() => change((s) => moveToFront(s, pyxie.uid))}>MAKE LEAD</button>
      <button className="btn btn--small" onClick={rename}>NICKNAME</button>
    </div>
  </div>
}

function CodexTab({ save }: { save: SaveState }) {
  const [open, setOpen] = useState<string | null>(null)
  const species = open ? getSpecies(open) : null
  return <div className="codex">
    <p className="codex__count">Seen {save.seen.length} · Caught {save.caught.length} · Total {speciesList.length}</p>
    <div className="codex__grid">{speciesList.map((s) => {
      const seen = save.seen.includes(s.id)
      const caught = save.caught.includes(s.id)
      return <button key={s.id} className={`codex__cell ${caught ? 'is-caught' : seen ? 'is-seen' : 'is-unknown'}`} disabled={!seen} onClick={() => setOpen(s.id)}>
        <small>#{String(s.dex).padStart(3, '0')}</small>
        {seen ? <PyxieImg species={s.id} size={48} className={caught ? '' : 'is-silhouette'} /> : <span className="codex__q">?</span>}
        <b>{seen ? s.name : '???'}</b>
      </button>
    })}</div>
    {species && <PyxieInspector species={species.id} mystery={!save.caught.includes(species.id)} onClose={() => setOpen(null)} />}
  </div>
}

function BagTab({ save, change }: { save: SaveState; change: (u: (s: SaveState) => SaveState) => void }) {
  const [using, setUsing] = useState<string | null>(null)
  const entries = Object.entries(save.bag)
  const apply = (pyxie: OwnedPyxie) => {
    if (!using) return
    const info = items[using]
    const st = statsFor(pyxie.species, pyxie.level)
    if (info.use === 'heal' && pyxie.hp > 0 && pyxie.hp < st.maxHp) change((s) => replacePyxie(takeItem(s, using), { ...pyxie, hp: Math.min(st.maxHp, pyxie.hp + (info.power ?? 0)) }))
    else if (info.use === 'revive' && pyxie.hp <= 0) change((s) => replacePyxie(takeItem(s, using), { ...pyxie, hp: Math.ceil(st.maxHp / 2) }))
    else { audio.sfx('wrong'); return }
    audio.sfx('heal')
    setUsing(null)
  }
  if (!entries.length) return <p className="menu__empty">Your bag is empty.</p>
  return <div className="bag">
    <ul className="bag__list">{entries.map(([id, count]) => {
      const info = items[id]
      if (!info) return null
      return <li key={id}><ItemIcon icon={info.icon} size={34} /><div><b>{info.name} <em>×{count}</em></b><small>{info.text}</small></div>
        {(info.use === 'heal' || info.use === 'revive') && <button className="btn btn--small" onClick={() => setUsing(using === id ? null : id)}>{using === id ? 'CANCEL' : 'USE'}</button>}
        {info.use === 'key' && <span className="bag__key">KEY</span>}
      </li>
    })}</ul>
    {using && <div className="bag__targets"><p>Use {items[using].name} on…</p>{save.team.map((p) => <button key={p.uid} className="btn" onClick={() => apply(p)}><PyxieImg species={p.species} size={28} /> {displayName(p)} {p.hp}/{statsFor(p.species, p.level).maxHp}</button>)}</div>}
  </div>
}

function CardTab({ save }: { save: SaveState }) {
  const minutes = Math.floor(save.playMs / 60000)
  const accuracy = save.stats.challenges ? Math.round((save.stats.correct / save.stats.challenges) * 100) : 0
  const next = badges.find((b) => !save.badges.includes(b.id))
  const gate = next ? labGates[next.id as keyof typeof labGates] : null
  return <div className="card">
    <div className="card__id">
      <PersonImg look={avatarLook(save.avatar)} size={112} />
      <div>
        <small>TRAINER CARD · ESCOLA LOURENÇO CASTANHO</small>
        <h3>{save.displayName}</h3>
        <p>⭐ {save.trainerXp} Trainer XP</p>
        {next && gate !== null && <p className="card__next">Next: {next.master} at {next.lab} needs {gate} XP {save.trainerXp >= gate ? '✓ READY' : `(${gate - save.trainerXp} to go)`}</p>}
        {!next && <p className="card__next">All six badges! The Grand Hackathon awaits.</p>}
        <p>Play time: {Math.floor(minutes / 60)}h {String(minutes % 60).padStart(2, '0')}m · ◈ {save.bits} bits</p>
      </div>
    </div>
    <div className="card__badges">{badges.map((b) => <div key={b.id} title={b.name}><BadgeIcon id={b.id} size={54} locked={!save.badges.includes(b.id)} /><small>{save.badges.includes(b.id) ? b.name : '???'}</small></div>)}</div>
    <dl className="card__stats">
      <div><dt>Battles won</dt><dd>{save.stats.wins}/{save.stats.battles}</dd></div>
      <div><dt>Right answers</dt><dd>{accuracy}% ({save.stats.correct}/{save.stats.challenges})</dd></div>
      <div><dt>Best streak</dt><dd>{save.stats.bestStreak}</dd></div>
      <div><dt>Pyxies caught</dt><dd>{save.caught.length}</dd></div>
      <div><dt>Code duels won</dt><dd>{save.stats.codeDuels}</dd></div>
      <div><dt>Tests passed</dt><dd>{save.stats.codeTestsPassed}</dd></div>
      <div><dt>Steps</dt><dd>{save.stats.steps}</dd></div>
    </dl>
  </div>
}

const mapNodes: Array<{ id: string; x: number; y: number; town: boolean }> = [
  { id: 'academy', x: 7, y: 0, town: true }, { id: 'hackroad', x: 7, y: 1, town: false }, { id: 'branchwood', x: 7, y: 2, town: true },
  { id: 'route6', x: 5, y: 2, town: false }, { id: 'veritas', x: 3, y: 2, town: true }, { id: 'route5', x: 3, y: 3, town: false },
  { id: 'abacus', x: 3, y: 4, town: true }, { id: 'route4', x: 5, y: 4, town: false }, { id: 'stringhaven', x: 7, y: 4, town: true },
  { id: 'route3', x: 7, y: 5, town: false }, { id: 'boxford', x: 7, y: 6, town: true }, { id: 'route2', x: 5, y: 6, town: false },
  { id: 'harbor', x: 3, y: 6, town: true }, { id: 'route1', x: 3, y: 7, town: false }, { id: 'vila', x: 3, y: 8, town: true },
]

function MapTab({ save }: { save: SaveState }) {
  const here = mapNodes.find((node) => node.id === save.map) ? save.map
    : Object.values(mapById).find((map) => map.warps?.some((w) => w.to === save.map) || map.buildings?.some((b) => b.to === save.map))?.id ?? save.map
  const outer = mapNodes.find((node) => node.id === here) ? here : mapNodes.find((node) => mapById[node.id].buildings?.some((b) => b.to === here))?.id
  return <div className="valley">
    <svg viewBox="0 0 10 9.4" className="valley__svg" role="img" aria-label="Map of the Castanho Valley">
      <rect x="0" y="0" width="10" height="9.4" fill="#5fae55" />
      <path d="M0 0 h10 v0.6 h-10 Z" fill="#3f7f3a" />
      <path d="M0 6.2 h2.4 v3.2 h-2.4 Z" fill="#4aa3df" />
      <polyline points={mapNodes.map((node) => `${node.x + 1},${node.y + 0.5}`).join(' ')} fill="none" stroke="#f1dc9a" strokeWidth="0.22" strokeLinejoin="round" />
      <polyline points={mapNodes.map((node) => `${node.x + 1},${node.y + 0.5}`).join(' ')} fill="none" stroke="#c9a35a" strokeWidth="0.05" strokeDasharray="0.15 0.15" />
      {mapNodes.map((node) => {
        const visited = save.flags.includes(`visited:${node.id}`) || node.id === 'vila'
        return <g key={node.id} transform={`translate(${node.x + 1} ${node.y + 0.5})`} opacity={visited ? 1 : 0.35}>
          {node.town
            ? <rect x="-0.38" y="-0.38" width="0.76" height="0.76" rx="0.1" fill={node.id === 'academy' ? '#6a2fb8' : '#e8483f'} stroke={node.id === 'academy' ? '#ffd23f' : '#fff'} strokeWidth="0.07" />
            : <circle r="0.2" fill="#f1dc9a" stroke="#8a6a4a" strokeWidth="0.05" />}
          {outer === node.id && <circle r="0.55" fill="none" stroke="#ffd23f" strokeWidth="0.09" className="valley__here" />}
        </g>
      })}
    </svg>
    <ul className="valley__legend">{mapNodes.filter((node) => node.town).map((node) => <li key={node.id} className={outer === node.id ? 'is-here' : ''}>{mapById[node.id].name}{outer === node.id && ' ◀ YOU'}</li>)}</ul>
  </div>
}

function OptionsTab({ save, change, onQuit, onSave }: { save: SaveState; change: (u: (s: SaveState) => SaveState) => void; onQuit: () => void; onSave: () => void }) {
  const toggle = (key: 'music' | 'sfx') => {
    change((s) => ({ ...s, settings: { ...s.settings, [key]: !s.settings[key] } }))
    if (key === 'music') audio.setMusic(!save.settings.music)
    else audio.sfxOn = !save.settings.sfx
  }
  return <div className="options">
    <div className="options__row"><span>Music</span><button className="btn btn--small" onClick={() => toggle('music')}>{save.settings.music ? 'ON' : 'OFF'}</button></div>
    <div className="options__row"><span>Sound effects</span><button className="btn btn--small" onClick={() => toggle('sfx')}>{save.settings.sfx ? 'ON' : 'OFF'}</button></div>
    <div className="options__row"><span>Text speed</span>{(['slow', 'normal', 'fast'] as const).map((speed) => <button key={speed} className={`btn btn--small ${save.settings.textSpeed === speed ? 'is-on' : ''}`} onClick={() => change((s) => ({ ...s, settings: { ...s.settings, textSpeed: speed } }))}>{speed.toUpperCase()}</button>)}</div>
    <div className="options__help">
      <h4>Controls</h4>
      <p>Arrows / WASD or the D-pad: move · Shift or hold B: run · A, Enter or Space: talk · Esc or MENU: menu</p>
      <h4>The concept ring</h4>
      <p className="ring">{conceptOrder.map((c, i) => <span key={c}><ConceptTag concept={c} small />{i < conceptOrder.length - 1 ? ' → ' : ' → ✦'}</span>)}</p>
      <p>Each concept is super effective against the next one around the ring.</p>
    </div>
    <div className="options__actions">
      <button className="btn btn--primary" onClick={onSave}>💾 SAVE NOW</button>
      <button className="btn" onClick={onQuit}>SAVE & QUIT</button>
    </div>
  </div>
}
