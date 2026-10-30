<script setup>
const props = defineProps({
    pattern: {type: String, default: 'honeycomb'},
    fade: {type: String, default: 'right'},
    intensity: {type: Number, default: 1},
    colour: {type: String, default: '255, 255, 255'},
    icon: {type: String, default: ''},
    icons: {type: Array, default: () => []},
    iconMax: {type: Number, default: 124},
    interactive: {type: Boolean, default: true},
})

const SQRT3 = Math.sqrt(3)
const PARALLAX = 14
const LIGHT_RADIUS = 190
const IDLE_MS = 2500
const EASE = 0.08
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const canvas = ref(null)
let ctx = null
let width = 0
let height = 0
let frame = null
let visible = false
let reduced = false
let lastInput = 0
let resizeObserver = null
let intersectionObserver = null
let iconImages = []
let tileFill = 'rgb(0, 0, 0)'
let layerCtx = null
const light = {x: 0, y: 0, tx: 0, ty: 0}
const shift = {x: 0, y: 0, tx: 0, ty: 0}

const hash = (a, b = 0) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
    return s - Math.floor(s)
}
const glowAt = (x, y, radius = LIGHT_RADIUS) => Math.max(0, 1 - Math.hypot(x - light.x, y - light.y) / radius) ** 2
const rgba = (a) => `rgba(${props.colour}, ${Math.max(0, Math.min(1, a * props.intensity)).toFixed(3)})`
const countFor = (area) => Math.max(8, Math.round(width * height / area))
const loopY = (t, speed, seed, span) => ((t * speed + seed * span) % span + span) % span

function hexPath(x, y, r) {
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
        const a = Math.PI / 3 * i
        const px = x + r * Math.cos(a)
        const py = y + r * Math.sin(a)
        if (i) ctx.lineTo(px, py)
        else ctx.moveTo(px, py)
    }
    ctx.closePath()
}

function roundRectPath(cx, cy, size, radius) {
    ctx.beginPath()
    ctx.roundRect(cx - size / 2, cy - size / 2, size, size, radius)
}

