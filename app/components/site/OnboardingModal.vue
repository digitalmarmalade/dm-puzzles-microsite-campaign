<script setup>
import Archive from '@/api/Archive.js'
import {themeClass, branchLabel} from '@/lib/utils'

const {t} = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const modals = useModalStore()
const preferences = usePreferencesStore()
const features = useFeatures()
const auth = useAuthStore()
const {startTour} = useGuide()
const preview = usePreview()


const slides = computed(() => {
    const list = ['daily', 'pick', 'streak', 'profile']
    if (features.requireAccount && !auth.user) list.push('free')
    return list
})
const STREAK_DAYS = 7
const favourites = useFavouritesStore()
const hidden = useHiddenVariantsStore()

function toggleFavourite(slug) {
    if (hidden.isHidden(slug)) hidden.toggle(slug)
    favourites.toggle(slug)
}

function toggleHidden(slug) {
    if (!hidden.isHidden(slug) && favourites.isFavourite(slug)) favourites.toggle(slug)
    hidden.toggle(slug)
}
const TUTORIAL_MODAL_ID = 'guide-tutorial'
const picks = Archive.getVariantFamilies()
    .flatMap(family => family.branches.map(branch => ({
        family,
        branch,
        label: branchLabel(family, branch),
        tutorial: getPuzzleMeta(family.slug)?.tutorial ? family.slug : null,
    })))
    .sort((x, y) => x.label.localeCompare(y.label))
const pickFilters = usePuzzleFilters(Archive.getVariantFamilies())
const pickFilter = pickFilters.active
const visiblePicks = computed(() => picks.filter(item => pickFilters.matches(item.family.slug)))
const trying = ref(null)

function tryPuzzle(item) {
    trying.value = item
    modals.open(TUTORIAL_MODAL_ID)
}
const slide = ref(0)
const isLast = computed(() => slide.value >= slides.value.length - 1)

let openedAt = 0
let finished = false

function params() {
    return {
        step: slides.value[slide.value],
        step_index: slide.value,
        steps_total: slides.value.length,
        seconds: Math.round((Date.now() - openedAt) / 1000),
    }
}

function goTo(index) {
    slide.value = Math.max(0, Math.min(slides.value.length - 1, index))
}

function finish(outcome) {
    finished = true
    trackFunnel('sp_tour_complete', {...params(), outcome})
    preferences.set('onboardingCompleted', true)
    preview.hide('welcome')
    closeOnboarding()
}

async function showAround() {
    finish('tour')
    if (route.name && !String(route.name).startsWith('index')) await navigateTo(localePath('/'))
    setTimeout(() => startTour('slides'), 350)
}

let swipe = null
function swipeStart(e) {
    swipe = {x: e.clientX, y: e.clientY}
}
function swipeEnd(e) {
    if (!swipe || e.type === 'pointercancel') {
        swipe = null
        return
    }
    const dx = e.clientX - swipe.x
    const dy = e.clientY - swipe.y
    swipe = null
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goTo(slide.value + (dx < 0 ? 1 : -1))
}

function onKeydown(e) {
    if (!modals.isOpen(ONBOARDING_MODAL_ID) || modals.isOpen(TUTORIAL_MODAL_ID)) return
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    goTo(slide.value + (e.key === 'ArrowRight' ? 1 : -1))
    e.preventDefault()
}

if (import.meta.client) {
    window.__showOnboarding = (step) => {
        slide.value = typeof step === 'number' ? Math.max(0, step - 1) : 0
        openOnboarding()
    }
    window.__hideOnboarding = () => closeOnboarding()
    window.__startTour = () => startTour('console')
    const query = new URLSearchParams(window.location.search)
    const raw = query.get('showOnboarding')
    if (raw != null) {
        const step = Number(raw)
        onMounted(() => window.__showOnboarding(Number.isFinite(step) && step > 0 ? step : undefined))
    }
    if (query.get('showTour') != null) onMounted(() => setTimeout(() => startTour('preview'), 1200))

    watch(() => modals.isOpen(ONBOARDING_MODAL_ID), (open, wasOpen) => {
        if (open) {
            openedAt = Date.now()
            finished = false
        } else if (wasOpen && !finished) {
            trackFunnel('sp_tour_skip', params())
        }
        if (!open) slide.value = 0
        document.documentElement.style.overflow = open ? 'hidden' : ''
    })
    onMounted(() => document.addEventListener('keydown', onKeydown))
    onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
}
</script>

