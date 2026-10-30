<script setup>
import {themeSlug} from '@/lib/utils'
import {isPuzzleDone} from '@/composables/puzzleProgress'

const {t} = useI18n()
const dateLocale = useDateLocale()

const props = defineProps({
    family:  {type: Object, required: true},
    entries: {type: Array, required: true},
})

const playStatus = usePlayStatusStore()
const challenges = useChallengesStore()
const auth = useAuthStore()
const features = useFeatures()
const modals = useModalStore()
const loggedOut = computed(() => features.requireAccount && !auth.user)

const flipped = ref(false)
const levelsModalId = `family-levels-${props.family.slug}`
const modalOpen = computed(() => modals.isOpen(levelsModalId))

function onActivate(e) {
    if (e?.target?.closest?.('a, button, .fav-heart')) return
    if (import.meta.client && window.matchMedia('(max-width: 719px)').matches) {
        modals.open(levelsModalId)
    } else {
        flipped.value = !flipped.value
    }
}

const puzzleByBranchSlug = computed(() => {
    const m = new Map()
    for (const e of props.entries) m.set(e.branch.slug, e.puzzle)
    return m
})

const rows = computed(() => props.family.branches.map(branch => ({
    branch,
    puzzle: puzzleByBranchSlug.value.get(branch.slug) ?? null,
})))

const dateText = computed(() => {
    const first = props.entries[0]?.puzzle?.date
    if (!first) return ''
    return new Date(first).toLocaleDateString(dateLocale.value, {weekday: 'long', day: 'numeric', month: 'long'})
})

const playableRows = computed(() => rows.value.filter(r => r.puzzle))
const isDone = (row) => isPuzzleDone(row.puzzle.slug, playStatus, challenges.completions ?? [])
const completedCount = computed(() => playableRows.value.filter(isDone).length)
const allDone = computed(() => playableRows.value.length > 0 && completedCount.value === playableRows.value.length)
const showCompletion = computed(() => !loggedOut.value && completedCount.value > 0)

const iconStatus = computed(() => {
    if (loggedOut.value || !playableRows.value.length) return null
    const levels = playableRows.value.map(row => ({done: isDone(row), status: playStatus.statusFor(row.puzzle.slug)}))
    if (!levels.some(l => l.done || l.status?.started)) return null
    const progress = levels.reduce((sum, l) => sum + (l.done ? 100 : l.status?.progress ?? 0), 0) / levels.length
    return {started: true, completed: allDone.value, progress: Math.round(progress)}
})
</script>

<template>
    <div
        class="puzzle-card puzzle-card--family"
        :class="[`puzzle-card--${themeSlug(family.name)}`, {'puzzle-card--flipped': flipped}]"
        role="button"
        :aria-pressed="flipped"
        :aria-label="$t(flipped ? 'home.showFront' : 'home.showLevels', {name: family.name})"
        tabindex="0"
        @click="onActivate"
        @keydown.enter.prevent="onActivate"
        @keydown.space.prevent="onActivate"
    >
        <div class="puzzle-card__inner">
            <div class="puzzle-card__face puzzle-card__face--front">
                <div class="puzzle-card__status">
                    <span class="puzzle-card__level-count">
                        {{ $t('home.levelCount', family.branches.length, {count: family.branches.length}) }}
                    </span>
                </div>
                <div class="puzzle-card__play">
                    <PuzzleIcon :icon="family.slug" :status="iconStatus" :show-home-icon="true" />
                    <div class="content">
                        <h2 class="title" v-text="family.name"></h2>
                        <p class="date">{{ dateText }}</p>
                    </div>
                </div>

                <p
                    v-if="showCompletion"
                    class="family-status"
                    :class="{'family-status--completed': allDone}"
                >
                    <svg v-if="allDone" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                    <span v-else aria-hidden="true">{{ completedCount }}/{{ playableRows.length }}</span>
                    <span class="sr-only">{{ t('home.completedCount', {count: completedCount, total: playableRows.length}) }}</span>
                </p>
            </div>

            <div class="puzzle-card__face puzzle-card__face--back">
                <div class="puzzle-card__play puzzle-card__play--back">
                    <div class="puzzle-card__play--back__icon">
                        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <use :href="sprite(family.slug)"></use>
                        </svg>
                    </div>

                    <FamilyLevels :family="family" :entries="entries" />
                </div>
            </div>
        </div>
    </div>

    <Modal
        :id="levelsModalId"
        size="sm"
        :title="family.name"
        :hide-title="true"
        classes-footer=""
        :classes-modal="`sp-modal family-levels-overlay puzzle-card--${themeSlug(family.name)}`"
    >
        <div v-if="modalOpen" class="family-levels-panel">
            <div class="family-levels-panel__head">
                <div class="family-levels-panel__icon">
                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><use :href="sprite(family.slug)" /></svg>
                </div>
                <p class="family-levels-panel__title">{{ family.name }}</p>
            </div>
            <FamilyLevels :family="family" :entries="entries" />
        </div>
    </Modal>
</template>

<style scoped>
.puzzle-card--family {
    container-type: inline-size;
    container-name: family-card;
    background: transparent;
    border: 0;
    box-shadow: none;
    perspective: 1000px;
    cursor: pointer;

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 4px;
        border-radius: var(--border-radius, 10px);
    }

    @media (hover: hover) {
        &:hover {
            transform: none;
        }
    }
}

