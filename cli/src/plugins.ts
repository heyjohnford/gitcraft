import type { ReleaseResult, ReleaseOptions } from './release'

export interface PluginContext {
  result: ReleaseResult
  options: ReleaseOptions
  /** Full list of commit messages analyzed for this release. Available to all plugins. */
  commits: string[]
}

export interface Plugin {
  name: string
  /** Called after the next version is calculated, but before any git actions. */
  onResolved?(ctx: PluginContext): Promise<void> | void
  /** Called after the git tag is successfully created and pushed. */
  onSuccess?(ctx: PluginContext): Promise<void> | void
  /** Called if the release process fails. */
  onFailure?(err: Error): Promise<void> | void
}

export interface GitCraftConfig {
  plugins?: (Plugin | string)[]
}
