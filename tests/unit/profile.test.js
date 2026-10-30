import {expect, test} from 'vitest'
import {DEFAULT_AVATARS, cleanProfile, handleCandidates, handleFrom, isValidHandle, validateProfileSettings} from '../../app/lib/campaign/profile.js'

const campaign = {id: 'x'}

test('a profile is trimmed and kept within its limits', () => {
    const profile = cleanProfile(campaign, {name: '  Amy  ', avatar: DEFAULT_AVATARS[0], reason: 'x'.repeat(300)})
    expect(profile.name).toBe('Amy')
    expect(profile.avatar).toBe(DEFAULT_AVATARS[0])
    expect(profile.reason).toHaveLength(280)
})
test('only the campaign\'s own avatars can be picked', () => {
    expect(cleanProfile(campaign, {name: 'Amy', avatar: 'https://example.com/me.png'}).avatar).toBe(null)
    expect(cleanProfile({profile: {avatars: ['/a.svg']}}, {name: 'Amy', avatar: '/a.svg'}).avatar).toBe('/a.svg')
})
test('a campaign can turn the reason off', () => {
    expect(cleanProfile({profile: {reason: false}}, {name: 'Amy', reason: 'Because'}).reason).toBe('')
})
test('a page address is made from a name', () => {
    expect(handleFrom('Harold')).toBe('harold')
    expect(handleFrom('  Zoë O\'Brien-Smith!! ')).toBe('zoe-o-brien-smith')
    expect(handleFrom('李')).toBe('')
})
test('addresses must be tidy and not clash with the site\'s own pages', () => {
    expect(isValidHandle('harold-2')).toBe(true)
    expect(isValidHandle('Harold')).toBe(false)
    expect(isValidHandle('harold-')).toBe(false)
    expect(isValidHandle('profile')).toBe(false)
    expect(isValidHandle('day')).toBe(false)
})
test('addresses are tried in order: the name, then numbered, then random', () => {
    const tries = handleCandidates('Harold', () => .5)
    expect(tries.slice(0, 3)).toEqual(['harold', 'harold-2', 'harold-3'])
    expect(tries.at(-1)).toBe('harold-i')
    expect(handleCandidates('')[0]).toBe('player')
})
test('a name that clashes with a site page skips straight to numbered addresses', () => {
    expect(handleCandidates('Welcome')[0]).toBe('welcome-2')
})
test('a campaign can turn public pages off', () => {
    expect(cleanProfile(campaign, {name: 'Amy', handle: 'amy'}).handle).toBe('amy')
    expect(cleanProfile({profile: {publicPage: false}}, {name: 'Amy', handle: 'amy'}).handle).toBe(null)
})
test('profile settings are checked', () => {
    expect(validateProfileSettings(undefined)).toEqual([])
    expect(validateProfileSettings({avatars: [], reason: 'yes'})).toHaveLength(2)
})
