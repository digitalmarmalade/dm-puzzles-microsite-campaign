<script setup>

const props = defineProps({
    total: {type: Number, required: true},
    filled: {type: Number, default: 0},
    size: {type: Number, default: 96},
    strokeWidth: {type: Number, default: 8},
})

const clampedTotal = computed(() => Math.max(1, props.total))
const clampedFilled = computed(() => Math.min(clampedTotal.value, Math.max(0, props.filled)))

const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)

const gapPx = computed(() => {
    const base = Math.max(2, props.strokeWidth * 0.5)
    const max = circumference.value / clampedTotal.value * 0.5
    return Math.min(base, max)
})

const segments = computed(() => {
    const n = clampedTotal.value
    const c = circumference.value
    const g = gapPx.value
    const segLen = Math.max(0, (c - n * g) / n)
    return Array.from({length: n}, (_, i) => ({
        i,
        length: segLen,
        offset: -(i * (segLen + g)),
        filled: i < clampedFilled.value,
    }))
})
</script>

<template>
    <svg
        :width="size"
        :height="size"
        :viewBox="`0 0 ${size} ${size}`"
        class="segring"
        aria-hidden="true"
    >
        <g :transform="`rotate(-90 ${size / 2} ${size / 2})`">
            <circle
                v-for="seg in segments"
                :key="seg.i"
                :cx="size / 2"
                :cy="size / 2"
                :r="radius"
                fill="none"
                :stroke-width="strokeWidth"
                :stroke-dasharray="`${seg.length} ${circumference - seg.length}`"
                :stroke-dashoffset="seg.offset"
                :class="seg.filled ? 'segring__seg--on' : 'segring__seg--off'"
                stroke-linecap="butt"
            />
        </g>
    </svg>
</template>

<style scoped>
.segring { display: block; }
.segring__seg--off {
    stroke: currentColor;
}
.segring__seg--on {
    stroke: var(--primary);
    transition: stroke .3s ease;
}
</style>
