<script setup>
import {PuzzleChannel} from '@/lib/puzzleChannel'

const props = defineProps({
    slug: {type: String, required: true},
    name: {type: String, default: ''},
    surface: {type: String, default: ''},
    start: {type: Number, default: 1},
    single: {type: Boolean, default: false},
    icon: {type: String, default: ''},
})
const emit = defineEmits(['complete', 'done'])

const {t, te} = useI18n()
const {steps, frameSrc} = useTutorial(() => props.slug)
const preferences = usePreferencesStore()

const step = ref(props.start)
const solved = ref([])
const missed = ref([])
const briefed = ref([])
const frame = ref(null)
const brief = ref(null)
const result = ref(null)

const FRAME_EVENTS = ['tutorialready', 'puzzleready', 'puzzlestart', 'puzzleprogress', 'puzzlecomplete', 'puzzlereset', 'puzzleshare']
let channel = null
const releaseWindowChannel = claimWindowChannel()

const briefKey = computed(() => `tutorial.brief.${props.slug}.${step.value}`)
const briefOpen = computed(() => te(`${briefKey.value}.title`) && !briefed.value.includes(step.value))

const src = computed(() => frameSrc(step.value))
const isSolved = computed(() => solved.value.includes(step.value))
const isLast = computed(() => props.single || step.value >= steps.value)
const resultMessage = computed(() => {
    if (props.single) return t(missed.value.includes(step.value) ? 'tutorial.singleMissed' : 'tutorial.singleSolved')
    if (!isLast.value) return t(missed.value.includes(step.value) ? 'tutorial.missed' : 'tutorial.solved')
    return t(missed.value.length || solved.value.length < steps.value ? 'tutorial.practiceDone' : 'tutorial.allDone')
})

function trackParams() {
    return {variant: props.slug, step: step.value, surface: props.surface}
}

function onTutorialEvent(type, payload) {
    if (type === 'tutorialstart') trackFunnel('sp_tutorial_start', trackParams())
    if (type !== 'tutorialcomplete' || isSolved.value) return
    solved.value = [...solved.value, step.value]
    if (payload?.solved === false) missed.value = [...missed.value, step.value]
    trackFunnel('sp_tutorial_complete', {...trackParams(), solved: !missed.value.includes(step.value)})
    const done = preferences.tutorialsDone[props.slug] ?? []
    if (!done.includes(step.value)) preferences.set('tutorialsDone', {...preferences.tutorialsDone, [props.slug]: [...done, step.value].sort()})
    emit('complete', step.value)
    if (isLast.value) emit('done')
}

function onMessage(e) {
    if (!frame.value || e.source !== frame.value.contentWindow) return
    if (e.data?.type) onTutorialEvent(e.data.type, e.data.payload)
}

function closeChannel() {
    channel?.dispose()
    channel = null
}

function openChannel(el) {
    closeChannel()
    if (!el?.contentWindow) return
    channel = new PuzzleChannel(el.contentWindow, new URL(src.value, window.location.href).origin, {events: {bubble: true, forward: false}})
    channel.on('tutorialstart', message => onTutorialEvent('tutorialstart', message?.content))
    channel.on('tutorialcomplete', message => onTutorialEvent('tutorialcomplete', message?.content))
    for (const name of FRAME_EVENTS) channel.on(name, () => {})
}

const label = computed(() => {
    if (!props.single) return t('tutorial.step', {step: step.value, steps: steps.value})
    const params = {step: step.value, steps: steps.value}
    return te(`${briefKey.value}.title`)
        ? t('tutorial.stepNamed', {...params, name: t(`${briefKey.value}.title`)})
        : t('tutorial.stepOf', params)
})

function focusResult() {
    result.value?.querySelector('button')?.focus()
}

function focusBrief() {
    requestAnimationFrame(() => requestAnimationFrame(() => brief.value?.querySelector('button')?.focus()))
}

function closeBrief() {
    briefed.value = [...briefed.value, step.value]
    nextTick(() => {
        frame.value?.focus({preventScroll: true})
        try {
            frame.value?.contentWindow?.focus()
        } catch {}
    })
}

function onFrameLoad() {
    if (briefOpen.value) focusBrief()
}

watch(briefOpen, (open) => open && focusBrief(), {immediate: true})

watch(frame, openChannel, {flush: 'post'})

onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
    closeChannel()
    releaseWindowChannel()
})
</script>

