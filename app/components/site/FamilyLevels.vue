<script setup>
const {t} = useI18n()

const props = defineProps({
    family:  {type: Object, required: true},
    entries: {type: Array, required: true},
})

const playStatus = usePlayStatusStore()
const challenges = useChallengesStore()
const auth = useAuthStore()
const features = useFeatures()
const loggedOut = computed(() => features.requireAccount && !auth.user)

const branchStreak = (puzzle) => challenges.variantDayStreak(puzzle.variant)

const puzzleByBranchSlug = computed(() => {
    const m = new Map()
    for (const e of props.entries) m.set(e.branch.slug, e.puzzle)
    return m
})

const rows = computed(() => props.family.branches.map(branch => ({
    branch,
    puzzle: puzzleByBranchSlug.value.get(branch.slug) ?? null,
})))

const rowStatus = (puzzle) => {
    const s = playStatus.statusFor(puzzle.slug)
    if (s?.completed) return {key: 'completed', text: t('puzzle.statusCompleted')}
    if (s?.started) {
        const p = s.progress
        if (typeof p === 'number' && p > 0) return {key: 'inProgress', text: t('puzzle.statusInProgress', {percent: p}), percent: p}
        return {key: 'inProgress', text: t('puzzle.statusStarted')}
    }
    return {key: 'notStarted', text: t('puzzle.statusNotStarted')}
}
</script>

<template>
    <ul class="puzzle-card__branches">
        <li
            v-for="row in rows"
            :key="row.branch.slug"
            class="puzzle-card__branch"
            :class="[
                row.puzzle ? `puzzle-card__branch--${rowStatus(row.puzzle).key}` : 'puzzle-card__branch--absent',
            ]"
        >
            <FavouriteHeart :slug="row.branch.slug" />
            <NuxtLinkLocale
                v-if="row.puzzle"
                :to="`/puzzle/${row.puzzle.slug}`"
                class="puzzle-card__branch-link"
                @click.stop
            >
                <span class="puzzle-card__branch-label">{{ row.branch.label ?? family.name }}</span>
                <span class="puzzle-card__branch-meta">
                    <span class="puzzle-card__branch-status">
                        <svg v-if="loggedOut" class="status__lock" aria-hidden="true"><use :href="sprite('padlock')" /></svg>
                        <svg v-else-if="rowStatus(row.puzzle).key === 'completed'" class="status__tick" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                        <span v-else-if="rowStatus(row.puzzle).percent" class="status__percent">{{ rowStatus(row.puzzle).percent }}%</span>
                        <span v-else-if="rowStatus(row.puzzle).key === 'inProgress'" class="status__dot">·</span>
                    </span>
                    <span
                        v-if="!loggedOut && rowStatus(row.puzzle).key === 'completed' && branchStreak(row.puzzle) >= 2"
                        class="branch-streak"
                        aria-hidden="true"
                    >
                        <svg class="branch-streak__icon"><use :href="sprite('streak')" /></svg>
                        <span>{{ branchStreak(row.puzzle) }}</span>
                    </span>
                </span>
                <span class="sr-only">{{ rowStatus(row.puzzle).text }}</span>
            </NuxtLinkLocale>
            <span
                v-else
                class="puzzle-card__branch-link puzzle-card__branch-link--absent"
            >
                <span class="puzzle-card__branch-label">{{ row.branch.label ?? family.name }}</span>
            </span>
            <NuxtLinkLocale
                :to="`/puzzles/${row.branch.slug}`"
                class="puzzle-card__branch-archive"
                @click.stop
            >
                <span>{{ $t('home.archive') }}</span>
                <svg aria-hidden="true"><use :href="sprite('right-arrow')"/></svg>
            </NuxtLinkLocale>
        </li>
    </ul>
</template>

<style scoped>
.puzzle-card__branches {
    list-style: none;
    padding: 0;
    inline-size: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;

    @container family-card (width < 260px) {
        gap: 1rem;
        margin: 0;
        flex-grow: 1;
    }
}

