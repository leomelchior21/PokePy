// The Castanho Valley as a board: towns and routes in travel order, from Vila Maker up to the Academy.
import { mapById } from './maps'

export const mapNodes: Array<{ id: string; x: number; y: number; town: boolean }> = [
  { id: 'academy', x: 7, y: 0, town: true }, { id: 'hackroad', x: 7, y: 1, town: false }, { id: 'branchwood', x: 7, y: 2, town: true },
  { id: 'route6', x: 5, y: 2, town: false }, { id: 'veritas', x: 3, y: 2, town: true }, { id: 'route5', x: 3, y: 3, town: false },
  { id: 'abacus', x: 3, y: 4, town: true }, { id: 'route4', x: 5, y: 4, town: false }, { id: 'stringhaven', x: 7, y: 4, town: true },
  { id: 'route3', x: 7, y: 5, town: false }, { id: 'boxford', x: 7, y: 6, town: true }, { id: 'route2', x: 5, y: 6, town: false },
  { id: 'harbor', x: 3, y: 6, town: true }, { id: 'route1', x: 3, y: 7, town: false }, { id: 'vila', x: 3, y: 8, town: true },
]


/** The town or route a map belongs to: a house or lab counts as the town around it. */
export function outerPlace(id: string): string | undefined {
  if (mapNodes.some((node) => node.id === id)) return id
  const parent = Object.values(mapById).find((map) => map.warps?.some((w) => w.to === id) || map.buildings?.some((b) => b.to === id))?.id
  if (!parent || parent === id) return undefined
  return outerPlace(parent)
}
