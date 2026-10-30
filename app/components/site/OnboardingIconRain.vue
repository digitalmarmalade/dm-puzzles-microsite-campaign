<script setup>
import Archive from '@/api/Archive.js'
import {themeClass} from '@/lib/utils'

const props = defineProps({
    //  how many tiles to render (families are repeated to fill)
    count: {type: Number, default: 0},
    //  'grid' fills a band, 'column' stacks vertically for a side rail
    layout: {type: String, default: 'grid'},
})

//  Widen the arc on bigger screens: more columns → the rain spreads further.
const cols = ref(6)
function colsForWidth(w) {
    if (w >= 1080) return 10
    if (w >= 720) return 8
    return 6
}
function syncCols() {
    cols.value = colsForWidth(window.innerWidth)
}
onMounted(() => {
    syncCols()
    window.addEventListener('resize', syncCols)
})
onUnmounted(() => window.removeEventListener('resize', syncCols))

const families = Archive.getVariantFamilies()
const tiles = computed(() => {
    const n = props.count || families.length
    return Array.from({length: n}, (_, i) => families[i % families.length])
})

const delays = computed(() => tiles.value.map(() => (Math.random() * 0.65).toFixed(2)))

//  Stagger the drop directionally — columns left→right, tiles bottom→top.
const COL_STEP = 0.09
const ROW_STEP = 0.06
const gridColumns = computed(() => {
    const n = cols.value
    const grouped = Array.from({length: n}, () => [])
    tiles.value.forEach((f, i) => grouped[i % n].push({f, k: i}))
    grouped.forEach((col, ci) => {
        const last = col.length - 1
        col.forEach((cell, ri) => {
            cell.d = (ci * COL_STEP + (last - ri) * ROW_STEP).toFixed(2)
        })
    })
    return grouped
})
</script>

<template>
    <div class="ob-rain" :class="`ob-rain--${layout}`" aria-hidden="true">
        <template v-if="layout === 'grid'">
            <div v-for="(col, ci) in gridColumns" :key="ci" class="ob-rain__col">
                <div
                    v-for="cell in col"
                    :key="cell.k"
                    class="ob-rain__tile"
                    :class="themeClass(cell.f.name)"
                    :style="{ animationDelay: cell.d + 's' }"
                >
                    <svg><use :href="sprite(cell.f.slug)"/></svg>
                </div>
            </div>
        </template>
        <template v-else>
            <div
                v-for="(f, i) in tiles"
                :key="i"
                class="ob-rain__tile"
                :class="themeClass(f.name)"
                :style="{ animationDelay: delays[i] + 's' }"
            >
                <svg><use :href="sprite(f.slug)"/></svg>
            </div>
        </template>
    </div>
</template>

<style scoped>
    .ob-rain {
        overflow: hidden;
        inline-size: 98vw;
        gap: 1rem;
        position: absolute;
        inset-inline-start: 50%;
        transform: translateX(-50%);
        inset-block-end: calc(50% + 15rem);
        padding-block-end: 3rem;
    }
    .ob-rain--grid {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        
    }
    .ob-rain__col {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: flex-end;
        gap: .7rem;

        min-inline-size: 0;
    }
    .ob-rain__col:nth-child(odd) { padding-block-end: 4rem; }

    .ob-rain--column {
        display: flex;
        flex-direction: column;
    }
    .ob-rain__tile {
        flex: 0 0 auto;
        position: relative;
        inline-size: 100%;
        block-size: 0;
        padding-block-start: 100%;
        border-radius: .9rem;
        background: color-mix(in srgb, var(--puzzle-tile-text), var(--app-bg) 95%);
        border: 1px solid color-mix(in srgb, var(--puzzle-tile-text, var(--card-border)) 28%, transparent);
        color: var(--puzzle-tile-text, var(--primary));
        animation: ob-rain-drop .6s both cubic-bezier(.3, .85, .4, 1.1);
    }
    .ob-rain__tile svg {
        position: absolute;
        inset: 0;
        margin: auto;
        inline-size: 60%;
        block-size: 60%;
    }
    @keyframes ob-rain-drop {
        0%   { transform: translateY(-10rem) scale(.8); opacity: 0; }
        55%  { opacity: 1; }
        72%  { transform: translateY(.5rem) scale(1.06); opacity: 1; }
        86%  { transform: translateY(-.15rem) scale(.99); }
        100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
        .ob-rain__tile { animation: none; }
    }
</style>
