<script setup>
import {themeSlug} from '@/lib/utils'

const {t} = useI18n()
const dateLocale = useDateLocale()
const props = defineProps({
    puzzle: {type: Object, default: null},

    showArchive: {type: Boolean, default: false},
    showFavourite: {type: Boolean, default: true},
    slim: {type: Boolean, default: false},
    titleOverride: {type: String, default: ''},
    archiveSlugOverride: {type: String, default: ''},
    favouriteSlugOverride: {type: String, default: ''},
    iconOverride: {type: String, default: ''},
    themeOverride: {type: String, default: ''},
    badge: {type: Object, default: null},   //  {key: 'mostPlayed'|'streak'|'lastTime', count?: number}
    reason: {type: String, default: ''},
    favourited: {type: Boolean, default: false},
})

const variant = computed(() => props.puzzle?.variant)
const slug = computed(() => props.puzzle?.slug)
const icon = computed(() => props.iconOverride || props.puzzle?.icon)
const date = computed(() => props.puzzle?.date)
const displayTitle = computed(() => props.titleOverride || variant.value)
const themeName = computed(() => props.themeOverride || variant.value)
const archiveSlug = computed(() => props.archiveSlugOverride || props.puzzle?.icon)
const favouriteSlug = computed(() => props.favouriteSlugOverride || props.puzzle?.icon)

const {status, progress, hasPercent, wordsPct, completed, wordsPartial, iconStatus, resultLabelKey} = usePuzzleProgress(variant, slug)

const challenges = useChallengesStore()
const variantStreak = computed(() => challenges.variantDayStreak(variant.value))

const auth = useAuthStore()
const features = useFeatures()
const loggedOut = computed(() => features.requireAccount && !auth.user)

const freePlay = useFreePlayStore()
//  Locked only once the free puzzle is spent — and never on the one they can resume.
const locked = computed(() =>
    loggedOut.value && !freePlay.available && freePlay.claimedSlug !== slug.value)

const statusKey = computed(() => {
    if (completed.value) return 'completed'
    if (status.value?.started) return 'inProgress'
    return 'notStarted'
})
const statusText = computed(() => {
    if (locked.value) return t('auth.locked')
    if (statusKey.value === 'completed') {
        return wordsPct.value !== null ? `${t('puzzle.statusCompleted')}, ${t(resultLabelKey.value)}: ${wordsPct.value}%` : t('puzzle.statusCompleted')
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
    <div class="puzzle-card"
        :class="[themeName ? 'puzzle-card--' + themeSlug(themeName) : '', {'puzzle-card--slim': slim}]"
    >
        <p v-if="reason" class="puzzle-card__reason">{{ reason }}</p>

        <div class="puzzle-card__status">
            <p v-if="locked" class="status status--locked">
                <svg class="status__lock" aria-hidden="true"><use :href="sprite('padlock')" /></svg>
                <span class="sr-only">{{ statusText }}</span>
            </p>
            <p v-else-if="status?.started" class="status" :class="`status--${wordsPartial ? 'inProgress' : statusKey}`">
                <span v-if="wordsPartial" aria-hidden="true">{{ wordsPct }}%</span>
                <svg v-else-if="completed" class="status__tick" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                <span v-else-if="wordsPct !== null" aria-hidden="true">{{ wordsPct }}%</span>
                <span v-else-if="hasPercent" aria-hidden="true">{{ progress }}%</span>
                <span v-else class="status__dots" aria-hidden="true">{{ $t('puzzle.statusStarted') }}</span>
                <span class="sr-only">{{ statusText }}</span>
            </p>
            <span
                v-if="completed && !loggedOut && variantStreak >= 2"
                class="puzzle-card__streak"
                :aria-label="`${variantStreak} ${t('streak.dayCount', variantStreak)}`"
            >
                <svg class="puzzle-card__streak-icon" aria-hidden="true"><use :href="sprite('streak')" /></svg>
                <span class="puzzle-card__streak-count">{{ variantStreak }}</span>
            </span>
            <FavouriteHeart v-if="showFavourite" :slug="favouriteSlug" :on="favourited" />
        </div>
        
        <NuxtLinkLocale class="puzzle-card__play" :to="`/puzzle/${slug}`">
            <PuzzleIcon :icon="icon" :status="locked ? null : iconStatus" />

            <div class="content">
                <h2 class="title" v-text="displayTitle"></h2>
                

                <span
                    v-if="badge?.key && !completed && !loggedOut && !hasPercent"
                    class="puzzle-card__badge"
                    :class="{'puzzle-card__badge--streak': badge.key === 'streak'}"
                    aria-hidden="true"
                >
                    <template v-if="badge.key === 'streak'">
                        <svg class="puzzle-card__badge-icon"><use :href="sprite('streak')" /></svg>{{ badge.count ?? 0 }}
                    </template>
                    <template v-else>{{ $t(`home.badges.${badge.key}`, {count: badge.count ?? 0}) }}</template>
                </span>
                <p class="date"
                    v-if="!slim"
                    v-text="(new Date(date)).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })"
                ></p>
            </div>
        </NuxtLinkLocale>
        
        <NuxtLinkLocale v-if="showArchive" class="puzzle-card__archive" :to="`/puzzles/${archiveSlug}`">
            <span>{{ $t('home.viewArchive') }}</span>
            <svg aria-hidden="true"><use :href="sprite('right-arrow')"/></svg>
        </NuxtLinkLocale>
    </div>
</template>

<style scoped>
.puzzle-card {
    container-type: inline-size;
    container-name: puzzle-card;
    background-color: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    position: relative;
    block-size: 100%;
    transition: all .25s ease;
    max-inline-size: 100%;

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem);
            box-shadow: var(--card-shadow-hover);
        }
    }
}

