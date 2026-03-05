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

      let label: string
      if (result.published) {
        label = ' [published]'
      } else if (result.dryRun) {
        label = ' [dry-run]'
      } else {
        label = ' [tag]'
      }
      console.log(`\nGitCraft Release${label}`)
      console.log(`  ${result.previousVersion}  →  ${result.nextVersion}  (${result.bumpType})`)
      console.log(`  Tag:     ${result.tag}`)
      console.log(`  Commits: ${result.commitCount}`)
      if (result.published) {
        console.log(`\nPublished: ${result.tag} pushed to origin`)
      } else if (result.nextVersion === result.previousVersion) {
        console.log('\nNo version bump needed based on commit messages')
      } else if (result.dryRun) {
        console.log('\nThis was a dry run — no changes were made')
      }
    } catch (err) {
      console.error(`\nError: ${(err as Error).message}`)
      process.exit(1)
    }
  })

program.parse()
