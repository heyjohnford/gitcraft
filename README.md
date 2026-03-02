# GitCraft

Craft production-ready releases directly from your Git history.

GitCraft analyzes your commits, determines the correct SemVer bump, applies tags, generates changelogs, and publishes release metadata — all with zero configuration to start.

## Features

- **Correct SemVer** — Detects breaking changes (`feat!`, `BREAKING CHANGE:`) and bumps major, minor, or patch accordingly
- **Release Channels** — Auto-maps branches to channels, or override manually
- **Changelog Generation** — Generates and prepends to `CHANGELOG.md`, grouped by commit type
- **Monorepo Support** — Independent versioning per package using path filtering
- **Plugin System** — Extend with changelog, AI summaries, Slack notifications, and more
- **Azure DevOps** — First-class pipeline task with output variables
- **Dry Run Mode** — Preview exactly what will happen before committing anything

## Installation

```bash
npm install -g @gitcraft/cli
```

## Usage

```bash
# Preview the next release
gitcraft release --dry-run

# Run a release on the current branch
gitcraft release

# Override the release channel
gitcraft release --channel alpha

# Scope to a subdirectory (monorepo)
gitcraft release --path packages/api
```

## Configuration

Create a `gitcraft.config.js` in your project root:

```javascript
module.exports = {
  plugins: [
    'changelog',
    // 'ai-notes',
  ],
}
```

### Writing a Plugin

```typescript
import type { Plugin } from '@gitcraft/cli'

const myPlugin: Plugin = {
  name: 'my-plugin',
  async onResolved(ctx) {
    // Runs after version is computed, before any git actions
    console.log(`Next version: ${ctx.result.nextVersion}`)
  },
  async onSuccess(ctx) {
    // Runs after tag is pushed
    console.log(`Released ${ctx.result.tag}`)
  },
  async onFailure(err) {
    // Runs if the release fails
    console.error(err)
  },
}

module.exports = { plugins: [myPlugin] }
```

## Azure Pipelines

```yaml
- task: GitCraft@1
  inputs:
    releaseChannel: 'stable'
    tagPrefix: 'v'
```

### Output Variables

| Variable                | Description                           |
| ----------------------- | ------------------------------------- |
| `GitCraft.Version`      | The new version number (e.g. `1.2.0`) |
| `GitCraft.Tag`          | The full git tag (e.g. `v1.2.0`)      |
| `GitCraft.BumpType`     | `major`, `minor`, or `patch`          |
| `GitCraft.ReleaseNotes` | Changelog entry for this release      |

## GitHub Actions

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '24'

- name: Release
  run: npx @gitcraft/cli release --channel stable
```

## License

MIT
