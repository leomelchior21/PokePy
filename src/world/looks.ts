import type { AvatarChoice } from '../types'
import type { Look } from './types'

export const hairColors = ['#2b2230', '#6b3e26', '#e8c15a', '#c2452d', '#3d63c9', '#e66fa8', '#3f9b5a', '#f1efe8']
export const skinTones = ['#ffdcbf', '#f1b98c', '#c98b5e', '#8d5a3b', '#5e3a26']
export const outfitColors = ['#e8483f', '#3d7be0', '#36b26b', '#f2a93b', '#9b59d0', '#ec6aa8', '#2fb8b8', '#4b4f5c']

export function avatarLook(avatar: AvatarChoice): Look {
  return {
    hair: hairColors[avatar.hair % hairColors.length],
    skin: skinTones[avatar.skin % skinTones.length],
    shirt: outfitColors[avatar.outfit % outfitColors.length],
    pants: '#2d3142',
    style: avatar.style,
    cap: avatar.style === 'cap' ? outfitColors[avatar.outfit % outfitColors.length] : undefined,
  }
}

const L = (hair: string, skin: string, shirt: string, pants: string, style: Look['style'], extra?: Look['extra'], cap?: string): Look => ({ hair, skin, shirt, pants, style, extra, cap })

export const looks = {
  leoMaker: L('#9a9aa6', '#f1b98c', '#f28c28', '#3a3f55', 'short', 'apron'),
  brian: L('#6b3e26', '#ffdcbf', '#d93a3a', '#24262e', 'spiky', 'goggles'),
  mom: L('#3b2a20', '#f1b98c', '#7fbf6a', '#4a6fa5', 'bun'),
  grandma: L('#e4e0ea', '#f1b98c', '#c4568a', '#5a4a6a', 'bun', 'glasses'),
  segfault: L('#f1efe8', '#d8c8e8', '#5b2a86', '#1d1530', 'long', 'goggles'),
  grunt: L('#1d1530', '#c98b5e', '#3b2457', '#1d1530', 'cap', undefined, '#7a2fd0'),
  nurse: L('#e66fa8', '#ffdcbf', '#ffffff', '#e66fa8', 'bun'),
  clerk: L('#2b2230', '#c98b5e', '#3d7be0', '#2d3142', 'cap', undefined, '#3d7be0'),
  steward: L('#2b2230', '#8d5a3b', '#2d3142', '#2d3142', 'short', 'glasses'),
  marina: L('#2fb8b8', '#f1b98c', '#ffd23f', '#2d3142', 'long'),
  otto: L('#2b2230', '#8d5a3b', '#4fa3ff', '#1d4f94', 'bald', 'glasses'),
  lia: L('#e66fa8', '#ffdcbf', '#ff6fae', '#5a2140', 'bun'),
  rafa: L('#c2452d', '#c98b5e', '#ff8b3d', '#3a2a20', 'spiky', 'goggles'),
  bruna: L('#3f9b5a', '#5e3a26', '#5fd17a', '#1e4a2a', 'long', 'glasses'),
  igor: L('#7a4bc9', '#f1b98c', '#a57bff', '#2a1d4a', 'short', 'beard'),
}

/** A recognizable crowd from a small set of looks, picked by a number. */
export function kid(n: number): Look {
  const styles: Look['style'][] = ['short', 'long', 'spiky', 'cap', 'bun', 'short']
  return {
    hair: hairColors[(n * 3 + 1) % hairColors.length],
    skin: skinTones[(n * 2) % skinTones.length],
    shirt: outfitColors[(n * 5 + 2) % outfitColors.length],
    pants: ['#2d3142', '#4a6fa5', '#5a4636'][n % 3],
    style: styles[n % styles.length],
    cap: outfitColors[(n * 7) % outfitColors.length],
    extra: n % 7 === 3 ? 'glasses' : n % 11 === 5 ? 'goggles' : undefined,
  }
}
