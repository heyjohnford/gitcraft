# GitCraft

**GitCraft** — Craft production-ready releases directly from your Git history.

GitCraft analyzes your commits, determines the correct Semantic Version bump, applies tags, generates changelogs, and publishes release metadata — all with zero configuration to start.

## Features

- **Correct SemVer**: Properly detects breaking changes (`feat!`, `BREAKING CHANGE:`) and bumps major, minor, or patch accordingly.
- **Release Channels**: Auto-maps branches to channels: `main` → stable, `develop` → alpha, `feature/*` → feature preview.
- **Monorepo Support**: Independent versioning for packages within a monorepo using path filtering.
- **Plugin System**: Extensible design for changelog generation, AI summaries, Slack notifications, and more.
- **Azure-Native**: First-class Azure DevOps pipeline task with output variables.
- **Dry Run Mode**: Preview exactly what will be released before committing.

## Quick Start

### CLI

```bash
npm install -g gitcraft
gitcraft release --dry-run
```

### Azure Pipelines

```yaml
- task: GitCraft@1
  inputs:
    releaseChannel: 'stable'
    tagPrefix: 'v'
```

## Configuration

Create a `gitcraft.config.js` in your root:

```javascript
module.exports = {
  plugins: [
    'changelog',
    'ai-notes',
    // Custom plugins...
  ],
}
```

## License

MIT