const PATTERNS = {
    icons(t) {
        if (!iconImages.length) return
        const layer = iconLayer()
        const max = props.iconMax
        const span = height + max + 96
        const icons = []
        for (let i = 0; i < countFor(30000); i++) {
            const size = 44 + hash(i, 2) ** 1.4 * (max - 44)
            const x = hash(i, 3) * width + Math.sin(t * 0.35 + i * 1.7) * 10 + shift.x
            const y = loopY(t, 6 + (1 - size / max) * 10, hash(i, 4), span) - (max - 14) + shift.y
            const spin = reduced ? (hash(i, 6) - 0.5) * 0.6 : Math.sin(t * 0.25 + i) * 0.3
            icons.push({i, size, x, y, spin})
        }
        icons.sort((a, b) => a.size - b.size)
        for (const {i, size, x, y, spin} of icons) {
            layer.save()
            layer.translate(x, y)
            layer.rotate(spin)
            layer.globalAlpha = 1
            layer.beginPath()
            layer.roundRect(-size / 2, -size / 2, size, size, size * 0.14)
            layer.fillStyle = tileFill
            layer.fill()
            layer.globalAlpha = Math.min(1, 0.55 + hash(i, 5) * 0.25 + glowAt(x, y) * 0.5)
            const inset = size * 0.16
            layer.drawImage(iconImages[i % iconImages.length], -size / 2 + inset, -size / 2 + inset, size - inset * 2, size - inset * 2)
            layer.restore()
        }
        ctx.save()
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.globalAlpha = Math.min(1, 0.5 * props.intensity)
        ctx.drawImage(layer.canvas, 0, 0)
        ctx.restore()
    },

    honeycomb(t) {
        const r = 22
        const stepX = r * 1.5
        const stepY = r * SQRT3
        ctx.lineWidth = 1
        for (let c = -1; c < Math.ceil(width / stepX) + 2; c++) {
            for (let row = -1; row < Math.ceil(height / stepY) + 2; row++) {
                const x = c * stepX + shift.x
                const y = row * stepY + (c % 2 ? stepY / 2 : 0) + shift.y
                const glow = glowAt(x, y)
                const wave = reduced ? 0 : 0.5 + 0.5 * Math.sin(t * 0.7 - x * 0.012 + y * 0.008)
                const twinkle = reduced ? 0 : Math.max(0, Math.sin(t * 0.6 + hash(c, row) * 40)) ** 14
                const fill = glow * 0.16 + twinkle * 0.14
                hexPath(x, y, r - 2)
                if (fill > 0.005) {
                    ctx.fillStyle = rgba(fill)
                    ctx.fill()
                }
                ctx.strokeStyle = rgba(Math.min(0.16 + wave * 0.06 + glow * 0.5 + twinkle * 0.2, 0.85))
                ctx.stroke()
            }
        }
    },

    tiles(t) {
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        const span = height + 200
        for (let i = 0; i < countFor(20000); i++) {
            const size = 30 + hash(i, 2) ** 1.5 * 60
            const x = hash(i, 3) * width + Math.sin(t * 0.5 + i) * 8 + shift.x
            const y = height + 100 - loopY(t, 8 + (1 - size / 90) * 14, hash(i, 4), span) + shift.y
            const spin = reduced ? hash(i, 6) - 0.5 : Math.sin(t * 0.3 + i) * 0.35
            const glow = glowAt(x, y)
            const solved = hash(i, 7) < 0.3
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate(spin)
            roundRectPath(0, 0, size, size * 0.26)
            ctx.fillStyle = rgba((solved ? 0.1 : 0.03) + glow * 0.12)
            ctx.fill()
            ctx.lineWidth = 2 + size / 30
            ctx.strokeStyle = rgba(0.2 + glow * 0.5)
            ctx.stroke()
            if (solved) {
                const s = size * 0.5
                ctx.beginPath()
                ctx.moveTo(-s * 0.5, 0)
                ctx.lineTo(-s * 0.15, s * 0.35)
                ctx.lineTo(s * 0.5, -s * 0.4)
                ctx.stroke()
            }
            ctx.restore()
        }
    },

    rays(t) {
        const ox = width / 2 + shift.x * 2
        const oy = height * 1.08
        const reach = Math.hypot(width, height) * 1.2
        const tilt = Math.sin(t * 0.12) * 0.06 + (light.x / width - 0.5) * 0.18
        const count = 16
        for (let i = 0; i < count; i++) {
            const centre = -Math.PI / 2 + (i / (count - 1) - 0.5) * Math.PI * 0.95 + tilt
            const half = 0.035 + hash(i, 1) * 0.03
            const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.7)
            const tipX = ox + Math.cos(centre) * reach * 0.5
            const tipY = oy + Math.sin(centre) * reach * 0.5
            ctx.fillStyle = rgba(0.035 + pulse * 0.045 + glowAt(tipX, tipY, 260) * 0.12)
            ctx.beginPath()
            ctx.moveTo(ox, oy)
            ctx.lineTo(ox + Math.cos(centre - half) * reach, oy + Math.sin(centre - half) * reach)
            ctx.lineTo(ox + Math.cos(centre + half) * reach, oy + Math.sin(centre + half) * reach)
            ctx.closePath()
            ctx.fill()
        }
        const sun = ctx.createRadialGradient(ox, oy, 0, ox, oy, height * 0.6)
        sun.addColorStop(0, rgba(0.22))
        sun.addColorStop(1, rgba(0))
        ctx.fillStyle = sun
        ctx.fillRect(0, 0, width, height)
    },

    clock(t) {
        const cx = width / 2 + shift.x
        const cy = height * 0.45 + shift.y
        const radius = Math.min(width, height) * 0.46
        const turn = t * 0.015
        const hand = reduced ? -Math.PI / 2 : t * 0.5 - Math.PI / 2
        ctx.lineCap = 'round'
        for (let i = 0; i < 60; i++) {
            const a = turn + i / 60 * Math.PI * 2
            const major = i % 5 === 0
            const inner = radius * (major ? 0.86 : 0.92)
            const x1 = cx + Math.cos(a) * inner
            const y1 = cy + Math.sin(a) * inner
            const x2 = cx + Math.cos(a) * radius
            const y2 = cy + Math.sin(a) * radius
            const behind = ((hand - a) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2)
            const trail = Math.max(0, 1 - behind / 1.2)
            ctx.lineWidth = major ? 3 : 1.5
            ctx.strokeStyle = rgba(0.18 + trail * 0.45 + glowAt(x2, y2) * 0.45)
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.stroke()
        }
        ctx.lineWidth = 1
        ctx.strokeStyle = rgba(0.12)
        for (const f of [0.55, 0.75]) {
            ctx.beginPath()
            ctx.arc(cx, cy, radius * f, 0, Math.PI * 2)
            ctx.stroke()
        }
        ctx.lineWidth = 2
        ctx.strokeStyle = rgba(0.3)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(hand) * radius * 0.82, cy + Math.sin(hand) * radius * 0.82)
        ctx.stroke()
    },

    pulse(t) {
        const cx = width / 2 + shift.x
        const cy = height * 0.42 + shift.y
        const max = Math.max(width, height) * 0.75
        ctx.lineWidth = 2
        for (let k = 0; k < 6; k++) {
            const phase = reduced ? k / 6 : (t * 0.22 + k / 6) % 1
            const size = 140 + phase * max
            roundRectPath(cx, cy, size, size * 0.22)
            ctx.strokeStyle = rgba((1 - phase) * 0.2 + glowAt(cx + size / 2, cy, 260) * 0.15 * (1 - phase))
            ctx.stroke()
        }
    },

    chevronsUp(t) {
        drawChevrons(t, -1, {speed: 22, speedRange: 18, size: 22, sizeRange: 22, line: 10, area: 20000, span: 120})
    },

    chevronsDown(t) {
        drawChevrons(t, 1, {speed: 9, speedRange: 6, size: 8, sizeRange: 10, line: 2.5, area: 8500, span: 60})
    },

    speed(t) {
        ctx.lineCap = 'round'
        for (let i = 0; i < countFor(7000); i++) {
            const length = 40 + hash(i, 1) * 140
            const span = width + length * 2
            const x = loopY(t, 140 + hash(i, 2) * 220, hash(i, 3), span) - length + shift.x
            const y = hash(i, 4) * height + shift.y
            const a = 0.14 + hash(i, 5) * 0.2 + glowAt(x, y) * 0.4
            const grad = ctx.createLinearGradient(x - length, y, x, y)
            grad.addColorStop(0, rgba(0))
            grad.addColorStop(1, rgba(a))
            ctx.strokeStyle = grad
            ctx.lineWidth = 1.5 + hash(i, 6) * 2
            ctx.beginPath()
            ctx.moveTo(x - length, y)
            ctx.lineTo(x, y)
            ctx.stroke()
        }
    },

    constellation(t) {
        const stars = []
        for (let i = 0; i < countFor(6000); i++) {
            stars.push({
                x: hash(i, 1) * width + Math.sin(t * 0.08 + i) * 24 + shift.x,
                y: hash(i, 2) * height + Math.cos(t * 0.07 + i * 1.3) * 24 + shift.y,
                tw: reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.2 + hash(i, 3) * 30),
            })
        }
        ctx.lineWidth = 1
        for (let i = 0; i < stars.length; i++) {
            for (let j = i + 1; j < stars.length; j++) {
                const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y)
                if (d > 130) continue
                const near = glowAt((stars[i].x + stars[j].x) / 2, (stars[i].y + stars[j].y) / 2, 220)
                ctx.strokeStyle = rgba((1 - d / 130) * (0.28 + near * 0.4))
                ctx.beginPath()
                ctx.moveTo(stars[i].x, stars[i].y)
                ctx.lineTo(stars[j].x, stars[j].y)
                ctx.stroke()
            }
        }
        for (const s of stars) {
            ctx.fillStyle = rgba(0.4 + s.tw * 0.4 + glowAt(s.x, s.y) * 0.4)
            ctx.beginPath()
            ctx.arc(s.x, s.y, 1.5 + s.tw * 1.5, 0, Math.PI * 2)
            ctx.fill()
        }
    },

    bubbles(t) {
        const span = height + 120
        for (let i = 0; i < countFor(14000); i++) {
            const r = 6 + hash(i, 1) ** 2 * 34
            const x = hash(i, 2) * width + Math.sin(t * 0.6 + i * 2) * 12 + shift.x
            const y = height + 60 - loopY(t, 8 + (1 - r / 40) * 16, hash(i, 3), span) + shift.y
            const glow = glowAt(x, y)
            ctx.fillStyle = rgba(0.05 + glow * 0.1)
            ctx.strokeStyle = rgba(0.2 + glow * 0.4)
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fill()
            ctx.stroke()
        }
    },

    letters(t) {
        const cell = 36
        ctx.font = '700 18px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let c = -1; c < Math.ceil(width / cell) + 1; c++) {
            for (let r = -1; r < Math.ceil(height / cell) + 1; r++) {
                const x = c * cell + cell / 2 + shift.x
                const y = r * cell + cell / 2 + shift.y
                const twinkle = reduced ? 0 : Math.max(0, Math.sin(t * 0.5 + hash(c, r) * 50)) ** 10
                const glow = glowAt(x, y, 170)
                ctx.fillStyle = rgba(0.08 + twinkle * 0.3 + glow * 0.45)
                ctx.fillText(LETTERS[Math.floor(hash(r, c) * LETTERS.length)], x, y)
            }
        }
    },

    confetti(t) {
        const span = height + 40
        for (let i = 0; i < countFor(6000); i++) {
            const x = hash(i, 1) * width + Math.sin(t * (0.6 + hash(i, 2)) + i) * 18 + shift.x
            const y = loopY(t, 18 + hash(i, 3) * 26, hash(i, 4), span) - 20 + shift.y
            const spin = reduced ? i : t * (1 + hash(i, 5) * 3) + i
            const w = 4 + hash(i, 6) * 5
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate(spin)
            ctx.scale(1, Math.abs(Math.cos(spin * 1.3)) * 0.8 + 0.2)
            ctx.fillStyle = rgba(0.3 + hash(i, 7) * 0.25 + glowAt(x, y) * 0.4)
            ctx.fillRect(-w / 2, -w * 0.3, w, w * 0.6)
            ctx.restore()
        }
    },
}

