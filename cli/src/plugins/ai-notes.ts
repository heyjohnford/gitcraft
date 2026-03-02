import type { Plugin, PluginContext } from '../plugins'

/**
 * AI-powered release notes summarizer.
 *
 * Future feature — not yet implemented.
 * Will call an LLM API to produce a human-friendly release summary
 * from the commit list, suitable for blog posts or release emails.
 *
 * Enable via gitcraft.config.js:
 *   plugins: ["ai-notes"]
 */
export class AIReleaseNotesPlugin implements Plugin {
  name = 'ai-notes'

  async onSuccess(_ctx: PluginContext): Promise<void> {
    // TODO: call LLM API with _ctx.commits to generate a summary
    // and store it in _ctx.result.releaseNotes
  }
}
