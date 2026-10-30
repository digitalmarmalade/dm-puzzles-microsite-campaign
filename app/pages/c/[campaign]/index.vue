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
const sample = p.previewing ? campaign.preview : null
const pageUrl = useCampaignPageUrl(campaign)

async function start(trackId) {
    busy.value = true
    error.value = ''
    try {
        await p.start(trackId)
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
        <section v-if="!p.player.value" class="campaign-intro">
            <p class="campaign-intro__tagline">{{ text('tagline') }}</p>
            <p>{{ text('intro') }}</p>
        </section>

        <p v-if="!p.loaded.value" class="campaign-note">{{ t('campaign.loading') }}</p>

        <CampaignSignIn v-else-if="p.needsAccount.value && !p.previewing" :campaign="campaign" />

        <template v-else-if="!p.player.value">
            <p v-if="when === 'upcoming'" class="campaign-note">{{ t('campaign.upcoming', {date: formatDate(joinWindow(campaign).from)}) }}</p>
            <p v-else-if="when === 'ended'" class="campaign-note">{{ t('campaign.ended') }}</p>
            <template v-else>
                <h2 v-if="campaign.tracks.length > 1">{{ t('campaign.pickTrack') }}</h2>
                <ul class="campaign-tracks">
                    <li v-for="track in campaign.tracks" :key="track.id" class="campaign-track">
                        <template v-if="campaign.tracks.length > 1">
                            <h3>{{ track.name }}</h3>
                            <p>{{ track.description }}</p>
                        </template>
                        <button class="campaign-button" :disabled="busy" @click="start(track.id)">
                            {{ campaign.tracks.length > 1 ? t('campaign.startTrack', {name: track.name}) : t('campaign.start') }}
                        </button>
                    </li>
                </ul>
                <p v-if="error" class="campaign-note" role="alert">{{ error }}</p>
            </template>
        </template>

        <CampaignFinale
            v-if="p.progress.value?.over && p.track.value"
            :campaign="campaign"
            :track="p.track.value"
            :progress="p.progress.value"
            :profile="p.profile.value"
            :page-url="p.profile.value?.handle ? pageUrl(p.profile.value.handle) : null"
            :fundraising="sample?.fundraising ?? null"
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
            :fundraising="sample?.fundraising ?? null"
        >
            <CampaignShareLink v-if="p.profile.value?.handle" :campaign="campaign" :handle="p.profile.value.handle" :title="text('title')" />
            <p v-if="p.progress.value.currentDay === 0" class="campaign-note">{{ t('campaign.beforeStart', {date: formatDate(p.progress.value.days[0].due)}) }}</p>
        </CampaignChallengeCard>

        <p v-if="p.user.value?.email" class="campaign-account">
            {{ t('campaign.account.signedInAs', {email: p.user.value.email}) }}
            <button type="button" class="link-button" @click="signOut($auth)">{{ t('campaign.account.signOut') }}</button>
        </p>
    </CampaignShell>
</template>

<style scoped>
.campaign-intro {
    text-align: center;
    margin-block-end: 2.4rem;
}

.campaign-intro__tagline {
    font-size: 2rem;
    font-weight: 700;
    margin-block-end: .8rem;
}

.campaign-note {
    text-align: center;
}

h2 {
    text-align: center;
    margin-block-end: 1.6rem;
}

.campaign-tracks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(24rem, 1fr));
    gap: 1.6rem;
}

.campaign-track {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
    border-radius: var(--border-radius);
    background: #fff;

    p {
        flex-grow: 1;
    }
}

.campaign-tracks:has(> :only-child) .campaign-track {
    background: none;
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
