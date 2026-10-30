import { useEffect, useState } from 'react'
import { speciesList } from '../data/species'
import { audio } from '../engine/audio'
import { hallOfFame, type FameEntry } from '../save/cloud'
import type { SaveState } from '../types'
import { PyxieImg } from './Sprite'

export function Credits({ save, onClose }: { save: SaveState; onClose: () => void }) {
  const [fame, setFame] = useState<FameEntry[] | null>(null)
  const [stage, setStage] = useState<'roll' | 'fame'>('roll')
  useEffect(() => {
    audio.play('title')
    const id = window.setTimeout(() => setStage('fame'), 26000)
    void hallOfFame().then(setFame)
    return () => window.clearTimeout(id)
  }, [])
  const minutes = Math.floor(save.playMs / 60000)
  const accuracy = save.stats.challenges ? Math.round((save.stats.correct / save.stats.challenges) * 100) : 0
  if (stage === 'fame') return <div className="credits credits--fame">
    <h1>HALL OF FAME</h1>
    <p className="credits__you">{save.displayName} · Champion · {Math.floor(minutes / 60)}h {minutes % 60}m · {accuracy}% right answers · {save.caught.length} pyxies caught</p>
    <ol className="fame">
      {(fame ?? []).map((entry, i) => <li key={`${entry.name}-${i}`} className={entry.champion ? 'is-champion' : ''}><b>{i + 1}</b><span>{entry.name}</span><em>{entry.champion ? '👑' : `${entry.badges}/6`}</em><small>{entry.xp} XP</small></li>)}
      {fame && fame.length === 0 && <li className="fame__empty">The Hall of Fame will fill up as the class plays.</li>}
      {!fame && <li className="fame__empty">Loading the Hall of Fame…</li>}
    </ol>
    <button className="btn btn--primary" onClick={onClose}>CONTINUE THE ADVENTURE ▶</button>
  </div>
  return <div className="credits" onClick={() => setStage('fame')}>
    <div className="credits__roll">
      <h1>PYXIES</h1>
      <p>A Python adventure in the Castanho Valley</p>
      <h3>Starring</h3>
      <p>{save.displayName}, Champion of the Grand Hackathon</p>
      <p>Leo Maker · Brian · Marina Echo · Otto Box · Lia Quote · Rafa Sum · Bruna Bool · Igor Fork</p>
      <p>and Dr. Segfault, who really should write tests</p>
      <h3>The Pyxies</h3>
      <div className="credits__parade">{speciesList.map((s) => <PyxieImg key={s.id} species={s.id} size={56} />)}</div>
      <h3>Made for</h3>
      <p>the makers of Escola Lourenço Castanho</p>
      <p>Purple and yellow forever 💜💛</p>
      <h3>Remember</h3>
      <p>Every program starts with one print().</p>
      <p>Measure twice, cut once. Test the edge cases.</p>
      <p>And when you're stuck… explain it to the duck. 🦆</p>
      <h1>THE END?</h1>
    </div>
    <small className="credits__skip">Tap to skip</small>
  </div>
}
