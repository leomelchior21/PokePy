import { useRef, useState, type PointerEvent } from 'react'

const RADIUS = 56

/**
 * A floating analog stick. Touch anywhere in its zone: the base appears under the thumb and the knob
 * follows it. The vector goes from -1 to 1 on each axis; past 92% the trainer runs.
 */
export function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const [stick, setStick] = useState<{ ox: number; oy: number; x: number; y: number } | null>(null)
  const pointer = useRef<number | null>(null)
  const zone = useRef<HTMLDivElement>(null)

  const local = (event: PointerEvent) => {
    const rect = zone.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const update = (ox: number, oy: number, x: number, y: number) => {
    let dx = x - ox
    let dy = y - oy
    const d = Math.hypot(dx, dy)
    if (d > RADIUS) { dx = (dx / d) * RADIUS; dy = (dy / d) * RADIUS }
    setStick({ ox, oy, x: dx, y: dy })
    onMove(dx / RADIUS, dy / RADIUS)
  }

  const end = () => {
    pointer.current = null
    setStick(null)
    onMove(0, 0)
  }

  return <div ref={zone} className="stick-zone" aria-label="Move: drag in any direction"
    onPointerDown={(event) => {
      if (pointer.current !== null) return
      pointer.current = event.pointerId
      event.currentTarget.setPointerCapture(event.pointerId)
      const p = local(event)
      update(p.x, p.y, p.x, p.y)
    }}
    onPointerMove={(event) => {
      if (event.pointerId !== pointer.current || !stick) return
      const p = local(event)
      update(stick.ox, stick.oy, p.x, p.y)
    }}
    onPointerUp={(event) => { if (event.pointerId === pointer.current) end() }}
    onPointerCancel={(event) => { if (event.pointerId === pointer.current) end() }}>
    {stick
      ? <div className="stick" style={{ left: stick.ox, top: stick.oy }}><i style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} /></div>
      : <div className="stick stick--idle"><i /></div>}
  </div>
}
