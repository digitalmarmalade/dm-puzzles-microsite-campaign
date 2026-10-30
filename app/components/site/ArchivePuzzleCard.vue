<script setup>
import {themeSlug} from '@/lib/utils'
import {gameConfig} from '@/lib/gameConfig'
import {variantLook} from '@/lib/variantLook'

const {locale, t} = useI18n()
const dateLocale = useDateLocale()
const props = defineProps({
    puzzle: {type: Object, default: null},
    theme: {type: String, default: ''},
})

const variant = computed(() => props.puzzle?.variant)
const slug = computed(() => props.puzzle?.slug)
const icon = computed(() => variantLook(variant.value).icon ?? props.puzzle?.icon)
const date = computed(() => props.puzzle?.date)

const {status, progress, hasPercent, wordsPct, completed, wordsPartial, iconStatus, resultLabelKey} = usePuzzleProgress(variant, slug)

const challenges = useChallengesStore()
const guessResult = computed(() => {
    if (!status.value?.completed || gameConfig(variant.value).cardResult !== 'guesses') return null
    const latest = (challenges.completions ?? [])
        .filter(c => c.slug === slug.value)
        .sort((a, b) => new Date(b.at) - new Date(a.at))[0]
    if (!latest) return null
    if (latest.solved === false) return {lost: true}
    return typeof latest.guesses === 'number' ? {guesses: latest.guesses} : null
})


const auth = useAuthStore()
const features = useFeatures()
const loggedOut = computed(() => features.requireAccount && !auth.user)


const dayNumber = computed(() =>
    new Date(date.value).toLocaleDateString(dateLocale.value, {day: 'numeric'}))

const dateText = computed(() =>
    new Date(date.value).toLocaleDateString(dateLocale.value, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}))

const statusKey = computed(() => {
    if (completed.value) return 'completed'
    if (status.value?.started) return 'inProgress'
    return 'notStarted'
})
const statusText = computed(() => {
    if (loggedOut.value) return t('auth.locked')
    if (statusKey.value === 'completed') {
        if (guessResult.value?.lost) return `${t('puzzle.statusCompleted')}, ${t('archive.stats.notSolved')}`
        if (guessResult.value) return `${t('puzzle.statusCompleted')}, ${t('archive.stats.guesses')}: ${guessResult.value.guesses}`
        if (wordsPct.value !== null) return `${t('puzzle.statusCompleted')}, ${t(resultLabelKey.value)}: ${wordsPct.value}%`
        return t('puzzle.statusCompleted')
    }
    if (statusKey.value === 'inProgress') {
        return hasPercent.value
            ? t('puzzle.statusInProgress', {percent: progress.value})
            : t('puzzle.statusStarted')
    }
    return t('puzzle.statusNotStarted')
})
</script>

<template>
    <div class="puzzle-card puzzle-card--archive"
        :class="[(props.theme || variant) ? 'puzzle-card--' + themeSlug(props.theme || variant) : '', {'puzzle-card--completed': completed}]"
    >
        <NuxtLinkLocale class="puzzle-card__play" :to="`/puzzle/${slug}`">
            <PuzzleIcon :icon="icon" :status="iconStatus" :show-home-icon="false">

                <p class="date" aria-hidden="true" v-text="dayNumber"></p>

                <p v-if="loggedOut" class="archive-status status status--locked" aria-hidden="true">
                    <svg class="status__lock" aria-hidden="true"><use :href="sprite('padlock')" /></svg>
                </p>
                <p v-else-if="status?.started"
                    class="archive-status status"
                    :class="`status--${wordsPartial ? 'inProgress' : statusKey}`"
                    aria-hidden="true"
                >
                    <svg v-if="completed && guessResult?.lost" class="status__cross" aria-hidden="true"><use :href="sprite('close')" /></svg>
                    <span v-else-if="completed && guessResult" class="status__guesses">{{ guessResult.guesses }}</span>
                    <span v-else-if="wordsPartial">{{ wordsPct }}%</span>
                    <svg v-else-if="completed" class="status__tick" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                    <span v-else-if="wordsPct !== null">{{ wordsPct }}%</span>
                    <span v-else-if="hasPercent">{{ progress }}%</span>
                    <span v-else>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <title>{{ $t('puzzle.statusStarted') }}</title>
                            <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="2"/>
                            <path d="M7 11C7.52529 11 8.04543 10.8965 8.53073 10.6955C9.01604 10.4945 9.45699 10.1999 9.82843 9.82843C10.1999 9.45699 10.4945 9.01604 10.6955 8.53073C10.8965 8.04543 11 7.52529 11 7C11 6.47471 10.8965 5.95457 10.6955 5.46927C10.4945 4.98396 10.1999 4.54301 9.82843 4.17157C9.45699 3.80014 9.01604 3.5055 8.53073 3.30448C8.04543 3.10346 7.52529 3 7 3L7 7L7 11Z" fill="currentColor"/>
                        </svg>
                    </span>
                </p>

                <span class="sr-only">{{ variant }}, {{ dateText }} — {{ statusText }}</span>
            </PuzzleIcon>
        </NuxtLinkLocale>
    </div>
