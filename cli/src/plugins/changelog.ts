import fs from 'fs'
import path from 'path'
import type { Plugin, PluginContext } from '../plugins'

interface ParsedCommit {
  type: string
  scope?: string
  subject: string
  breaking: boolean
}

// Matches: type(scope)!: subject  or  type!: subject  or  type(scope): subject  or  type: subject
const COMMIT_RE = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)/i
const BREAKING_FOOTER_RE = /^BREAKING CHANGE:\s+(.+)/m

const TYPE_LABELS: Record<string, string> = {
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance',
  refactor: 'Refactoring',
  docs: 'Documentation',
  chore: 'Maintenance',
  test: 'Tests',
  style: 'Style',
  ci: 'CI/CD',
  build: 'Build',
  revert: 'Reverts',
}

// Order in which sections appear in the generated output
const TYPE_ORDER = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'chore',
  'test',
  'build',
  'ci',
  'revert',
  'style',
]

export class ChangelogPlugin implements Plugin {
  name = 'changelog'

  async onSuccess(ctx: PluginContext): Promise<void> {
    const { result, commits } = ctx
    const entry = this.buildEntry(result.tag, commits)
    // Expose the entry so the extension task can publish it as a pipeline variable
    result.releaseNotes = entry
    this.prepend(entry)
    console.log('  Changelog: CHANGELOG.md updated')
  }

  /** Builds the markdown entry for a single release. Public for testability. */
  buildEntry(tag: string, commits: string[]): string {
    const date = new Date().toISOString().slice(0, 10)
    const parsed = commits.map(parseCommit).filter(Boolean) as ParsedCommit[]

    const breaking = parsed.filter((c) => c.breaking)

    // Group by type for section rendering
    const byType = new Map<string, ParsedCommit[]>()
    for (const commit of parsed) {
      if (!byType.has(commit.type)) byType.set(commit.type, [])
      byType.get(commit.type)!.push(commit)
    }

    let md = `## ${tag} (${date})\n\n`

    // Breaking changes section always appears first
    if (breaking.length > 0) {
      md += `### ⚠ Breaking Changes\n\n`
      for (const c of breaking) md += `- ${format(c)}\n`
      md += '\n'
    }

    for (const type of TYPE_ORDER) {
      const group = byType.get(type)
      if (!group) continue
      // Breaking entries are already shown above — omit them here to avoid duplication
      const nonBreaking = group.filter((c) => !c.breaking)
      if (nonBreaking.length === 0) continue
      md += `### ${TYPE_LABELS[type] ?? type}\n\n`
      for (const c of nonBreaking) md += `- ${format(c)}\n`
      md += '\n'
    }

    return md
  }

  private prepend(entry: string): void {
    const filePath = path.resolve(process.cwd(), 'CHANGELOG.md')
    const header =
      '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n'

    let prior = ''
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      // Preserve everything from the first ## section header onwards
      const firstEntry = content.indexOf('\n## ')
      prior = firstEntry >= 0 ? content.slice(firstEntry + 1) : ''
    }

    fs.writeFileSync(filePath, header + entry + prior, 'utf-8')
  }
}

function parseCommit(raw: string): ParsedCommit | null {
  const firstLine = raw.split('\n')[0]
  const match = firstLine.match(COMMIT_RE)
  if (!match) return null

  const [, type, scope, bang, subject] = match
  const breaking = !!bang || BREAKING_FOOTER_RE.test(raw)

  return { type: type.toLowerCase(), scope, subject, breaking }
}

function format(c: ParsedCommit): string {
  return c.scope ? `**${c.scope}:** ${c.subject}` : c.subject
}
