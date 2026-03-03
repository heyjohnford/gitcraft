#!/usr/bin/env node
import { Command } from 'commander'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Channel } from './channels'
import { loadConfig, resolvePlugins } from './config'
import { createRelease } from './release'

const { version } = JSON.parse(readFileSync(resolve(__dirname, './package.json'), 'utf-8')) as {
  version: string
}

const program = new Command()

program
  .name('gitcraft')
  .description('Craft production-ready releases from your Git history.')
  .version(version)

program
  .command('release')
  .description('Analyze commits and publish the next semantic version release')
  .option('-c, --channel <channel>', 'Release channel: stable, alpha, beta, rc, feature')
  .option('-p, --tag-prefix <prefix>', 'Git tag prefix', 'v')
  .option('-n, --dry-run', 'Preview the release without running plugins or writing files')
  .option('--publish', 'Create and push the git tag to the remote')
  .option('--path <path>', 'Only analyze commits touching this path (monorepo support)')
  .action(async (opts) => {
    try {
      const config = await loadConfig()
      const plugins = await resolvePlugins(config)

      const result = await createRelease({
        channel: opts.channel as Channel | undefined,
        tagPrefix: opts.tagPrefix,
        dryRun: opts.dryRun ?? false,
        publish: opts.publish ?? false,
        plugins,
        filterPath: opts.path,
      })

      const label = result.dryRun ? ' [dry-run]' : ''
      console.log(`\nGitCraft Release${label}`)
      console.log(`  ${result.previousVersion}  →  ${result.nextVersion}  (${result.bumpType})`)
      console.log(`  Tag:     ${result.tag}`)
      console.log(`  Commits: ${result.commitCount}`)
      if (result.published) console.log(`  Published: ${result.tag} pushed to origin`)

      if (result.dryRun) {
        console.log('\nDry run — no plugins ran, no files were written.')
      }
    } catch (err) {
      console.error(`\nError: ${(err as Error).message}`)
      process.exit(1)
    }
  })

program.parse()
