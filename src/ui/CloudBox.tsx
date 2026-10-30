import { useState } from 'react'
import { displayName, statsFor } from '../battle/engine'
import { audio } from '../engine/audio'
import { healPyxie } from '../battle/engine'
import { swapWithBox } from '../game/state'
import type { SaveState } from '../types'
import { Bar, PyxieImg } from './Sprite'

/** The PC at every Charging Station: move pyxies between the team and the Cloud Box. */
export function CloudBox({ get, set, onClose }: { get: () => SaveState; set: (update: (s: SaveState) => SaveState) => void; onClose: () => void }) {
  const [teamPick, setTeamPick] = useState<string | null>(null)
  const [, force] = useState(0)
  const save = get()
  const deposit = (uid: string) => {
    if (save.team.length <= 1) { audio.sfx('wrong'); return }
    set((s) => swapWithBox(s, uid, null))
    audio.sfx('select')
    force((n) => n + 1)
  }
  const withdraw = (uid: string) => {
    // Pyxies in the Cloud Box rest, so they come back fully charged.
    set((s) => {
      const healed = { ...s, box: s.box.map((p) => p.uid === uid ? healPyxie(p) : p) }
      return swapWithBox(healed, teamPick, uid)
    })
    setTeamPick(null)
    audio.sfx('select')
    force((n) => n + 1)
  }
  return <div className="panel cloudbox">
    <header className="panel__head"><h2>Cloud Box</h2><small>Team: {save.team.length}/4 · Box: {save.box.length}</small><button className="btn btn--small" onClick={onClose}>CLOSE</button></header>
    <div className="cloudbox__cols">
      <section>
        <h3>YOUR TEAM</h3>
        {save.team.map((p) => {
          const st = statsFor(p.species, p.level)
          return <div key={p.uid} className={`cloudbox__mon ${teamPick === p.uid ? 'is-picked' : ''}`}>
            <PyxieImg species={p.species} shiny={p.shiny} size={44} />
            <span><b>{displayName(p)}</b><small>Lv{p.level}</small><Bar value={p.hp} max={st.maxHp} /></span>
            <button className="btn btn--tiny" onClick={() => setTeamPick(teamPick === p.uid ? null : p.uid)}>{teamPick === p.uid ? '✓ SWAP' : 'SWAP'}</button>
            <button className="btn btn--tiny" disabled={save.team.length <= 1} onClick={() => deposit(p.uid)}>STORE</button>
          </div>
        })}
      </section>
      <section>
        <h3>CLOUD BOX {teamPick ? '· pick one to swap in' : ''}</h3>
        {save.box.length === 0 && <p className="cloudbox__empty">Empty. Caught pyxies go here when your team is full.</p>}
        <div className="cloudbox__grid">{save.box.map((p) => <button key={p.uid} className="cloudbox__cell" disabled={!teamPick && save.team.length >= 4} onClick={() => withdraw(p.uid)} title={displayName(p)}>
          <PyxieImg species={p.species} shiny={p.shiny} size={40} /><small>Lv{p.level}</small>
        </button>)}</div>
      </section>
    </div>
  </div>
}
