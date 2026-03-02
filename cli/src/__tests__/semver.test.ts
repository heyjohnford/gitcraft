import { describe, it, expect } from 'vitest'
import { bumpVersion } from '../semver'

describe('bumpVersion', () => {
  it('increments patch', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
  })

  it('increments minor and resets patch', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
  })

  it('increments major and resets minor + patch', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
  })

  it('handles 0.0.0 initial state', () => {
    expect(bumpVersion('0.0.0', 'patch')).toBe('0.0.1')
    expect(bumpVersion('0.0.0', 'minor')).toBe('0.1.0')
    expect(bumpVersion('0.0.0', 'major')).toBe('1.0.0')
  })

  it('handles versions with leading zeros stripped', () => {
    expect(bumpVersion('1.0.0', 'patch')).toBe('1.0.1')
  })

  it('throws on invalid version string', () => {
    expect(() => bumpVersion('not-a-version', 'patch')).toThrow(/invalid version/i)
  })

  it('throws on empty string', () => {
    expect(() => bumpVersion('', 'patch')).toThrow()
  })
})
