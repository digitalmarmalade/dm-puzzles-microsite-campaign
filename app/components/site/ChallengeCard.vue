<script setup>
const props = defineProps({
    card: {type: Object, required: true},
    board: {type: Object, required: true},
})
const emit = defineEmits(['play'])

const {t} = useI18n()

const state = computed(() => props.card.state)
const copy = computed(() => props.card.copy)
const title = computed(() => t(copy.value.title, copy.value.params))

const waiting = computed(() => state.value === 'active' && !!props.board.waiting?.(props.card.entry))
const canPlay = computed(() => state.value === 'active' && !!props.board.puzzleFor(props.card.entry))
</script>

<template>
    <div class="challenge-card" :class="`challenge-card--${state}`">
        <div class="challenge-card__text">
            <h3 class="challenge-card__title">{{ title }}</h3>
            <p v-if="state === 'suggested'" class="challenge-card__meta">{{ t(copy.body, copy.params) }}</p>
            <p v-else-if="state === 'active'" class="challenge-card__meta">{{ waiting ? t('challenges.comeBackTomorrow') : t(copy.goal, copy.params) }}</p>
            <div v-if="state === 'active'" class="challenge-card__progress">
                <SegmentedBar class="challenge-card__bar" :total="card.progress.target" :filled="card.progress.current" />
                <span class="challenge-card__count">{{ t('challenges.progress', {current: card.progress.current, target: card.progress.target}) }}</span>
            </div>
            <p v-if="state === 'complete'" class="challenge-card__meta">{{ t(copy.goal, copy.params) }}</p>
            <p v-else-if="state === 'expired'" class="challenge-card__meta">{{ t(copy.expired, {current: card.progress.current, target: card.progress.target}) }}</p>
        </div>

        <div class="challenge-card__actions">
            <button v-if="state === 'complete'" type="button" class="challenge-card__primary" @click="board.dismiss(card.entry)">{{ t('challenges.pickNew') }}</button>
            <button v-else-if="state === 'suggested'" type="button" class="challenge-card__primary" @click="board.join(card.entry)">{{ t('challenges.join') }}</button>
            <button v-else-if="canPlay" type="button" class="challenge-card__primary" @click="emit('play', card)">{{ t('challenges.play') }}</button>
            <button v-else-if="state === 'expired'" type="button" class="challenge-card__primary" @click="board.retry(card.entry)">{{ t('challenges.retry') }}</button>
        </div>
    </div>
</template>

<style scoped>
.challenge-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 1.6rem;
}

.challenge-card__text {
    display: flex;
    flex-direction: column;
    gap: .4rem;
    min-inline-size: 0;
}

.challenge-card__title {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 1.8rem;
    font-weight: 700;
    line-height: 1.2;
}

.challenge-card__meta {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    color: var(--text-colour-secondary, #666);
    font-size: 1.4rem;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;

    .challenge-card--complete & {
        color: rgba(255, 255, 255, .9);
    }
}

.challenge-card__progress {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-block-start: .2rem;
}

.challenge-card__bar {
    max-inline-size: 12rem;

    & :deep(.segment-bar__segment) {
        background: color-mix(in srgb, var(--text-colour) 22%, transparent);
    }

    & :deep(.segment-bar__segment--on) {
        background: var(--text-colour);
    }
}

.challenge-card__count {
    flex-shrink: 0;
    font-size: 1.3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.challenge-card__actions {
    display: flex;
    align-items: center;
}

.challenge-card__primary {
    padding: .8rem 2rem;
    border: 0;
    border-radius: 2rem;
    background: var(--text-colour);
    color: var(--card-background);
    font: inherit;
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: .08rem;
    text-transform: uppercase;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition: filter .15s ease;

    &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        &:hover {
            filter: brightness(1.08);
        }
    }
}

.challenge-card--complete .challenge-card__primary {
    background: #fff;
    color: var(--primary);
}
</style>
