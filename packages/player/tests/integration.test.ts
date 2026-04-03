import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('build output', () => {
  const distDir = resolve(__dirname, '../dist')

  it('ESM output exists', () => {
    const content = readFileSync(resolve(distDir, 'index.js'), 'utf-8')
    expect(content).toContain('AsciiPlayer')
    expect(content).toContain('AsciiPlayerElement')
  })

  it('CJS output exists', () => {
    const content = readFileSync(resolve(distDir, 'index.cjs'), 'utf-8')
    expect(content).toContain('AsciiPlayer')
  })

  it('IIFE output exists', () => {
    const content = readFileSync(resolve(distDir, 'index.global.js'), 'utf-8')
    expect(content).toContain('Asciify')
  })

  it('type definitions exist', () => {
    const content = readFileSync(resolve(distDir, 'index.d.ts'), 'utf-8')
    expect(content).toContain('AsciiPlayer')
    expect(content).toContain('AsciiPlayerOptions')
    expect(content).toContain('AsciiPlayerElement')
  })

  it('pretext is bundled -- no external import reference (PLR-10)', () => {
    const esm = readFileSync(resolve(distDir, 'index.js'), 'utf-8')
    // pretext should be inlined, not imported externally
    expect(esm).not.toMatch(/from\s+['"]@chenglou\/pretext['"]/)
    expect(esm).not.toContain("require('@chenglou/pretext')")
  })

  it('encoder stays external as peer dep (D-06)', () => {
    const esm = readFileSync(resolve(distDir, 'index.js'), 'utf-8')
    expect(esm).toMatch(/@asciify\/encoder/)
  })
})

describe('new render mode exports (TEST-03)', () => {
  const distDir = resolve(__dirname, '../dist')

  it('ESM dist contains renderProportionalFrame', () => {
    const esm = readFileSync(resolve(distDir, 'index.js'), 'utf-8')
    expect(esm).toContain('renderProportionalFrame')
  })

  it('ESM dist contains renderTypewriterFrame', () => {
    const esm = readFileSync(resolve(distDir, 'index.js'), 'utf-8')
    expect(esm).toContain('renderTypewriterFrame')
  })

  it('ESM dist contains TypewriterReveal', () => {
    const esm = readFileSync(resolve(distDir, 'index.js'), 'utf-8')
    expect(esm).toContain('TypewriterReveal')
  })

  it('ESM dist contains charTimestamps (MODE-04 property)', () => {
    const esm = readFileSync(resolve(distDir, 'index.js'), 'utf-8')
    expect(esm).toContain('charTimestamps')
  })

  it('IIFE dist contains proportional mode name', () => {
    const iife = readFileSync(resolve(distDir, 'index.global.js'), 'utf-8')
    expect(iife).toContain('proportional')
  })

  it('IIFE dist contains typewriter mode name', () => {
    const iife = readFileSync(resolve(distDir, 'index.global.js'), 'utf-8')
    expect(iife).toContain('typewriter')
  })

  it('type definitions contain RenderMode export', () => {
    const dts = readFileSync(resolve(distDir, 'index.d.ts'), 'utf-8')
    expect(dts).toContain('RenderMode')
  })

  it('type definitions contain TriggerMode export', () => {
    const dts = readFileSync(resolve(distDir, 'index.d.ts'), 'utf-8')
    expect(dts).toContain('TriggerMode')
  })

  it('type definitions contain TypewriterReveal export', () => {
    const dts = readFileSync(resolve(distDir, 'index.d.ts'), 'utf-8')
    expect(dts).toContain('TypewriterReveal')
  })
})
