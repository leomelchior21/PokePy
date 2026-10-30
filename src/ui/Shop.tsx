import { useState } from 'react'
import { items, shopStock } from '../data/items'
import { audio } from '../engine/audio'
import { giveItem } from '../game/state'
import type { SaveState } from '../types'
import { ItemIcon } from './Sprite'

export function Shop({ tier, get, set, onClose }: { tier: number; get: () => SaveState; set: (update: (s: SaveState) => SaveState) => void; onClose: () => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [, force] = useState(0)
  const save = get()
  const buy = (id: string) => {
    const count = counts[id] ?? 1
    const cost = items[id].price * count
    if (save.bits < cost) { audio.sfx('wrong'); return }
    set((s) => giveItem({ ...s, bits: s.bits - cost }, id, count))
    audio.sfx('item')
    force((n) => n + 1)
  }
  return <div className="panel shop">
    <header className="panel__head"><h2>Maker Mart</h2><span className="panel__bits">◈ {save.bits} bits</span><button className="btn btn--small" onClick={onClose}>CLOSE</button></header>
    <ul className="shop__list">
      {shopStock[tier].map((id) => {
        const info = items[id]
        const count = counts[id] ?? 1
        return <li key={id}>
          <ItemIcon icon={info.icon} size={36} />
          <div><b>{info.name}</b><small>{info.text}</small><em>You have {save.bag[id] ?? 0}</em></div>
          <div className="shop__qty">
            <button className="btn btn--tiny" onClick={() => setCounts({ ...counts, [id]: Math.max(1, count - 1) })}>−</button>
            <span>{count}</span>
            <button className="btn btn--tiny" onClick={() => setCounts({ ...counts, [id]: Math.min(20, count + 1) })}>+</button>
          </div>
          <button className="btn btn--primary btn--small" disabled={save.bits < info.price * count} onClick={() => buy(id)}>BUY ◈{info.price * count}</button>
        </li>
      })}
    </ul>
  </div>
}
