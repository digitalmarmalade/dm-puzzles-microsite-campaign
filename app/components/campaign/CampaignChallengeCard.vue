<script setup>
const props = defineProps({
    campaign: {type: Object, required: true},
    track: {type: Object, required: true},
    progress: {type: Object, required: true},
    percents: {type: Object, default: () => ({})},
    profile: {type: Object, default: null},
    fundraising: {type: Object, default: null},
    playable: {type: Boolean, default: true},
    editTo: {type: String, default: null},
})

const {t} = useI18n()
const dateLocale = useDateLocale()

const total = props.campaign.schedule.days
const title = computed(() => props.profile?.name ? t('campaign.namedChallenge', {name: props.profile.name}) : t('campaign.yourChallenge'))
const initial = computed(() => (props.profile?.name ?? '').trim().charAt(0).toUpperCase())
const money = (amount) => new Intl.NumberFormat(dateLocale.value, {style: 'currency', currency: props.fundraising?.currency ?? 'GBP', maximumFractionDigits: 0}).format(amount)
const raisedPercent = computed(() => props.fundraising?.target ? props.fundraising.raised / props.fundraising.target * 100 : null)
</script>

<template>
    <section class="challenge-card">
        <header class="challenge-card__header">
            <img v-if="profile?.avatar" :src="profile.avatar" alt="" class="challenge-card__avatar challenge-card__avatar--image">
            <span v-else-if="initial" class="challenge-card__avatar challenge-card__avatar--initial" aria-hidden="true">{{ initial }}</span>
            <div class="challenge-card__titles">
                <h1 class="challenge-card__title">{{ title }}</h1>
                <p v-if="track.headline" class="challenge-card__headline">{{ track.headline }}</p>
                <blockquote v-if="profile?.reason" class="challenge-card__reason">{{ profile.reason }}</blockquote>
                <NuxtLink v-if="editTo" :to="editTo" class="challenge-card__edit">{{ t(profile ? 'campaign.profile.edit' : 'campaign.profile.add') }}</NuxtLink>
            </div>
            <a v-if="fundraising?.url" :href="fundraising.url" class="campaign-button challenge-card__sponsor" target="_blank" rel="noopener">
                {{ t('campaign.sponsor') }}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </a>
        </header>

        <div class="challenge-card__stats">
            <CampaignStat
                :value="`${progress.completed} / ${total}`"
                :label="t('campaign.daysCompleted')"
                :percent="progress.completed / total * 100"
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
    </section>
</template>

<style scoped>
.challenge-card {
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

.challenge-card__edit {
    display: inline-block;
    margin-block-start: .8rem;
    color: var(--primary);
    font-size: 1.4rem;
    font-weight: 600;
}

.challenge-card__sponsor {
    text-transform: uppercase;
    letter-spacing: .1rem;
    padding: .8rem 1.6rem;

    svg {
        inline-size: 1.4rem;
        block-size: 1.4rem;
    }
}

.challenge-card__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(26rem, 1fr));
    gap: 1rem;
}
</style>
