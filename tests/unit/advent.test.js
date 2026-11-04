import {expect, test} from 'vitest'
import {WOODS, doorOrder, drawerOrnament, drawerWood} from '../../app/lib/campaign/advent.js'
import {validateCampaign} from '../../app/lib/campaign/schedule.js'

const sorted = (list) => [...list].sort((a, b) => a - b)

test('doors are a shuffled set of every day, the same each time', () => {
    for (const count of [24, 12, 30, 1]) {
        const order = doorOrder(count)
        expect(sorted(order)).toEqual(Array.from({length: count}, (_, i) => i + 1))
        expect(doorOrder(count)).toEqual(order)
    }
    expect(doorOrder(24)).not.toEqual(sorted(doorOrder(24)))
})

test('only known skins are allowed', () => {
    const base = {id: 'x', account: 'optional', schedule: {mode: 'fixed', days: 1, start: '2026-12-01'}, tracks: [{id: 'a', name: 'A', puzzles: [{slug: 's', url: 'u', type: 't'}]}]}
    expect(validateCampaign({...base, theme: {skin: 'advent'}}).filter(e => e.includes('skin'))).toEqual([])
    expect(validateCampaign({...base, theme: {skin: 'summer'}}).some(e => e.includes('skin'))).toBe(true)
})

test('every drawer gets a wood and an ornament, and neighbours vary', () => {
    for (let day = 1; day <= 31; day++) {
        expect(WOODS).toContain(drawerWood(day))
        expect(typeof drawerOrnament(day)).toBe('string')
    }
    expect(drawerWood(1)).not.toBe(drawerWood(2))
})

test('a campaign can give its own words for each drawer', () => {
    const base = {id: 'x', account: 'optional', schedule: {mode: 'fixed', days: 1, start: '2026-12-01'}, tracks: [{id: 'a', name: 'A', puzzles: [{slug: 's', url: 'u', type: 't'}]}]}
    expect(validateCampaign({...base, text: {en: {days: {1: 'Mince pies at the ready.'}}}}).filter(e => e.includes('days'))).toEqual([])
    expect(validateCampaign({...base, text: {en: {days: {first: 'Hi'}}}}).some(e => e.includes('text.en.days'))).toBe(true)
    expect(validateCampaign({...base, text: {en: {days: ['Hi']}}}).some(e => e.includes('text.en.days'))).toBe(true)
})