.puzzle-card__inner {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 22rem;
    transform-style: preserve-3d;
    transition: transform .5s ease;
}
.puzzle-card--flipped .puzzle-card__inner {
    transform: rotateY(180deg);
}

.puzzle-card__face {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background-color: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    box-shadow: var(--card-shadow);
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    overflow: hidden;
    align-items: center;
    justify-content: center;
}
.puzzle-card__face--front {

    --shadow-1: var(--card-background);
    --shadow-2: var(--text-colour);

    &::before {
        position: absolute;
        inset: 0;
        content: '';
        display: block;
        border-radius: var(--border-radius);
        pointer-events: none;
        box-shadow: inset 0 -1px 0 var(--shadow-2), inset 0 -2px 0 var(--shadow-1), inset 0 -3px 0  var(--shadow-2), inset 0 -4px 0 var(--shadow-1), inset 0 -5px 0  var(--shadow-2);
        opacity: .3;
    }
    &::after {
        position: absolute;
        inset: 1rem 1rem 1.5rem 1rem;
        border: 1px solid rgba(var(--puzzle-tile-shadow),.5);
        content: '';
        display: block;
        border-radius: var(--border-radius-inner);
        pointer-events: none;
        outline: 1px solid rgba(var(--puzzle-tile-shadow),.5);
        outline-offset: -.5rem;
    }
}
.puzzle-card__face--back {
    transform: rotateY(180deg);
    background-color: color-mix(rgba(var(--puzzle-tile-shadow),1) 8%, var(--card-background));

    &::after {
        position: absolute;
        inset: 1rem 1rem 1rem 1rem;
        border: 1px dotted rgba(var(--puzzle-tile-shadow),1);
        content: '';
        display: block;
        border-radius: var(--border-radius-inner);
        pointer-events: none;
    }

    @container family-card (width < 260px) {
        &::after { display: none; }
        & .puzzle-icon-holder { display: none; }
        & > .puzzle-card__play--back > .title { display: none; }
    }
}

.puzzle-card__level-count {
    margin-inline-start: auto;
    font-size: 1.1rem;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;
}

.puzzle-card__play {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    text-align: center;
    text-decoration: none;
    color: inherit;
    inline-size: 100%;

    .puzzle-card__face--front & {
        padding: 1.5rem 2.4rem 3rem;
        text-wrap: balance;
    }
}

.puzzle-card__play--back {
    align-items: center;
    flex-grow: 1;
    padding: 1rem;
    gap: 0;

    @container family-card (width < 260px) {
        padding: 1rem;
        justify-content: center;
    }
}

.puzzle-card__play--back__icon {
    flex-grow: 1;
    display: flex;
    justify-content: center;
    align-items: center;
        > svg {
        inline-size: 6rem;
        block-size: 6rem;
        color: var(--puzzle-tile-text);
    }

    @container family-card (width < 260px) {
        display: none;
    }
}

.puzzle-card__status {
    @container family-card (width < 260px) {
        margin: 1rem 0 -.5rem;
    }
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

.date {
    color: var(--text-colour-secondary);
    font-size: var(--card-date-size, 1.3rem);
    line-height: 1.2;
    margin: 0;
}

.family-status {
    position: absolute;
    inset-inline-start: 2.5rem;
    inset-block-start: 2.5rem;
    display: inline-flex;
    align-items: center;
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: .1rem;
    border: 1px solid var(--puzzle-tile-text, --text-colour);
    background-color: var(--card-background);
    border-radius: 2rem;
    padding: 0 .8rem;
    color: var(--puzzle-tile-text, --text-colour);
    block-size: 2.4rem;
    font-variant-numeric: tabular-nums;

    @container family-card (width < 260px) {
        transform: scale(.8);
        inset-inline-start: 2rem;
        inset-block-start: 2rem;
        transform-origin: top left;
    }

    > svg {
        inline-size: 1.4rem;
        block-size: 1.4rem;
        color: var(--card-background);
    }
}
.family-status--completed {
    background-color: var(--puzzle-tile-text);
    border-color: var(--puzzle-tile-text);
    color: var(--text-colour);
}

</style>


<style>
.family-levels-overlay .sp-modal__dialog {
    background-color: color-mix(rgba(var(--puzzle-tile-shadow),1) 8%, var(--card-background));
    border: 1px solid var(--card-border);
    padding: 2rem 1.5rem;
    gap: 1.5rem;
    overflow: hidden;
    
    &::after {
        content: '';
        position: absolute;
        inset: 2rem 1.5rem;
        border: 1px dotted rgba(var(--puzzle-tile-shadow),1);
        border-radius: var(--border-radius-inner);
        pointer-events: none;
    }
}
.family-levels-overlay .sp-modal__close {
    inset-inline-end: 2rem;
    inset-block-start: 2rem;
}
.family-levels-overlay .family-levels-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 2rem 0 0;
}
.family-levels-overlay .family-levels-panel__head {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .8rem;
}
.family-levels-overlay .family-levels-panel__icon > svg {
    inline-size: 6rem;
    block-size: 6rem;
    color: var(--puzzle-tile-text);
}
.family-levels-overlay .family-levels-panel__title {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 1.8rem;
    font-weight: 700;
    text-align: center;
}
</style>
