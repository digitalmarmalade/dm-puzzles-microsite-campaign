<script setup>
import {themeClass} from '@/lib/utils'

const {t} = useI18n()
const localePath = useLocalePath()
const {tour, tip, nextStep, backStep, finishTour, closeTip, reposition, moving} = useGuide()

const step = computed(() => tour.value.active ? tour.value.steps[tour.value.index] : null)
const isLast = computed(() => tour.value.index >= tour.value.steps.length - 1)
const playable = computed(() => step.value?.id === 'ready' && tour.value.next)
const tipEl = ref(null)

const outlineStyle = computed(() => {
    const r = tour.value.rect
    return {top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`}
})
const tipStyle = computed(() => ['dock', 'centre'].includes(tour.value.placement)
    ? {}
    : {top: `${tour.value.tipTop}px`, left: `${tour.value.tipLeft}px`, '--guide-arrow': `${tour.value.arrow}px`})

const pressStyle = computed(() => tour.value.press
    ? {top: `${tour.value.press.top}px`, left: `${tour.value.press.left}px`}
    : {})
const contextTipStyle = computed(() => tip.value
    ? {top: `${tip.value.top}px`, left: `${tip.value.left}px`, '--guide-tip-arrow': `${tip.value.arrow}px`}
    : {})
const ringStyle = computed(() => {
    const r = tip.value?.rect
    return r ? {top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`} : {}
})

const body = computed(() => {
    if (!step.value) return ''
    if (step.value.id !== 'ready') return t(`guide.tour.${step.value.id}.body`)
    return tour.value.next
        ? t('guide.tour.ready.bodyWith', {name: tour.value.next.variant})
        : t('guide.tour.ready.body')
})

function primary() {
    if (!isLast.value) return nextStep()
    const next = playable.value ? tour.value.next : null
    finishTour(next ? 'play' : 'done')
    if (next) navigateTo(localePath(`/puzzle/${next.slug}`))
}

function onKeydown(e) {
    if (!tour.value.active) {
        if (e.key === 'Escape' && tip.value) closeTip()
        return
    }
    const inTip = e.target?.closest?.('.guide-tour')
    if (e.key === 'Escape') finishTour('end')
    else if (e.key === 'Tab' || (inTip && (e.key === 'Enter' || e.key === ' '))) return
    else if (e.key === 'ArrowRight' || e.key === 'Enter') primary()
    else if (e.key === 'ArrowLeft') backStep()
    else return
    e.preventDefault()
}

watch(() => tour.value.ready, (ready) => {
    if (ready) nextTick(() => tipEl.value?.querySelector('.guide-tour__next')?.focus({preventScroll: true}))
})

let frame = null
function onScroll() {
    if (tour.value.active) return moving()
    if (frame) return
    frame = requestAnimationFrame(() => {
        frame = null
        reposition()
    })
}

onMounted(() => {
    document.addEventListener('keydown', onKeydown, true)
    window.addEventListener('resize', onScroll)
    window.addEventListener('scroll', onScroll, {passive: true})
})
onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown, true)
    window.removeEventListener('resize', onScroll)
    window.removeEventListener('scroll', onScroll)
})
</script>

