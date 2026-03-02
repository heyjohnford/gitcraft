import { execSync } from 'child_process'
import semver from 'semver'

export interface TagResolution {
  /** Semver version string without prefix, e.g. "1.2.3" */
  latest: string
  /** Full git tag name, e.g. "v1.2.3" */
  tag: string
  /** True when no prior tags exist and this is the first release */
  isInitial: boolean
}

export function resolveLatestTag(prefix: string = 'v'): TagResolution {
  let rawOutput: string

  try {
    rawOutput = execSync(`git tag -l "${prefix}*"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return makeInitial(prefix)
  }

  if (!rawOutput) return makeInitial(prefix)

  const candidates = rawOutput
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((tag) => {
      const stripped = tag.slice(prefix.length)
      const version = semver.valid(stripped)
      return version ? { tag, latest: version } : null
    })
    .filter((e): e is { tag: string; latest: string } => e !== null)

  if (candidates.length === 0) return makeInitial(prefix)

  // Sort descending so index 0 is the highest version
  candidates.sort((a, b) => semver.rcompare(a.latest, b.latest))

  return { ...candidates[0], isInitial: false }
}

export function getCommitsSinceTag(latestTag: string, isInitial: boolean, path?: string): string[] {
  try {
    // %B = full commit message (subject + body), %x00 = null-byte separator
    const range = isInitial ? '' : `${latestTag}..HEAD`
    const pathSuffix = path ? ` -- ${path}` : ''
    const cmd = `git log ${range} --format=%B%x00 --no-merges${pathSuffix}`.trim()

    const output = execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    if (!output) return []

    return output
      .split('\0')
      .map((m) => m.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function makeInitial(prefix: string): TagResolution {
  return { latest: '0.0.0', tag: `${prefix}0.0.0`, isInitial: true }
}
