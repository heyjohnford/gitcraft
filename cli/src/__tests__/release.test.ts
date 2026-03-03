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

describe('Publish', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setupMocks()
  })

  it('creates and pushes the tag when publish is true', async () => {
    const result = await createRelease({ publish: true })

    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('git tag v1.1.0'),
      expect.any(Object)
    )
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining('git push origin v1.1.0'),
      expect.any(Object)
    )
    expect(result.published).toBe(true)
  })

  it('does not create a tag when publish is false', async () => {
    await createRelease({ publish: false })

    expect(mockExecSync).not.toHaveBeenCalledWith(
      expect.stringContaining('git tag'),
      expect.any(Object)
    )
  })

  it('does not publish in dry run mode', async () => {
    const result = await createRelease({ publish: true, dryRun: true })

    expect(mockExecSync).not.toHaveBeenCalledWith(
      expect.stringContaining('git tag'),
      expect.any(Object)
    )
    expect(result.published).toBe(false)
  })

  it('calls onFailure and rethrows when pushTag fails', async () => {
    mockExecSync.mockImplementation((cmd: string) => {
      if (cmd.includes('git tag')) throw new Error('git tag failed')
      return 'main' as any
    })

    const plugin: Plugin = {
      name: 'test-plugin',
      onFailure: vi.fn(),
    }

    await expect(createRelease({ publish: true, plugins: [plugin] })).rejects.toThrow(
      'Failed to create or push tag'
    )
    expect(plugin.onFailure).toHaveBeenCalled()
  })
})
