<script setup>
import {themeClass} from '@/lib/utils'

const props = defineProps({
    board: {type: Object, required: true},
})

const {t} = useI18n()
const modals = useModalStore()
const preferences = usePreferencesStore()
const toast = useToastStore()
const {showTip} = useGuide()
const preview = usePreview()

const QUICK_CANCELS = 3
const QUICK_WINDOW_MS = 60000
let cancels = []
function cancelled() {
    const now = Date.now()
    cancels = [...cancels.filter(at => now - at < QUICK_WINDOW_MS), now]
    if (cancels.length < QUICK_CANCELS) return
    cancels = []
    setTimeout(() => showTip('challengesOff', t('challenges.offTip'), {
        label: t('challenges.offAction'),
        dismiss: t('challenges.offKeep'),
        run: () => {
            if (!preview.is('challenges')) preferences.set('showChallenges', false)
            toast.add({message: t('challenges.offToast')})
            trackFunnel('sp_challenges_off', {surface: 'tip'})
        },
    }), 350)
}
const skip = (entry) => {
    props.board.skip(entry)
    cancelled()
}
const leave = (entry) => {
    props.board.leave(entry)
    cancelled()
}
const PUZZLES_MODAL_ID = 'modal-challenge-puzzles'
const playing = ref(null)
const openPuzzles = (card) => {
    playing.value = card
    modals.open(PUZZLES_MODAL_ID)
}

const cards = computed(() => props.board.cards.value)
const index = ref(0)
const current = computed(() => cards.value[Math.min(index.value, cards.value.length - 1)])

watch(() => cards.value.length, (n) => {
    if (index.value >= n) index.value = Math.max(0, n - 1)
})

const SWIPE_PX = 30

const track = ref(null)
const slideHeight = ref(0)
let ro = null
watch(track, (el) => {
    ro?.disconnect()
    if (!el) return
    ro = new ResizeObserver(() => {
        slideHeight.value = el.offsetHeight / Math.max(1, cards.value.length)
    })
    ro.observe(el)
})
onBeforeUnmount(() => ro?.disconnect())

const goTo = (i) => {
    index.value = Math.max(0, Math.min(cards.value.length - 1, i))
}

let startY = null
const onPointerDown = (e) => {
    startY = e.clientY
}
const onPointerUp = (e) => {
    if (startY === null) return
    const dy = e.clientY - startY
    startY = null
    if (Math.abs(dy) > SWIPE_PX) goTo(index.value + (dy < 0 ? 1 : -1))
}

