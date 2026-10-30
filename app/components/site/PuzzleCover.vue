<script setup>
import Archive from '@/api/Archive.js'
import {gameConfig} from '@/lib/gameConfig'
import {themeClass, slugify} from '@/lib/utils'
import {baseNameOf} from '@/lib/branches'
import {getPuzzleMeta} from '@/composables/puzzle'

const props = defineProps({
    puzzle: {type: Object, required: true},
    icon: {type: String, default: ''},
    theme: {type: String, default: ''},
    status: {type: Object, default: null},
    last: {type: Object, default: null},
    plan: {type: Object, default: null},
})
const emit = defineEmits(['start'])

const {t} = useI18n()
const dateLocale = useDateLocale()
const learning = ref(0)
const familySlug = computed(() => slugify(baseNameOf(props.puzzle.variant ?? '')))
const tutorialSlug = computed(() => getPuzzleMeta(familySlug.value)?.tutorial ? familySlug.value : props.puzzle.type)
const {steps: tutorialSteps} = useTutorial(tutorialSlug)

const date = computed(() => props.puzzle.date
    ? new Date(props.puzzle.date).toLocaleDateString(dateLocale.value, {weekday: 'long', day: 'numeric', month: 'long'})
    : '')

const fmtTime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = String(Math.round(s % 60)).padStart(2, '0')
    return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const COUNT_FIELDS = {guesses: 'guesses', reveals: 'cellsRevealed', checks: 'checksUsed', hints: 'hintsShown', mistakes: 'wrongAnswers'}

const preview = usePreview()
const board = useChallengeBoard()
const auth = useAuthStore()
const features = useFeatures()
const challengeRows = computed(() => features.requireAccount && !auth.user ? [] : board.coverChallenges(props.puzzle).map(card => ({
    key: card.key,
    title: t(card.copy.title, card.copy.params),
    goal: t(card.copy.goal, card.copy.params),
    progress: card.progress,
    left: card.daysLeft > 0 ? t('challenges.daysLeft', {n: card.daysLeft}, card.daysLeft) : t('challenges.endsToday'),
})))
const last = computed(() => props.last ?? (preview.is('cover-last')
    ? {slug: props.puzzle.slug, variant: props.puzzle.variant, timeSec: 312, checksUsed: 2, cellsRevealed: 1, wrongAnswers: 1, guesses: 4, wordsFound: 18, totalWords: 24}
    : null))
const lastName = computed(() => last.value ? Archive.getPuzzles(last.value.slug)?.name ?? last.value.variant : '')
const lastTiles = computed(() => {
    const c = last.value
    if (!c) return []
    return gameConfig(c.variant).chart.flatMap((m) => {
        if (m === 'time') return isNum(c.timeSec) && c.timeSec > 0 ? [{key: m, value: fmtTime(c.timeSec), label: t('archive.stats.time')}] : []
        if (m === 'wordsFound') return isNum(c.wordsFound) && c.totalWords > 0 ? [{key: m, value: `${c.wordsFound}/${c.totalWords}`, label: t('archive.stats.wordsFound')}] : []
        if (m === 'score') return isNum(c.score) && c.maxScore > 0 ? [{key: m, value: `${c.score}/${c.maxScore}`, label: t('archive.stats.score')}] : []
        const field = COUNT_FIELDS[m]
        return field && isNum(c[field]) ? [{key: m, value: String(c[field]), label: t(`archive.stats.${m}`)}] : []
    })
})

const planMessage = computed(() => props.plan?.message ? t(`cover.assist.${props.puzzle.type}.${props.plan.message}`, {name: props.puzzle.variant}) : '')
const secondaryLabel = computed(() => props.plan?.secondary ? t(`cover.assist.${props.puzzle.type}.${props.plan.secondary}`) : '')
</script>