<template>
    <div
        v-if="tour.active"
        class="guide-tour"
        :class="{'is-ready': tour.ready}"
        role="dialog"
        :aria-label="t('guide.tour.label')"
        @click.stop
    >
        <Transition name="guide-scrim">
            <div v-if="tour.ready && tour.placement === 'centre'" class="guide-tour__scrim" aria-hidden="true"></div>
        </Transition>
        <div v-if="step?.outline && tour.placement !== 'dock'" class="guide-tour__outline" :style="outlineStyle"></div>
        <div v-if="tour.press" class="guide-tour__press" :style="pressStyle" aria-hidden="true"></div>

        <div v-if="step" ref="tipEl" class="guide-tour__tip" :class="`is-${tour.placement}`" :style="tipStyle">
            <div v-if="tour.placement === 'centre'" class="guide-tour__icon" :class="{'guide-tour__icon--puzzle': playable}" aria-hidden="true">
                <span v-if="playable" :class="themeClass(tour.next.variant)">
                    <PuzzleIcon :icon="tour.next.icon" :status="{completed: true}" :show-home-icon="false" />
                </span>
                <Logo v-else />
            </div>
            <p v-else class="guide-tour__count">{{ t('guide.tour.count', {n: tour.index + 1, total: tour.steps.length}) }}</p>
            <h3 class="guide-tour__title">{{ t(`guide.tour.${step.id}.title`) }}</h3>
            <p class="guide-tour__body">{{ body }}</p>

            <div class="guide-tour__nav">
                <button v-if="!isLast" type="button" class="guide-tour__skip" @click="finishTour('end')">
                    {{ t('guide.tour.end') }}
                </button>
                <button v-else-if="playable" type="button" class="guide-tour__skip" @click="finishTour('done')">
                    {{ t('guide.tour.later') }}
                </button>
                <Button size="sm" class-name="guide-tour__next" :icon="isLast && !playable ? null : 'right-arrow'" @click.prevent="primary">
                    <template #text>{{ isLast ? t(playable ? 'guide.tour.play' : 'guide.tour.done') : t('guide.tour.next') }}</template>
                </Button>
            </div>
        </div>
    </div>

    <template v-if="tip">
        <div class="guide-tip__ring" :style="ringStyle" aria-hidden="true"></div>
        <div class="guide-tip" :class="{'is-above': tip.above, 'guide-tip--action': tip.action}" role="status" :style="contextTipStyle" @click.stop>
            <p class="guide-tip__text">{{ tip.text }}</p>
            <button v-if="tip.action" type="button" class="guide-tip__action" @click="tip.action.run(); closeTip()">{{ tip.action.label }}</button>
            <button type="button" class="guide-tip__dismiss" @click="closeTip">{{ tip.action?.dismiss ?? t('guide.tip.dismiss') }}</button>
        </div>
    </template>
</template>

<style scoped>
.guide-tour {
    position: fixed;
    inset: 0;
    z-index: 10000;

    &:not(.is-ready) .guide-tour__tip,
    &:not(.is-ready) .guide-tour__outline {
        opacity: 0;
    }
}

.guide-tour__outline {
    position: fixed;
    border: .2rem solid var(--primary);
    border-radius: 1rem;
    box-shadow: 0 0 0 .4rem color-mix(in srgb, var(--primary) 20%, transparent);
    pointer-events: none;
    transition: opacity .2s ease;

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}

