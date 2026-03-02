import { describe, it, expect, vi } from 'vitest'
import { createRelease } from '../release'
import * as tags from '../tags'
import type { Plugin } from '../plugins'
import { execSync } from 'child_process'

vi.mock('../tags', () => ({
  resolveLatestTag: vi.fn(),
  getCommitsSinceTag: vi.fn(),
}))

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

describe('Plugin System', () => {
  it('executes onResolved and onSuccess hooks', async () => {
    ;(tags.resolveLatestTag as any).mockReturnValue({
      latest: '1.0.0',
      tag: 'v1.0.0',
      isInitial: false,
    })
    ;(tags.getCommitsSinceTag as any).mockReturnValue(['feat: new feature'])
    ;(execSync as any).mockReturnValue('main') // for getCurrentBranch

    const plugin: Plugin = {
      name: 'test-plugin',
      onResolved: vi.fn(),
      onSuccess: vi.fn(),
    }

    await createRelease({ dryRun: false, plugins: [plugin] })

    expect(plugin.onResolved).toHaveBeenCalled()
    expect(plugin.onSuccess).toHaveBeenCalled()
  })

  it('does not execute onSuccess in dryRun mode', async () => {
    ;(tags.resolveLatestTag as any).mockReturnValue({
      latest: '1.0.0',
      tag: 'v1.0.0',
      isInitial: false,
    })
    ;(tags.getCommitsSinceTag as any).mockReturnValue(['feat: new feature'])

    const plugin: Plugin = {
      name: 'test-plugin',
      onResolved: vi.fn(),
      onSuccess: vi.fn(),
    }

    await createRelease({ dryRun: true, plugins: [plugin] })

    expect(plugin.onResolved).toHaveBeenCalled()
    expect(plugin.onSuccess).not.toHaveBeenCalled()
  })
})
