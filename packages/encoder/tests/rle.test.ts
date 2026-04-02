import { describe, it, expect } from 'vitest'
import { rleEncode, rleDecode } from '../src/rle'

describe('rle', () => {
  describe('rleEncode', () => {
    it('returns empty string for empty input', () => {
      expect(rleEncode('')).toBe('')
    })

    it('does not encode a single character', () => {
      expect(rleEncode('a')).toBe('a')
    })

    it('does not encode runs of 2 (shorter than 3)', () => {
      expect(rleEncode('aa')).toBe('aa')
    })

    it('does not encode mixed 2-char run', () => {
      expect(rleEncode('aab')).toBe('aab')
    })

    it('encodes a run of exactly 3 identical characters', () => {
      expect(rleEncode('aaa')).toBe('~3~a')
    })

    it('encodes two adjacent runs of 3', () => {
      expect(rleEncode('aaabbb')).toBe('~3~a~3~b')
    })

    it('encodes long runs', () => {
      expect(rleEncode('a'.repeat(10))).toBe('~10~a')
    })

    it('handles spaces and punctuation', () => {
      const input = '   ...###'
      const encoded = rleEncode(input)
      expect(rleDecode(encoded)).toBe(input)
    })

    it('does not encode short mixed strings', () => {
      expect(rleEncode('ab')).toBe('ab')
    })

    it('handles single character string', () => {
      const result = rleEncode('x')
      expect(result).toBe('x')
    })
  })

  describe('rleDecode', () => {
    it('decodes empty string', () => {
      expect(rleDecode('')).toBe('')
    })

    it('decodes a run of 3', () => {
      expect(rleDecode('~3~a')).toBe('aaa')
    })

    it('decodes a run of 10', () => {
      expect(rleDecode('~10~x')).toBe('x'.repeat(10))
    })

    it('decodes mixed content', () => {
      expect(rleDecode('ab~3~cde')).toBe('abcccde')
    })
  })

  describe('round-trip', () => {
    it('round-trips an empty string', () => {
      expect(rleDecode(rleEncode(''))).toBe('')
    })

    it('round-trips a string with short runs (no encoding expected)', () => {
      const str = 'abc def ghi'
      expect(rleDecode(rleEncode(str))).toBe(str)
    })

    it('round-trips a string with long runs', () => {
      const str = 'aaa   bbb...ccc'
      expect(rleDecode(rleEncode(str))).toBe(str)
    })

    it('round-trips a realistic multi-line ASCII frame text', () => {
      const frame = '###...\n...###\n###...\n......\n######'
      expect(rleDecode(rleEncode(frame))).toBe(frame)
    })

    it('round-trips text with spaces, newlines, and special chars', () => {
      const text = ' .:-=+*#%@\n .:-=+*#%@\n##########'
      expect(rleDecode(rleEncode(text))).toBe(text)
    })

    it('round-trips a uniform string', () => {
      const str = ' '.repeat(100)
      expect(rleDecode(rleEncode(str))).toBe(str)
    })
  })
})
