<script setup>
import {themeClass} from '@/lib/utils'
import {assistKind, assistOptions} from '@/lib/assists'

const {t} = useI18n()
const state = useAssistFeedbackState()
const modals = useModalStore()

const letters = computed(() => assistKind(state.value?.type) === 'letters')
const title = computed(() => state.value ? t(letters.value ? 'assistFeedback.letters.title' : 'assistFeedback.title') : '')
const intro = computed(() => {
    if (!letters.value) return ''
    const used = state.value?.used ?? 0
    return used ? t('assistFeedback.letters.used', {n: used}, used) : t('assistFeedback.letters.unused')
})
const options = computed(() => state.value ? assistOptions(state.value.type, state.value.current, state.value.direction) : [])
const label = (option) => {
    const text = t(`assistFeedback.choices.${option.choice}`)
    return letters.value && option.amount && option.choice !== 'same' ? t('assistFeedback.letters.choice', {label: text, n: option.amount}) : text
}

const chosen = ref(null)
watch(state, () => { chosen.value = null })

function choose(choice) {
    if (chosen.value) return
    chosen.value = choice
    setTimeout(() => closeAssistFeedback(choice), 250)
}

watch(() => modals.isOpen(ASSIST_FEEDBACK_MODAL_ID), (open) => {
    if (!open && state.value) closeAssistFeedback(null)
})
</script>

<template>
    <Modal :id="ASSIST_FEEDBACK_MODAL_ID" size="sm" :hide-title="true" :fullscreen-mobile="true" classes-modal="sp-modal sp-modal--center-mobile" :title="title">
        <div v-if="state" class="assist-feedback">
            <div class="assist-feedback__icon" :class="themeClass(state.theme)" aria-hidden="true">
                <PuzzleIcon :icon="state.icon" />
            </div>
            <h2 class="assist-feedback__title">{{ title }}</h2>
            <p v-if="intro" class="assist-feedback__intro">{{ intro }}</p>
        </div>
        <template #footer>
            <div class="assist-feedback__options">
                <button
                    v-for="option in options"
                    :key="option.choice"
                    type="button"
                    class="assist-feedback__choice"
                    :class="{'assist-feedback__choice--on': chosen === option.choice}"
                    :aria-pressed="chosen === option.choice"
                    @click="choose(option.choice)"
                >{{ label(option) }}</button>
            </div>
        </template>
    </Modal>
</template>

<style scoped>
.assist-feedback {
    --card-icon-size: 9rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
    text-align: center;
}

.assist-feedback__icon {
    margin-block: .8rem;
}

.assist-feedback__title {
    margin: 0;
    font-size: 2.4rem;
    text-wrap: balance;
}

.assist-feedback__intro {
    margin: 0;
    color: var(--text-colour-secondary, #777);
    font-size: 1.6rem;
    text-wrap: balance;
}
.assist-feedback__options {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    inline-size: 100%;
}

.assist-feedback__choice {
    min-inline-size: 7rem;
    padding: .6rem 1.2rem;
    border: 1px solid var(--card-border);
    border-radius: 0;
    background: var(--app-bg);
    color: var(--text-colour);
    font: inherit;
    font-size: 1.5rem;
    line-height: 1.3;
    text-wrap: balance;
    position: relative;
    cursor: pointer;
    transition: border-color .1s ease-in-out, background-color .1s ease-in-out, color .1s ease-in-out;

    & + & {
        margin-inline-start: -1px;
    }

    &:first-child {
        border-start-start-radius: 999px;
        border-end-start-radius: 999px;
    }

    &:last-child {
        border-start-end-radius: 999px;
        border-end-end-radius: 999px;
    }

    &.assist-feedback__choice--on {
        border-color: var(--primary);
        background: var(--primary);
        color: var(--text-on-primary, #fff);
        z-index: 1;
    }

    &:focus-visible {
        z-index: 1;
    }

    @media (hover: hover) and (pointer: fine) {
        &:not(.assist-feedback__choice--on):hover {
            background: color-mix(in srgb, var(--primary) 8%, var(--app-bg));
            z-index: 1;
        }
    }
}
</style>