<template>
    <Modal :id="ONBOARDING_MODAL_ID" :fullscreen="true" :hide-title="true" :title="t('guide.slides.title')">
        <div class="guide-slides">
            <div class="guide-slides__dots">
                <button
                    v-for="(key, i) in slides"
                    :key="key"
                    type="button"
                    class="guide-slides__dot"
                    :aria-current="i === slide ? 'step' : undefined"
                    :aria-label="t('guide.slides.goTo', {n: i + 1})"
                    @click="goTo(i)"
                ></button>
            </div>

            <div class="guide-slides__track" @pointerdown="swipeStart" @pointerup="swipeEnd" @pointercancel="swipeEnd">
                <section
                    v-for="(key, i) in slides"
                    :key="key"
                    class="guide-slides__slide"
                    :class="[`guide-slides__slide--${key}`, {'is-current': i === slide, 'is-before': i < slide}]"
                    :aria-hidden="i === slide ? undefined : 'true'"
                >
                    <template v-if="i === slide">
                        <div class="guide-slides__visual" :aria-hidden="key === 'pick' ? undefined : 'true'">
                            <template v-if="key === 'daily'">
                                <OnboardingIconRain class="guide-slides__rain" :count="50" layout="grid" />
                                <Logo class="guide-slides__logo" />
                            </template>

                            <div v-else-if="key === 'pick'" class="guide-slides__pick-area">
                                <PillFilter
                                    v-model="pickFilter"
                                    class="guide-slides__pick-filter"
                                    :options="pickFilters.options.value"
                                    :aria-label="t('home.filterByType')"
                                />
                                <ul class="guide-slides__picks">
                                    <li
                                        v-for="item in visiblePicks"
                                        :key="item.branch.slug"
                                        class="guide-slides__pick"
                                        :class="[themeClass(item.family.name), {'is-on': favourites.isFavourite(item.branch.slug), 'is-hidden': hidden.isHidden(item.branch.slug)}]"
                                    >
                                        <button
                                            type="button"
                                            class="guide-slides__pick-toggle"
                                            :aria-pressed="favourites.isFavourite(item.branch.slug)"
                                            @click="toggleFavourite(item.branch.slug)"
                                        >
                                            <svg class="guide-slides__pick-heart" aria-hidden="true"><use :href="sprite('heart')" /></svg>
                                            <PuzzleIcon :icon="item.family.slug" :status="{completed: true}" :show-home-icon="false" />
                                            <span class="guide-slides__pick-name">{{ item.label }}</span>
                                        </button>
                                        <button
                                            type="button"
                                            class="guide-slides__pick-hide"
                                            :aria-pressed="hidden.isHidden(item.branch.slug)"
                                            :aria-label="t(hidden.isHidden(item.branch.slug) ? 'home.unhideVariant' : 'home.hideVariant')"
                                            :title="t(hidden.isHidden(item.branch.slug) ? 'home.unhideVariant' : 'home.hideVariant')"
                                            @click="toggleHidden(item.branch.slug)"
                                        >
                                            <VisibilityIcon :hidden="hidden.isHidden(item.branch.slug)" />
                                        </button>
                                        <button v-if="item.tutorial" type="button" class="guide-slides__pick-try" @click="tryPuzzle(item)">
                                            <span>{{ t('guide.slides.tryIt') }}</span>
                                            <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            <div v-else-if="key === 'streak'" class="guide-slides__streak">
                                <p class="guide-slides__flame">
                                    <svg viewBox="0 0 24 24"><use :href="sprite('streak')" /></svg>
                                    <span class="guide-slides__flame-count"><CountUp :value="STREAK_DAYS" :duration="1800" /></span>
                                </p>
                                <ol class="guide-slides__days">
                                    <li v-for="n in STREAK_DAYS" :key="n" :style="{'--i': n}"></li>
                                </ol>
                            </div>

                            <div v-else-if="key === 'profile'" class="guide-slides__profile theme--sudoku">
                                <p class="guide-slides__profile-label">{{ t('profile.label') }}</p>
                                <div class="puzzle-icon-holder" aria-hidden="true">
                                    <div class="puzzle-icon">
                                        <img class="guide-slides__profile-icon" src="/img/profiles/logicBuff.svg" alt="">
                                    </div>
                                </div>
                                <p class="guide-slides__profile-title">{{ t('profile.logicBuff.title') }}</p>
                                <p class="guide-slides__profile-sub">{{ t('profile.logicBuff.subtitle', {v1: 'Sudoku', v2: 'Train Tracks'}) }}</p>
                            </div>

                            <div v-else class="guide-slides__free">
                                <svg viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M10 8.5v7l6-3.5z" />
                                </svg>
                                {{ t('auth.bannerFreeTitle') }}
                            </div>
                        </div>

                        <h2 class="guide-slides__title">{{ t(`guide.slides.${key}.title`) }}</h2>
                        <p class="guide-slides__text" aria-live="polite">{{ t(`guide.slides.${key}.text`) }}</p>
                    </template>
                </section>
            </div>
        </div>

        <template #footer>
            <div class="guide-slides__footer">
                <button v-if="slide > 0" type="button" class="guide-slides__back" @click="goTo(slide - 1)">
                    <svg aria-hidden="true" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" /></svg>
                    <span class="guide-slides__back-label">{{ t('guide.slides.back') }}</span>
                </button>
                <span v-else></span>

                <div class="guide-slides__actions">
                    <button v-if="isLast" type="button" class="guide-slides__close" @click="finish('close')">
                        {{ t('guide.slides.close') }}
                    </button>
                    <Button icon="right-arrow" @click.prevent="isLast ? showAround() : goTo(slide + 1)">
                        <template #text>{{ isLast ? t('guide.slides.tour') : t('guide.slides.next') }}</template>
                    </Button>
                </div>
            </div>
        </template>
    </Modal>

    <Modal :id="TUTORIAL_MODAL_ID" :title="t('guide.slides.tryIt')" classes-footer="" :fullscreen-mobile="true">
        <template #title>{{ trying?.family.name ?? '' }}</template>
        <div v-if="trying" class="guide-slides__tutorial" :class="themeClass(trying.family.name)">
            <TutorialPractice :key="trying.tutorial" :slug="trying.tutorial" :name="trying.family.name" :icon="trying.family.slug" surface="tour" class="guide-slides__tutorial-player" />
        </div>
    </Modal>
