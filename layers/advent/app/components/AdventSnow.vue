<script setup>
const props = defineProps({
    density: {type: Number, default: 1},
})

const canvas = ref(null)
let raf = null
let observer = null
let visible = true
let flakes = []
let size = {w: 0, h: 0}

function resize() {
    const el = canvas.value
    if (!el) return
    const box = el.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    size = {w: box.width, h: box.height}
    el.width = box.width * dpr
    el.height = box.height * dpr
    el.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
    const count = Math.round((box.width * box.height) / 9000 * props.density)
    flakes = Array.from({length: count}, () => ({
        x: Math.random() * box.width,
        y: Math.random() * box.height,
        r: .8 + Math.random() * 2.2,
        speed: .15 + Math.random() * .45,
        drift: Math.random() * Math.PI * 2,
        alpha: .35 + Math.random() * .55,
    }))
}

function draw(t) {
    const el = canvas.value
    if (!el) return
    const ctx = el.getContext('2d')
    ctx.clearRect(0, 0, size.w, size.h)
    for (const f of flakes) {
        ctx.globalAlpha = f.alpha
        ctx.beginPath()
        ctx.arc(f.x + Math.sin(t / 1600 + f.drift) * 6, f.y, f.r, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
    }
}

function step(t) {
    for (const f of flakes) {
        f.y += f.speed * (f.r / 1.6)
        if (f.y > size.h + 4) {
            f.y = -4
            f.x = Math.random() * size.w
        }
    }
    draw(t)
    raf = visible ? requestAnimationFrame(step) : null
}

onMounted(() => {
    resize()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        draw(0)
        return
    }
    observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        if (visible && !raf) raf = requestAnimationFrame(step)
    })
    observer.observe(canvas.value)
    window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    observer?.disconnect()
    window.removeEventListener('resize', resize)
})
</script>

<template>
    <canvas ref="canvas" class="advent-snow" aria-hidden="true"></canvas>
</template>

<style scoped>
.advent-snow {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    pointer-events: none;
}
</style>
