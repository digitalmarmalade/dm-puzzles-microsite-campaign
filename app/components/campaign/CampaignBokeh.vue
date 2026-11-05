<script setup>
const COLOURS = ['255, 214, 140', '255, 196, 110', '255, 224, 160', '255, 150, 90', '255, 120, 80', '255, 236, 190']
const BAND = 240

let seed = 7
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647

const lights = Array.from({length: 30}, () => {
    const depth = .08 + random() * .5
    return {
        y: random(),
        depth,
        style: {
            left: `${random() * 100}%`,
            '--size': `${(1.2 + depth * 14 + random() * 3).toFixed(1)}rem`,
            '--colour': COLOURS[Math.floor(random() * COLOURS.length)],
            '--glow': (.12 + random() * .3).toFixed(2),
            '--drift-x': `${((random() - .5) * 6).toFixed(1)}rem`,
            '--drift-y': `${((random() - .5) * 5).toFixed(1)}rem`,
            '--drift': `${(9 + random() * 12).toFixed(1)}s`,
            '--twinkle': `${(3 + random() * 5).toFixed(1)}s`,
            '--delay': `${(-random() * 12).toFixed(1)}s`,
        },
    }
})

const layer = ref(null)
let frame = null

function place() {
    frame = null
    const span = window.innerHeight + BAND * 2
    const scrolled = window.scrollY
    ;[...(layer.value?.children ?? [])].forEach((el, i) => {
        const light = lights[i]
        const y = ((light.y * span - scrolled * light.depth) % span + span) % span - BAND
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`
    })
}

function queue() {
    frame ??= requestAnimationFrame(place)
}

onMounted(() => {
    place()
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    window.addEventListener('scroll', queue, {passive: true})
    window.addEventListener('resize', queue)
})

onBeforeUnmount(() => {
    window.removeEventListener('scroll', queue)
    window.removeEventListener('resize', queue)
    cancelAnimationFrame(frame)
})
</script>

<template>
    <div ref="layer" class="bokeh" aria-hidden="true">
        <span v-for="(light, i) in lights" :key="i" class="bokeh__light" :style="light.style">
            <span class="bokeh__glow"></span>
        </span>
    </div>
</template>

<style scoped>
.bokeh {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
}

.bokeh__light {
    position: absolute;
    inset-block-start: 0;
    will-change: transform;
}

.bokeh__glow {
    display: block;
    inline-size: var(--size);
    block-size: var(--size);
    border-radius: 50%;
    background: radial-gradient(circle, rgba(var(--colour), var(--glow)) 0, rgba(var(--colour), calc(var(--glow) * .55)) 38%, transparent 70%);
    translate: -50% -50%;
    animation:
        bokeh-drift var(--drift) ease-in-out var(--delay) infinite alternate,
        bokeh-twinkle var(--twinkle) ease-in-out var(--delay) infinite alternate;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

@keyframes bokeh-drift {
    to {
        transform: translate(var(--drift-x), var(--drift-y));
    }
}

@keyframes bokeh-twinkle {
    from {
        opacity: .45;
    }

    to {
        opacity: 1;
    }
}
</style>