function drawChevrons(t, dir, o) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const span = height + o.span
    for (let i = 0; i < countFor(o.area); i++) {
        const size = o.size + hash(i, 1) * o.sizeRange
        const x = hash(i, 2) * width + Math.sin(t * 0.4 + i) * 5 + shift.x
        const travel = loopY(t, o.speed + hash(i, 3) * o.speedRange, hash(i, 4), span)
        const y = (dir < 0 ? height + o.span / 2 - travel : travel - o.span / 2) + shift.y
        ctx.lineWidth = o.line * (0.8 + hash(i, 6) * 0.4)
        ctx.strokeStyle = rgba(0.22 + hash(i, 5) * 0.12 + glowAt(x, y) * 0.5)
        ctx.beginPath()
        ctx.moveTo(x - size, y - dir * size * 0.6)
        ctx.lineTo(x, y + dir * size * 0.3)
        ctx.lineTo(x + size, y - dir * size * 0.6)
        ctx.stroke()
    }
}

function resize() {
    const el = canvas.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = rect.width
    height = rect.height
    el.width = Math.round(width * dpr)
    el.height = Math.round(height * dpr)
    ctx = el.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!light.x) {
        light.x = light.tx = width * (props.fade === 'right' ? 0.8 : 0.5)
        light.y = light.ty = height * 0.5
    }
    if (reduced || !frame) draw(performance.now())
}