<template>
    <div class="tutorial">
        <div class="tutorial__progress">
            <p class="tutorial__label">{{ label }}</p>
            <ol v-if="!single" class="tutorial__dots">
                <li v-for="n in steps" :key="n">
                    <button
                        type="button"
                        class="tutorial__dot"
                        :class="{'tutorial__dot--solved': solved.includes(n)}"
                        :aria-current="n === step ? 'step' : undefined"
                        :aria-label="t('tutorial.goTo', {step: n})"
                        @click="step = n"
                    ></button>
                </li>
            </ol>
        </div>

        <div class="tutorial__stage">
            <iframe
                ref="frame"
                v-focus-on-load
                :key="step"
                :src="src"
                class="tutorial__frame"
                :inert="briefOpen || isSolved || undefined"
                :title="t('tutorial.frameTitle', {name, step, steps})"
                @load="onFrameLoad"
            />

            <Transition name="tutorial-brief" @after-enter="focusResult">
                <div v-if="isSolved" ref="result" class="tutorial__brief" role="status">
                    <div class="tutorial__brief-card tutorial__brief-card--result">
                        <PuzzleIcon :icon="icon || slug" />
                        <p class="tutorial__brief-title">{{ resultMessage }}</p>
                        <Button v-if="!isLast" size="sm" icon="right-arrow" @click.prevent="step++">
                            <template #text>{{ t('tutorial.next') }}</template>
                        </Button>
                        <slot v-else name="done" />
                    </div>
                </div>
            </Transition>

            <Transition name="tutorial-brief">
                <div
                    v-if="briefOpen"
                    ref="brief"
                    class="tutorial__brief"
                    role="dialog"
                    aria-modal="true"
                    :aria-labelledby="`tutorial-brief-${slug}-${step}`"
                    @keydown.esc.prevent="closeBrief"
                >
                    <div class="tutorial__brief-card">
                        <h3 :id="`tutorial-brief-${slug}-${step}`" class="tutorial__brief-title">{{ t(`${briefKey}.title`) }}</h3>
                        <p class="tutorial__brief-text">{{ t(`${briefKey}.text`) }}</p>
                        <Button size="sm" icon="right-arrow" @click.prevent="closeBrief">
                            <template #text>{{ t('tutorial.start') }}</template>
                        </Button>
                    </div>
                </div>
            </Transition>
        </div>

    </div>
</template>

<style scoped>
.tutorial {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-block-size: 0;
}

.tutorial__progress {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.tutorial__label {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08rem;
    color: var(--text-colour-secondary, #777);
}

.tutorial__dots {
    display: flex;
    margin: 0;
    padding: 0;
    list-style: none;
}

.tutorial__dot {
    display: grid;
    place-items: center;
    inline-size: 2.4rem;
    block-size: 2.4rem;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;

    &::before {
        content: '';
        inline-size: 1.2rem;
        block-size: 1.2rem;
        border: 2px solid color-mix(in srgb, var(--text-colour) 30%, transparent);
        border-radius: 50%;
        box-sizing: border-box;
    }

    &[aria-current]::before {
        border-color: var(--primary);
    }

    &.tutorial__dot--solved::before {
        border-color: var(--primary);
        background: var(--primary);
    }

    &:focus-visible {
        outline: 2px solid var(--focus-colour, currentColor);
        outline-offset: -2px;
        border-radius: 50%;
    }
}

.tutorial__stage {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    min-block-size: 0;
}

.tutorial__frame {
    flex: 1 1 auto;
    min-block-size: 0;
    inline-size: 100%;
    border: 0;
    border-radius: var(--border-radius-inner, 6px);
    background: var(--app-bg);
}

.tutorial__brief {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1.6rem;
    border-radius: var(--border-radius-inner, 6px);
    background: color-mix(in srgb, var(--app-bg) 70%, transparent);
    backdrop-filter: blur(2px);
}

.tutorial__brief-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
    inline-size: min(100%, 34rem);
    padding: 2rem;
    text-align: start;
    border-radius: var(--border-radius, 10px);
    background: var(--modal-bg);
    box-shadow: 0 .6rem 2.4rem rgba(var(--puzzle-tile-shadow), .25);
}

.tutorial__brief-card--result {
    --card-icon-size: 7rem;
    align-items: center;
    text-align: center;
}

.tutorial__brief-title {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-colour);
    text-wrap: balance;
}

.tutorial__brief-text {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.45;
    color: var(--text-colour);
    text-wrap: pretty;
}

.tutorial-brief-enter-active,
.tutorial-brief-leave-active {
    transition: opacity .25s ease;

    .tutorial__brief-card {
        transition: transform .25s ease;
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;

        .tutorial__brief-card {
            transition: none;
        }
    }
}

.tutorial-brief-enter-from,
.tutorial-brief-leave-to {
    opacity: 0;

    .tutorial__brief-card {
        transform: translateY(.8rem);
    }
}

</style>
