export type BumpType = 'major' | 'minor' | 'patch'

// Breaking change: ! must appear in the type/scope position, not anywhere in the message.
// Valid:   feat!: ...   feat(api)!: ...   fix(scope)!: ...
// Invalid: fix: don't do this!
const BREAKING_HEADER_RE = /^[a-z]+(?:\([^)]+\))?!:/i

// BREAKING CHANGE: as a footer token (multi-line commit body)
const BREAKING_FOOTER_RE = /^BREAKING CHANGE:/m

// Feature commit
const FEAT_RE = /^feat(ure)?(?:\([^)]+\))?:/i

export function determineBump(commitMessages: string[]): BumpType {
  let bump: BumpType = 'patch'

  for (const message of commitMessages) {
    if (BREAKING_HEADER_RE.test(message) || BREAKING_FOOTER_RE.test(message)) {
      // Short-circuit: nothing can override a major bump
      return 'major'
    }

    if (FEAT_RE.test(message)) {
      bump = 'minor'
    }
  }

  return bump
}
