import { execSync } from 'child_process'
import { determineBump } from './analyzer'
import type { Channel } from './channels'
import { applyChannel, detectChannel } from './channels'
import type { Plugin, PluginContext } from './plugins'
import { bumpVersion } from './semver'
import { getCommitsSinceTag, resolveLatestTag } from './tags'

export interface ReleaseOptions {
  channel?: Channel
  tagPrefix?: string
  dryRun?: boolean
  plugins?: Plugin[]
  filterPath?: string
}

export interface ReleaseResult {
  previousVersion: string
  nextVersion: string
  bumpType: string
  tag: string
  commitCount: number
  dryRun: boolean
  /** Populated by the changelog plugin — markdown for this release entry. */
  releaseNotes?: string
}

export async function createRelease(opts: ReleaseOptions = {}): Promise<ReleaseResult> {
  const prefix = opts.tagPrefix ?? 'v'
  const branch = getCurrentBranch()
  const channel = opts.channel ?? detectChannel(branch)

  const { latest, tag: latestTag, isInitial } = resolveLatestTag(prefix)
  const commits = getCommitsSinceTag(latestTag, isInitial, opts.filterPath)

  if (commits.length === 0) {
    throw new Error('No commits found since last release. Nothing to release.')
  }

  const bumpType = determineBump(commits)
  const baseNext = bumpVersion(latest, bumpType)
  const nextVersion = applyChannel(baseNext, channel, branch, prefix)
  const nextTag = `${prefix}${nextVersion}`

  const result: ReleaseResult = {
    previousVersion: latest,
    nextVersion,
    bumpType,
    tag: nextTag,
    commitCount: commits.length,
    dryRun: opts.dryRun ?? false,
  }

  const context: PluginContext = { result, options: opts, commits }

  // Run 'onResolved' hook
  if (opts.plugins) {
    for (const plugin of opts.plugins) {
      if (plugin.onResolved) await plugin.onResolved(context)
    }
  }

  if (!opts.dryRun) {
    try {
      if (opts.plugins) {
        for (const plugin of opts.plugins) {
          if (plugin.onSuccess) await plugin.onSuccess(context)
        }
      }
    } catch (err) {
      if (opts.plugins) {
        for (const plugin of opts.plugins) {
          if (plugin.onFailure) await plugin.onFailure(err as Error)
        }
      }
      throw err
    }
  }

  return result
}

function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch {
    throw new Error('Could not determine current Git branch.')
  }
}
