import { lazy, Suspense, useState } from 'react'
import { audio } from './engine/audio'
import { chapterSave, chapters } from './game/chapters'
import { newSave } from './game/state'
import { saveCloud } from './save/cloud'
import type { SaveState } from './types'
import { GameScreen } from './ui/GameScreen'
import { Title } from './ui/Title'

/** Development only: ?chapter=route1 skips the login and drops straight into a chapter. */
function devChapter(): SaveState | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  const id = new URLSearchParams(window.location.search).get('chapter')
  const chapter = chapters.find((item) => item.id === id)
  if (!chapter) return null
  const save = chapterSave(chapter, newSave('devplayer', 'Dev Player', { hair: 1, skin: 1, outfit: 0, style: 'cap' }))
  return { ...save, settings: { ...save.settings, music: false }, flags: [...new Set([...save.flags, 'intro_done'])] }
}

// Development pages, left out of production builds.
const Gallery = import.meta.env.DEV ? lazy(() => import('./dev/Gallery')) : null
const MiniLab = import.meta.env.DEV ? lazy(() => import('./dev/MiniLab')) : null
const devQuery = import.meta.env.DEV && typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const showGallery = Boolean(devQuery?.has('gallery'))
const showMini = Boolean(devQuery?.has('mini'))

export default function App() {
  const [save, setSave] = useState<SaveState | null>(devChapter)
  if (showGallery && Gallery) return <Suspense fallback={null}><Gallery /></Suspense>
  if (showMini && MiniLab) return <Suspense fallback={null}><MiniLab /></Suspense>
  return save
    ? <GameScreen key={save.createdAt} initial={save} onQuit={() => setSave(null)} onRestart={setSave} />
    : <Title onStart={(next) => {
      audio.setMusic(next.settings.music)
      audio.sfxOn = next.settings.sfx
      saveCloud(next, true)
      setSave(next)
    }} />
}
