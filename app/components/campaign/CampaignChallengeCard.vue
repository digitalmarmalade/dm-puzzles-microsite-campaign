<script setup>
import {streaks} from '@/lib/campaign/achievements'

const props = defineProps({
    campaign: {type: Object, required: true},
    track: {type: Object, required: true},
    progress: {type: Object, required: true},
    percents: {type: Object, default: () => ({})},
    times: {type: Object, default: () => ({})},
    profile: {type: Object, default: null},
    fundraising: {type: Object, default: null},
    playable: {type: Boolean, default: true},
    editTo: {type: String, default: null},
    shareUrl: {type: String, default: null},
    shareTitle: {type: String, default: ''},
    shareCard: {type: Boolean, default: false},
    sample: {type: Boolean, default: false},
    previewing: {type: Boolean, default: false},
    thankedKey: {type: String, default: null},
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
const snowy = props.campaign.theme?.skin === 'advent'
const raisedPercent = computed(() => props.fundraising?.target ? props.fundraising.raised / props.fundraising.target * 100 : null)
</script>

<template>
    <section class="challenge-card" :class="{'challenge-card--snowy': snowy}">
        <CampaignSnow v-if="snowy" class="challenge-card__snow" :density="2" />
        <div v-if="shareUrl || (editTo && !snowy)" class="challenge-card__tools">
            <CampaignShareMenu v-if="shareUrl" :url="shareUrl" :title="shareTitle" :on-card="shareCard ? openShareCard : null" />
            <NuxtLink v-if="editTo && !snowy" :to="editTo" class="campaign-pill">
                <svg aria-hidden="true"><use :href="sprite('edit')" /></svg>
                {{ t(profile ? 'campaign.profile.editShort' : 'campaign.profile.add') }}
            </NuxtLink>
        </div>

        <header class="challenge-card__header">
            <img v-if="profile?.avatar && !snowy" :src="profile.avatar" alt="" class="challenge-card__avatar challenge-card__avatar--image">
            <span v-else-if="initial && !snowy" class="challenge-card__avatar challenge-card__avatar--initial" aria-hidden="true">{{ initial }}</span>
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
                v-if="fundraising"
                :value="fundraising.target ? t('campaign.raisedOf', {raised: money(fundraising.raised), target: money(fundraising.target)}) : money(fundraising.raised)"
                :label="t('campaign.raised')"
                :percent="raisedPercent"
                colour="var(--secondary)"
            />
            <CampaignStat
                :value="t('campaign.streak.value', {n: streak.current})"
                :label="streak.best > streak.current ? t('campaign.streak.labelBest', {best: streak.best}) : t('campaign.streak.label')"
                :flame="streak.current > 0"
            />
            <CampaignStat
                v-if="typeof fundraising?.sponsors === 'number'"
                :value="String(fundraising.sponsors)"
                :label="t('campaign.sponsors')"
            />
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

        <CampaignSolveTimes :campaign="campaign" :times="times" :puzzles="track.puzzles" :previewing="previewing" />

        <CampaignSupporters
            v-if="fundraising"
            :fundraising="fundraising"
            :name="profile?.name ?? ''"
            :own="!!editTo"
            :sample="sample"
            :thanked-key="thankedKey"
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

    &.challenge-card--snowy {
        --advent-night: #154d99;
        --advent-night-deep: #071b57;
        --advent-night-light: #6196c7;
        --advent-gold: #e8b64c;
        --advent-gold-light: #f6d98e;
        --advent-paper: #f8f1e3;
        --advent-ink: #1d2a4d;

        isolation: isolate;
        background: linear-gradient(180deg, var(--advent-night-deep) 0%, var(--advent-night) 45%, var(--advent-night-light) 100%);
        color: #fff;
    }
}

.challenge-card__snow {
    z-index: -1;
    border-radius: inherit;
}

.challenge-card--snowy :deep(.campaign-heading),
.challenge-card--snowy .challenge-card__headline {
    color: var(--advent-gold-light);
}

.challenge-card--snowy .challenge-card__reason {
    border-color: var(--advent-gold);
}

.challenge-card--snowy :deep(.campaign-stat),
.challenge-card--snowy :deep(.milestone) {
    border: 1px solid rgba(255, 255, 255, .14);
    background: rgba(7, 27, 87, .45);
    color: #fff;
    backdrop-filter: blur(2px);
}

.challenge-card--snowy :deep(.solve-times__stat) {
    border-color: rgba(255, 255, 255, .25);
}

.challenge-card--snowy :deep(.solve-times__stat--fastest) {
    border-color: rgba(255, 255, 255, .25);
    background: none;
    color: inherit;

    .solve-times__value {
        color: inherit;
    }
}

.challenge-card--snowy :deep(.campaign-stat__arc),
.challenge-card--snowy :deep(.campaign-stat__flame) {
    color: #fff;
    stroke: #fff;
}

.challenge-card--snowy :deep(.campaign-stat__track) {
    stroke: rgba(255, 255, 255, .2);
}

.challenge-card--snowy :deep(.unlock) {
    border: 1px solid rgba(255, 255, 255, .14);
    background: rgba(7, 27, 87, .45);
    color: #fff;
    backdrop-filter: blur(2px);
}

.challenge-card--snowy :deep(.unlock__label) {
    color: var(--advent-gold-light);
}

.challenge-card--snowy :deep(.unlock .campaign-button.is-secondary) {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .6);
    color: #fff;
}

.challenge-card--snowy :deep(.milestone:not(.is-reached)) {
    border-style: dashed;
    border-color: rgba(255, 255, 255, .3);
    background: rgba(7, 27, 87, .25);
}

.challenge-card--snowy :deep(.milestone__badge) {
    border-color: rgba(255, 255, 255, .45);
    color: rgba(255, 255, 255, .7);
}

.challenge-card--snowy :deep(.milestone.is-reached .milestone__badge),
.challenge-card--snowy :deep(.unlock__badge) {
    background: #fff;
    color: var(--advent-night-deep);
    box-shadow: 0 6px 16px rgba(0, 0, 0, .25);
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
    position: absolute;
    z-index: 3;
    inset-block-start: 2rem;
    inset-inline-end: 1.6rem;
    display: flex;
    justify-content: flex-end;
    gap: .8rem;

    @media (width >= 720px) {
        inset-inline-end: 2rem;
    }

    .challenge-card:not(:has(.challenge-card__avatar)) & {
        position: relative;
        inset: auto;
        margin-block-end: -1.2rem;

        @media (width >= 720px) {
            position: absolute;
            inset-block-start: 2rem;
            inset-inline-end: 2rem;
            margin: 0;
        }
    }
}

.challenge-card__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;

    @media (width >= 720px) {
        grid-template-columns: repeat(auto-fit, minmax(26rem, 1fr));
    }
}
</style>
