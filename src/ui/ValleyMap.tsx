import { useMemo } from 'react'
import { MAP_H, MAP_W, nodePixel, worldMapCanvas } from '../engine/worldmap'
import type { SaveState } from '../types'
import { mapById } from '../world/maps'
import { mapNodes, outerPlace } from '../world/valley'

// The Castanho Valley as an illustrated pixel map (painted in src/engine/worldmap.ts). On top: a
// yellow ring where you are, an arrow on the place to find, fog over places not visited yet, and
// crisp town names. The menu shows the town list beside it; the place card shows the map alone.

export function ValleyMap({ save, target, legend = true }: { save: SaveState; target?: string; legend?: boolean }) {
  const outer = outerPlace(save.map)
  const picture = useMemo(() => worldMapCanvas()?.toDataURL() ?? '', [])
  const known = (id: string) => save.flags.includes(`visited:${id}`) || id === 'vila' || id === target
  return <div className={`valley ${legend ? '' : 'valley--bare'}`}>
    <div className="valley__board" role="img" aria-label="Map of the Castanho Valley">
      {picture && <img className="valley__art" src={picture} alt="" draggable={false} />}
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="valley__svg" aria-hidden="true">
        {!picture && <rect width={MAP_W} height={MAP_H} fill="#8fd06a" />}
        {mapNodes.map((node) => {
          const p = nodePixel(node)
          return <g key={node.id} transform={`translate(${p.x} ${p.y})`}>
            {!picture && <circle r={node.town ? 7 : 4} fill={node.town ? '#e8483f' : '#ffd23f'} stroke="#1b1626" strokeWidth="1.5" />}
            {!known(node.id) && <circle r={node.town ? 15 : 10} fill="rgba(22, 10, 46, 0.55)" />}
            {outer === node.id && <circle r="15" fill="none" stroke="#ffd23f" strokeWidth="3" className="valley__here" />}
            {target === node.id && <g className="valley__target"><circle r="17" fill="none" stroke="#ffffff" strokeWidth="3" /><path d="M-4 -40 h8 v10 h6 l-10 12 l-10 -12 h6 Z" fill="#ffd23f" stroke="#1b1626" strokeWidth="2" /></g>}
          </g>
        })}
      </svg>
      {mapNodes.filter((node) => node.town && known(node.id)).map((node) => {
        const p = nodePixel(node)
        return <span key={node.id} className={`valley__label ${outer === node.id ? 'is-here' : ''}`} style={{ left: `${(p.x / MAP_W) * 100}%`, top: `${((p.y + 9) / MAP_H) * 100}%` }}>{mapById[node.id].name}</span>
      })}
    </div>
    {legend && <ul className="valley__legend">{mapNodes.filter((node) => node.town).map((node) => <li key={node.id} className={outer === node.id ? 'is-here' : ''}>{known(node.id) ? mapById[node.id].name : '???'}{outer === node.id && ' ◀ YOU'}</li>)}</ul>}
  </div>
}
