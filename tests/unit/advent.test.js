import {expect, test} from 'vitest'
import {doorOrder} from '../../app/lib/campaign/advent.js'
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
