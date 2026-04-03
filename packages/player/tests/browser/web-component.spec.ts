import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const iifeBundle = readFileSync(
  resolve(__dirname, '../../dist/index.global.js'),
  'utf-8',
)

function htmlPage(bodyContent: string): string {
  return `<!DOCTYPE html><html><head><script>${iifeBundle}</script></head><body>${bodyContent}</body></html>`
}

test('registers <ascii-player> as custom element', async ({ page }) => {
  await page.setContent(htmlPage('<ascii-player></ascii-player>'))
  const isDefined = await page.evaluate(() =>
    typeof customElements.get('ascii-player') !== 'undefined',
  )
  expect(isDefined).toBe(true)
})

test('mode attribute is reflected', async ({ page }) => {
  await page.setContent(htmlPage('<ascii-player mode="proportional"></ascii-player>'))
  const mode = await page.evaluate(() =>
    document.querySelector('ascii-player')?.getAttribute('mode'),
  )
  expect(mode).toBe('proportional')
})

test('char-delay attribute is reflected', async ({ page }) => {
  await page.setContent(htmlPage('<ascii-player char-delay="50"></ascii-player>'))
  const charDelay = await page.evaluate(() =>
    document.querySelector('ascii-player')?.getAttribute('char-delay'),
  )
  expect(charDelay).toBe('50')
})

test('trigger attribute is reflected', async ({ page }) => {
  await page.setContent(htmlPage('<ascii-player trigger="scroll"></ascii-player>'))
  const trigger = await page.evaluate(() =>
    document.querySelector('ascii-player')?.getAttribute('trigger'),
  )
  expect(trigger).toBe('scroll')
})

test('shadow DOM contains canvas element', async ({ page }) => {
  await page.setContent(htmlPage('<ascii-player></ascii-player>'))
  const hasCanvas = await page.evaluate(() => {
    const el = document.querySelector('ascii-player')
    return !!el?.shadowRoot?.querySelector('canvas')
  })
  expect(hasCanvas).toBe(true)
})

test('IIFE bundle exposes Asciify global', async ({ page }) => {
  await page.setContent(htmlPage(''))
  const hasGlobal = await page.evaluate(() => typeof (window as unknown as Record<string, unknown>).Asciify !== 'undefined')
  expect(hasGlobal).toBe(true)
})

test('Asciify.AsciiPlayer is a constructor', async ({ page }) => {
  await page.setContent(htmlPage(''))
  const isFunction = await page.evaluate(
    () => typeof (window as unknown as Record<string, Record<string, unknown>>).Asciify.AsciiPlayer === 'function',
  )
  expect(isFunction).toBe(true)
})
