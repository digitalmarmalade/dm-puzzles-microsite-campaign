<script setup>
import {signOut} from 'firebase/auth'
import {joinWindow, phase} from '@/lib/campaign/schedule'

const campaign = await useCampaign()
const {t} = useI18n()
const dateLocale = useDateLocale()
const localePath = useLocalePath()
const text = useCampaignText(campaign)
const {$auth} = useNuxtApp()
const p = useCampaignPlayer(campaign)

const busy = ref(false)
const error = ref('')

const when = computed(() => phase(campaign, p.today.value))
const formatDate = (iso) => new Intl.DateTimeFormat(dateLocale.value, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${iso}T12:00:00Z`))
const fundraising = sampleFundraising(campaign, p.previewing)
const pageUrl = useCampaignPageUrl(campaign)
const welcomePath = localePath(`/c/${campaign.id}/welcome`)

watchEffect(() => {
    if (p.previewing || !p.loaded.value || p.player.value || when.value !== 'open') return
    if (p.user.value && !p.user.value.isAnonymous) navigateTo(welcomePath, {replace: true})
})

const hero = ref(null)
const heroImage = ref(null)
const PARALLAX = .15
let frame = null

function drift() {
    frame = null
    if (!hero.value || !heroImage.value) return
    const box = hero.value.getBoundingClientRect()
    if (box.bottom < 0) return
    const scrolled = Math.min(Math.max(-box.top, 0), box.height)
    heroImage.value.style.transform = `translate3d(0, ${scrolled * PARALLAX}px, 0)`
}

function onScroll() {
    frame ??= requestAnimationFrame(drift)
}

onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    window.addEventListener('scroll', onScroll, {passive: true})
})
onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    if (frame) cancelAnimationFrame(frame)
})

async function begin() {
    busy.value = true
    error.value = ''
    try {
        if (campaign.tracks.length > 1) {
            await p.ensureUser()
            await navigateTo(welcomePath)
        } else {
            await p.start(campaign.tracks[0].id)
        }
    } catch (e) {
        console.error(e)
        error.value = t('campaign.account.errors.default')
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <CampaignShell :campaign="campaign" :previewing="p.previewing ? p.today.value : null">
        <template v-if="p.loaded.value && !p.player.value && campaign.theme?.banner" #banner>
            <section ref="hero" class="campaign-hero">
                <img
                    ref="heroImage"
                    :src="campaign.theme.banner"
                    alt=""
                    class="campaign-hero__image"
                    :style="{objectPosition: campaign.theme.bannerFocus ?? 'center'}"
                    fetchpriority="high"
                >
                <div class="campaign-hero__inner">
                    <h1 class="campaign-hero__title"><span>{{ text('tagline') || text('title') }}</span></h1>
                </div>
            </section>
        </template>

        <p v-if="!p.loaded.value" class="campaign-note">{{ t('campaign.loading') }}</p>

        <div v-else-if="!p.player.value" class="campaign-landing" :class="{'has-banner': campaign.theme?.banner}">
            <aside class="campaign-landing__action">
                <CampaignSignIn
                    v-if="campaign.account === 'required' && (p.previewing || p.needsAccount.value)"
                    :campaign="campaign"
                    :profile="p.profile.value"
                    :intro="text('intro')"
                    @registered="navigateTo(welcomePath)"
                />

                <div v-else class="card card--main campaign-panel">
                    <p v-if="when === 'upcoming'" class="campaign-note">{{ t('campaign.upcoming', {date: formatDate(joinWindow(campaign).from)}) }}</p>
                    <p v-else-if="when === 'ended'" class="campaign-note">{{ t('campaign.ended') }}</p>
                    <template v-else>
                        <div class="campaign-panel__header">
                            <h2 class="campaign-panel__title">{{ t('campaign.readyTitle') }}</h2>
                            <p>{{ text('intro') }}</p>
                        </div>
                        <button class="campaign-button campaign-start" :disabled="busy" @click="begin">{{ t('campaign.start') }}</button>
                        <p v-if="error" class="campaign-note" role="alert">{{ error }}</p>
                    </template>
                </div>
            </aside>

            <CampaignExplainer :campaign="campaign" :show-title="!campaign.theme?.banner" class="campaign-landing__explainer" />
        </div>

        <CampaignDetails v-if="p.loaded.value && !p.player.value" :campaign="campaign" />

        <CampaignFinale
            v-if="p.progress.value?.over && p.track.value"
            :campaign="campaign"
            :track="p.track.value"
            :progress="p.progress.value"
            :profile="p.profile.value"
            :page-url="p.profile.value?.handle ? pageUrl(p.profile.value.handle) : null"
            :fundraising="fundraising"
            own
        />

        <CampaignChallengeCard
            v-if="p.player.value && p.progress.value && p.track.value"
            :campaign="campaign"
            :track="p.track.value"
            :progress="p.progress.value"
            :percents="p.percents.value"
            :profile="p.profile.value"
            :edit-to="localePath(`/c/${campaign.id}/profile`)"
            :share-url="p.profile.value?.handle ? pageUrl(p.profile.value.handle) : null"
            :share-title="text('title')"
            :share-card="!!p.profile.value?.handle"
            :fundraising="fundraising"
            :sample="!!fundraising"
        >
            <template v-if="!p.progress.value.over" #lead>
                <CampaignMilestoneUnlock :colours="[campaign.theme?.primary, campaign.theme?.secondary, '#ffd166'].filter(Boolean)" :progress="p.progress.value" :storage-key="`campaign-milestones-seen:${campaign.id}:${p.previewing ? 'preview' : p.user.value?.uid}`" />
                <CampaignToday :campaign="campaign" :track="p.track.value" :progress="p.progress.value" :percents="p.percents.value" />
            </template>
            <p v-if="p.progress.value.currentDay === 0" class="campaign-note">{{ t('campaign.beforeStart', {date: formatDate(p.progress.value.days[0].due)}) }}</p>
        </CampaignChallengeCard>

        <p v-if="p.user.value?.email" class="campaign-account">
            {{ t('campaign.account.signedInAs', {email: p.user.value.email}) }}
            <button type="button" class="link-button" @click="signOut($auth)">{{ t('campaign.account.signOut') }}</button>
        </p>
    </CampaignShell>
</template>

<style scoped>
.campaign-landing {
    display: grid;
    align-items: start;

    @media (width >= 960px) {
        grid-template-columns: minmax(0, 1fr) minmax(36rem, 46rem);
        gap: 4rem 6rem;
    }
}

.campaign-hero {
    position: relative;
    display: flex;
    block-size: var(--hero-height);
    margin-block-end: 3.2rem;
    overflow: hidden;

    @media (width >= 960px) {
        margin-block-end: 0;
    }

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to top, rgba(0, 0, 0, .6), rgba(0, 0, 0, .15) 45%, transparent 70%);
        pointer-events: none;
    }
}

.campaign-hero__image {
    position: absolute;
    inset-block: -15% 0;
    inset-inline: 0;
    inline-size: 100%;
    block-size: 115%;
    object-fit: cover;
    will-change: transform;
}

.campaign-hero__inner {
    position: relative;
    z-index: 1;
    display: grid;
    align-items: end;
    inline-size: 100%;
    max-inline-size: 128rem;
    margin-inline: auto;
    padding: 10rem var(--page-gutter) 2.4rem;

    @media (width >= 720px) {
        padding-block: 0 4rem;
    }

    @media (width >= 960px) {
        grid-template-columns: minmax(0, 1fr) minmax(36rem, 46rem);
        column-gap: 6rem;
    }
}

.campaign-hero__title {
    margin: 0;
    color: var(--text-on-primary, #fff);
    font-family: var(--font-display);
    font-size: 4rem;
    line-height: 1.3;
    text-wrap: balance;

    @media (width >= 720px) {
        font-size: 6rem;
    }

    @media (width >= 1200px) {
        font-size: 7.2rem;
    }

    span {
        padding: .02em .25em .08em;
        border-radius: .12em;
        background: var(--primary);
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
    }
}

.campaign-landing__explainer {
    @media (width >= 960px) {
        grid-column: 1;
        grid-row: 1;
    }
}

.campaign-landing__action {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;

    @media (width >= 960px) {
        grid-column: 2;
        grid-row: 1;
        position: relative;
        z-index: 1;
        margin-block-end: 4rem;

        @media (height >= 760px) {
            position: sticky;
            inset-block-start: 2rem;
        }

        .has-banner & {
            margin-block-start: calc(10rem - var(--hero-height));
        }
    }
}

.has-banner .campaign-landing__action :deep(.card) {
    background: color-mix(in srgb, var(--card-background) 85%, transparent);
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, .15);
}

.campaign-note {
    text-align: center;
}

.campaign-start {
    align-self: flex-start;
    padding-inline: 3.2rem;
}

.campaign-account {
    margin-block-start: 3.2rem;
    text-align: center;
    font-size: 1.4rem;
}

.link-button {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    margin-inline-start: .6rem;
    color: var(--primary);
    font: inherit;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
}
</style>

<style>
.campaign__main:has(> .details) {
    padding-block-end: 0;
}

.campaign:has(.campaign-hero) {
    --hero-height: 46rem;

    @media (width >= 600px) {
        --hero-height: 54rem;
    }

    @media (width >= 960px) {
        --hero-height: max(48rem, min(clamp(64rem, 48vw, 78rem), calc(100svh - 4rem)));
    }
}
</style>
