#!/usr/bin/env node
import { Command } from 'commander'
import { createRelease } from './release'
import type { Channel } from './channels'
import { loadConfig, resolvePlugins } from './config'

const program = new Command()

program
  .name('gitcraft')
  .description('Craft production-ready releases from your Git history.')
  .version('0.1.0')

program
  .command('release')
  .description('Analyze commits and publish the next semantic version release')
  .option('-c, --channel <channel>', 'Release channel: stable, alpha, beta, rc, feature')
  .option('-p, --tag-prefix <prefix>', 'Git tag prefix', 'v')
  .option('-n, --dry-run', 'Preview the release without running plugins or writing files')
  .option('--path <path>', 'Only analyze commits touching this path (monorepo support)')
  .action(async (opts) => {
    try {
      const config = await loadConfig()
      const plugins = await resolvePlugins(config)

      const result = await createRelease({
        channel: opts.channel as Channel | undefined,
        tagPrefix: opts.tagPrefix,
        dryRun: opts.dryRun ?? false,
        plugins,
        filterPath: opts.path,
      })

      const label = result.dryRun ? ' [dry-run]' : ''
      console.log(`\nGitCraft Release${label}`)
      console.log(`  ${result.previousVersion}  →  ${result.nextVersion}  (${result.bumpType})`)
      console.log(`  Tag:     ${result.tag}`)
      console.log(`  Commits: ${result.commitCount}`)

      if (result.dryRun) {
        console.log('\nDry run — no plugins ran, no files were written.')
      }
    } catch (err) {
      console.error(`\nError: ${(err as Error).message}`)
      process.exit(1)
    }
  })

program.parse()
