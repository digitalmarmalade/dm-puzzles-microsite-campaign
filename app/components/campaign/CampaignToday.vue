<script setup>
import {msUntilTomorrow} from '@/lib/campaign/dates'
import {durationParts, fasterThan} from '@/lib/campaign/achievements'
import {timezoneOf} from '@/lib/campaign/schedule'

const props = defineProps({
    campaign: {type: Object, required: true},
    track: {type: Object, required: true},
    progress: {type: Object, required: true},
    percents: {type: Object, default: () => ({})},
    times: {type: Object, default: () => ({})},
    previewing: {type: Boolean, default: false},
})

const {t} = useI18n()
const localePath = useLocalePath()
const shareCard = inject('shareCard', null)

const iconOf = (puzzle) => puzzle.icon ?? (puzzle.tag ?? '').replaceAll('-', '')
const dayPath = (day) => localePath(`/c/${props.campaign.id}/day/${day}`)
const today = computed(() => props.progress.days.find(d => d.state === 'today') ?? null)
const catchUp = computed(() => props.progress.days.find(d => d.state === 'catchup') ?? null)
const lead = computed(() => today.value ?? catchUp.value)
const puzzle = computed(() => lead.value ? props.track.puzzles[lead.value.day - 1] : null)
const percent = computed(() => lead.value ? props.percents[lead.value.day] ?? null : null)
const doneToday = computed(() => !today.value && props.progress.currentDay >= 1 && props.progress.currentDay <= props.progress.days.length)
const todaySolve = computed(() => {
    const day = props.progress.currentDay
    const seconds = props.times[day]
    return doneToday.value && seconds ? {day, seconds, slug: props.track.puzzles[day - 1]?.slug} : null
})
const tallySlugs = computed(() => todaySolve.value?.slug ? [todaySolve.value.slug] : [])
const tallies = useSolveTallies(props.campaign, tallySlugs, props.previewing)
const beat = computed(() => todaySolve.value ? fasterThan(tallies.value[todaySolve.value.slug], todaySolve.value.seconds) : null)
const solvedIn = computed(() => {
    if (!todaySolve.value) return ''
    const {h, m, s} = durationParts(todaySolve.value.seconds)
    return h ? t('campaign.time.hm', {h, m}) : m ? t('campaign.time.ms', {m, s}) : t('campaign.time.s', {s})
})
const nextDay = computed(() => props.progress.currentDay < props.progress.days.length ? props.progress.currentDay + 1 : null)

const remaining = ref(msUntilTomorrow(timezoneOf(props.campaign)))
const countdown = computed(() => {
    const minutes = Math.max(1, Math.ceil(remaining.value / 60000))
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h ? t('campaign.time.hm', {h, m}) : t('campaign.time.m', {m})
})
let clock = null
onMounted(() => {
    clock = setInterval(() => remaining.value = msUntilTomorrow(timezoneOf(props.campaign)), 30000)
})
onBeforeUnmount(() => clearInterval(clock))
</script>

<template>
    <section v-if="lead" class="today" :class="{'today--catchup': !today}">
        <span class="today__tile" aria-hidden="true">
            <svg><use :href="sprite(iconOf(puzzle))" /></svg>
        </span>
        <div class="today__text">
            <p class="today__label">{{ t(today ? 'campaign.today.label' : 'campaign.today.catchUpLabel', {day: lead.day}) }}</p>
            <h2 class="today__name">{{ puzzle.variant || puzzle.name }}</h2>
            <p v-if="!today" class="today__note">{{ t('campaign.today.catchUpNote') }}</p>
        </div>
        <NuxtLink :to="dayPath(lead.day)" class="today__play">
            {{ percent ? t('campaign.today.continue', {percent}) : t('campaign.today.play') }}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        </NuxtLink>
    </section>

    <section v-else-if="doneToday" class="today today--done">
        <span class="today__tile" aria-hidden="true">
            <svg><use :href="sprite('tick')" /></svg>
        </span>
        <div class="today__text">
            <p class="today__label">{{ t('campaign.today.doneLabel') }}</p>
            <h2 class="today__name">{{ t('campaign.today.doneTitle') }}</h2>
            <p v-if="todaySolve" class="today__solve">
                {{ t('campaign.today.solvedIn', {time: solvedIn}) }}
                <strong v-if="beat !== null">{{ t('campaign.solveTimes.fasterThan', {percent: beat}) }}</strong>
            </p>
            <p v-if="nextDay" class="today__note">
                {{ t('campaign.today.unlocksIn', {day: nextDay}) }}
                <strong class="today__countdown">{{ countdown }}</strong>
            </p>
        </div>
        <button v-if="shareCard?.available.value" type="button" class="today__share" @click="shareCard.open()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            {{ t('campaign.card.shareProgress') }}
        </button>
    </section>