const WHEEL_PX = 30
const WHEEL_GESTURE_MS = 200
let wheelDelta = 0
let wheelLocked = false
let wheelTimer = null
const onWheel = (e) => {
    if (cards.value.length < 2 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
    const target = index.value + (e.deltaY > 0 ? 1 : -1)
    if (!wheelLocked && (target < 0 || target >= cards.value.length)) return
    e.preventDefault()
    clearTimeout(wheelTimer)
    wheelTimer = setTimeout(() => {
        wheelLocked = false
        wheelDelta = 0
    }, WHEEL_GESTURE_MS)
    if (wheelLocked) return
    wheelDelta += e.deltaY
    if (Math.abs(wheelDelta) < WHEEL_PX) return
    goTo(target)
    wheelLocked = true
    wheelDelta = 0
}
onBeforeUnmount(() => clearTimeout(wheelTimer))

const kicker = (card) => {
    if (card.state === 'suggested') return t('challenges.suggested')
    if (card.state === 'complete') return t('challenges.complete')
    if (card.state === 'expired') return t('challenges.expired')
    return card.daysLeft > 0 ? t('challenges.daysLeft', {n: card.daysLeft}, card.daysLeft) : t('challenges.endsToday')
}
</script>

<template>
    <section
        v-if="cards.length"
        class="home-highlight challenge-panel"
        data-guide="challenges"
        :class="`challenge-panel--${current.state}`"
        :aria-label="t('challenges.aria')"
        @wheel="onWheel"
    >
        <AmbientField v-if="current.state === 'complete'" pattern="confetti" fade="none" :intensity="1.4" :interactive="false" />

        <div class="home-highlight__header challenge-panel__header">
            <h2>{{ kicker(current) }}</h2>
            <button v-if="current.state === 'active'" type="button" class="challenge-panel__leave" @click="leave(current.entry)">{{ t('challenges.leave') }}</button>
            <button v-else-if="current.state === 'suggested'" type="button" class="challenge-panel__close" :aria-label="t('challenges.notNow')" :title="t('challenges.notNow')" @click="skip(current.entry)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            <button v-else type="button" class="challenge-panel__close" :aria-label="t('challenges.dismiss')" :title="t('challenges.dismiss')" @click="board.dismiss(current.entry)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <div class="challenge-panel__body">
            <div
                class="challenge-panel__viewport"
                :style="{blockSize: slideHeight ? `${slideHeight}px` : null}"
                @pointerdown="onPointerDown"
                @pointerup="onPointerUp"
                @pointercancel="startY = null"
            >
                <div ref="track" class="challenge-panel__track" :style="{'--index': index, '--count': cards.length}">
                    <ChallengeCard
                        v-for="card in cards"
                        :key="card.key"
                        :card="card"
                        :board="board"
                        class="challenge-panel__slide"
                        :class="card.look ? [themeClass(card.look.theme), 'challenge-panel__slide--puzzle'] : ''"
                        :inert="card !== current"
                        @play="openPuzzles"
                    />
                </div>
            </div>

            <div v-if="cards.length > 1" class="challenge-panel__dots" role="tablist" :aria-label="t('challenges.aria')">
                <button
                    v-for="(card, i) in cards"
                    :key="card.key"
                    type="button"
                    role="tab"
                    class="challenge-panel__dot"
                    :class="{'challenge-panel__dot--active': i === index}"
                    :aria-selected="i === index"
                    :aria-label="t(card.copy.title, card.copy.params)"
                    @click="goTo(i)"
                />
            </div>
        </div>

        <Teleport to="body">
            <ChallengePuzzlesModal :card="playing" :board="board" :modal-id="PUZZLES_MODAL_ID" />
        </Teleport>
    </section>
</template>

<style scoped>
.challenge-panel {
    --accent: var(--primary);
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    transition: background .3s ease, color .3s ease;

    &.challenge-panel--complete {
        border-color: var(--primary);
        background:
            radial-gradient(rgba(255, 255, 255, .16) 1px, transparent 1.6px) 0 0 / 1.2rem 1.2rem,
            linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 82%, #000));
        color: #fff;
    }
}

.challenge-panel__header {
    position: relative;
    z-index: 1;
    justify-content: space-between;

    .challenge-panel--complete & h2 {
        font-weight: 700;
    }
}

.challenge-panel__body {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1;
    align-items: center;
    gap: 1.2rem;
}

.challenge-panel__viewport {
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
    touch-action: pan-x;
    transition: block-size .3s ease;
}

.challenge-panel__track {
    display: grid;
    grid-auto-rows: 1fr;
    transform: translateY(calc(var(--index) * -100% / var(--count)));
    transition: transform .4s cubic-bezier(.3, .7, .3, 1);

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}

.challenge-panel__slide {
    align-self: center;
    min-block-size: 100%;
}

.challenge-panel__slide--puzzle {
    --accent: rgb(var(--puzzle-tile-shadow));
}

.challenge-panel__dots {
    display: flex;
    flex-direction: column;
    gap: .6rem;
}

.challenge-panel__dot {
    inline-size: .7rem;
    block-size: .7rem;
    padding: 0;
    border: 0;
    border-radius: .4rem;
    background: rgba(var(--text-rgb), .18);
    cursor: pointer;
    transition: background .15s ease, transform .15s ease;

    .challenge-panel--complete & {
        background: rgba(255, 255, 255, .45);
    }

    &.challenge-panel__dot--active {
        background: rgba(var(--text-rgb), .8);
        transform: scale(1.15);

        .challenge-panel--complete & {
            background: #fff;
        }
    }
}

.challenge-panel__leave {
    padding: .4rem 0;
    border: 0;
    background: none;
    color: var(--text-colour-secondary, #666);
    font: inherit;
    font-size: 1.2rem;
    white-space: nowrap;
    text-decoration: underline;
    text-underline-offset: .2em;
    cursor: pointer;

    @media (hover: hover) {
        &:hover {
            color: var(--text-colour);
        }
    }
}

.challenge-panel__close {
    display: grid;
    place-items: center;
    inline-size: 2.8rem;
    block-size: 2.8rem;
    margin-inline-end: -.6rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--text-colour);
    cursor: pointer;

    .challenge-panel--complete & {
        color: #fff;
    }

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        fill: none;
    }

    @media (hover: hover) {
        &:hover {
            background: rgba(var(--text-rgb), .08);
        }
    }
}
</style>
