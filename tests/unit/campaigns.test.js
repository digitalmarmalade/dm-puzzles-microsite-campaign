import {existsSync, readdirSync, readFileSync} from 'node:fs'
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
    test('its images are in public/', () => {
        const local = [campaign.theme?.logo, campaign.theme?.banner, campaign.theme?.crest, ...(campaign.profile?.avatars ?? [])].filter(src => src?.startsWith('/'))
        expect(local.filter(src => !existsSync(`public${src}`))).toEqual([])
    })
})

test('no two campaigns share a domain', () => {
    const hosts = ids.flatMap(id => JSON.parse(readFileSync(`campaigns/${id}/campaign.json`, 'utf8')).hosts ?? [])
    expect(hosts.length).toBe(new Set(hosts).size)
})
