<script setup>
import {slugify} from '@/lib/utils'

const {variantName, entry, dateLabel, isQuiz, hideTitle} = defineProps({
    variantName: {type: String, default: ''},
    entry: {type: Object, default: () => ({completions: [], puzzleNumber: null})},
    dateLabel: {type: String, default: ''},
    isQuiz: {type: Boolean, default: false},
    hideTitle: {type: Boolean, default: false},
})

const pad = (n) => String(n).padStart(2, '0')
const icon = computed(() => slugify(variantName ?? ''))

function formatResult(c) {
    if (isQuiz) return c.score
    return `${Math.floor(c.seconds / 60)}:${pad(c.seconds % 60)}`
}
</script>

<template>
    <div class="day-results">
        <h2 v-if="!hideTitle" class="results-title">
            {{ entry.puzzleNumber ? `${variantName} ${entry.puzzleNumber}` : variantName }}
        </h2>
        <p class="results-date">{{ dateLabel }}</p>

        <table v-if="entry.completions.length" class="results-table">
            <thead>
                <tr>
                    <th scope="col" class="col-player">{{ $t('friends.stats.player') }}</th>
                    <th scope="col" class="col-result">{{ isQuiz ? $t('friends.stats.score') : $t('friends.stats.time') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="c in entry.completions" :key="c.label" :class="{ 'is-current-player': c.isUser }">
                    <th scope="row" class="cell-player">
                        <RankBadge class="rank" :rank="c.rank" :ordinal="false" />
                        <span class="pname">{{ c.name }}</span>
                    </th>
                    <td class="cell-result">{{ formatResult(c) }}</td>
                </tr>
            </tbody>
        </table>

        <Empty v-else>
            <template #icon>
                <svg><use :href="sprite(icon)"/></svg>
            </template>
            <template #text>
                <p>{{ $t('friends.stats.noCompletions') }}</p>
            </template>
        </Empty>
    </div>
</template>

<style scoped>
.results-title {
    font-size: var(--page-h3-size, 2.2rem);
    font-weight: 700;
}

.results-date {
    margin: .3rem 0 1.5rem;
    opacity: .7;
}

.results-table {
    inline-size: 100%;
    border-collapse: separate;
    border-spacing: 0;
}

.results-table th,
.results-table td {
    padding: 1.4rem 1rem;
    border-block-end: 1px solid var(--card-border);
    vertical-align: middle;
}

.results-table th {
    border-radius: .5rem 0 0 .5rem;
}
.results-table td {
    border-radius: 0 .5rem .5rem 0;
}

.results-table .is-current-player th,
.results-table .is-current-player td {
    background-color: var(--card-background);
}

.results-table thead th {
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 400;
    opacity: .7;
}

.col-player,
.cell-player {
    text-align: start;
}

.col-result,
.cell-result {
    text-align: end;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.cell-player {
    display: flex;
    align-items: center;
    gap: 2rem;
    font-weight: 400;
}

.rank {
    min-inline-size: 3rem;
    text-align: center;
    justify-content: center;
}

.pname {
    font-weight: 600;
}
</style>
