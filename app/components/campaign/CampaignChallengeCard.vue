<script setup>
import {streaks} from '@/lib/campaign/achievements'

const props = defineProps({
    campaign: {type: Object, required: true},
    track: {type: Object, required: true},
    progress: {type: Object, required: true},
    percents: {type: Object, default: () => ({})},
    profile: {type: Object, default: null},
    fundraising: {type: Object, default: null},
    playable: {type: Boolean, default: true},
    editTo: {type: String, default: null},
    shareUrl: {type: String, default: null},
    shareTitle: {type: String, default: ''},
    shareCard: {type: Boolean, default: false},
    sample: {type: Boolean, default: false},
})

const {t} = useI18n()

const total = props.campaign.schedule.days
const streak = computed(() => streaks(props.progress))
const title = computed(() => props.profile?.name ? t('campaign.namedChallenge', {name: props.profile.name}) : t('campaign.yourChallenge'))
const initial = computed(() => (props.profile?.name ?? '').trim().charAt(0).toUpperCase())
const money = useMoney(props.fundraising?.currency)
const shareCardDialog = ref(null)
const openShareCard = () => shareCardDialog.value?.open()
provide('shareCard', {available: toRef(props, 'shareCard'), open: openShareCard})
const raisedPercent = computed(() => props.fundraising?.target ? props.fundraising.raised / props.fundraising.target * 100 : null)
</script>

<template>
    <section class="challenge-card">
        <div v-if="shareUrl || editTo" class="challenge-card__tools">
            <CampaignShareMenu v-if="shareUrl" :url="shareUrl" :title="shareTitle" :on-card="shareCard ? openShareCard : null" />
            <NuxtLink v-if="editTo" :to="editTo" class="campaign-pill">
                <svg aria-hidden="true"><use :href="sprite('edit')" /></svg>
                {{ t(profile ? 'campaign.profile.editShort' : 'campaign.profile.add') }}
            </NuxtLink>
        </div>

        <header class="challenge-card__header">
            <img v-if="profile?.avatar" :src="profile.avatar" alt="" class="challenge-card__avatar challenge-card__avatar--image">
            <span v-else-if="initial" class="challenge-card__avatar challenge-card__avatar--initial" aria-hidden="true">{{ initial }}</span>
            <div class="challenge-card__titles">
                <h1 class="challenge-card__title">{{ title }}</h1>
                <p v-if="track.headline" class="challenge-card__headline">{{ track.headline }}</p>
                <blockquote v-if="profile?.reason" class="challenge-card__reason">{{ profile.reason }}</blockquote>
            </div>
        </header>

        <slot name="lead" />

        <div class="challenge-card__stats">
            <CampaignStat
                :value="`${progress.completed} / ${total}`"
                :label="t('campaign.daysCompleted')"
                :percent="progress.completed / total * 100"
            />
            <CampaignStat
                :value="t('campaign.streak.value', {n: streak.current})"
                :label="streak.best > streak.current ? t('campaign.streak.labelBest', {best: streak.best}) : t('campaign.streak.label')"
                :flame="streak.current > 0"
            />
            <template v-if="fundraising">
                <CampaignStat
                    :value="fundraising.target ? t('campaign.raisedOf', {raised: money(fundraising.raised), target: money(fundraising.target)}) : money(fundraising.raised)"
                    :label="t('campaign.raised')"
                    :percent="raisedPercent"
                    colour="var(--secondary)"
                />
                <CampaignStat
                    v-if="typeof fundraising.sponsors === 'number'"
                    :value="String(fundraising.sponsors)"
                    :label="t('campaign.sponsors')"
                />
            </template>
        </div>

        <slot />

        <CampaignDayGrid
            :campaign="campaign"
            :days="progress.days"
            :puzzles="track.puzzles"
            :percents="percents"
            :playable="playable"
        />

        <CampaignMilestones :progress="progress" />

        <CampaignSupporters
            v-if="fundraising"
            :fundraising="fundraising"
            :name="profile?.name ?? ''"
            :own="!!editTo"
            :sample="sample"
        />

        <CampaignShareCard
            v-if="shareCard"
            ref="shareCardDialog"
            :campaign="campaign"
            :track="track"
            :progress="progress"
            :url="shareUrl"
            :fundraising="fundraising"
        />
    </section>
</template>

<style scoped>
.challenge-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2.4rem;
    background: var(--card-background);
    border-radius: var(--border-radius);
    box-shadow: 0 1px 2px rgba(var(--text-rgb), .06), 0 12px 30px color-mix(in srgb, var(--secondary) 18%, transparent);
    padding: 2rem 1.6rem;

    @media (width >= 720px) {
        gap: 4rem;
        padding: 4rem;
    }
}

.challenge-card__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.6rem 2rem;
}

.challenge-card__avatar {
    inline-size: 8rem;
    block-size: 8rem;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;

    @media (width >= 720px) {
        inline-size: 13rem;
        block-size: 13rem;
    }
}

.challenge-card__avatar--image {
    object-fit: contain;
    padding: 1.2rem;
    background: color-mix(in srgb, var(--primary) 8%, var(--card-background));

    @media (width >= 720px) {
        padding: 2rem;
    }
}

.challenge-card__avatar--initial {
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--primary) 12%, var(--card-background));
    color: var(--primary);
    font-family: var(--font-display);
    font-size: 3.6rem;
    font-weight: 700;

    @media (width >= 720px) {
        font-size: 5.6rem;
    }
}

.challenge-card__titles {
    flex: 1 1 24rem;
}

.challenge-card__title {
    font-family: var(--font-display);
    font-size: 2.8rem;
    font-weight: 700;
    line-height: 1.15;
    margin: 0;

    @media (width >= 720px) {
        font-size: 3.6rem;
    }
}

.challenge-card__headline {
    color: var(--primary);
    font-size: 2rem;
    margin: .4rem 0 0;

    @media (width >= 720px) {
        font-size: 2.4rem;
    }
}

.challenge-card__reason {
    margin: 1.2rem 0 0;
    padding-inline-start: 1.2rem;
    border-inline-start: .3rem solid var(--secondary);
    font-style: italic;
    text-wrap: pretty;
}

.challenge-card__tools {
    position: relative;
    display: flex;
    justify-content: flex-end;
    gap: .8rem;
    margin-block-end: -1.2rem;

    @media (width >= 720px) {
        position: absolute;
        z-index: 3;
        inset-block-start: 2rem;
        inset-inline-end: 2rem;
        margin: 0;
    }
}

.challenge-card__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(26rem, 1fr));
    gap: 1rem;
}
</style>
