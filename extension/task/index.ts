import * as tl from 'azure-pipelines-task-lib/task'
import type { Channel } from '../../cli/src/channels'
import { createRelease } from '../../cli/src/release'

async function run(): Promise<void> {
  try {
    const releaseChannel = (tl.getInput('releaseChannel') ?? 'stable') as Channel
    const tagPrefix = tl.getInput('tagPrefix') ?? 'v'
    const filterPath = tl.getInput('path') || undefined

    const result = await createRelease({
      channel: releaseChannel,
      tagPrefix,
      filterPath,
      dryRun: true,
    })

    // Publish output variables (readable downstream as $(stepName.GitCraft.Version) etc.)
    tl.setVariable('GitCraft.Version', result.nextVersion, false, true)
    tl.setVariable('GitCraft.Tag', result.tag, false, true)
    tl.setVariable('GitCraft.BumpType', result.bumpType, false, true)
    tl.setVariable('GitCraft.ReleaseNotes', result.releaseNotes ?? '', false, true)

    console.log('##[section]GitCraft Summary')
    console.log(`  ${result.previousVersion} → ${result.nextVersion} (${result.bumpType})`)
    console.log(`  Tag:     ${result.tag}`)
    console.log(`  Commits: ${result.commitCount}`)
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, (err as Error).message)
  }
}

run()