<template>
    <div class="puzzle-cover" :class="themeClass(theme)">
        <section v-if="learning" class="puzzle-cover__card puzzle-cover__card--tutorial" aria-labelledby="puzzle-cover-tutorial-title">
            <button type="button" class="puzzle-cover__close" :aria-label="t('common.close')" @click="learning = 0">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <h1 id="puzzle-cover-tutorial-title" class="puzzle-cover__title">{{ t('tutorial.title', {name: puzzle.variant}) }}</h1>
            <TutorialPlayer
                :key="learning"
                :slug="tutorialSlug"
                :name="puzzle.variant"
                :start="learning"
                :icon="icon"
                single
                surface="cover"
                class="puzzle-cover__tutorial"
            >
                <template #done>
                    <Button size="sm" @click.prevent="learning = 0">
                        <template #text>{{ t('common.close') }}</template>
                    </Button>
                </template>
            </TutorialPlayer>
        </section>

        <div v-else class="puzzle-cover__stack">
            <section class="puzzle-cover__card" aria-labelledby="puzzle-cover-title">
                <PuzzleIcon :icon="icon" :status="status" />
                <div class="puzzle-cover__heading">
                    <h1 id="puzzle-cover-title" class="puzzle-cover__title">{{ puzzle.variant }}</h1>
                    <p class="puzzle-cover__meta">
                        <span v-if="puzzle.number">{{ t('cover.number', {number: puzzle.number}) }}</span>
                        <span v-if="puzzle.number && date" aria-hidden="true"> · </span>
                        <span v-if="date">{{ date }}</span>
                    </p>
                </div>

                <p v-if="planMessage" class="puzzle-cover__plan">{{ planMessage }}</p>

                <div class="puzzle-cover__actions">
                    <Button icon="right-arrow" class-name="puzzle-cover__play" @click.prevent="emit('start', 'primary')">
                        <template #text>
                            <span>{{ t('cover.play') }}</span>
                        </template>
                    </Button>
                    <TextButton v-if="plan?.secondary" colour="primary" @click.prevent="emit('start', 'secondary')">
                        <template #text>
                            <span>{{ secondaryLabel }}</span>
                        </template>
                    </TextButton>
                </div>

                <div v-if="lastTiles.length" class="puzzle-cover__last">
                    <p class="puzzle-cover__kicker">{{ t('cover.lastTimeOf', {name: lastName}) }}</p>
                    <div class="puzzle-cover__tiles">
                        <div v-for="tile in lastTiles" :key="tile.key" class="puzzle-cover__tile">
                            <p class="puzzle-cover__tile-value">{{ tile.value }}</p>
                            <p class="puzzle-cover__tile-label">{{ tile.label }}</p>
                        </div>
                    </div>
                </div>

                <div v-if="challengeRows.length" class="puzzle-cover__challenges">
                    <p class="puzzle-cover__kicker">{{ t('cover.includedIn', challengeRows.length) }}</p>
                    <ul class="puzzle-cover__challenge-list">
                        <li v-for="row in challengeRows" :key="row.key" class="puzzle-cover__challenge">
                            <span class="puzzle-cover__challenge-text">
                                <span class="puzzle-cover__challenge-title">{{ row.title }}</span>
                                <span class="puzzle-cover__challenge-goal">{{ row.goal }}</span>
                            </span>
                            <span class="puzzle-cover__challenge-status">
                                <span class="puzzle-cover__challenge-count">{{ t('challenges.progress', {current: row.progress.current, target: row.progress.target}) }}</span>
                                <span class="puzzle-cover__challenge-left">{{ row.left }}</span>
                            </span>
                        </li>
                    </ul>
                </div>
            </section>

            <section v-if="tutorialSteps" class="puzzle-cover__card puzzle-cover__card--tutorials" aria-labelledby="puzzle-cover-tutorials-title">
                <h2 id="puzzle-cover-tutorials-title" class="puzzle-cover__section-title">{{ t('cover.tutorials') }}</h2>
                <TutorialLessons :slug="tutorialSlug" @pick="learning = $event" />
            </section>
        </div>
    </div>
</template>

<style scoped>
.puzzle-cover {
    --card-icon-size: 9rem;
    flex-grow: 1;
    display: grid;
    place-items: safe center;
    min-block-size: 100dvh;
    padding: 10rem 1.6rem 4rem;
    background: var(--app-bg);
}

.puzzle-cover__stack {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
    inline-size: 100%;
    max-inline-size: 48rem;
}

