export type ItemUse = 'heal' | 'revive' | 'cube' | 'battle' | 'key' | 'material'

export interface ItemInfo {
  id: string
  name: string
  price: number
  use: ItemUse
  power?: number
  text: string
  icon: string
}

export const items: Record<string, ItemInfo> = {
  patch: { id: 'patch', name: 'Patch', price: 30, use: 'heal', power: 30, icon: 'patch', text: 'A software patch. Restores 30 HP.' },
  bigpatch: { id: 'bigpatch', name: 'Big Patch', price: 90, use: 'heal', power: 90, icon: 'bigpatch', text: 'A huge update. Restores 90 HP.' },
  revivechip: { id: 'revivechip', name: 'Reboot Chip', price: 160, use: 'revive', icon: 'chip', text: 'Reboots a fainted pyxie with half its HP.' },
  bytecube: { id: 'bytecube', name: 'Bytecube', price: 40, use: 'cube', icon: 'cube', text: 'A cube of pure memory. Stores a wild pyxie.' },
  supercube: { id: 'supercube', name: 'Super Cube', price: 110, use: 'cube', icon: 'supercube', text: 'More memory, better grip. Catches more easily.' },
  makercube: { id: 'makercube', name: 'Maker Cube', price: 0, use: 'cube', icon: 'makercube', text: 'Hand-made in the Makerspace. The best cube there is.' },
  hintlens: { id: 'hintlens', name: 'Hint Lens', price: 60, use: 'battle', icon: 'lens', text: 'In a challenge, hides two wrong answers or shows the first piece.' },
  debugduck: { id: 'debugduck', name: 'Debug Duck', price: 0, use: 'battle', icon: 'duck', text: 'Explain your code to the duck. It solves one challenge for you.' },
  boxcutter: { id: 'boxcutter', name: 'Box Cutter', price: 0, use: 'key', icon: 'cutter', text: 'Cuts through cardboard barricades. Always cut away from your body!' },
  lostarduino: { id: 'lostarduino', name: 'Brian\'s Arduino', price: 0, use: 'key', icon: 'arduino', text: 'An Arduino with "BRIAN" written in marker. The LED still blinks.' },
  wood: { id: 'wood', name: 'Wood', price: 0, use: 'material', icon: 'wood', text: 'A sturdy piece of a fallen tree. Builds bridges and tools.' },
  fiber: { id: 'fiber', name: 'Fiber', price: 0, use: 'material', icon: 'fiber', text: 'Strong river reeds, twisted into rope.' },
  stone: { id: 'stone', name: 'Stone', price: 0, use: 'material', icon: 'stone', text: 'A heavy mountain rock. Each one weighs 5 kg.' },
  codex: { id: 'codex', name: 'Codex', price: 0, use: 'key', icon: 'codex', text: 'Leo Maker\'s pyxie encyclopedia. Records every pyxie you meet.' },
}

export const shopStock: Record<number, string[]> = {
  1: ['patch', 'bytecube', 'hintlens'],
  2: ['patch', 'bigpatch', 'bytecube', 'supercube', 'hintlens'],
  3: ['patch', 'bigpatch', 'revivechip', 'bytecube', 'supercube', 'hintlens'],
  4: ['bigpatch', 'revivechip', 'supercube', 'bytecube', 'hintlens'],
}

export function itemName(id: string, count = 1): string {
  const name = items[id]?.name ?? id
  return count > 1 ? `${name} ×${count}` : name
}
