'use client'

import { useRef, useEffect } from 'react'
import { useDemoStore } from '@/stores/demo-store'

export function DemoPlayer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<HTMLElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const registeredRef = useRef(false)

  const playerData = useDemoStore((s) => s.playerData)
  const renderMode = useDemoStore((s) => s.renderMode)
  const theme = useDemoStore((s) => s.theme)
  const loop = useDemoStore((s) => s.loop)
  const charDelay = useDemoStore((s) => s.charDelay)
  const fps = useDemoStore((s) => s.fps)

  // Register web component and create element on mount
  useEffect(() => {
    if (!containerRef.current) return

    let cleanup: (() => void) | undefined

    import('@asciify/player').then(({ registerAsciiPlayer }) => {
      if (!registeredRef.current) {
        registerAsciiPlayer()
        registeredRef.current = true
      }

      if (!containerRef.current) return

      // Create the <ascii-player> element imperatively (React custom element support is limited)
      const el = document.createElement('ascii-player') as HTMLElement
      el.setAttribute('autoplay', '')
      el.setAttribute('controls', '')
      el.setAttribute('loop', String(loop))
      el.setAttribute('fps', String(fps))
      el.setAttribute('mode', renderMode)
      el.setAttribute('theme', theme)
      el.setAttribute('char-delay', String(charDelay))
      el.setAttribute('width', '800')
      el.style.display = 'block'
      el.style.width = '100%'

      containerRef.current.appendChild(el)
      elementRef.current = el

      cleanup = () => {
        el.remove()
        elementRef.current = null
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current)
          blobUrlRef.current = null
        }
      }
    })

    return () => {
      cleanup?.()
    }
    // Only run on mount/unmount — attribute updates are handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update src when playerData changes
  useEffect(() => {
    if (!playerData || !elementRef.current) return

    // Revoke previous blob URL
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
