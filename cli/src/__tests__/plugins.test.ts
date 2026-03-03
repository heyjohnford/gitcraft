import { execSync } from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Plugin } from '../plugins'
import { createRelease } from '../release'
import * as tags from '../tags'

vi.mock('../tags', () => ({
  resolveLatestTag: vi.fn(),
  getCommitsSinceTag: vi.fn(),
}))

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

const mockExecSync = vi.mocked(execSync)

function setupMocks() {
  ;(tags.resolveLatestTag as ReturnType<typeof vi.fn>).mockReturnValue({
    latest: '1.0.0',
    tag: 'v1.0.0',
    isInitial: false,
  })
  ;(tags.getCommitsSinceTag as ReturnType<typeof vi.fn>).mockReturnValue(['feat: new feature'])
  mockExecSync.mockReturnValue('main' as any) // getCurrentBranch
}

describe('Plugin System', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('executes onResolved and onSuccess hooks', async () => {
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
