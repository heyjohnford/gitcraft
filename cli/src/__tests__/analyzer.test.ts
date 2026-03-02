import { describe, it, expect } from 'vitest'
import { determineBump } from '../analyzer'

describe('determineBump', () => {
  // ── Major ────────────────────────────────────────────────────────────────

  describe('major bump', () => {
    it('detects feat! in header', () => {
      expect(determineBump(['feat!: rewrite auth system'])).toBe('major')
    })

    it('detects feat(scope)! in header', () => {
      expect(determineBump(['feat(api)!: remove v1 endpoints'])).toBe('major')
    })

    it('detects fix(scope)! in header', () => {
      expect(determineBump(['fix(db)!: change primary key type'])).toBe('major')
    })

    it('detects any type with ! marker', () => {
      expect(determineBump(['chore!: drop Node 14 support'])).toBe('major')
    })

    it('detects BREAKING CHANGE: footer token', () => {
      const commit = 'feat: new login\n\nBREAKING CHANGE: removes /auth/v1 endpoint'
      expect(determineBump([commit])).toBe('major')
    })

    it('detects BREAKING CHANGE: in multi-line footer', () => {
      const commit = 'feat: redesign\n\nCloses #42\nBREAKING CHANGE: renames config keys'
      expect(determineBump([commit])).toBe('major')
    })

    it('short-circuits on first major — remaining commits ignored', () => {
      expect(determineBump(['feat!: breaking', 'feat!: also breaking'])).toBe('major')
    })

    it('major wins over minor in same list', () => {
      expect(determineBump(['feat: add button', 'fix(core)!: remove legacy api'])).toBe('major')
    })
  })

  // ── False-positive guard ─────────────────────────────────────────────────

  describe('false-positive guard (! not in type/scope position)', () => {
    it('ignores ! at end of message', () => {
      expect(determineBump(["fix: don't do this!"])).toBe('patch')
    })

    it('ignores ! mid-sentence', () => {
      expect(determineBump(['fix: wow this is really bad! urgent'])).toBe('patch')
    })

    it('ignores ! in commit body, not header', () => {
      const commit = 'feat: cool feature\n\nThis change is amazing!'
      expect(determineBump([commit])).toBe('minor')
    })

    it('ignores BREAKING-CHANGE (hyphen, not colon+space)', () => {
      // Only 'BREAKING CHANGE:' with a colon is spec-compliant
      const commit = 'feat: new thing\n\nBREAKING-CHANGE: old style'
      expect(determineBump([commit])).toBe('minor')
    })
  })

  // ── Minor ────────────────────────────────────────────────────────────────

  describe('minor bump', () => {
    it('detects feat:', () => {
      expect(determineBump(['feat: add dark mode'])).toBe('minor')
    })

    it('detects feat(scope):', () => {
      expect(determineBump(['feat(auth): add OAuth support'])).toBe('minor')
    })

    it('minor wins over patch in same list', () => {
      expect(determineBump(['fix: typo', 'feat: new feature', 'chore: lint'])).toBe('minor')
    })
  })

  // ── Patch ────────────────────────────────────────────────────────────────

  describe('patch bump', () => {
    it('fix: maps to patch', () => {
      expect(determineBump(['fix: resolve null pointer'])).toBe('patch')
    })

    it('chore: maps to patch', () => {
      expect(determineBump(['chore: update dependencies'])).toBe('patch')
    })

    it('docs: maps to patch', () => {
      expect(determineBump(['docs: update README'])).toBe('patch')
    })

    it('perf: maps to patch', () => {
      expect(determineBump(['perf: reduce bundle size'])).toBe('patch')
    })

    it('non-conventional commit maps to patch', () => {
      expect(determineBump(['updated stuff', 'more changes', 'WIP'])).toBe('patch')
    })

    it('empty array returns patch', () => {
      expect(determineBump([])).toBe('patch')
    })
  })
})