function draw(now) {
    if (!ctx || !width) return
    const t = now / 1000
    if (!reduced && now - lastInput > IDLE_MS) {
        const right = props.fade === 'right'
        light.tx = width * (right ? 0.72 + 0.18 * Math.sin(t * 0.23) : 0.5 + 0.35 * Math.sin(t * 0.23))
        light.ty = height * (0.5 + 0.35 * Math.sin(t * 0.31 + 1.3))
        shift.tx = Math.sin(t * 0.17) * PARALLAX * 0.4
        shift.ty = Math.cos(t * 0.13) * PARALLAX * 0.4
    }
    light.x += (light.tx - light.x) * EASE
    light.y += (light.ty - light.y) * EASE
    shift.x += (shift.tx - shift.x) * EASE
    shift.y += (shift.ty - shift.y) * EASE
    ctx.clearRect(0, 0, width, height)
    ;(PATTERNS[props.pattern] ?? PATTERNS.honeycomb)(t)
}

function loop(now) {
    draw(now)
    frame = visible && !reduced && document.visibilityState === 'visible' ? requestAnimationFrame(loop) : null
}

function start() {
    if (!frame && visible && !reduced && document.visibilityState === 'visible') frame = requestAnimationFrame(loop)
}

function steer(fx, fy) {
    lastInput = performance.now()
    light.tx = fx * width
    light.ty = fy * height
    shift.tx = (0.5 - fx) * PARALLAX * 2
    shift.ty = (0.5 - fy) * PARALLAX * 2
    start()
}

