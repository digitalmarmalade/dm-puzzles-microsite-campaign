<script setup>
import {AWARDS} from '../lib/advent'

const props = defineProps({
    progress: {type: Object, default: null},
    final: {type: Boolean, default: false},
})
const {t} = useI18n()

const current = computed(() => props.progress?.award?.key ?? null)
const nextText = computed(() => {
    const next = props.progress?.next
    if (!next || props.final) return ''
    const count = next.min - props.progress.done
    return t('advent.award.next', {count, award: t(`advent.award.${next.key}.title`)}, count)
})
</script>

<template>
    <section class="advent-awards" :aria-label="t('advent.award.heading')">
        <h2 class="advent-awards__heading">{{ t('advent.award.heading') }}</h2>
        <ul class="advent-awards__list">
            <li
                v-for="award in AWARDS"
                :key="award.key"
                class="advent-award"
                :class="[`advent-award--${award.key}`, {'advent-award--current': award.key === current}]"
            >
                <span class="advent-award__art"><AdventAwardArt :award="award.key" /></span>
                <span class="advent-award__text">
                    <span v-if="award.key === current" class="advent-award__tag">
                        {{ t(final ? 'advent.award.yours' : 'advent.award.onTrack') }}
                    </span>
                    <span class="advent-award__title">{{ t(`advent.award.${award.key}.title`) }}</span>
                    <span class="advent-award__desc">{{ t(`advent.award.${award.key}.desc`) }}</span>
                </span>
            </li>
        </ul>
        <p v-if="nextText" class="advent-awards__next">{{ nextText }}</p>
    </section>
</template>

<style scoped>
.advent-awards__heading {
    margin: 0 0 1.6rem;
}

.advent-awards__list {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.2rem;
    margin: 0;
    padding: 0;
    list-style: none;

    @media (max-width: 800px) {
        grid-template-columns: repeat(2, 1fr);
    }
}

.advent-award {
    --award-colour: #c9962a;
    --award-tint: rgba(242, 193, 78, .18);

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem 1.2rem;
    border-radius: var(--border-radius, 1rem);
    background: var(--app-bg);
    text-align: center;
    opacity: .7;
    transition: opacity .2s ease;

    &.advent-award--silver {
        --award-colour: #8a97a6;
        --award-tint: rgba(138, 151, 166, .18);
    }

    &.advent-award--bronze {
        --award-colour: #b0703c;
        --award-tint: rgba(176, 112, 60, .18);
    }

    &.advent-award--coal {
        --award-colour: #3d3f4a;
        --award-tint: rgba(61, 63, 74, .14);
    }

    &.advent-award--current {
        opacity: 1;
        background: var(--award-tint);
        box-shadow: inset 0 0 0 .2rem var(--award-colour);
    }
}

.advent-award__art {
    inline-size: 7.2rem;
}

.advent-award__text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .3rem;
}

.advent-award__tag {
    padding: .2rem .8rem;
    border-radius: 99rem;
    background: var(--award-colour);
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
}

.advent-award__title {
    font-weight: 700;
}

.advent-award__desc {
    color: var(--text-colour-secondary);
    font-size: 1.4rem;
}

.advent-awards__next {
    margin: 1.6rem 0 0;
    color: var(--text-colour-secondary);
    text-align: center;
}
</style>
