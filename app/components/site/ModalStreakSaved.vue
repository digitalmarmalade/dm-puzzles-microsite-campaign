<script setup>
const {t} = useI18n()
const state = useStreakSavedState()
const modals = useModalStore()

const display = ref(0)
const medallion = ref(null)
const bursts = ref(0)
let raf = null
let burstTimer = null

if (import.meta.client) {
    window.__showStreakSaved = (n = 12) => showStreakSaved(n)
    window.__hideStreakSaved = () => closeStreakSaved()
    const preview = new URLSearchParams(window.location.search).get('showStreakSaved')
    if (preview) onMounted(() => showStreakSaved(Number(preview) || 12))
}

const streak = computed(() => state.value?.streak ?? 0)

function runCountUp(target) {
    if (raf) cancelAnimationFrame(raf)
    const dur = 1000
    const start = performance.now()
    const step = (now) => {
        const p = Math.min(1, (now - start) / dur)
        const eased = 1 - Math.pow(1 - p, 3)
        display.value = Math.round(eased * target)
        if (p < 1) raf = requestAnimationFrame(step)
        else display.value = target
    }
    display.value = 0
    raf = requestAnimationFrame(step)
}

watch(state, (s) => {
    clearTimeout(burstTimer)
    if (!s) return
    runCountUp(s.streak)
    burstTimer = setTimeout(() => { bursts.value++ }, 650)
}, {immediate: true})

watch(() => modals.isOpen(STREAK_SAVED_MODAL_ID), (open) => {
    if (!open && state.value) closeStreakSaved()
})

onBeforeUnmount(() => {
    if (raf) cancelAnimationFrame(raf)
    clearTimeout(burstTimer)
})
</script>

<template>
    <Modal :id="STREAK_SAVED_MODAL_ID" size="sm" :hide-title="true" :fullscreen-mobile="true" classes-modal="sp-modal sp-modal--center-mobile streak-dialog" :title="t('streakFreeze.savedTitle')">
        <div v-if="state" class="saved">
            <AmbientField class="saved__backdrop" pattern="confetti" fade="radial" :intensity="1.6" :interactive="false" />
            <ConfettiBurst class="saved__backdrop" :fire="bursts" :origin="medallion" />
            <div ref="medallion" class="saved__medallion">
                <span class="saved__ring" aria-hidden="true"></span>
                <span class="saved__ring saved__ring--2" aria-hidden="true"></span>
                <svg class="saved__icon" aria-hidden="true"><use :href="sprite('lifebuoy')" /></svg>

                <p class="saved__count">{{ display }}</p>

            </div>

            
            <!--<p class="saved__unit">{{ t('streak.dayCount', display) }}</p>-->

            <h2 class="saved__title">{{ t('streakFreeze.savedTitle') }}</h2>
            <p class="saved__body">{{ t('streakFreeze.savedBody', {n: streak}) }}</p>
        </div>

        <template #footer>
            <ButtonGroup>
                <Button icon="right-arrow" @click.prevent="closeStreakSaved">
                    <template #text>
                        <span>{{ t('streakFreeze.continue') }}</span>
                    </template>
                </Button>
            </ButtonGroup>
        </template>
    </Modal>
</template>

<style scoped>
    .saved {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: .4rem;
        text-align: center;
    }

    .saved__backdrop {
        z-index: -1;
    }

    .saved__medallion {
        position: relative;
    }

    .saved__icon {
        display: block;
        inline-size: 12rem;
        block-size: 12rem;
        animation: scaleBounceSpin 600ms ease-out both;
        transform-origin: center;
        animation-delay: .2s;
    }

    .saved__count {
        font-size: 3rem;
        font-weight: 800;
        line-height: 1;
        position: absolute;
        inset-block-start: 50%;
        inset-inline-start: 50%;
        transform: translate(-50%, -50%);
        margin-block-start: -.4rem;

        font-variant-numeric: tabular-nums;
        animation: saved-pop .5s cubic-bezier(.3, 1.4, .5, 1) both;
    }
    .saved__unit {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .1rem;
        opacity: .85;
    }
    .saved__title {
        margin: 1rem 0 0;
        font-size: 2.4rem;
        line-height: 1.2;
        text-wrap: balance;
    }
    .saved__body {
        margin: 0;
        font-size: 1.6rem;
        line-height: 1.5;
        text-wrap: balance;
        opacity: .85;
    }
    @keyframes scaleBounceSpin {
        0% {
            transform: scale(0) rotate(0deg);
            opacity: 0;
        }

        60% {
            transform: scale(1.08) rotate(270deg);
            opacity: 1;
        }

        80% {
            transform: scale(0.96) rotate(350deg);
        }

        100% {
            transform: scale(1) rotate(360deg);
        }
    }


</style>
