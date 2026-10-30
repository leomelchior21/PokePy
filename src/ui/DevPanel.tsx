import { useMemo, useState } from 'react'
import { speciesList } from '../data/species'
import { items } from '../data/items'
import { chapters, chapterSave, devState, spawnPoint } from '../game/chapters'
import { giveItem, healTeam } from '../game/state'
import type { SaveState } from '../types'
import { maps } from '../world/maps'

interface Props {
  get: () => SaveState
  set: (update: (s: SaveState) => SaveState) => void
  onJump: (save: SaveState) => void
  onPlace: (map: string, x: number, y: number) => void
  onWild: (species: string, level: number) => void
  onTrainer: (map: string, npc: string) => void
  onClose: () => void
}

/** Teacher tools (Ctrl+K): jump to a chapter, teleport, start battles, reveal answers. */
export function DevPanel({ get, set, onJump, onPlace, onWild, onTrainer, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [species, setSpecies] = useState('echobat')
  const [level, setLevel] = useState(10)
  const [reveal, setReveal] = useState(devState.reveal)
  const [note, setNote] = useState('')
  const q = query.trim().toLowerCase()
  const masters = useMemo(() => maps.flatMap((map) => (map.npcs ?? []).flatMap((npc) => npc.trainer ? [{ map: map.id, npc: npc.id, label: `${npc.name} · ${map.name}`, duel: Boolean(npc.trainer.duels) }] : [])), [])
  const shownChapters = chapters.filter((chapter) => !q || `${chapter.label} ${chapter.note}`.toLowerCase().includes(q))
  const shownMaps = maps.filter((map) => !q || `${map.name} ${map.id}`.toLowerCase().includes(q))
  const shownTrainers = masters.filter((t) => !q ? t.duel : t.label.toLowerCase().includes(q))
  const flash = (text: string) => { setNote(text); window.setTimeout(() => setNote(''), 1600) }

  return <div className="overlay overlay--menu" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
    <div className="panel dev">
      <header className="panel__head"><h2>TEACHER TOOLS</h2><small>Ctrl+K</small><button className="btn btn--small" onClick={onClose}>CLOSE</button></header>
      <div className="dev__body">
        <input className="dev__search" autoFocus placeholder="Search chapters, maps, trainers…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {note && <p className="dev__note">{note}</p>}
        <section>
          <h3>Jump to a chapter</h3>
          <div className="dev__chapters">{shownChapters.map((chapter, i) => <button key={chapter.id} className="dev__chapter" onClick={() => {
            if (window.confirm(`Jump to "${chapter.label}"? Your current teacher save is replaced.`)) onJump(chapterSave(chapter, get()))
          }}><b>{String(chapters.indexOf(chapter) + 1).padStart(2, '0')} · {chapter.label}</b><small>{chapter.note}{chapter.level ? ` Team around Lv ${chapter.level}.` : ''}</small>{i === -1 && null}</button>)}</div>
        </section>
        <section className="dev__tools">
          <h3>Quick tools</h3>
          <button className="btn btn--small" onClick={() => { set((s) => healTeam(s)); flash('Team healed.') }}>Heal team</button>
          <button className="btn btn--small" onClick={() => { set((s) => ({ ...s, trainerXp: s.trainerXp + 500 })); flash('+500 Trainer XP') }}>+500 Trainer XP</button>
          <button className="btn btn--small" onClick={() => { set((s) => Object.keys(items).reduce((acc, id) => giveItem(acc, id, items[id].use === 'key' ? 1 : 10), s)); flash('Bag filled.') }}>Fill the bag</button>
          <button className="btn btn--small" onClick={() => { set((s) => ({ ...s, bits: s.bits + 5000 })); flash('+5000 bits') }}>+5000 bits</button>
          <button className={`btn btn--small ${reveal ? 'is-on' : ''}`} onClick={() => { devState.reveal = !devState.reveal; setReveal(devState.reveal); flash(devState.reveal ? 'Answers are shown in challenges.' : 'Answers hidden.') }}>{reveal ? '✓ ' : ''}Show answers</button>
        </section>
        <section>
          <h3>Start a battle</h3>
          <div className="dev__row">
            <select value={species} onChange={(e) => setSpecies(e.target.value)}>{speciesList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <label>Lv <input type="number" min={2} max={50} value={level} onChange={(e) => setLevel(Number(e.target.value) || 5)} /></label>
            <button className="btn btn--small btn--primary" onClick={() => onWild(species, level)}>Wild battle</button>
          </div>
          <div className="dev__list">{shownTrainers.slice(0, 40).map((t) => <button key={t.npc} className="btn btn--small" onClick={() => onTrainer(t.map, t.npc)}>{t.duel ? '⚔ ' : ''}{t.label}</button>)}</div>
        </section>
        <section>
          <h3>Teleport</h3>
          <div className="dev__list">{shownMaps.map((map) => <button key={map.id} className="btn btn--small" onClick={() => { const at = spawnPoint(map.id); onPlace(map.id, at.x, at.y) }}>{map.name}</button>)}</div>
        </section>
      </div>
    </div>
  </div>
}
