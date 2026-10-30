<script setup>
const {t} = useI18n()
const challenges = useChallengesStore()
const features = useFeatures()

const HIDE_KEY = 'sp:streakSaveBar:hidden'
const hiddenFor = ref(null)

if (import.meta.client) {
    try { hiddenFor.value = sessionStorage.getItem(HIDE_KEY) } catch {}
}

const preview = useState('streakSaveBarPreview', () => false)

const progress = computed(() => preview.value
    ? {current: 1, target: 3, complete: false}
    : challenges.freezeProgress)

const visible = computed(() => {
    if (preview.value) return true
    if (!features.streakFreeze) return false
    const p = progress.value
    if (!p || p.complete) return false
    return hiddenFor.value !== challenges.todayKey
})

function dismiss() {
    if (preview.value) {
        preview.value = false
        return
    }
    hiddenFor.value = challenges.todayKey
    try { sessionStorage.setItem(HIDE_KEY, challenges.todayKey) } catch {}
}
</script>

<template>
    <Transition name="save-bar">
        <aside v-if="visible" class="save-bar streak-broken" role="status" :aria-label="t('streakFreeze.saveBarLabel')">
            <div class="save-bar__inner">
                <div class="save-bar__text">
                    <p class="save-bar__label">{{ t('streakFreeze.saveBarLabel') }}</p>
                    <p class="save-bar__progress">{{ t('streakFreeze.progress', {done: progress.current, target: progress.target}) }}</p>
                </div>

                <span class="save-bar__steps" aria-hidden="true">
                    <span
                        v-for="n in progress.target"
                        :key="n"
                        class="save-bar__step"
                        :class="{'save-bar__step--done': n <= progress.current}"
                    >
                        <svg v-if="n <= progress.current"><use :href="sprite('tick')" /></svg>
                        <template v-else>{{ n }}</template>
                    </span>
                </span>

                <button type="button" class="save-bar__close" :aria-label="t('common.close')" @click="dismiss">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><use :href="sprite('close')" /></svg>
                </button>
            </div>
        </aside>
    </Transition>
</template>

<style scoped>
    .save-bar {
        position: fixed;
        inset-inline: 0;
        inset-block-end: 0;
        z-index: 55;
        background: var(--streak-surface);
        color: var(--streak-on);
        box-shadow: 0 -0.4rem 2rem rgba(0, 0, 0, .2);
        padding: .6rem .6rem calc(.6rem + env(safe-area-inset-bottom));

        &.save-bar-enter-active,
        &.save-bar-leave-active {
            transition: transform .35s cubic-bezier(.3, .7, .3, 1), opacity .35s ease;

            @media (prefers-reduced-motion: reduce) {
                transition: opacity .2s ease;
            }
        }

        &.save-bar-enter-from,
        &.save-bar-leave-to {
            transform: translateY(100%);
            opacity: 0;

            @media (prefers-reduced-motion: reduce) {
                transform: none;
            }
        }
    }
    .save-bar__inner {
        display: flex;
        align-items: center;
        gap: 1.4rem;
        --save-bar-edge: 2rem;
        --save-bar-pad: 0rem;
        padding-block: .8rem;
        padding-inline: max(calc(var(--save-bar-edge) - .7rem), calc((100% - var(--header-max-width)) / 2 + var(--save-bar-pad) - .1rem));
        border: 1px solid color-mix(in srgb, var(--streak-on) 50%, transparent);
        border-radius: .6rem;

        @media (width >= 720px) {
            --save-bar-edge: 9rem;
            --save-bar-pad: 2rem;
        }
    }
    .save-bar__text {
        flex: 1 1 auto;
        min-inline-size: 0;
    }
    .save-bar__label {
        margin: 0;
        font-weight: 700;
        line-height: 1.2;
    }
    .save-bar__progress {
        margin: 0;
        font-size: 1.3rem;
        color: var(--primary);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }
    .save-bar__steps {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 1rem;
    }
    .save-bar__step {
        position: relative;
        inline-size: 3.4rem;
        block-size: 3.4rem;
        border: .2rem solid transparent;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--streak-on) 22%, transparent);
        font-size: 1.3rem;
        font-weight: 700;
        transition: background .3s ease, color .3s ease, box-shadow .3s ease;

        &:not(:first-child)::before {
            content: '';
            position: absolute;
            inset-inline-end: calc(100% + .2rem);
            inline-size: 1rem;
            block-size: .4rem;
            background: color-mix(in srgb, var(--streak-on) 22%, transparent);
        }

        svg {
            inline-size: 1.6rem;
            block-size: 1.6rem;
        }
    }
    .save-bar__step--done {
        background: var(--streak-on);
        color: var(--streak-ink);
        box-shadow: inset 0 0 0 .1rem var(--streak-ink);

        &::before {
            background: var(--streak-on);
        }
    }
    .save-bar__close {
        flex: 0 0 auto;
        appearance: none;
        border: none;
        background: transparent;
        cursor: pointer;
        display: grid;
        place-items: center;
        inline-size: 3.2rem;
        block-size: 3.2rem;
        border-radius: 50%;
        color: var(--streak-on);
        opacity: .7;
        transition: opacity .15s ease, background .15s ease;

        svg {
            inline-size: 1.6rem;
            block-size: 1.6rem;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
        }

        @media (hover: hover) {
            &:hover {
                opacity: 1;
                background: color-mix(in srgb, var(--streak-on) 12%, transparent);
            }
        }
    }
</style>
