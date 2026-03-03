import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be declared before importing the module under test so vitest can hoist it
vi.mock('child_process')

import { execSync } from 'node:child_process'
import { applyChannel, detectChannel } from '../channels'

const mockExecSync = vi.mocked(execSync)

// ── detectChannel ──────────────────────────────────────────────────────────

describe('detectChannel', () => {
  it('maps main to stable', () => expect(detectChannel('main')).toBe('stable'))
  it('maps master to stable', () => expect(detectChannel('master')).toBe('stable'))
  it('maps develop to alpha', () => expect(detectChannel('develop')).toBe('alpha'))
  it('maps release/1.0 to rc', () => expect(detectChannel('release/1.0')).toBe('rc'))
  it('maps release/2.0.0 to rc', () => expect(detectChannel('release/2.0.0')).toBe('rc'))
  it('maps feature/login to feature', () => expect(detectChannel('feature/login')).toBe('feature'))
  it('maps feat/login to feature', () => expect(detectChannel('feat/login')).toBe('feature'))
  it('defaults hotfix/* to alpha', () => expect(detectChannel('hotfix/critical')).toBe('alpha'))
  it('defaults unknown branch to alpha', () => expect(detectChannel('my-branch')).toBe('alpha'))
})

// ── applyChannel ──────────────────────────────────────────────────────────

describe('applyChannel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default: no existing pre-release tags
    mockExecSync.mockReturnValue('' as any)
  })

  describe('stable', () => {
    it('returns version unchanged', () => {
      expect(applyChannel('1.2.0', 'stable', 'main')).toBe('1.2.0')
    })

    it('never calls git for stable channel', () => {
      applyChannel('1.2.0', 'stable', 'main')
      expect(mockExecSync).not.toHaveBeenCalled()
    })
  })

  describe('alpha', () => {
    it('appends alpha.0 when no prior tags exist', () => {
      expect(applyChannel('1.2.0', 'alpha', 'develop')).toBe('1.2.0-alpha.0')
    })

    it('appends alpha.3 when prior tags .0, .1, .2 exist', () => {
      mockExecSync.mockReturnValue('v1.2.0-alpha.0\nv1.2.0-alpha.1\nv1.2.0-alpha.2' as any)
      expect(applyChannel('1.2.0', 'alpha', 'develop')).toBe('1.2.0-alpha.3')
    })

    it('uses the highest existing index + 1, not count', () => {
      // Only .0 and .5 exist (gap in sequence)
      mockExecSync.mockReturnValue('v1.2.0-alpha.0\nv1.2.0-alpha.5' as any)
      expect(applyChannel('1.2.0', 'alpha', 'develop')).toBe('1.2.0-alpha.6')
    })
  })

  describe('beta', () => {
    it('appends beta.0 when no prior tags exist', () => {
      expect(applyChannel('1.2.0', 'beta', 'main')).toBe('1.2.0-beta.0')
    })
  })

  describe('rc', () => {
    it('appends rc.0 when no prior tags exist', () => {
      expect(applyChannel('2.0.0', 'rc', 'release/2.0')).toBe('2.0.0-rc.0')
    })

    it('increments rc index from existing tags', () => {
      mockExecSync.mockReturnValue('v2.0.0-rc.0\nv2.0.0-rc.1' as any)
      expect(applyChannel('2.0.0', 'rc', 'release/2.0')).toBe('2.0.0-rc.2')
    })
  })

  describe('feature branch slug', () => {
    it('strips feature/ prefix', () => {
      expect(applyChannel('1.2.0', 'feature', 'feature/login')).toBe('1.2.0-login')
    })

    it('strips feat/ prefix', () => {
      expect(applyChannel('1.2.0', 'feature', 'feat/login')).toBe('1.2.0-login')
    })

    it('lowercases the slug', () => {
      expect(applyChannel('1.2.0', 'feature', 'feature/UserAuth')).toBe('1.2.0-userauth')
    })

    it('replaces non-alphanumeric chars with hyphens', () => {
      expect(applyChannel('1.2.0', 'feature', 'feature/JIRA-1234_fix_login')).toBe(
        '1.2.0-jira-1234-fix-login'
      )
    })

    it('collapses multiple hyphens', () => {
      expect(applyChannel('1.2.0', 'feature', 'feature/fix--double--dash')).toBe(
        '1.2.0-fix-double-dash'
      )
    })

    it('trims leading and trailing hyphens from slug', () => {
      expect(applyChannel('1.2.0', 'feature', 'feature/-leading-trailing-')).toBe(
        '1.2.0-leading-trailing'
      )
    })
  })

  describe('git error fallback', () => {
    it('defaults to index 0 when git throws', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git error')
      })
      expect(applyChannel('1.2.0', 'alpha', 'develop')).toBe('1.2.0-alpha.0')
    })
  })
})
