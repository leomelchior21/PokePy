import type { CSSProperties } from 'react'
import { iconUrl, personUrl, pyxieUrl } from '../engine/art'
import { concepts } from '../data/concepts'
import type { Concept, Direction } from '../types'
import type { Look } from '../world/types'

export function PyxieImg({ species, shiny = false, size = 64, className = '', style }: { species: string; shiny?: boolean; size?: number; className?: string; style?: CSSProperties }) {
  const src = pyxieUrl(species, shiny)
  if (!src) return <span className={`px-sprite px-sprite--empty ${className}`} style={{ width: size, height: size, ...style }} aria-hidden="true" />
  return <img className={`px-sprite ${className}`} src={src} width={size} height={size} alt="" draggable={false} style={style} />
}

export function PersonImg({ look, dir = 'down', frame = 0, size = 64, className = '' }: { look: Look; dir?: Direction; frame?: number; size?: number; className?: string }) {
  const src = personUrl(look, dir, frame)
  if (!src) return <span className={`px-sprite px-sprite--empty ${className}`} style={{ width: size, height: size }} aria-hidden="true" />
  return <img className={`px-sprite ${className}`} src={src} width={size} height={size} alt="" draggable={false} />
}

export function ItemIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const src = iconUrl(icon)
  if (!src) return <span className="px-icon" style={{ width: size, height: size }} />
  return <img className="px-sprite px-icon" src={src} width={size} height={size} alt="" draggable={false} />
}

export function ConceptTag({ concept, small = false }: { concept: Concept; small?: boolean }) {
  const info = concepts[concept]
  return <span className={`concept-tag ${small ? 'is-small' : ''}`} style={{ '--c': info.color, '--cd': info.dark } as CSSProperties}><b>{info.glyph}</b>{info.label}</span>
}

export function Bar({ value, max, kind = 'hp' }: { value: number; max: number; kind?: 'hp' | 'xp' }) {
  const ratio = Math.max(0, Math.min(1, max ? value / max : 0))
  const tone = kind === 'xp' ? 'xp' : ratio > 0.5 ? 'good' : ratio > 0.2 ? 'mid' : 'low'
  return <span className={`bar bar--${kind}`} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}><i className={`is-${tone}`} style={{ width: `${ratio * 100}%` }} /></span>
}
