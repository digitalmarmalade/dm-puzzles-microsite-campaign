<script setup>
import {isValidHandle} from '@/lib/campaign/profile'

const campaign = await useCampaign()
const route = useRoute()
const {t} = useI18n()
const localePath = useLocalePath()
const text = useCampaignText(campaign)

const handle = String(route.params.handle)
if (!isValidHandle(handle)) throw createError({statusCode: 404, statusMessage: 'Page not found', fatal: true})

const page = useCampaignPublicPage(campaign, handle)
const homePath = localePath(`/c/${campaign.id}`)
const name = computed(() => page.profile.value?.name ?? '')
const title = computed(() => name.value ? t('campaign.namedChallenge', {name: name.value}) : t('campaign.yourChallenge'))
const pageUrl = useCampaignPageUrl(campaign)
const fundraising = computed(() => page.previewing ? campaign.preview?.fundraising ?? null : null)
</script>

<template>
    <CampaignShell :campaign="campaign" :previewing="page.previewing ? page.today.value : null" :title="page.profile.value ? title : null">
        <template v-if="!page.isOwner.value" #nav>
            <NuxtLink :to="homePath">{{ t('campaign.public.createOwn') }}</NuxtLink>
        </template>

        <p v-if="!page.loaded.value" class="campaign-note">{{ t('campaign.loading') }}</p>

        <section v-else-if="!page.profile.value" class="card card--main public-missing">
            <h1>{{ t('campaign.public.notFound') }}</h1>
            <p>{{ t('campaign.public.notFoundText') }}</p>
            <NuxtLink :to="homePath" class="campaign-button">{{ t('campaign.public.createOwn') }}</NuxtLink>
        </section>

        <template v-else>
            <p v-if="page.isOwner.value" class="public-owner">
                {{ t('campaign.public.yours') }}
                <NuxtLink :to="homePath">{{ t('campaign.public.backToYours') }}</NuxtLink>
            </p>

            <CampaignFinale
                v-if="page.progress.value?.over && page.track.value"
                :campaign="campaign"
                :track="page.track.value"
                :progress="page.progress.value"
                :profile="page.profile.value"
                :page-url="pageUrl(handle)"
                :fundraising="fundraising"
            />

            <CampaignChallengeCard
                v-if="page.progress.value && page.track.value"
                :campaign="campaign"
                :track="page.track.value"
                :progress="page.progress.value"
                :profile="page.profile.value"
                :fundraising="fundraising"
                :share-url="pageUrl(handle)"
                :share-title="title"
                :playable="false"
            />

            <section v-else class="card card--main public-missing">
                <h1>{{ title }}</h1>
                <p>{{ t('campaign.public.notStarted', {name}) }}</p>
            </section>

            <aside v-if="!page.isOwner.value" class="public-cta">
                <h2>{{ t('campaign.public.ctaTitle') }}</h2>
                <p>{{ text('tagline') }}</p>
                <NuxtLink :to="homePath" class="campaign-button">{{ t('campaign.public.createOwn') }}</NuxtLink>
            </aside>
        </template>
    </CampaignShell>
</template>

<style scoped>
.campaign-note {
    text-align: center;
}

.public-missing {
    align-items: center;
    text-align: center;
    max-inline-size: 64rem;
    margin-inline: auto;

    h1 {
        font-family: var(--font-display);
        font-size: 2.8rem;
        margin: 0;
    }

    @media (width >= 1024px) {
        align-items: center;
    }
}

.public-owner {
    text-align: center;
    margin: 0 0 2rem;
    padding: 1rem 1.6rem;
    border-radius: var(--border-radius-inner);
    background: color-mix(in srgb, var(--secondary) 10%, var(--card-background));
    font-size: 1.4rem;

    a {
        color: var(--primary);
        font-weight: 600;
        margin-inline-start: .6rem;
    }
}

.public-cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
    margin-block-start: 3.2rem;
    padding: 3.2rem 2rem;
    border-radius: var(--border-radius);
    background: var(--primary);
    color: var(--text-on-primary);
    text-align: center;

    h2 {
        font-family: var(--font-display);
        font-size: 2.6rem;
        margin: 0;
    }

    p {
        margin: 0;
    }

    .campaign-button {
        background: var(--text-on-primary);
        color: var(--primary);
    }
}
</style>
