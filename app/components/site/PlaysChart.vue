<script setup>
const props = defineProps({
    labels:    {type: Array, required: true},
    series:    {type: Array, required: true},
    ariaLabel: {type: String, default: ''},
})

const LEFT = 50
const RIGHT = 650
const MAX_MARKERS = 16

const xFor = (i) => props.labels.length > 1
    ? LEFT + i * (RIGHT - LEFT) / (props.labels.length - 1)
    : (LEFT + RIGHT) / 2
const yFor = (v, max) => 200 - (v / (max || 1)) * 180

const chartMax = computed(() => Math.max(1, ...props.series.flatMap(s => s.values)))

const lines = computed(() => props.series.map(s => ({
    ...s,
    points: s.values.map((v, i) => `${xFor(i)},${yFor(v, chartMax.value).toFixed(1)}`).join(' '),
    markers: s.variant === 'current' && s.values.length <= MAX_MARKERS
        ? s.values.map((v, i) => ({x: xFor(i), y: yFor(v, chartMax.value)}))
        : [],
})))

const ORDER = {average: 0, previous: 1, current: 2}
const drawOrder = computed(() => [...lines.value].sort((a, b) => ORDER[a.variant] - ORDER[b.variant]))
</script>

<template>
    <div class="plays-chart-wrap">
        <svg
            viewBox="0 0 700 260"
            class="plays-chart"
            role="img"
            :aria-label="props.ariaLabel"
            preserveAspectRatio="none"
        >
            <template v-for="line in drawOrder" :key="line.key">
                <polyline :points="line.points" class="plays-chart__line" :class="`plays-chart__line--${line.variant}`" />
                <circle
                    v-for="(p, i) in line.markers"
                    :key="`${line.key}-${i}`"
                    :cx="p.x"
                    :cy="p.y"
                    r="6"
                    class="plays-chart__marker"
                />
            </template>

            <template v-for="(name, i) in props.labels" :key="`l-${i}`">
                <text
                    v-if="name"
                    :x="xFor(i)"
                    y="240"
                    text-anchor="middle"
                    class="plays-chart__x-label"
                >{{ name }}</text>
            </template>
        </svg>

        <ul class="plays-chart__legend">
            <li
                v-for="line in lines"
                :key="line.key"
                class="plays-chart__legend-item"
                :class="`plays-chart__legend-item--${line.variant}`"
            >
                <span class="plays-chart__legend-swatch"></span>
                {{ line.label }}
            </li>
        </ul>
    </div>
</template>

<style scoped>
.plays-chart {
    inline-size: 100%;
    block-size: auto;
    display: block;
    margin-block-start: 1rem;
    overflow: visible;
    max-inline-size: 48rem;
    margin-inline: auto;
}
.plays-chart__line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
}
.plays-chart__line--current {
    stroke: var(--primary, #2e7d32);
    stroke-width: 2;
}
.plays-chart__line--previous {
    stroke: var(--text-colour-secondary, #777);
    stroke-width: 1.5;
    opacity: .55;
}
.plays-chart__line--average {
    stroke: var(--text-colour-secondary, #777);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
    opacity: .5;
}
.plays-chart__marker {
    fill: var(--primary, #2e7d32);
    stroke: var(--card-background, #fff);
    stroke-width: 2;
}
.plays-chart__x-label {
    font-size: 1.8rem;
    fill: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: 1px;
}

.plays-chart__legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1.4rem;
    padding: 0;
    margin: .8rem 0 0;
    list-style: none;
    font-size: 1.4rem;
    color: var(--text-colour-secondary, #777);
}
.plays-chart__legend-item {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
}
.plays-chart__legend-swatch {
    inline-size: 1.8rem;
    block-size: .3rem;
    border-radius: 2px;
    background: currentColor;
}
.plays-chart__legend-item--current  { color: var(--primary, #2e7d32); }
.plays-chart__legend-item--previous { color: var(--text-colour-secondary, #777); opacity: .7; }
.plays-chart__legend-item--average  { color: var(--text-colour-secondary, #777); opacity: .7; }
.plays-chart__legend-item--average .plays-chart__legend-swatch {
    background: repeating-linear-gradient(
        to right,
        currentColor 0 4px,
        transparent 4px 8px
    );
}
</style>
