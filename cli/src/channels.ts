import { execSync } from 'child_process'

export type Channel = 'stable' | 'alpha' | 'beta' | 'rc' | 'feature'

/** Map a branch name to its default release channel. */
export function detectChannel(branch: string): Channel {
  if (branch === 'main' || branch === 'master') return 'stable'
  if (branch === 'develop') return 'alpha'
  if (/^release\//.test(branch)) return 'rc'
  if (/^feat(ure)?\//.test(branch)) return 'feature'
  return 'alpha'
}

/**
 * Apply a pre-release suffix to a base version.
 *
 * The pre-release index is derived by counting existing tags that share the
 * same base version and channel — avoiding non-monotonic timestamps.
 *
 * Examples:
 *   stable  → "1.2.0"
 *   alpha   → "1.2.0-alpha.0"  (or .1, .2, ... if prior alpha tags exist)
 *   feature → "1.2.0-feature-login.0"
 */
export function applyChannel(
  version: string,
  channel: Channel,
  branch: string,
  prefix: string = 'v'
): string {
  if (channel === 'stable') return version

  const idx = getNextPreReleaseIndex(version, channel, prefix)

  if (channel === 'alpha') return `${version}-alpha.${idx}`
  if (channel === 'beta') return `${version}-beta.${idx}`
  if (channel === 'rc') return `${version}-rc.${idx}`

  if (channel === 'feature') {
    const slug = branch
      .replace(/(^feature|^feat)\//, '')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
    return `${version}-${slug}`
  }

  return version
}

/** Count existing pre-release tags for this base version + channel to get the next index. */
function getNextPreReleaseIndex(baseVersion: string, channel: string, prefix: string): number {
  try {
    const pattern = `${prefix}${baseVersion}-${channel}*`
    const output = execSync(`git tag -l "${pattern}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    if (!output) return 0

    const indices = output
      .split('\n')
      .filter(Boolean)
      .map((tag) => {
        const match = tag.match(/\.(\d+)$/)
        return match ? parseInt(match[1], 10) : -1
      })
      .filter((n) => n >= 0)

    return indices.length > 0 ? Math.max(...indices) + 1 : 0
  } catch {
    return 0
  }
}
