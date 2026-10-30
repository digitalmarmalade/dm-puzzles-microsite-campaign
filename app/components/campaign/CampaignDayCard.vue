<script setup>
import {canPlay} from '@/lib/campaign/schedule'

const props = defineProps({
    day: {type: Object, required: true},
    puzzle: {type: Object, required: true},
    to: {type: String, default: null},
    percent: {type: Number, default: null},
})

const {t} = useI18n()

const completed = computed(() => props.day.state === 'done' || props.day.state === 'late')
const playable = computed(() => !!props.to && canPlay(props.day.state))
const icon = computed(() => props.puzzle.icon ?? (props.puzzle.tag ?? '').replaceAll('-', ''))
const started = computed(() => !completed.value && typeof props.percent === 'number')
const iconStatus = computed(() => ({
    completed: completed.value,
    started: started.value || completed.value,
    progress: started.value ? props.percent : undefined,
}))
const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
    <div class="puzzle-card puzzle-card--archive puzzle-card--campaign"
        :class="[`is-${day.state}`, {'puzzle-card--completed': completed}]"
    >
        <component :is="playable ? NuxtLink : 'span'" class="puzzle-card__play" :to="playable ? to : undefined">
            <PuzzleIcon :icon="icon" :status="iconStatus" :show-home-icon="false">
                <p class="date" aria-hidden="true" v-text="day.day"></p>

                <p v-if="day.state === 'late'" class="archive-status status status--late" aria-hidden="true">{{ t('campaign.lateBadge') }}</p>
                <p v-else-if="day.state === 'missed'" class="archive-status status status--missed" aria-hidden="true">
                    <svg class="status__cross" aria-hidden="true"><use :href="sprite('close')" /></svg>
                </p>
                <p v-else-if="started" class="archive-status status status--inProgress" aria-hidden="true">{{ percent }}%</p>

                <span class="sr-only">{{ t('campaign.dayN', {day: day.day}) }}, {{ puzzle.variant }}: {{ t(`campaign.states.${day.state}`) }}</span>
            </PuzzleIcon>
        </component>
    </div>
</template>

<style scoped>
.puzzle-card {
    --card-icon-size: 8rem;
    --card-svg-size: 40%;

    display: flex;
    flex-direction: column;
    position: relative;
    transition: all .25s ease;
    inline-size: var(--card-icon-size);
    block-size: var(--card-icon-size);
    margin: 0 auto;
}

.puzzle-card__play {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    text-align: center;
    text-decoration: none;
    color: inherit;
}

a.puzzle-card__play {
    cursor: pointer;
}

.date {
    color: var(--text-colour-secondary);
    font-size: 2.6rem;
    line-height: 1;
    margin: 0;
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
}

.puzzle-card--completed .date {
    inset-block-start: .5rem;
    inset-inline-start: .7rem;
    transform: none;
    font-size: 1.6rem;
}

.archive-status {
    position: absolute;
    inset-block-start: .2rem;
    inset-inline-end: .2rem;
    z-index: 2;
}

.status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1rem;
    color: var(--puzzle-tile-text, --text-colour);
    block-size: 1.8rem;
}

.status--late {
    font-size: 1rem;
    letter-spacing: .05rem;
    padding-inline: .4rem;
    border-radius: .4rem;
    background-color: var(--puzzle-tile-text);
    color: var(--card-background);
    inset-block-start: .4rem;
    inset-inline-end: .4rem;
    block-size: 1.6rem;
}

.status--missed {
    color: var(--text-colour-secondary);
}

.status__cross {
    inline-size: 1rem;
    block-size: 1rem;
}

.is-missed {
    opacity: .5;
}

.is-locked .date {
    opacity: .6;
}

.is-today :deep(.puzzle-icon-holder) {
    border-color: rgba(var(--puzzle-tile-shadow), 1);
}

.is-today .date,
.is-catchup .date {
    color: var(--text-colour);
}

.puzzle-card--archive :deep(.puzzle-icon-holder) {
    transition: background-color .2s ease, border-color .2s ease;
}

.puzzle-card--archive:has(a):focus-within :deep(.puzzle-icon-holder) {
    background-color: rgba(var(--puzzle-tile-shadow), .08);
}

.puzzle-card--archive:has(a):hover :deep(.puzzle-icon-holder) {
    @media (hover: hover) {
        background-color: rgba(var(--puzzle-tile-shadow), .08);
    }
}

.puzzle-card--archive :deep(.puzzle-icon-holder__rotor) {
    transition: transform .25s ease;
    transform-origin: 15% 15%;
}

.puzzle-card--archive.puzzle-card--completed:has(a):focus-within :deep(.puzzle-icon-holder__rotor) {
    transform: rotate(-15deg);
}

.puzzle-card--archive.puzzle-card--completed:has(a):hover :deep(.puzzle-icon-holder__rotor) {
    @media (hover: hover) {
        transform: rotate(-15deg);
    }
}

.puzzle-card--archive.puzzle-card--completed:has(a):focus-within :deep(.puzzle-icon) {
    transform: none;
}

.puzzle-card--archive.puzzle-card--completed:has(a):hover :deep(.puzzle-icon) {
    @media (hover: hover) {
        transform: none;
    }
}
</style>
