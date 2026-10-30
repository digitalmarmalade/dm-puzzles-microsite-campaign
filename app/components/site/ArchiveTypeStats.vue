<script setup>
import {gameConfig, isCleanSolve} from '@/lib/gameConfig'
import {currentStreakOf, longestStreakOf, personaFor} from '@/lib/personas'
import {variantAttempts, wordPct} from '@/lib/wordStats'
import ArchiveCompletionChart from './ArchiveCompletionChart.vue'

const props = defineProps({
    variant: {type: String, default: ''},
    name: {type: String, default: ''},
})

const {t} = useI18n()

const challenges = useChallengesStore()
const playStatus = usePlayStatusStore()
const auth = useAuthStore()
const features = useFeatures()
const loggedOut = computed(() => features.requireAccount && !auth.user)

const cfg = computed(() => gameConfig(props.variant))

const typeCompletions = computed(() =>
    (challenges.completions ?? []).filter(c => c.variant === props.variant))

const completed = computed(() => {
    if (cfg.value.source !== 'attempts') return typeCompletions.value.length
    const threshold = cfg.value.wordsComplete ?? 0
    const slugs = new Set(typeCompletions.value.map(c => c.slug))
    for (const a of attempts.value) if (wordPct(a) >= threshold) slugs.add(a.slug)
    return slugs.size
})

const times = computed(() =>
    typeCompletions.value.map(c => c.timeSec).filter(v => typeof v === 'number' && !Number.isNaN(v)))
const avgTime = computed(() =>
    times.value.length ? Math.round(times.value.reduce((a, b) => a + b, 0) / times.value.length) : null)
const bestTime = computed(() => (times.value.length ? Math.min(...times.value) : null))

