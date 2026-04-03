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
