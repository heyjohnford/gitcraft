import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs')

import fs from 'fs'
import { ChangelogPlugin } from '../plugins/changelog'
import type { PluginContext } from '../plugins'

const plugin = new ChangelogPlugin()

// ── buildEntry (pure — no fs involved) ───────────────────────────────────

describe('ChangelogPlugin.buildEntry', () => {
  it('includes the tag and ISO date in the header', () => {
    const entry = plugin.buildEntry('v1.4.0', ['feat: dark mode'])
    expect(entry).toMatch(/^## v1\.4\.0 \(\d{4}-\d{2}-\d{2}\)/)
  })

  it('groups feat: commits under Features', () => {
    const entry = plugin.buildEntry('v1.4.0', ['feat: add login page'])
    expect(entry).toContain('### Features')
    expect(entry).toContain('add login page')
  })

  it('groups fix: commits under Bug Fixes', () => {
    const entry = plugin.buildEntry('v1.4.0', ['fix: resolve null crash'])
    expect(entry).toContain('### Bug Fixes')
    expect(entry).toContain('resolve null crash')
  })

  it('groups perf: commits under Performance', () => {
    const entry = plugin.buildEntry('v1.4.0', ['perf: reduce tag lookup overhead'])
    expect(entry).toContain('### Performance')
    expect(entry).toContain('reduce tag lookup overhead')
  })

  it('puts breaking (!) commits in Breaking Changes section', () => {
    const entry = plugin.buildEntry('v2.0.0', ['feat!: remove v1 API'])
    expect(entry).toContain('### ⚠ Breaking Changes')
    expect(entry).toContain('remove v1 API')
  })

  it('puts BREAKING CHANGE: footer commits in Breaking Changes section', () => {
    const commit = 'feat: redesign\n\nBREAKING CHANGE: renames all config keys'
    const entry = plugin.buildEntry('v2.0.0', [commit])
    expect(entry).toContain('### ⚠ Breaking Changes')
  })

  it('does NOT show breaking commit separately under its type section', () => {
    // feat!: should appear in ⚠ Breaking Changes, not also under Features
    const entry = plugin.buildEntry('v2.0.0', ['feat!: only breaking'])
    expect(entry).toContain('### ⚠ Breaking Changes')
    expect(entry).not.toContain('### Features')
  })

  it('shows non-breaking feats under Features when mixed with breaking feats', () => {
    const entry = plugin.buildEntry('v2.0.0', ['feat!: breaking change', 'feat: normal feature'])
    expect(entry).toContain('### ⚠ Breaking Changes')
    expect(entry).toContain('### Features')
    expect(entry).toContain('normal feature')
  })

  it('formats scoped commits as **scope:** subject', () => {
    const entry = plugin.buildEntry('v1.4.0', ['feat(auth): add OAuth support'])
    expect(entry).toContain('**auth:** add OAuth support')
  })

  it('formats unscoped commits without bold prefix', () => {
    const entry = plugin.buildEntry('v1.4.0', ['fix: resolve crash'])
    expect(entry).toContain('- resolve crash')
    expect(entry).not.toContain('**')
  })

  it('skips non-conventional commit messages', () => {
    const entry = plugin.buildEntry('v1.4.0', [
      'updated stuff',
      'WIP: do not merge',
      'feat: real feature',
    ])
    expect(entry).not.toContain('updated stuff')
    expect(entry).not.toContain('WIP')
    expect(entry).toContain('real feature')
  })

  it('returns only the header when all commits are non-conventional', () => {
    const entry = plugin.buildEntry('v1.4.0', ['wip', 'squash me', 'merge'])
    // Only the `## tag (date)\n\n` header, nothing else
    expect(entry).toMatch(/^## v1\.4\.0 \(\d{4}-\d{2}-\d{2}\)\n\n$/)
  })

  it('outputs Breaking Changes before Features', () => {
    const entry = plugin.buildEntry('v2.0.0', ['feat!: breaking', 'feat: normal'])
    const breakingIdx = entry.indexOf('### ⚠ Breaking Changes')
    const featIdx = entry.indexOf('### Features')
    expect(breakingIdx).toBeLessThan(featIdx)
  })

  it('handles multiple commit types in one release', () => {
    const entry = plugin.buildEntry('v1.4.0', [
      'feat: new button',
      'fix: crash on empty input',
      'perf: cache lookups',
      'docs: update README',
    ])
    expect(entry).toContain('### Features')
    expect(entry).toContain('### Bug Fixes')
    expect(entry).toContain('### Performance')
    expect(entry).toContain('### Documentation')
  })
})

// ── onSuccess (writes to fs) ──────────────────────────────────────────────

describe('ChangelogPlugin.onSuccess', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.writeFileSync).mockImplementation(() => {})
  })

  it('writes CHANGELOG.md', async () => {
    await plugin.onSuccess(makeCtx(['feat: new feature']))
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('CHANGELOG.md'),
      expect.any(String),
      'utf-8'
    )
  })

  it('sets result.releaseNotes on the context', async () => {
    const ctx = makeCtx(['feat: new feature'])
    await plugin.onSuccess(ctx)
    expect(ctx.result.releaseNotes).toBeDefined()
    expect(ctx.result.releaseNotes).toContain('## v1.4.0')
  })

  it('prepends new entry before existing entries', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockReturnValue(
      '# Changelog\n\nAll notable changes...\n\n## v1.3.0 (2026-01-01)\n\n### Bug Fixes\n\n- old fix\n'
    )
    await plugin.onSuccess(makeCtx(['feat: new feature']))
    const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
    expect(written).toContain('## v1.4.0')
    expect(written).toContain('## v1.3.0')
    expect(written.indexOf('v1.4.0')).toBeLessThan(written.indexOf('v1.3.0'))
  })

  it('always writes the Changelog header', async () => {
    await plugin.onSuccess(makeCtx(['fix: typo']))
    const written = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string
    expect(written).toContain('# Changelog')
  })
})

// ── helpers ───────────────────────────────────────────────────────────────

function makeCtx(commits: string[]): PluginContext {
  return {
    result: {
      previousVersion: '1.3.0',
      nextVersion: '1.4.0',
      bumpType: 'minor',
      tag: 'v1.4.0',
      commitCount: commits.length,
      dryRun: false,
    },
    options: {},
    commits,
  }
}
