<script setup>
const props = defineProps({
    completions: {type: Array, default: () => []},
    maxGuesses: {type: Number, default: 6},
})

const {t} = useI18n()

const wins = computed(() =>
    props.completions.filter(c => c.solved !== false && typeof c.guesses === 'number' && c.guesses > 0))

const latest = computed(() =>
    [...wins.value].sort((a, b) => new Date(b.at) - new Date(a.at))[0]?.guesses ?? null)

const rows = computed(() => {
    const top = Math.max(props.maxGuesses, ...wins.value.map(c => c.guesses))
    const counts = Array.from({length: top}, (_, i) => wins.value.filter(c => c.guesses === i + 1).length)
    const most = Math.max(1, ...counts)
    return counts.map((count, i) => ({
        guesses: i + 1,
        count,
        width: (count / most) * 100,
        latest: latest.value === i + 1,
    }))
})
</script>

<template>
    <div v-if="wins.length" class="gd">
        <h3 class="gd__title">{{ t('archive.stats.guessDistribution') }}</h3>
        <ol class="gd__rows">
            <li v-for="row in rows" :key="row.guesses" class="gd__row" :class="{'gd__row--latest': row.latest}">
                <span class="gd__label">{{ row.guesses }}</span>
                <span class="gd__track">
                    <span class="gd__bar" :style="{inlineSize: `${row.width}%`}"></span>
                    <span class="gd__count">{{ row.count }}</span>
                </span>
            </li>
        </ol>
    </div>
</template>

<style scoped>
.gd {
    --gd-bar: color-mix(in srgb, var(--puzzle-tile-text) 35%, var(--card-background, #fff));
    --gd-bar-latest: var(--puzzle-tile-text);

    display: flex;
    flex-direction: column;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    padding: 1.4rem 1.6rem;
}

.gd__title {
    margin: 0 0 1rem;
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;
}

.gd__rows {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: space-around;
    gap: .6rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.gd__row {
    display: grid;
    grid-template-columns: 1.6rem minmax(0, 1fr);
    align-items: center;
    gap: .8rem;
    font-size: 1.4rem;
    font-variant-numeric: tabular-nums;
}

.gd__label {
    color: var(--text-colour-secondary, #777);
    text-align: end;
}

.gd__track {
    display: flex;
    align-items: center;
    gap: .6rem;
    min-inline-size: 0;
}

.gd__bar {
    block-size: 1.8rem;
    min-inline-size: .4rem;
    border-radius: .4rem;
    background: var(--gd-bar);
    transition: inline-size .3s ease;

    .gd__row--latest & {
        background: var(--gd-bar-latest);
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}

.gd__count {
    flex-shrink: 0;
    color: var(--text-colour, #212121);
    font-weight: 700;
}
</style>