.puzzle-card__branch {
    display: flex;
    gap: .5rem;
    padding: 1rem 1rem 1rem .5rem;
    border-block-start: 1px dotted rgba(var(--puzzle-tile-shadow),1);

    & .fav-heart {
        position: relative;
        inset: auto;
        margin: 0;
        flex: none;
        grid-column: 1;
        grid-row: 1;
        align-self: center;

        @container family-card (width < 260px) {
            position: absolute;
            inset: 0 0 auto auto;
            z-index: 1;
        }
    }

    @container family-card (width < 260px) {
        position: relative;
        display: flex;
        flex-direction: column;
        flex: 1;
        padding-block: 0;
        column-gap: 0;
        row-gap: 0;
        justify-content: center;
        background-color: var(--card-background);
        border: 1px solid color-mix(rgba(var(--puzzle-tile-shadow), 1) 30%, var(--card-background));
        border-radius: var(--border-radius-inner);
    }

    @media (hover: hover) {
        &:hover {
            background-color: rgba(var(--puzzle-tile-shadow), .1);
        }
    }
}

.puzzle-card__branch-link {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .6rem;
    text-decoration: none;
    color: var(--text-colour, #212121);
    font-size: 1.5rem;
    font-weight: 600;
    text-align: start;

    &:focus-visible {
        color: var(--text-colour);
    }

    @media (hover: hover) {
        &:hover {
            color: var(--text-colour);
        }
    }

    @container family-card (width < 260px) {
        flex: 1;
        padding: 0;
        justify-content: center;
        text-align: center;
    }
}

.puzzle-card__branch-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 2.2rem;
    block-size: 2.2rem;
    padding-inline: .4rem;
    color: var(--puzzle-tile-text, var(--text-colour-secondary));

    & .status__tick {
        inline-size: 1.4rem;
        block-size: 1.4rem;
    }
    & .status__lock {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        color: var(--text-colour-secondary, #777);
    }
    & .status__percent {
        font-size: 1.1rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: .02rem;
        padding: 0 .6rem;
        border: 1px solid currentColor;
        border-radius: 2rem;
        line-height: 1.8rem;
    }

    @container family-card (width < 260px) {
        position: absolute;
        inset: .5rem auto auto .5rem;
    }
}

.puzzle-card__branch--completed .puzzle-card__branch-status {
    background: var(--puzzle-tile-text);
    color: var(--card-background);
    border-radius: 50%;
    padding-inline: 0;
}

.puzzle-card__branch--absent .puzzle-card__branch-link {
    color: var(--text-colour-secondary, #777);
    justify-content: flex-start;

    @container family-card (width < 260px) {
        justify-content: center;
    }
}

.puzzle-card__branch-archive {
    grid-column: 2;
    grid-row: 2;
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    padding: .3rem .8rem;
    border: 1px solid var(--card-border);
    border-radius: 999px;
    background: transparent;
    color: var(--text-colour-secondary, #777);
    font-size: 1.05rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .05rem;
    text-decoration: none;
    transition: all .15s ease;

    & svg {
        inline-size: 1rem;
        block-size: 1rem;
    }

    &:focus-visible {
        background-color: rgba(var(--puzzle-tile-shadow), .1);
    }

    @media (hover: hover) {
        &:hover {
            background-color: rgba(var(--puzzle-tile-shadow), .1);
        }
    }

    @container family-card (width < 260px) {
        justify-self: stretch;
        display: flex;
        justify-content: center;
        gap: .6rem;
        padding: 1rem;
        border: 0;
        border-block-start: 1px solid rgba(var(--puzzle-tile-shadow),.4);
        border-radius: 0;
        font-size: 1.2rem;
        letter-spacing: .1rem;

        & svg {
            inline-size: 1.2rem;
            block-size: 1.2rem;
        }

        &:focus-visible {
            background-color: rgba(var(--puzzle-tile-shadow), 0.1);
            border-color: rgba(var(--puzzle-tile-shadow),.4);
        }

        @media (hover: hover) {
            &:hover {
                background-color: rgba(var(--puzzle-tile-shadow), 0.1);
                border-color: rgba(var(--puzzle-tile-shadow),.4);
            }
        }
    }
}

.branch-streak {
    margin-inline-start: -1rem;
    display: inline-flex;
    align-items: center;
    gap: .2rem;
    color: var(--puzzle-tile-text);
    font-size: 1.3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    background: color-mix(in srgb, var(--puzzle-tile-text) 14%, transparent);
    border-radius: 0 2rem 2rem 0;
    padding: .1rem .5rem .1rem 1.5rem;
}
.branch-streak__icon {
    margin-block-start: -.2rem;
    inline-size: 1.4rem;
    block-size: 1.4rem;
}
</style>
