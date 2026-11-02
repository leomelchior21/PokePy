import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { items } from '../data/items'
import { speciesList } from '../data/species'
import { audio } from '../engine/audio'
import { placePreview } from '../engine/preview'
import type { ShowSpec } from '../game/scripts'
import type { SaveState } from '../types'
import { getMap } from '../world/maps'
import { outerPlace } from '../world/valley'
import { ItemIcon, PyxieImg } from './Sprite'
import { ValleyMap } from './ValleyMap'

const howToUse: Record<string, string> = {
  heal: 'Open MENU, then BAG, to heal a tired pyxie. In battle, use the BAG button.',
  revive: 'Open MENU, then BAG, to wake up a fainted pyxie.',
  cube: 'In a battle with a WILD pyxie: weaken it first, then press BAG and throw a cube.',
  battle: 'Use it in battle, from the BAG button, when a challenge is hard.',
  key: 'A special item. You keep it forever.',
  material: 'A building material. Bring enough to a build site, press A, and build it with code!',
}

/**
 * The big picture card: whenever the story gives you something new or names a new place, it is shown
 * big on screen first. Items get a spotlit stage; places get an aerial view and the valley map.
 */
export function Showcase({ spec, save, onClose }: { spec: ShowSpec; save: SaveState; onClose: () => void }) {
  useEffect(() => {
    audio.sfx(spec.kind === 'item' ? 'item' : 'select')
    const onKey = (event: KeyboardEvent) => { if (['Enter', ' ', 'Escape'].includes(event.key)) { event.preventDefault(); onClose() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, spec.kind])
  const picture = useMemo(() => {
    if (spec.kind !== 'place') return ''
    const canvas = placePreview(getMap(spec.map), new Set(save.flags), spec.building)
    return canvas ? canvas.toDataURL() : ''
  }, [spec, save.flags])

  if (spec.kind === 'item') {
    const item = items[spec.item]
    return createPortal(<div className="showcase" role="dialog" aria-label={item.name} onClick={onClose}>
      <div className="showcase__card" onClick={(event) => event.stopPropagation()}>
        <span className="showcase__tag">{spec.tag ?? 'NEW ITEM!'}</span>
        <div className="showcase__stage">
          <i className="showcase__rays" aria-hidden="true" />
          <div className="showcase__icon"><ItemIcon icon={item.icon} size={176} /></div>
          {spec.count && spec.count > 1 && <b className="showcase__count">×{spec.count}</b>}
        </div>
        <h2>{item.name}</h2>
        <p>{item.text}</p>
        {spec.item === 'codex' && <div className="showcase__codex" aria-label="Pyxies to discover">
          {speciesList.slice(0, 6).map((species) => <PyxieImg key={species.id} species={species.id} size={56} className="is-mystery" />)}
          <small>23 pyxies to discover. Open it in MENU, then CODEX.</small>
        </div>}
        {spec.item !== 'codex' && <p className="showcase__how">{howToUse[item.use]}</p>}
        <button className="btn btn--primary" autoFocus onClick={onClose}>GOT IT! ▶</button>
      </div>
    </div>, document.body)
  }

  const map = getMap(spec.map)
  return createPortal(<div className="showcase" role="dialog" aria-label={map.name} onClick={onClose}>
    <div className="showcase__card showcase__card--place" onClick={(event) => event.stopPropagation()}>
      <span className="showcase__tag">{spec.building ? 'FIND IT HERE!' : save.flags.includes(`visited:${map.id}`) ? 'THIS PLACE' : 'NEW PLACE!'}</span>
      <h2>{map.name}</h2>
      {spec.note && <p className="showcase__note">{spec.note}</p>}
      <div className="showcase__place">
        {picture && <figure className="showcase__aerial"><img src={picture} alt={`${map.name} from above`} draggable={false} /><figcaption>From above</figcaption></figure>}
        <figure className="showcase__valley"><ValleyMap save={save} target={outerPlace(map.id)} legend={false} /><figcaption>In the valley</figcaption></figure>
      </div>
      <button className="btn btn--primary" autoFocus onClick={onClose}>LET'S GO! ▶</button>
    </div>
  </div>, document.body)
}
