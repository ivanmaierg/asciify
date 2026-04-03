import type { Metadata } from 'next'
import { DemoPlayground } from '@/components/demo/demo-playground'

export const metadata: Metadata = {
  title: 'Asciify Demo Playground',
  description: 'Interactive demo — drop a video, configure settings, and watch it play as animated ASCII art.',
}

export default function DemoPage() {
  return <DemoPlayground />
}
