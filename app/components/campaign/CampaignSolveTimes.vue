<script setup>
import {durationParts, fasterThan, solveStats} from '@/lib/campaign/achievements'

const props = defineProps({
    campaign: {type: Object, required: true},
    times: {type: Object, default: () => ({})},
    puzzles: {type: Array, required: true},
    previewing: {type: Boolean, default: false},
})

const {t} = useI18n()
const stats = computed(() => solveStats(props.times, props.puzzles))
const slugOf = (day) => props.puzzles[day - 1]?.slug
const slugs = computed(() => stats.value ? [...new Set([stats.value.fastest, ...stats.value.bests].map(s => slugOf(s.day)).filter(Boolean))] : [])
const tallies = useSolveTallies(props.campaign, slugs, props.previewing)
const beat = (solve) => fasterThan(tallies.value[slugOf(solve.day)], solve.seconds)

function duration(seconds) {
    const {h, m, s} = durationParts(seconds)
    if (h) return t('campaign.time.hm', {h, m})
    if (m) return t('campaign.time.ms', {m, s})
    return t('campaign.time.s', {s})
}
</script>

<template>
    <section v-if="stats" class="solve-times">
        <h2 class="campaign-heading">{{ t('campaign.solveTimes.title') }}</h2>

        <div class="solve-times__stats">
            <div class="solve-times__stat solve-times__stat--fastest">
                <span class="solve-times__label">{{ t('campaign.solveTimes.fastest') }}</span>
                <strong class="solve-times__value">{{ duration(stats.fastest.seconds) }}</strong>
                <span class="solve-times__note">{{ t('campaign.solveTimes.fastestNote', {day: stats.fastest.day, type: stats.fastest.type}) }}</span>
                <span v-if="beat(stats.fastest) !== null" class="solve-times__beat">{{ t('campaign.solveTimes.fasterThan', {percent: beat(stats.fastest)}) }}</span>
            </div>
            <div class="solve-times__stat">
                <span class="solve-times__label">{{ t('campaign.solveTimes.average') }}</span>
                <strong class="solve-times__value">{{ duration(stats.average) }}</strong>
                <span class="solve-times__note">{{ t('campaign.solveTimes.timed', {count: stats.count}) }}</span>
            </div>
            <div class="solve-times__stat">
                <span class="solve-times__label">{{ t('campaign.solveTimes.total') }}</span>
                <strong class="solve-times__value">{{ duration(stats.total) }}</strong>
                <span class="solve-times__note">{{ t('campaign.solveTimes.totalNote') }}</span>
            </div>
        </div>

        <div v-if="stats.bests.length > 1" class="solve-times__bests">
            <h3 class="solve-times__subhead">{{ t('campaign.solveTimes.bests') }}</h3>
            <ul>
                <li v-for="best in stats.bests" :key="best.type" class="solve-times__best">
                    <span class="solve-times__icon" aria-hidden="true"><svg><use :href="sprite(best.icon)" /></svg></span>
                    <span class="solve-times__type">
                        {{ best.type }}
                        <small v-if="beat(best) !== null">{{ t('campaign.solveTimes.fasterThan', {percent: beat(best)}) }}</small>
                    </span>
                    <span class="solve-times__day">{{ t('campaign.dayN', {day: best.day}) }}</span>
                    <strong class="solve-times__time">{{ duration(best.seconds) }}</strong>
                </li>
            </ul>
        </div>
    </section>
</template>

<style scoped>
.solve-times {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.solve-times__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;

    @media (width >= 720px) {
        grid-template-columns: repeat(3, 1fr);
    }
}

.solve-times__stat {
    display: flex;
    flex-direction: column;
    gap: .2rem;
    padding: 1.4rem 1.6rem;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius-inner);

    @media (width >= 720px) {
        padding: 1.6rem 2rem;
    }
}

.solve-times__stat--fastest {
    grid-column: 1 / -1;
    border-color: color-mix(in srgb, var(--primary) 30%, var(--card-border));
    background: color-mix(in srgb, var(--primary) 5%, var(--card-background));
    color: var(--text-colour);

    @media (width >= 720px) {
        grid-column: auto;
    }
}

.solve-times__label {
    font-size: 1.3rem;
    text-transform: uppercase;
    letter-spacing: .05rem;
}

.solve-times__value {
    font-family: var(--font-display);
    font-size: 2.6rem;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;

    .solve-times__stat--fastest & {
        color: var(--primary);
    }

    @media (width >= 720px) {
        font-size: 3.2rem;
    }
}

.solve-times__note {
    font-size: 1.3rem;
    opacity: .7;
}

.solve-times__bests {
    ul {
        display: grid;
        gap: .8rem;
        margin: 0;
        padding: 0;
        list-style: none;

        @media (width >= 720px) {
            grid-template-columns: repeat(auto-fill, minmax(30rem, 1fr));
        }
    }
}

.solve-times__subhead {
    margin: 0 0 1rem;
    font-size: 1.6rem;
}

.solve-times__best {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    padding: 1rem 1.4rem;
    border-radius: var(--border-radius-inner);
    background: color-mix(in srgb, var(--primary) 4%, var(--card-background));
    color: var(--text-colour);
}

.solve-times__icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 4rem;
    block-size: 4rem;
    border-radius: 1rem;
    background: color-mix(in srgb, var(--primary) 12%, var(--card-background));
    color: var(--primary);

    svg {
        inline-size: 2.4rem;
        block-size: 2.4rem;
    }
}

.solve-times__type {
    flex: 1;
    font-weight: 700;

    small {
        display: block;
        color: var(--secondary);
        font-size: 1.2rem;
    }
}

.solve-times__beat {
    align-self: flex-start;
    margin-block-start: .6rem;
    padding: .2rem 1rem;
    border-radius: 9999px;
    background: var(--secondary);
    color: #fff;
    font-size: 1.2rem;
    font-weight: 700;
}

.solve-times__day {
    white-space: nowrap;
    font-size: 1.3rem;
    opacity: .7;
}

.solve-times__time {
    min-inline-size: 7rem;
    color: var(--primary);
    font-variant-numeric: tabular-nums;
    text-align: end;
}
</style>