const meanOf = (key) => {
    const vals = typeCompletions.value.map(c => c[key]).filter(v => typeof v === 'number' && !Number.isNaN(v))
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}
const avgChecks = computed(() => meanOf('checksUsed'))
const avgReveals = computed(() => {
    if (cfg.value.source !== 'attempts') return meanOf('cellsRevealed')
    const vals = attempts.value.map(a => a.cellsRevealed).filter(v => typeof v === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
})
const avgMistakes = computed(() => meanOf('wrongAnswers'))
const wins = computed(() => typeCompletions.value.filter(c => c.solved !== false))
const winRate = computed(() => (completed.value ? (wins.value.length / completed.value) * 100 : null))
const guessVals = computed(() =>
    wins.value.map(c => c.guesses).filter(v => typeof v === 'number' && !Number.isNaN(v)))
const avgGuesses = computed(() => (guessVals.value.length ? guessVals.value.reduce((a, b) => a + b, 0) / guessVals.value.length : null))
const bestGuesses = computed(() => (guessVals.value.length ? Math.min(...guessVals.value) : null))

const attempts = computed(() => variantAttempts(props.variant, playStatus.map))
const wordPercents = computed(() => attempts.value.map(wordPct))
const avgWordsPct = computed(() =>
    wordPercents.value.length ? wordPercents.value.reduce((a, b) => a + b, 0) / wordPercents.value.length : null)
const bestWordsPct = computed(() => (wordPercents.value.length ? Math.max(...wordPercents.value) : null))

const cleanSolves = computed(() =>
    typeCompletions.value.filter(c => isCleanSolve(c, cfg.value.clean)).length)

const fmtTime = (s) => (s == null ? '–' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`)
const fmtNum = (v) => (v == null ? '–' : String(Math.round(v * 10) / 10))
const fmtPct = (v) => (v == null ? '–' : `${Math.round(v)}%`)

const STAT_DEFS = computed(() => ({
    completed:      {value: String(completed.value),     label: t('archive.stats.completed')},
    cleanSolves:    {value: String(cleanSolves.value),   label: t('archive.stats.cleanSolves')},
    sharpSolves:    {value: String(cleanSolves.value),   label: t('archive.stats.sharpSolves')},
    currentStreak:  {value: String(currentStreak.value), label: t('archive.stats.currentStreak')},
    longestStreak:  {value: String(longestStreak.value), label: t('archive.stats.longestStreak')},
    avgTime:        {value: fmtTime(avgTime.value),       label: t('archive.stats.averageTime')},
    bestTime:       {value: fmtTime(bestTime.value),      label: t('archive.stats.bestTime')},
    avgChecks:      {value: fmtNum(avgChecks.value),      label: t('archive.stats.averageChecks')},
    avgReveals:     {value: fmtNum(avgReveals.value),     label: t('archive.stats.averageReveals')},
    avgMistakes:    {value: fmtNum(avgMistakes.value),    label: t('archive.stats.averageMistakes')},
    avgWordsFound:  {value: fmtPct(avgWordsPct.value),    label: t('archive.stats.averageWordsFound')},
    bestWordsFound: {value: fmtPct(bestWordsPct.value),   label: t('archive.stats.bestWordsFound')},
    avgScore:       {value: fmtPct(avgWordsPct.value),    label: t('archive.stats.averageScore')},
    bestScore:      {value: fmtPct(bestWordsPct.value),   label: t('archive.stats.bestScore')},
    winRate:        {value: fmtPct(winRate.value),        label: t('archive.stats.winRate')},
    avgGuesses:     {value: fmtNum(avgGuesses.value),     label: t('archive.stats.averageGuesses')},
    bestGuesses:    {value: bestGuesses.value == null ? '–' : String(bestGuesses.value), label: t('archive.stats.bestGuesses')},
}))
const tiles = computed(() => cfg.value.stats.map(k => STAT_DEFS.value[k]).filter(Boolean))

const streakDays = computed(() => cfg.value.source === 'attempts'
    ? [...typeCompletions.value, ...attempts.value.filter(a => wordPct(a) >= (cfg.value.wordsComplete ?? 0)).map(a => ({at: a.playedAt}))]
    : typeCompletions.value)
const longestStreak = computed(() => longestStreakOf(streakDays.value))
const currentStreak = computed(() => currentStreakOf(streakDays.value))
const persona = computed(() => {
    const found = personaFor(typeCompletions.value, cfg.value)
    if (!found) return null
    const {id, params} = found
    return {
        title: t(`archive.stats.persona.${id}.title`),
        desc: t(`archive.stats.persona.${id}.desc`, {...params, ...(params.time != null ? {time: fmtTime(params.time)} : {}), name: props.name}),
    }
})

const distributionReady = computed(() =>
    cfg.value.distribution === 'guesses' && wins.value.some(c => typeof c.guesses === 'number' && c.guesses > 0))

const chartData = computed(() => (cfg.value.source === 'attempts' ? attempts.value : typeCompletions.value))
const chartReady = computed(() =>
    chartData.value.filter(c =>
        [c.timeSec, c.checksUsed, c.cellsRevealed, c.hintsShown, c.wordsFound, c.guesses].some(v => typeof v === 'number')).length >= 2)
</script>

<template>
    <section class="type-stats" :aria-label="t('archive.stats.title', {name})">
        <div class="type-stats__head">
            <h2 class="type-stats__title">{{ t('archive.stats.title', {name}) }}</h2>
            <p v-if="persona && !loggedOut" class="type-stats__persona">
                <span class="type-stats__persona-text">
                    <span class="type-stats__persona-title">{{ persona.title }}</span>
                    <span class="type-stats__persona-desc">{{ persona.desc }}</span>
                </span>
            </p>
        </div>

        <StatsTeaser v-if="loggedOut" compact sign-in />

        <div
            v-else
            class="type-stats__body"
            :class="{'type-stats__body--split': chartReady || distributionReady, 'type-stats__body--three': chartReady && distributionReady}"
        >
            <div class="type-stats__grid">
                <div v-for="tile in tiles" :key="tile.label" class="type-stat">
                    <p class="type-stat__value">{{ tile.value }}</p>
                    <p class="type-stat__label">{{ tile.label }}</p>
                </div>
            </div>

            <GuessDistribution v-if="distributionReady" :completions="typeCompletions" />

            <ArchiveCompletionChart v-if="chartReady" :completions="chartData" :lines="cfg.chart" class="type-stats__chart" />
        </div>
    </section>
</template>

<style scoped>
.type-stats {
    inline-size: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}
.type-stats__head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem 1.6rem;
}
.type-stats__title {
    margin: 0;
}
.type-stats__persona {
    display: inline-flex;
    align-items: center;
    gap: .8rem;
    margin: 0;
    padding: 1rem 2rem;
    background: color-mix(in srgb, var(--puzzle-tile-text) 10%, var(--card-background));
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
}
.type-stats__persona-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}
.type-stats__persona-title {
    font-weight: 700;
    color: var(--text-colour, #212121);
}
.type-stats__persona-desc {
    font-size: 1.2rem;
    color: var(--text-colour-secondary, #777);
}
.type-stats__body {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.2rem;
}
.type-stats__body--split {
    @media (width >= 1024px) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
        gap: 1.5rem;
    }
}
.type-stats__body--three {
    @media (width >= 1024px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}
.type-stats__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}
/*  In the split layout the tiles fill the column so it matches the chart's height.  */
.type-stats__body--split .type-stats__grid {
    @media (width >= 1024px) {
        grid-template-rows: repeat(4, 1fr);
    }
}
.type-stats__body:not(.type-stats__body--split) .type-stats__grid {
    @media (width >= 700px) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}
.type-stat {
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    padding: 1.2rem 1.4rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: .3rem;
    min-inline-size: 0;
}
.type-stat__value {
    margin: 0;
    font-size: 2.6rem;
    font-weight: 700;
    line-height: 1;
    color: var(--text-colour, #212121);
    font-variant-numeric: tabular-nums;
}
.type-stat__label {
    margin: 0;
    font-size: 1.15rem;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;
}
</style>
