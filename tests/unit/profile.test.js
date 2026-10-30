import {expect, test} from 'vitest'
import {DEFAULT_AVATARS, cleanProfile, validateProfileSettings} from '../../app/lib/campaign/profile.js'

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
test('profile settings are checked', () => {
    expect(validateProfileSettings(undefined)).toEqual([])
    expect(validateProfileSettings({avatars: [], reason: 'yes'})).toHaveLength(2)
})