</template>

<style scoped>
.guide-slides {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 2rem;
    min-block-size: 0;
    inline-size: 100%;
    overflow: clip visible;
    text-align: center;
}

.guide-slides__dots {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: center;
    gap: .8rem;
    padding-block-start: .4rem;
}

.guide-slides__dot {
    position: relative;
    inline-size: .9rem;
    block-size: .9rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: color-mix(in srgb, var(--text-colour) 20%, transparent);
    cursor: pointer;
    transition: background .2s ease, inline-size .2s ease;

    &::after {
        content: '';
        position: absolute;
        inset: -.8rem;
    }

    &[aria-current] {
        inline-size: 2.4rem;
        border-radius: 999px;
        background: var(--primary);
    }
}

.guide-slides__track {
    display: grid;
    grid-template-rows: minmax(0, 1fr);
    flex: 1 1 auto;
    min-block-size: 0;
    touch-action: pan-y;
    user-select: none;
}

.guide-slides__slide {
    grid-area: 1 / 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.4rem;
    padding-inline: clamp(2.4rem, 6vw, 4rem);
    opacity: 0;
    visibility: hidden;
    transform: translateX(3rem);
    transition: opacity .2s ease, transform .2s ease, visibility .2s;

    &.is-before {
        transform: translateX(-3rem);
    }

    &.is-current {
        opacity: 1;
        visibility: visible;
        transform: none;
    }

    &.guide-slides__slide--pick {
        justify-content: safe center;
        padding-block: 1rem 2rem;
        overflow-y: auto;
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}

.guide-slides__visual {
    position: relative;

    .guide-slides__slide--pick & {
        order: 1;
        min-block-size: 0;
        margin-block: 1.2rem 0;
    }

    display: grid;
    place-items: center;
    inline-size: 100%;
    min-block-size: 20rem;
    margin-block-end: 1rem;

    .guide-slides__slide--daily & {
        min-block-size: 0;
    }
}

.guide-slides__rain {
    inset-block-end: calc(100% + 2rem);
}

.guide-slides__logo {
    inline-size: 24rem;
    block-size: auto;
    color: var(--primary);
    animation: guide-slide-up .5s .5s both cubic-bezier(.2, .7, .2, 1);

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.guide-slides__pick-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    inline-size: min(100%, 80rem);
}

.guide-slides__pick-area .guide-slides__pick-filter {
    margin: 0 0 1.6rem;
}

.guide-slides__picks {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 1rem;
    inline-size: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
    animation: guide-slide-up .5s .2s both cubic-bezier(.2, .7, .2, 1);

    @media (width < 480px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.guide-slides__pick {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 1rem);
    background: var(--card-background, #fff);
    box-shadow: var(--card-shadow);
    transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;

    &.is-on {
        border-color: var(--primary);
        box-shadow: 0 0 0 1px var(--primary), var(--card-shadow);
    }

    &.is-hidden {
        box-shadow: none;
        background: color-mix(in srgb, var(--card-background, #fff) 60%, transparent);
    }

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem);
            box-shadow: var(--card-shadow-hover);
        }
    }
}

.guide-slides__pick-toggle {
    --card-icon-size: 8rem;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    gap: .8rem;
    padding: 1.8rem 1rem 1.4rem;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    transition: opacity .15s ease, filter .15s ease;

    .is-hidden & {
        opacity: .4;
        filter: grayscale(1);
    }

    &:focus-visible {
        outline: 2px solid var(--focus-colour, var(--primary));
        outline-offset: -4px;
        border-radius: var(--border-radius, 1rem);
    }

    @media (width < 480px) {
        --card-icon-size: 7rem;
    }
}

.guide-slides__pick-try {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    padding: .9rem 1rem;
    border: 0;
    border-block-start: 1px solid var(--card-border);
    background: none;
    color: var(--text-colour-secondary, #777);
    font: inherit;
    font-size: 1.2rem;
    font-weight: 600;
    letter-spacing: .1rem;
    text-transform: uppercase;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
        fill: currentColor;
    }

    &:focus-visible {
        outline: 2px solid var(--focus-colour, var(--primary));
        outline-offset: -2px;
    }

    @media (hover: hover) {
        &:hover {
            background: rgba(var(--puzzle-tile-shadow), .08);
            color: var(--text-colour);
        }
    }
}

.guide-slides__tutorial {
    display: flex;
    flex-direction: column;
    block-size: 70rem;
    max-block-size: calc(100dvh - 12rem);
}

.guide-slides__tutorial-player {
    flex: 1 1 auto;
    min-block-size: 0;
}

.guide-slides__pick-heart {
    position: absolute;
    inset-block-start: .9rem;
    inset-inline-end: .9rem;
    inline-size: 2rem;
    block-size: 2rem;
    fill: none;
    stroke: color-mix(in srgb, var(--text-colour) 35%, transparent);
    stroke-width: 2;
    transition: fill .15s ease, stroke .15s ease, transform .2s cubic-bezier(.34, 1.56, .64, 1);

    .is-on & {
        fill: var(--primary);
        stroke: var(--primary);
        transform: scale(1.15);
    }
}

.guide-slides__pick-hide {
    position: absolute;
    inset-block-start: .5rem;
    inset-inline-start: .5rem;
    z-index: 1;
    display: grid;
    place-items: center;
    inline-size: 2.8rem;
    block-size: 2.8rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    color: color-mix(in srgb, var(--text-colour) 35%, transparent);
    cursor: pointer;
    transition: color .15s ease, transform .15s ease;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
    }

    .is-hidden & {
        color: var(--text-colour);
    }

    &:focus-visible {
        outline: 2px solid var(--focus-colour, var(--primary));
        outline-offset: 0;
    }

    @media (hover: hover) {
        &:hover {
            color: var(--text-colour);
            transform: scale(1.08);
        }
    }
}

.guide-slides__pick-name {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    text-wrap: balance;
}

.guide-slides__streak {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
}

.guide-slides__flame {
    position: relative;
    display: grid;
    place-items: center;
    margin: 0;
    color: var(--primary);

    svg {
        inline-size: 11rem;
        block-size: 11rem;
        filter: drop-shadow(0 .8rem 1.6rem color-mix(in srgb, var(--primary) 40%, transparent));
    }
}

.guide-slides__flame-count {
    position: absolute;
    inset-block-end: -1rem;
    inset-inline-end: -2rem;
    display: grid;
    place-items: center;
    min-inline-size: 5rem;
    block-size: 5rem;
    padding-inline: 1rem;
    border: .3rem solid var(--app-bg);
    border-radius: 999px;
    background: var(--primary);
    color: var(--text-on-primary, #fff);
    font-size: 2.6rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
}

.guide-slides__days {
    display: flex;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
        position: relative;
        inline-size: 2.6rem;
        block-size: 2.6rem;
        border: 2px solid color-mix(in srgb, var(--text-colour) 20%, transparent);
        border-radius: 50%;
        animation: guide-day-on .35s calc(var(--i) * .22s) both cubic-bezier(.34, 1.56, .64, 1);

        &:not(:first-child)::before {
            content: '';
            position: absolute;
            inset-block-start: 50%;
            inset-inline-end: calc(100% + 2px);
            inline-size: 1rem;
            block-size: .4rem;
            background: var(--primary);
            transform: translateY(-50%) scaleX(0);
            transform-origin: left;
            animation: guide-day-link .2s calc(var(--i) * .22s - .1s) both ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
            animation: none;
            border-color: var(--primary);
            background: var(--primary);

            &::before {
                animation: none;
                transform: translateY(-50%);
            }
        }
    }
}

.guide-slides__profile {
    --card-icon-size: 8rem;
    --card-svg-size: 6rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .8rem;
    inline-size: min(100%, 28rem);
    padding: 1.4rem 1.6rem 2rem;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    background: var(--card-background, #fff);
    box-shadow: var(--card-shadow);
    animation: guide-slide-up .5s both cubic-bezier(.2, .7, .2, 1);

    :deep(.puzzle-icon-holder) {
        flex: none;
        background: transparent;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.guide-slides__profile-label {
    align-self: flex-start;
    margin: 0;
    font-size: 1.15rem;
    letter-spacing: .05rem;
    text-transform: uppercase;
    color: var(--text-colour-secondary, #777);
}

.guide-slides__profile-icon {
    display: block;
    inline-size: var(--card-svg-size);
    block-size: var(--card-svg-size);
    object-fit: contain;
}

.guide-slides__profile-title {
    margin: .6rem 0 0;
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.2;
}

.guide-slides__profile-sub {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.3;
    color: var(--text-colour-secondary, #777);
    text-wrap: balance;
}

.guide-slides__free {
    display: inline-flex;
    align-items: center;
    gap: .8rem;
    padding: 1rem 2rem 1rem 1.6rem;
    border: 1px solid color-mix(in srgb, var(--primary) 35%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--primary) 16%, var(--card-background, #fff));
    color: color-mix(in srgb, var(--primary) 75%, var(--text-colour, #212121));
    font-size: 1.8rem;
    font-weight: 800;
    animation: guide-slide-up .5s both cubic-bezier(.2, .7, .2, 1);

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }

    svg {
        inline-size: 2.4rem;
        block-size: 2.4rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
}

.guide-slides__title {
    margin: 0;
    font-size: 2.6rem;
    line-height: 1.2;
    text-wrap: balance;
    animation: guide-slide-up .5s .15s both cubic-bezier(.2, .7, .2, 1);

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.guide-slides__text {
    margin: 0;
    max-inline-size: 48rem;
    font-size: 1.8rem;
    line-height: 1.5;
    text-wrap: balance;
    animation: guide-slide-up .5s .22s both cubic-bezier(.2, .7, .2, 1);

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.guide-slides__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.2rem;
    inline-size: 100%;
    padding-inline: var(--fs-inset-inline-start, 2rem) var(--fs-inset-inline-end, 2rem);
}

.guide-slides__actions {
    display: flex;
    align-items: center;
    gap: .4rem;
    min-inline-size: 0;
}

.guide-slides__back-label {
    @media (width < 480px) {
        position: absolute;
        inline-size: 1px;
        block-size: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }
}

.guide-slides__back,
.guide-slides__close {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    padding: .8rem 1.2rem;
    border: 0;
    background: transparent;
    color: var(--text-colour);
    font: inherit;
    font-size: 1.4rem;
    opacity: .7;
    cursor: pointer;

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    @media (hover: hover) {
        &:hover {
            opacity: 1;
        }
    }
}

@keyframes guide-slide-up {
    from { opacity: 0; transform: translateY(1.4rem); }
    to { opacity: 1; transform: none; }
}

@keyframes guide-day-on {
    from { transform: scale(.4); }
    to { transform: scale(1); border-color: var(--primary); background: var(--primary); }
}

@keyframes guide-day-link {
    to { transform: translateY(-50%) scaleX(1); }
}

</style>