.puzzle-card__play {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--card-gap, 1rem);
    padding: var(--puzzle-card-padding, 1.5rem);
    text-align: center;
    text-decoration: none;
    color: inherit;
    cursor: pointer;

}

.puzzle-card__archive {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    padding: 1.2rem;
    border-block-start: 1px solid var(--card-border);

    font-size: var(--card-archive-size, 1.2rem);

    text-transform: uppercase;
    letter-spacing: 1px;
    text-decoration: none;
    transition: background .15s ease;
    
    border-end-start-radius: var(--border-radius, 10px);
    border-end-end-radius: var(--border-radius, 10px);

    @media (hover: hover) {
        &:hover {
            background-color: rgba(var(--puzzle-tile-shadow), 0.1);
        }
    }

    
}

.puzzle-card__archive svg {
    inline-size: 1.2rem;
    block-size: 1.2rem;
}

.puzzle-card__status {
    display: flex;
    padding: var(--card-status-padding);
    justify-content: space-between;
    align-items: center;
    min-block-size: 4.4rem;
    overflow: hidden;
    gap: 0rem;
}

.puzzle-card__badge {
    position: absolute;
    inset-block-start: calc(var(--card-status-padding) + .4rem);
    inset-inline-start: 0;
    pointer-events: none;
    padding: .3rem .7rem;
    background: rgba(var(--puzzle-tile-shadow), .1);
    border-radius: 0 1rem 1rem 0;
    font-size: 1.3rem;
    text-transform: uppercase;
    letter-spacing: .08rem;
    line-height: 1.2;
    color: var(--puzzle-tile-text);

    @container puzzle-card (width >= 240px) {

        font-size: 1.2rem;
        padding: .5rem 1rem;
        inset-block-start: calc(var(--card-status-padding) + .6rem);
        inset-inline-start: var(--card-status-padding);
        border-radius: 2rem;
    }
}
.puzzle-card--slim .puzzle-card__badge {
    inset-block-start: calc(var(--card-status-padding) + 4.2rem);
}
.puzzle-card__badge--streak {
    display: inline-flex;
    align-items: center;
    gap: .3rem;
}
.puzzle-card__badge-icon {
    inline-size: 1.4em;
    block-size: 1.4em;
    margin-block-start: -.1em;
}

.status {
    display: inline-flex;
    align-items: center;
    font-size: 1.2rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1rem;
    border: 1px solid var(--puzzle-tile-text, --text-colour);
    background-color: var(--card-background);
    border-radius: 2rem;
    padding: 0 .8rem;
    color: var(--puzzle-tile-text, --text-colour);
    block-size: 2.4rem;
    z-index: 1;
}

.status__tick {
    inline-size: 1.4rem;
    block-size: 1.4rem;
    color: var(--card-background);
}
.status--completed {
    background-color: var(--puzzle-tile-text);
    border-color: var(--puzzle-tile-text);
    color: var(--text-colour);
}

.status--locked {
    border: none;
    background: none;
    padding: 0;
    block-size: auto;
    color: var(--text-colour-secondary, #777);
}

.status__lock {
    inline-size: 2rem;
    block-size: 2rem;
}

.puzzle-card__streak {
    display: inline-flex;
    align-items: center;
    gap: .3rem;
    margin-inline-end: auto;
    margin-inline-start: -1rem;
    padding: 0 .8rem 0 1.6rem;
    block-size: 2.4rem;
    border-radius: 0 2rem 2rem 0;
    background: color-mix(in srgb, var(--puzzle-tile-text) 14%, transparent);
    color: var(--puzzle-tile-text);
    font-size: 1.4rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}
.puzzle-card__streak-icon {
    inline-size: 1.5rem;
    block-size: 1.5rem;
    margin-block-start: -.2rem;
}


.content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
}

.title {
    font-family: var(--font-sans);
    font-size: var(--card-title-size, 1.8rem);
    font-weight: 700;
}

.puzzle-card__reason {
    padding: .6rem 1rem;
    background: rgba(var(--puzzle-tile-shadow), .1);

    color: var(--text-colour);
    font-size: 1.3rem;
    line-height: 1.1;
    margin: 0;
    text-wrap: balance;
    text-align: center;
    
    min-block-size: 3.8rem;
    display: flex;
    justify-content: center;
    align-items: center;
}

.date {
    color: var(--text-colour-secondary);
    font-size: var(--card-date-size, 1.3rem);
    line-height: 1.2;
    margin: 0;
}

.puzzle-card .fav-heart {
    position: relative;
    margin: 0 0 0 auto;
}

.puzzle-card--slim {

    --card-status-padding: .5rem;
    --card-icon-size: 7rem;
    --puzzle-card-padding: 0 1.5rem 2rem;
    --card-archive-size: 1.1rem;

    :is(.puzzle-icon-holder) {
        flex: 0 0 auto;
    }

    :is(.title) {
        font-size: 1.6rem;
    }

    > .puzzle-card__status {
        min-block-size: unset;
        padding-block-end: 0;
    }

    > .puzzle-card__play {
        gap: 1rem;
    }

    > .puzzle-card__archive {
        padding: 1rem 1.2rem;
        display: none;
    }

}


</style>
