import { badges } from '../data/progression'

/** Badges as small SVG medals, one shape per Arena. */
export function BadgeIcon({ id, size = 48, locked = false }: { id: string; size?: number; locked?: boolean }) {
  const badge = badges.find((item) => item.id === id)
  if (!badge) return null
  const fill = locked ? '#3a3448' : badge.color
  const shapes: Record<string, React.ReactNode> = {
    star: <path d="M24 6 L29 19 L43 19 L32 28 L36 42 L24 34 L12 42 L16 28 L5 19 L19 19 Z" />,
    square: <rect x="11" y="11" width="26" height="26" rx="3" />,
    quote: <><path d="M12 14 h9 v9 c0 6 -3 10 -9 12 l-1 -3 c3 -1 5 -4 5 -6 h-4 Z" /><path d="M27 14 h9 v9 c0 6 -3 10 -9 12 l-1 -3 c3 -1 5 -4 5 -6 h-4 Z" /></>,
    plus: <path d="M19 8 h10 v11 h11 v10 h-11 v11 h-10 v-11 h-11 v-10 h11 Z" />,
    half: <><circle cx="24" cy="24" r="15" /><path d="M24 9 a15 15 0 0 1 0 30 Z" fill="#ffffff" opacity="0.55" /></>,
    fork: <path d="M22 40 v-13 l-9 -9 v-8 h4 v6 l7 7 l7 -7 v-6 h4 v8 l-9 9 v13 Z" />,
  }
  return <svg className={`badge-icon ${locked ? 'is-locked' : ''}`} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={locked ? 'Locked badge' : badge.name}>
    <circle cx="24" cy="24" r="22" fill="#2a2140" stroke="#ffd23f" strokeWidth="2.5" />
    <g fill={fill} stroke="#1b1626" strokeWidth="1.5">{shapes[badge.shape]}</g>
    {!locked && <circle cx="16" cy="13" r="3" fill="#ffffff" opacity="0.6" />}
  </svg>
}
