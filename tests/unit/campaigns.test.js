import {readdirSync, readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {validateCampaign} from '../../app/lib/campaign/schedule.js'

const ids = readdirSync('campaigns', {withFileTypes: true}).filter(d => d.isDirectory()).map(d => d.name)

describe.each(ids)('campaigns/%s', (id) => {
    const campaign = JSON.parse(readFileSync(`campaigns/${id}/campaign.json`, 'utf8'))

    test('is valid', () => {
        expect(validateCampaign(campaign)).toEqual([])
    })
    test('its id matches its folder', () => {
        expect(campaign.id).toBe(id)
    })
    test('has English text', () => {
        expect(campaign.text?.en?.title).toBeTruthy()
    })
})

test('no two campaigns share a domain', () => {
    const hosts = ids.flatMap(id => JSON.parse(readFileSync(`campaigns/${id}/campaign.json`, 'utf8')).hosts ?? [])
    expect(hosts.length).toBe(new Set(hosts).size)
})