.guide-tour__scrim {
    position: fixed;
    inset: 0;
    background: color-mix(in srgb, #190e25 45%, transparent);
    backdrop-filter: blur(2px);
}

.guide-scrim-enter-active,
.guide-scrim-leave-active {
    transition: opacity .25s ease;

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}

.guide-scrim-enter-from,
.guide-scrim-leave-to {
    opacity: 0;
}

.guide-tour__press {
    position: fixed;
    inline-size: 4.4rem;
    block-size: 4.4rem;
    border: .2rem solid var(--primary);
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary) 35%, transparent);
    pointer-events: none;
    transform: translate(-50%, -50%);
    animation: guide-tour-press .45s ease-out forwards;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.guide-tour__tip {
    --guide-arrow: 0px;
    position: fixed;
    inline-size: min(32rem, 100vw - 3.2rem);
    padding: 1.6rem;
    border: 1px solid var(--card-border);
    border-radius: 1.2rem;
    background: var(--card-background, #fff);
    box-shadow: 0 .8rem 2.4rem rgba(0, 0, 0, .3);
    color: var(--text-colour);
    transform: translateX(-50%);
    transition: opacity .2s ease;

    &::before {
        content: '';
        position: absolute;
        inline-size: 1.4rem;
        block-size: 1.4rem;
        border: inherit;
        background: inherit;
        transform: rotate(45deg);
    }

    &.is-below::before {
        inset-block-start: -.75rem;
        inset-inline-start: clamp(1.6rem, calc(50% + var(--guide-arrow) - .7rem), calc(100% - 3rem));
        border-inline-end: 0;
        border-block-end: 0;
    }

    &.is-above {
        transform: translate(-50%, -100%);

        &::before {
            inset-block-end: -.75rem;
            inset-inline-start: clamp(1.6rem, calc(50% + var(--guide-arrow) - .7rem), calc(100% - 3rem));
            border-inline-start: 0;
            border-block-start: 0;
        }
    }

    &.is-right,
    &.is-left {
        transform: translate(-50%, -50%);
    }

    &.is-right::before {
        inset-inline-start: -.75rem;
        inset-block-start: clamp(1.6rem, calc(50% + var(--guide-arrow) - .7rem), calc(100% - 3rem));
        border-block-start: 0;
        border-inline-end: 0;
    }

    &.is-left::before {
        inset-inline-end: -.75rem;
        inset-block-start: clamp(1.6rem, calc(50% + var(--guide-arrow) - .7rem), calc(100% - 3rem));
        border-block-end: 0;
        border-inline-start: 0;
    }

    &.is-centre::before,
    &.is-dock::before {
        display: none;
    }

    &.is-centre {
        inset-block-start: 50%;
        inset-inline-start: 50%;
        inline-size: min(36rem, 100vw - 3.2rem);
        padding: 3.2rem 2.8rem 2.8rem;
        text-align: center;
        transform: translate(-50%, -50%);
    }

    &.is-dock {
        inset-block-end: calc(1.6rem + env(safe-area-inset-bottom, 0px));
        inset-inline-start: 50%;
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}

.guide-tour__icon {
    --card-icon-size: 9rem;
    display: flex;
    justify-content: center;
    margin-block: 0 2rem;
    color: var(--primary);

    > svg {
        inline-size: 16rem;
        block-size: auto;
    }
}

.guide-tour__count {
    margin: 0 0 .4rem;
    font-size: 1.2rem;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--text-colour-secondary, #777);
}

.guide-tour__title {
    margin: 0 0 .6rem;
    font-size: 1.7rem;
    font-weight: 700;
}

.guide-tour__body {
    margin: 0;
    font-size: 1.6rem;
    line-height: 1.5;
    text-wrap: pretty;
}

.guide-tour__nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.2rem;
    margin-block-start: 1.6rem;

    .is-centre & {
        justify-content: center;
    }
}

.guide-tour__skip {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 1.4rem;
    text-decoration: underline;
    opacity: .75;
    cursor: pointer;

    @media (hover: hover) {
        &:hover {
            opacity: 1;
        }
    }
}

:deep(.guide-tour__next) {
    margin-inline-start: auto;

    .is-centre & {
        margin-inline-start: 0;
    }
}

.guide-tip__ring {
    position: fixed;
    z-index: 9000;
    border-radius: 1rem;
    box-shadow: 0 0 0 .2rem var(--primary);
    pointer-events: none;
    animation: guide-tip-ring 1.6s ease-out infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.guide-tip {
    --guide-tip-arrow: 0px;
    position: fixed;
    z-index: 9000;
    display: flex;
    align-items: center;
    gap: 1.2rem;
    inline-size: max-content;
    max-inline-size: min(28rem, 100vw - 3.2rem);
    padding: 1.2rem 1.4rem;
    border-radius: 1rem;
    background: var(--primary);
    box-shadow: 0 .6rem 2rem rgba(0, 0, 0, .25);
    color: var(--text-on-primary, #fff);
    transform: translateX(-50%);
    animation: guide-tip-in .25s ease;

    &.guide-tip--action {
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: .8rem;

        .guide-tip__text {
            flex: 1 0 100%;
        }
    }

    &::before {
        content: '';
        position: absolute;
        inset-block-start: -.5rem;
        inset-inline-start: calc(50% + var(--guide-tip-arrow) - .6rem);
        inline-size: 1.2rem;
        block-size: 1.2rem;
        background: inherit;
        transform: rotate(45deg);
    }

    &.is-above {
        transform: translate(-50%, -100%);

        &::before {
            inset-block-start: auto;
            inset-block-end: -.5rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.guide-tip__text {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.4;
    text-wrap: pretty;
}

.guide-tip__action {
    flex-shrink: 0;
    padding: .6rem 1.2rem;
    border: 1px solid var(--text-on-primary, #fff);
    border-radius: 999px;
    background: var(--text-on-primary, #fff);
    color: var(--primary);
    font: inherit;
    font-size: 1.2rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
}

.guide-tip__dismiss {
    flex-shrink: 0;
    padding: .6rem 1.2rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 1.2rem;
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;
}

@keyframes guide-tip-ring {
    0% { box-shadow: 0 0 0 .2rem var(--primary), 0 0 0 0 color-mix(in srgb, var(--primary) 50%, transparent); }
    100% { box-shadow: 0 0 0 .2rem var(--primary), 0 0 0 1rem color-mix(in srgb, var(--primary) 0%, transparent); }
}

@keyframes guide-tour-press {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(.4); }
    40% { opacity: 1; transform: translate(-50%, -50%) scale(.9); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(1.4); }
}

@keyframes guide-tip-in {
    from { opacity: 0; translate: 0 -.6rem; }
}
</style>