function onPointerMove(e) {
    if (!visible || !canvas.value) return
    const rect = canvas.value.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    if (fx < -0.25 || fx > 1.25 || fy < -0.5 || fy > 1.5) return
    steer(Math.min(1.1, Math.max(-0.1, fx)), Math.min(1.1, Math.max(-0.1, fy)))
}

function onOrientation(e) {
    if (!visible || e.gamma === null || e.beta === null) return
    const fx = 0.5 + Math.max(-1, Math.min(1, e.gamma / 30)) * 0.45
    const fy = 0.5 + Math.max(-1, Math.min(1, (e.beta - 45) / 30)) * 0.45
    steer(fx, fy)
}

function onVisibility() {
    if (document.visibilityState === 'visible') start()
}

function iconLayer() {
    const el = canvas.value
    if (!layerCtx) layerCtx = document.createElement('canvas').getContext('2d')
    const c = layerCtx.canvas
    if (c.width !== el.width || c.height !== el.height) {
        c.width = el.width
        c.height = el.height
    }
    layerCtx.setTransform(el.width / width, 0, 0, el.height / height, 0, 0)
    layerCtx.clearRect(0, 0, width, height)
    return layerCtx
}

async function loadIcon() {
    const ids = props.icons.length ? props.icons : [props.icon].filter(Boolean)
    if (!ids.length) return
    try {
        const text = await (await fetch(spriteFile())).text()
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
        const tint = getComputedStyle(canvas.value).getPropertyValue('--puzzle-tile-shadow').trim()
        if (tint) {
            const [r, g, b] = tint.split(',').map(n => Math.round(Number(n) * 0.35))
            tileFill = `rgb(${r}, ${g}, ${b})`
        }
        const images = await Promise.all(ids.map((id) => {
            const symbol = doc.getElementById(id)
            if (!symbol) return null
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.getAttribute('viewBox') ?? '0 0 100 100'}" fill="${symbol.getAttribute('fill') ?? 'none'}" color="#fff">${symbol.innerHTML}</svg>`
            return new Promise((resolve) => {
                const image = new Image()
                image.onload = () => resolve(image)
                image.onerror = () => resolve(null)
                image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
            })
        }))
        iconImages = images.filter(Boolean)
        if (reduced || !frame) draw(performance.now())
    } catch {
        //
    }
}

onMounted(() => {
    loadIcon()
    reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas.value)
    intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting
        start()
    })
    intersectionObserver.observe(canvas.value)
    resize()
    if (reduced) return
    document.addEventListener('visibilitychange', onVisibility)
    if (!props.interactive) return
    window.addEventListener('pointermove', onPointerMove, {passive: true})
    window.addEventListener('deviceorientation', onOrientation, {passive: true})
})

onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame)
    resizeObserver?.disconnect()
    intersectionObserver?.disconnect()
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('deviceorientation', onOrientation)
    document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
    <canvas ref="canvas" class="ambient-field" :class="`ambient-field--${fade}`" aria-hidden="true"></canvas>
</template>

<style scoped>
.ambient-field {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    pointer-events: none;
}

.ambient-field--right {
    mask-image: linear-gradient(to left, #000 0%, rgba(0, 0, 0, .55) 35%, transparent 75%);

    &:dir(rtl) {
        mask-image: linear-gradient(to right, #000 0%, rgba(0, 0, 0, .55) 35%, transparent 75%);
    }
}

.ambient-field--left {
    mask-image: linear-gradient(to right, #000 0%, rgba(0, 0, 0, .5) 40%, transparent 85%);

    &:dir(rtl) {
        mask-image: linear-gradient(to left, #000 0%, rgba(0, 0, 0, .5) 40%, transparent 85%);
    }
}

.ambient-field--bottom {
    mask-image: linear-gradient(to top, #000 0%, rgba(0, 0, 0, .5) 35%, transparent 80%);
}

.ambient-field--top {
    mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, .5) 35%, transparent 80%);
}

.ambient-field--radial {
    mask-image: radial-gradient(circle at 50% 45%, #000 0%, rgba(0, 0, 0, .45) 45%, transparent 80%);
}
</style>
