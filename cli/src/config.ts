import fs from 'node:fs'
import path from 'node:path'
import type { GitCraftConfig, Plugin } from './plugins'
import { ChangelogPlugin } from './plugins/changelog'

export async function loadConfig(): Promise<GitCraftConfig> {
  const configPath = path.resolve(process.cwd(), 'gitcraft.config.js')

  if (fs.existsSync(configPath)) {
    try {
      // For now, we'll support only JS config via require
      const config = require(configPath)
      return config.default || config
    } catch (err) {
      console.warn(`Warning: Could not load config from ${configPath}: ${(err as Error).message}`)
    }
  }

  // Default config
  return {
    plugins: [],
  }
}

export async function resolvePlugins(config: GitCraftConfig): Promise<Plugin[]> {
  const resolved: Plugin[] = []

  if (config.plugins) {
    for (const p of config.plugins) {
      if (typeof p === 'string') {
        // Resolve from node_modules or built-in
        const plugin = await loadPluginByName(p)
        if (plugin) resolved.push(plugin)
      } else {
        resolved.push(p)
      }
    }
  }

  return resolved
}

async function loadPluginByName(name: string): Promise<Plugin | null> {
  if (name === 'changelog') return new ChangelogPlugin()
  if (name === 'ai-notes') {
    const { AIReleaseNotesPlugin } = await import('./plugins/ai-notes')
    return new AIReleaseNotesPlugin()
  }

  try {
    // Try to require it
    const pluginModule = require(name)
    const PluginClass = pluginModule.default || pluginModule
    return new PluginClass()
  } catch {
    console.warn(`Warning: Could not load plugin "${name}"`)
    return null
  }
}
