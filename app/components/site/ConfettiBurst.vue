<script setup>
const props = defineProps({
    fire: {type: Number, default: 0},
    origin: {type: Object, default: null},
    colours: {type: Array, default: () => ['#ffffff', '#ffe08a', '#ffc9a8']},
    count: {type: Number, default: 110},
})

const canvas = ref(null)
let raf = null

function burst() {
    const el = canvas.value
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const box = el.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    el.width = box.width * dpr
    el.height = box.height * dpr
    const ctx = el.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const from = props.origin?.getBoundingClientRect?.()
    const ox = from ? from.left + from.width / 2 - box.left : box.width / 2
    const oy = from ? from.top + from.height / 2 - box.top : box.height / 3
    const reach = Math.max(box.width, box.height) / 40

    const pieces = Array.from({length: props.count}, () => {
        const angle = Math.random() * Math.PI * 2
        const speed = reach * (0.35 + Math.random() * 0.65)
        const w = 5 + Math.random() * 5
        return {
            x: ox, y: oy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - reach * 0.25,
            w, h: w * (0.4 + Math.random() * 0.3),
            spin: Math.random() * Math.PI,
            turn: (Math.random() - 0.5) * 0.3,
            flip: Math.random() * Math.PI,
            colour: props.colours[Math.floor(Math.random() * props.colours.length)],
            life: 1,
            fade: 0.006 + Math.random() * 0.006,
        }
    })

    cancelAnimationFrame(raf)
    let last = performance.now()
    const step = (now) => {
        const dt = Math.min(3, (now - last) / 16.67)
        last = now
        ctx.clearRect(0, 0, box.width, box.height)
        let alive = 0
        for (const p of pieces) {
            if (p.life <= 0) continue
            alive++
            p.vx *= 0.97 ** dt
            p.vy = p.vy * 0.97 ** dt + 0.12 * dt
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.spin += p.turn * dt
            p.flip += 0.15 * dt
            p.life -= p.fade * dt
            ctx.save()
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6))
            ctx.translate(p.x, p.y)
            ctx.rotate(p.spin)
            ctx.scale(1, Math.abs(Math.cos(p.flip)) * 0.8 + 0.2)
            ctx.fillStyle = p.colour
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
            ctx.restore()
        }
        raf = alive ? requestAnimationFrame(step) : null
    }
    raf = requestAnimationFrame(step)
}

watch(() => props.fire, (n) => { if (n) burst() })
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
    <canvas ref="canvas" class="confetti-burst" aria-hidden="true"></canvas>
</template>

<style scoped>
.confetti-burst {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    pointer-events: none;
}
</style>
