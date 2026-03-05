import semver from 'semver'
import type { BumpType } from './analyzer'

export function bumpVersion(current: string, type: BumpType): string {
  const next = semver.inc(current, type)
  if (!next) {
    throw new Error(`Cannot increment invalid version: "${current}"`)
  }

  return next
}