</template>

<style scoped>
.today {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.6rem 2.4rem;
    padding: 2.4rem;
    border-radius: var(--border-radius);
    background: linear-gradient(120deg, var(--primary), color-mix(in srgb, var(--primary) 60%, var(--secondary)));
    color: var(--text-on-primary);
    box-shadow: 0 14px 34px rgba(var(--primary-rgb), .28);
    overflow: hidden;

    @media (width >= 720px) {
        flex-wrap: nowrap;
        padding: 3.2rem 4rem;
    }

    &::after {
        content: '';
        position: absolute;
        inset-block-start: -40%;
        inset-inline-end: -10%;
        inline-size: 28rem;
        block-size: 28rem;
        border-radius: 50%;
        background: rgba(255, 255, 255, .08);
        pointer-events: none;
    }
}

.today--catchup {
    background: linear-gradient(120deg, color-mix(in srgb, var(--secondary) 85%, #000), var(--secondary));
    box-shadow: 0 14px 34px color-mix(in srgb, var(--secondary) 30%, transparent);
}

.today--done {
    background: color-mix(in srgb, var(--primary) 8%, var(--card-background));
    color: var(--text-colour);
    box-shadow: none;

    &::after {
        display: none;
    }
}

.today__tile {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 7.2rem;
    block-size: 7.2rem;
    border-radius: 1.6rem;
    background: var(--card-background);
    color: var(--primary);
    box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
    transform: rotate(-6deg);

    svg {
        inline-size: 4rem;
        block-size: 4rem;
    }

    @media (width >= 720px) {
        inline-size: 9.6rem;
        block-size: 9.6rem;

        svg {
            inline-size: 5.2rem;
            block-size: 5.2rem;
        }
    }

    .today--catchup & {
        color: var(--secondary);
    }

    .today--done & {
        background: var(--primary);
        color: var(--text-on-primary);
        box-shadow: none;
    }
}

.today__text {
    flex: 1 1 18rem;
    min-inline-size: 0;

    p,
    h2 {
        margin: 0;
    }
}

.today__label {
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .12rem;
    opacity: .85;
}

.today__name {
    margin-block-start: .2rem;
    font-family: var(--font-display);
    font-size: 2.8rem;
    line-height: 1.1;

    @media (width >= 720px) {
        font-size: 3.6rem;
    }
}

.today__countdown {
    display: inline-block;
    margin-inline-start: .4rem;
    padding: .1rem .8rem;
    border-radius: 9999px;
    background: var(--primary);
    color: var(--text-on-primary);
    font-variant-numeric: tabular-nums;
}

.today__solve {
    margin-block-start: .4rem;
    font-weight: 600;

    strong {
        margin-inline-start: .4rem;
        color: var(--secondary);
    }
}

.today__note {
    margin-block-start: .4rem;
    opacity: .85;
}

.today__share {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    flex: 1 1 100%;
    padding: 1.4rem 2.8rem;
    border: 0;
    border-radius: 9999px;
    background: var(--primary);
    color: var(--text-on-primary);
    font: inherit;
    font-size: 1.7rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 6px 16px rgba(var(--primary-rgb), .25);
    transition: transform .15s ease, background-color .15s ease;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    @media (width >= 720px) {
        flex: none;
    }

    @media (hover: hover) {
        &:hover {
            background: var(--button-primary-hover, var(--primary));
            transform: translateY(-.2rem);
        }
    }
}

.today__play {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    flex: 1 1 100%;
    padding: 1.6rem 3.2rem;
    border-radius: 9999px;
    background: var(--card-background);
    color: var(--primary);
    font-size: 1.8rem;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
    transition: transform .15s ease, box-shadow .15s ease;

    svg {
        inline-size: 1.8rem;
        block-size: 1.8rem;
        fill: currentColor;
    }

    @media (width >= 720px) {
        flex: none;
    }

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem) scale(1.02);
            box-shadow: 0 10px 24px rgba(0, 0, 0, .2);
        }
    }

    .today--catchup & {
        color: var(--secondary);
    }
}
</style>
