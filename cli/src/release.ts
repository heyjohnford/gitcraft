import { execSync } from 'node:child_process'
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
  publish?: boolean
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
  published: boolean
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
    published: false,
  }

  return craft(result, opts, commits)
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

function pushTag(tag: string): void {
  try {
    execSync(`git tag ${tag}`, { stdio: 'inherit' })
    execSync(`git push origin ${tag}`, { stdio: 'inherit' })
  } catch {
    throw new Error(`Failed to create or push tag: ${tag}`)
  }
}

async function runPluginResolved(
  plugins: Plugin[] | undefined,
  context: PluginContext
): Promise<void> {
  if (!plugins) return
  for (const plugin of plugins) {
    if (plugin.onResolved) await plugin.onResolved(context)
  }
}

async function runPluginSuccess(
  plugins: Plugin[] | undefined,
  context: PluginContext
): Promise<void> {
  if (!plugins) return
  for (const plugin of plugins) {
    if (plugin.onSuccess) await plugin.onSuccess(context)
  }
}

async function runPluginFailure(plugins: Plugin[] | undefined, error: Error): Promise<void> {
  if (!plugins) return
  for (const plugin of plugins) {
    if (plugin.onFailure) await plugin.onFailure(error)
  }
}

async function craft(
  result: ReleaseResult,
  options: ReleaseOptions,
  commits: string[]
): Promise<ReleaseResult> {
  const context: PluginContext = { result, options, commits }

  await runPluginResolved(options.plugins, context)

  if (!options.dryRun) {
    try {
      if (options.publish) {
        pushTag(result.tag)
        result.published = true
      }

      await runPluginSuccess(options.plugins, context)
    } catch (err) {
      await runPluginFailure(options.plugins, err as Error)

      throw err
    }
  }

  return result
}
