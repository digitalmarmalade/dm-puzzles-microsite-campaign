<script setup>
import {ordinal} from '@/lib/utils'

const {rank, showPosition, ordinal: useOrdinal} = defineProps({
    rank: {type: Number, default: 0},
    showPosition: {type: Boolean, default: false},
    ordinal: {type: Boolean, default: true},
})

const MEDALS = {1: 'gold', 2: 'silver', 3: 'bronze'}
const medal = computed(() => MEDALS[rank] || null)
const position = computed(() => (rank ? (useOrdinal ? ordinal(rank) : String(rank)) : ''))
</script>

<template>
    <span v-if="rank" class="rank-badge">
        <svg v-if="medal" class="rank-badge__medal" aria-hidden="true">
            <use :href="sprite(medal)"/>
        </svg>
        <span v-if="!medal || showPosition" class="rank-badge__pos">{{ position }}</span>
    </span>
</template>

<style scoped>
.rank-badge {
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    line-height: 1;
}

.rank-badge__medal {
    inline-size: 3rem;
    block-size: 3rem;
    display: block;
    flex-shrink: 0;
}
:global(.cal-grid) {
    .rank-badge__pos {
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        font-size: 1.4rem;
        border: 1px solid currentColor;
        padding: .4rem .8rem;
        border-radius: .5rem;
        line-height: 1;
    }
}
</style>
