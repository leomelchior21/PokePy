// Development only (?gallery): every pyxie at every size, for checking the art.
import { speciesList } from '../data/species'
import { personUrl, pyxieUrl } from '../engine/art'
import { kid, looks } from '../world/looks'
import type { Direction } from '../types'

export default function Gallery() {
  const people = [...Object.values(looks), kid(1), kid(2), kid(3), kid(4)]
  return <div style={{ padding: 16, background: '#2a1450', minHeight: '100%', overflow: 'auto', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 4, background: '#7ec850', padding: 8 }}>
      {people.map((look, i) => <div key={i} style={{ display: 'flex', gap: 2 }}>{(['down', 'up', 'right', 'left'] as Direction[]).flatMap((dir) => [0, 1, 3].map((f) => <img key={dir + f} src={personUrl(look, dir, f)} width={48} height={72} style={{ imageRendering: 'pixelated' }} />))}</div>)}
    </div>
    {speciesList.map((s) => <div key={s.id} style={{ background: '#3b2470', borderRadius: 8, padding: 8, color: '#fff', font: '12px sans-serif', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
      <img src={pyxieUrl(s.id, false, 24)} width={48} height={48} style={{ imageRendering: 'pixelated' }} />
      <img src={pyxieUrl(s.id, false, 48)} width={96} height={96} style={{ imageRendering: 'pixelated' }} />
      <img src={pyxieUrl(s.id, false, 96)} width={192} height={192} style={{ imageRendering: 'pixelated' }} />
      <span>{s.name}</span>
    </div>)}
  </div>
}