.puzzle-cover__card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
    inline-size: 100%;
    padding: 3.2rem 2.4rem;
    text-align: center;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    box-shadow: var(--card-shadow);
    animation: puzzle-cover-in .35s ease both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.puzzle-cover__card--tutorials {
    gap: 1.2rem;
    padding: 2.4rem;
    animation-delay: .08s;
}

.puzzle-cover__card--tutorial {
    position: relative;
    max-inline-size: 64rem;
    block-size: calc(100dvh - 12rem);
    min-block-size: 56rem;
    padding: 2.4rem;
    text-align: start;
    align-items: stretch;
}

.puzzle-cover__close {
    position: absolute;
    inset-block-start: 1.2rem;
    inset-inline-end: 1.2rem;
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--text-colour);
    cursor: pointer;
    transition: background .15s ease;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        fill: none;
    }

    &:focus-visible {
        outline: 2px solid var(--focus-colour, currentColor);
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:hover {
            background: rgba(var(--puzzle-tile-shadow), .12);
        }
    }
}

.puzzle-cover__tutorial {
    flex: 1 1 auto;
}

.puzzle-cover__heading {
    display: flex;
    flex-direction: column;
    gap: .4rem;
}

.puzzle-cover__title {
    margin: 0;
    font-size: 2.6rem;
}

.puzzle-cover__section-title {
    margin: 0;
    font-size: var(--page-h3-size, 2rem);
}

.puzzle-cover__meta {
    margin: 0;
    font-size: 1.4rem;
    color: var(--text-colour-secondary, #777);
}

.puzzle-cover__last {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    inline-size: 100%;
    padding: 1.4rem;
    border-radius: var(--border-radius, 10px);
    background: rgba(var(--puzzle-tile-shadow), .12);
}

.puzzle-cover__challenges {
    display: flex;
    flex-direction: column;
    gap: .8rem;
    inline-size: 100%;
}

.puzzle-cover__challenge-list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    background: var(--card-background, #fff);
    list-style: none;
}

.puzzle-cover__challenge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: .8rem 1.2rem;
    text-align: start;

    & + & {
        border-block-start: 1px solid var(--card-border);
    }
}

.puzzle-cover__challenge-text,
.puzzle-cover__challenge-status {
    display: flex;
    flex-direction: column;
    gap: .1rem;
    min-inline-size: 0;
}

.puzzle-cover__challenge-status {
    flex-shrink: 0;
    align-items: flex-end;
    text-align: end;
}

.puzzle-cover__challenge-title {
    font-size: 1.4rem;
    font-weight: 700;
    line-height: 1.2;
}

.puzzle-cover__challenge-goal,
.puzzle-cover__challenge-left {
    color: var(--text-colour-secondary, #777);
    font-size: 1.2rem;
    line-height: 1.3;
}

.puzzle-cover__challenge-count {
    font-size: 1.3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.puzzle-cover__kicker {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08rem;
    color: var(--text-colour);
}

.puzzle-cover__tiles {
    display: grid;
    grid-auto-columns: minmax(0, 1fr);
    grid-auto-flow: column;
    gap: .8rem;

    @media (width < 720px) {
        gap: .6rem;
    }
}

.puzzle-cover__tile {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: .3rem;
    min-inline-size: 0;
    padding: 1.2rem 1rem;
    background: var(--card-background, #fff);

    @media (width < 720px) {
        padding: 1rem .4rem;
    }

    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
}

.puzzle-cover__tile-value {
    margin: 0;
    font-size: 2.4rem;
    font-weight: 700;
    line-height: 1;
    color: var(--text-colour, #212121);
    font-variant-numeric: tabular-nums;

    @media (width < 720px) {
        font-size: 2rem;
    }
}

.puzzle-cover__tile-label {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;

    @media (width < 720px) {
        font-size: 1rem;
    }
}

.puzzle-cover__plan {
    margin: 0;
    max-inline-size: 36rem;
    font-size: 1.5rem;
    line-height: 1.45;
    text-wrap: balance;
}

.puzzle-cover__actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: .8rem;
    inline-size: min(100%, 30rem);
    margin: 0 0 2rem;
}

@keyframes puzzle-cover-in {
    from { opacity: 0; transform: translateY(1rem); }
    to   { opacity: 1; transform: none; }
}
</style>
