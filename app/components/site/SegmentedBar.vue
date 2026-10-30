<script setup>
//  Horizontal segmented progress bar — sibling of SegmentedRing with the
//  same {total, filled} API. Renders `total` equal-width pill segments,
//  colouring the first `filled` in the primary tone.
const props = defineProps({
    total:  {type: Number, required: true},
    filled: {type: Number, default: 0},
})

const clampedTotal  = computed(() => Math.max(1, props.total))
const clampedFilled = computed(() => Math.min(clampedTotal.value, Math.max(0, props.filled)))

const segments = computed(() =>
    Array.from({length: clampedTotal.value}, (_, i) => ({i, on: i < clampedFilled.value}))
)
</script>

<template>
    <div class="segment-bar" role="presentation" aria-hidden="true">
        <span
            v-for="seg in segments"
            :key="seg.i"
            class="segment-bar__segment"
            :class="{'segment-bar__segment--on': seg.on}"
        ></span>
    </div>
</template>

<style scoped>
.segment-bar {
    display: flex;
    gap: .4rem;
    inline-size: 100%;
}
.segment-bar__segment {
    flex: 1 1 0;
    block-size: .5rem;
    border-radius: 999px;
    background: rgba(var(--card-background-rgb),.8);
    transition: background .3s ease, opacity .3s ease;
}
.segment-bar__segment--on {
    background: var(--primary);
    opacity: 1;
}
</style>
