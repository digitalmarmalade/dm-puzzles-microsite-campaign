const loaders = import.meta.glob('../../../campaigns/*/campaign.json', {import: 'default'})

const idOf = (path) => path.split('/').at(-2)

export function campaignIds() {
    return useRuntimeConfig().public.campaigns.map(c => c.id)
}

export function campaignForHost(hostname) {
    return useRuntimeConfig().public.campaigns.find(c => c.hosts.includes(hostname))?.id ?? null
}

export async function loadCampaign(id) {
    const path = Object.keys(loaders).find(p => idOf(p) === id)
    return path ? await loaders[path]() : null
}
