import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('child_process')

import { execSync } from 'child_process'
import { resolveLatestTag, getCommitsSinceTag } from '../tags'

const mockExecSync = vi.mocked(execSync)

// ── resolveLatestTag ───────────────────────────────────────────────────────

describe('resolveLatestTag', () => {
  beforeEach(() => vi.resetAllMocks())

  describe('no-tag state (initial release)', () => {
    it('returns isInitial=true when no tags exist', () => {
      mockExecSync.mockReturnValue('' as any)
      expect(resolveLatestTag()).toEqual({
        latest: '0.0.0',
        tag: 'v0.0.0',
        isInitial: true,
      })
    })

    it('returns isInitial=true when git throws (not a git repo)', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository')
      })
      const result = resolveLatestTag()
      expect(result.isInitial).toBe(true)
      expect(result.latest).toBe('0.0.0')
    })

    it('returns isInitial=true when all tags are non-semver', () => {
      mockExecSync.mockReturnValue('v\nvfoo\nvbar' as any)
      expect(resolveLatestTag().isInitial).toBe(true)
    })
  })

  describe('version resolution', () => {
    it('returns the single tag when only one exists', () => {
      mockExecSync.mockReturnValue('v1.0.0' as any)
      expect(resolveLatestTag()).toEqual({
        latest: '1.0.0',
        tag: 'v1.0.0',
        isInitial: false,
      })
    })

    it('returns the highest semver from an unsorted list', () => {
      mockExecSync.mockReturnValue('v0.9.0\nv1.2.0\nv1.0.0' as any)
      expect(resolveLatestTag()).toMatchObject({ latest: '1.2.0', tag: 'v1.2.0' })
    })

    it('filters non-semver tags and keeps valid ones', () => {
      mockExecSync.mockReturnValue('v1.0.0\nnot-a-version\nv2.0.0\nlatest' as any)
      expect(resolveLatestTag()).toMatchObject({ latest: '2.0.0' })
    })

    it('handles pre-release tags using semver ordering', () => {
      // 1.1.0-alpha.0 > 1.0.1 per semver, but < 1.1.0
      mockExecSync.mockReturnValue('v1.0.1\nv1.1.0-alpha.0' as any)
      expect(resolveLatestTag()).toMatchObject({ latest: '1.1.0-alpha.0' })
    })
  })

  describe('custom prefix', () => {
    it('respects a custom tag prefix', () => {
      mockExecSync.mockReturnValue('rel-1.0.0\nrel-2.0.0' as any)
      expect(resolveLatestTag('rel-')).toEqual({
        latest: '2.0.0',
        tag: 'rel-2.0.0',
        isInitial: false,
      })
    })

    it('passes the correct glob pattern to git', () => {
      mockExecSync.mockReturnValue('' as any)
      resolveLatestTag('release/')
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('"release/*"'),
        expect.any(Object)
      )
    })
  })
})

// ── getCommitsSinceTag ─────────────────────────────────────────────────────

describe('getCommitsSinceTag', () => {
  beforeEach(() => vi.resetAllMocks())

  describe('initial release (no prior tags)', () => {
    it('uses git log without a range', () => {
      mockExecSync.mockReturnValue('feat: init\0fix: typo\0' as any)
      getCommitsSinceTag('v0.0.0', true)
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.not.stringContaining('..HEAD'),
        expect.any(Object)
      )
    })

    it('returns all commits when isInitial=true', () => {
      mockExecSync.mockReturnValue('feat: first commit\0fix: second\0' as any)
      expect(getCommitsSinceTag('v0.0.0', true)).toEqual(['feat: first commit', 'fix: second'])
    })
  })

  describe('incremental release (has prior tag)', () => {
    it('uses tag..HEAD range', () => {
      mockExecSync.mockReturnValue('feat: new\0' as any)
      getCommitsSinceTag('v1.0.0', false)
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('v1.0.0..HEAD'),
        expect.any(Object)
      )
    })

    it('returns commits since the given tag', () => {
      mockExecSync.mockReturnValue('feat: feature\0fix: bug\0' as any)
      expect(getCommitsSinceTag('v1.0.0', false)).toEqual(['feat: feature', 'fix: bug'])
    })
  })

  describe('output parsing', () => {
    it('trims whitespace from each message', () => {
      mockExecSync.mockReturnValue('  feat: spaced  \0' as any)
      expect(getCommitsSinceTag('v1.0.0', false)).toEqual(['feat: spaced'])
    })

    it('filters empty entries from null-byte split', () => {
      mockExecSync.mockReturnValue('\0\0feat: real\0\0' as any)
      expect(getCommitsSinceTag('v1.0.0', false)).toEqual(['feat: real'])
    })

    it('returns empty array when git output is empty', () => {
      mockExecSync.mockReturnValue('' as any)
      expect(getCommitsSinceTag('v1.0.0', false)).toEqual([])
    })

    it('preserves multi-line commit bodies', () => {
      const multiLine = 'feat: big feature\n\nThis adds dark mode.\nCloses #42'
      mockExecSync.mockReturnValue(`${multiLine}\0` as any)
      expect(getCommitsSinceTag('v1.0.0', false)).toEqual([multiLine])
    })
  })

  describe('error handling', () => {
    it('returns empty array when git throws', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git error')
      })
      expect(getCommitsSinceTag('v1.0.0', false)).toEqual([])
    })
  })
})
