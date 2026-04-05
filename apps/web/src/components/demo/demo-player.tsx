'use client'

import { useRef, useEffect } from 'react'
import { useDemoStore } from '@/stores/demo-store'

export function DemoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<HTMLElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const registeredRef = useRef(false)
  const readyRef = useRef(false)

  const playerData = useDemoStore((s) => s.playerData)
  const renderMode = useDemoStore((s) => s.renderMode)
  const theme = useDemoStore((s) => s.theme)
  const loop = useDemoStore((s) => s.loop)
  const charDelay = useDemoStore((s) => s.charDelay)
  const fps = useDemoStore((s) => s.fps)

  // Register web component and create element on mount
  useEffect(() => {
    if (!containerRef.current) return

    let cancelled = false

    import('@asciify/player').then(({ registerAsciiPlayer }) => {
      if (cancelled || !containerRef.current) return

      if (!registeredRef.current) {
        registerAsciiPlayer()
        registeredRef.current = true
      }

      const el = document.createElement('ascii-player') as HTMLElement
      el.setAttribute('autoplay', '')
      el.setAttribute('controls', '')
      el.setAttribute('loop', String(useDemoStore.getState().loop))
      el.setAttribute('fps', String(useDemoStore.getState().fps))
      el.setAttribute('mode', useDemoStore.getState().renderMode)
      el.setAttribute('theme', useDemoStore.getState().theme)
      el.setAttribute('char-delay', String(useDemoStore.getState().charDelay))
      el.style.display = 'block'
      el.style.width = '100%'

      containerRef.current.appendChild(el)
      elementRef.current = el
      readyRef.current = true

      // If playerData already exists (conversion happened before mount resolved),
      // set src now
      const currentData = useDemoStore.getState().playerData
      if (currentData) {
        const blob = new Blob([JSON.stringify(currentData)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url
        el.setAttribute('src', url)
      }
    })

    return () => {
      cancelled = true
      if (elementRef.current) {
        elementRef.current.remove()
        elementRef.current = null
      }
      readyRef.current = false
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update src when playerData changes (after element is ready)
  useEffect(() => {
    if (!playerData || !readyRef.current || !elementRef.current) return

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    const blob = new Blob([JSON.stringify(playerData)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    blobUrlRef.current = url
    elementRef.current.setAttribute('src', url)
  }, [playerData])

  // Update attributes when player options change
  useEffect(() => {
    const el = elementRef.current
    if (!el) return
    el.setAttribute('mode', renderMode)
    el.setAttribute('theme', theme)
    el.setAttribute('loop', String(loop))
    el.setAttribute('char-delay', String(charDelay))
    el.setAttribute('fps', String(fps))
  }, [renderMode, theme, loop, charDelay, fps])

  if (!playerData) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground text-sm">
        Configure settings and click Convert
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden bg-black border border-muted-foreground/25 w-full"
    />
  )
}
