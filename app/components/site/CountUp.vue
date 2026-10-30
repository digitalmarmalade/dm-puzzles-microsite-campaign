<script setup>
const props = defineProps({
    value:    {type: Number, required: true},
    duration: {type: Number, default: 600},
    still: {type: Boolean, default: false},
})

const instant = () =>
    props.still ||
    typeof window === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    document.visibilityState === 'hidden'

const el = ref(null)
const shown = ref(instant() ? props.value : 0)
const seen = ref(false)
let frame = null
let observer = null

function animateTo(to) {
    if (frame) cancelAnimationFrame(frame)
    const from = shown.value
    if (from === to || instant()) {
        shown.value = to
        return
    }
    const start = performance.now()
    const step = (now) => {
        const t = Math.min(1, (now - start) / props.duration)
        const eased = 1 - (1 - t) ** 3
        shown.value = Math.round(from + (to - from) * eased)
        frame = t < 1 ? requestAnimationFrame(step) : null
    }
    frame = requestAnimationFrame(step)
}

function reveal() {
    seen.value = true
    observer?.disconnect()
    observer = null
    animateTo(props.value)
}

onMounted(() => {
    if (instant() || typeof IntersectionObserver === 'undefined') return reveal()
    observer = new IntersectionObserver((entries) => {
        if (entries.some(e => e.isIntersecting)) reveal()
    }, {threshold: 0.5})
    observer.observe(el.value)
})

watch(() => props.value, (to) => {
    if (seen.value) animateTo(to)
})

onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame)
    observer?.disconnect()
})
</script>

<template>
    <span ref="el" class="count-up">{{ shown }}</span>
</template>

<style scoped>
.count-up {
    font-variant-numeric: tabular-nums;
}
</style>