</template>

<style scoped>
.puzzle-card {

    --card-icon-size: 8rem;
    --card-svg-size: 40%;

    display: flex;
    flex-direction: column;
    position: relative;
    transition: all .25s ease;
    inline-size: var(--card-icon-size);
    block-size: var(--card-icon-size);
    margin: 0 auto;
}

.puzzle-card__play {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    text-align: center;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
}

.date {
    color: var(--text-colour-secondary);
    font-size: 2.6rem;
    line-height: 1;
    margin: 0;
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
}

.puzzle-card--completed .date {
    inset-block-start: .5rem;
    inset-inline-start: .7rem;
    transform: none;
    font-size: 1.6rem;
}

.archive-status {
    position: absolute;
    inset-block-start: .2rem;
    inset-inline-end: .2rem;
    z-index: 2;

    &.status--completed {
        inset-inline-end: .2rem;
        inset-block-start: .2rem;
        inline-size: 2rem;
        block-size: 2rem;
    }
}

.status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1rem;
    color: var(--puzzle-tile-text, --text-colour);
    block-size: 1.8rem;
}

.status__tick {
    inline-size: 1.2rem;
    block-size: 1.2rem;
    color: var(--card-background);
}

.status__cross {
    inline-size: 1rem;
    block-size: 1rem;
    color: var(--card-background);
}

.status__guesses {
    font-size: 1.2rem;
    letter-spacing: 0;
    line-height: 1;
    color: var(--card-background);
    font-variant-numeric: tabular-nums;
}

.status--completed {
    background-color: var(--puzzle-tile-text);
    border-color: var(--puzzle-tile-text);
    padding: 0;
    border-radius: 50%;
}

.status--locked {
    block-size: auto;
    color: var(--text-colour-secondary);
}

.status__lock {
    inline-size: 1.7rem;
    block-size: 1.7rem;
}
.puzzle-card--archive :deep(.puzzle-icon-holder) {
    transition: background-color .2s ease, border-color .2s ease;
}

.puzzle-card--archive:focus-within :deep(.puzzle-icon-holder) {
    background-color: rgba(var(--puzzle-tile-shadow), .08);
    
}

.puzzle-card--archive:hover :deep(.puzzle-icon-holder) {
    @media (hover: hover) {
        background-color: rgba(var(--puzzle-tile-shadow), .08);
    }
}

.puzzle-card--archive:focus-within .date {
    color: var(--text-colour);
}

.puzzle-card--archive:hover .date {
    @media (hover: hover) {
        color: var(--text-colour);
    }
}

.puzzle-card--archive :deep(.puzzle-icon-holder__rotor) {
    transition: transform .25s ease;
    transform-origin: 15% 15%;
}

.puzzle-card--archive.puzzle-card--completed:focus-within :deep(.puzzle-icon-holder__rotor) {
    transform: rotate(-15deg);
}

.puzzle-card--archive.puzzle-card--completed:hover :deep(.puzzle-icon-holder__rotor) {
    @media (hover: hover) {
        transform: rotate(-15deg);
    }
}

.puzzle-card--archive.puzzle-card--completed:focus-within :deep(.puzzle-icon) {
    transform: none;
}

.puzzle-card--archive.puzzle-card--completed:hover :deep(.puzzle-icon) {
    @media (hover: hover) {
        transform: none;
    }
}

</style>
