<script setup>
import {canPlay} from '@/lib/campaign/schedule'
import {drawerOrnament, drawerWood} from '@/lib/campaign/advent'

const props = defineProps({
    day: {type: Object, required: true},
    puzzle: {type: Object, required: true},
    to: {type: String, default: null},
    opened: {type: Boolean, default: false},
    started: {type: Boolean, default: false},
})
const emit = defineEmits(['select'])

const {t} = useI18n()

const locked = computed(() => props.day.state === 'locked')
const completed = computed(() => props.day.state === 'done' || props.day.state === 'late')
const playable = computed(() => !!props.to && canPlay(props.day.state))
const pulled = computed(() => completed.value || (props.opened && !locked.value))
const icon = computed(() => props.puzzle.icon ?? (props.puzzle.tag ?? '').replaceAll('-', ''))
const ornament = computed(() => drawerOrnament(props.day.day))

const opening = ref(false)
let timer = null
watch(pulled, (now, before) => {
    if (!now || before) return
    opening.value = true
    clearTimeout(timer)
    timer = setTimeout(() => opening.value = false, 1700)
})
onBeforeUnmount(() => clearTimeout(timer))

const BAUBLES = ['#b3262f', '#c9973f', '#2e6b4f', '#8e3a5c']

const woodStyle = computed(() => {
    const w = drawerWood(props.day.day)
    return {'--wood': w.wood, '--wood-dark': w.dark, '--bauble': BAUBLES[props.day.day % BAUBLES.length], '--sway': props.day.day % 4}
})

const label = computed(() => {
    const name = t('campaign.dayN', {day: props.day.day})
    if (!pulled.value && playable.value) return t('campaign.advent.open', {day: props.day.day})
    if (!pulled.value) return `${name}: ${t(`campaign.states.${props.day.state}`)}`
    return `${name}, ${props.puzzle.variant || props.puzzle.name}: ${t(`campaign.states.${props.day.state}`)}`
})

const crumbs = computed(() => {
    let seed = props.day.day * 9301 + 49297
    const next = () => (seed = (seed * 9301 + 49297) % 233280) / 233280
    return Array.from({length: 11}, (_, i) => ({
        left: `${22 + next() * 56}%`,
        top: `${25 + next() * 55}%`,
        '--crumb': `${(i < 3 ? 5 : 2.5) + next() * 3}cqmin`,
        rotate: `${Math.round(next() * 360)}deg`,
    }))
})

const root = ref(null)
</script>

<template>
    <button
        ref="root"
        type="button"
        :disabled="!playable"
        class="drawer"
        :style="woodStyle"
        :class="[`drawer--${day.state}`, {'drawer--pulled': pulled, 'drawer--opening': opening, 'drawer--live': playable && !pulled}]"
        :aria-label="label"
        aria-haspopup="dialog"
        @click="emit('select', day, root)"
    >
        <span class="drawer__recess" aria-hidden="true">
            <span v-if="completed" class="drawer__crumbs">
                <span v-for="(c, i) in crumbs" :key="i" class="drawer__crumb" :style="c"></span>
            </span>
            <span v-else-if="!locked" class="drawer__chocolate" :class="{'drawer__chocolate--bitten': started}">
                <svg><use :href="sprite(icon)" /></svg>
            </span>
            <span v-if="completed" class="drawer__done" :class="{'drawer__done--late': day.state === 'late'}">
                <svg><use :href="sprite('tick')" /></svg>
            </span>
        </span>
        <span class="drawer__body" aria-hidden="true">
            <span class="drawer__front" :class="{'drawer__front--grooved': ornament === 'grooves'}">
            <span class="drawer__notch"></span>
            <svg v-if="ornament === 'snowflake'" class="drawer__ornament" viewBox="0 0 40 40">
                <path d="M20 4v32M6.1 12l27.8 16M6.1 28l27.8-16M20 4l-3 3m3-3 3 3M20 36l-3-3m3 3 3-3M6.1 12l1 4m-1-4 4-1M33.9 28l-1-4m1 4-4 1M6.1 28l4 1m-4-1 1-4M33.9 12l-4-1m4 1-1 4" />
            </svg>
            <svg v-else-if="ornament === 'sprig'" class="drawer__ornament" viewBox="0 0 40 40">
                <path d="M20 36V8M20 14c-4-4-9-4-11-2 3 3 8 4 11 2Zm0 0c4-4 9-4 11-2-3 3-8 4-11 2ZM20 23c-5-4-11-3-13-1 4 3 9 4 13 1Zm0 0c5-4 11-3 13-1-4 3-9 4-13 1ZM20 8c-1-2 0-4 0-4s1 2 0 4" />
            </svg>
            <svg v-else-if="ornament === 'swirl'" class="drawer__ornament" viewBox="0 0 40 40">
                <path d="M20 20c-6 0-10-3-10-7s3-6 6-5 3 4 1 5M20 20c6 0 10-3 10-7s-3-6-6-5-3 4-1 5M20 20c-6 0-10 3-10 7s3 6 6 5 3-4 1-5M20 20c6 0 10 3 10 7s-3 6-6 5-3-4-1-5" />
            </svg>
            <span class="drawer__number">{{ day.day }}</span>
            <span class="drawer__knob"></span>
            </span>
            <span v-if="locked" class="drawer__bauble">
                <svg><use :href="sprite('padlock')" /></svg>
            </span>
        </span>
    </button>
</template>

<style scoped>
.drawer {
    position: relative;
    container-type: size;
    display: block;
    inline-size: 100%;
    block-size: 100%;
    padding: 0;
    border: 0;
    border-radius: 1.6cqmin;
    background: transparent;
    cursor: pointer;
    font: inherit;
    color: #3b1d14;
    text-decoration: none;

    &:focus-visible {
        outline: .3rem solid #e8c77d;
        outline-offset: .3rem;
    }

    &:disabled {
        cursor: default;
    }

    &.drawer--live {
        z-index: 1;
    }

    &.drawer--opening {
        z-index: 5;
    }

    @media (hover: hover) {
        &.drawer--live:hover {
            z-index: 2;
        }
    }

    &.drawer--pulled:not(:disabled):hover .drawer__chocolate {
        translate: 0 -1.5cqmin;
        rotate: 0deg;
    }
}

.drawer__recess {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    border-style: solid;
    border-width: 11cqmin 13cqmin 15cqmin;
    border-color: #120604 #2a120b #5a3019 #2a120b;
    border-radius: inherit;
    background: radial-gradient(120% 100% at 50% 100%, #3a1a0f, #1c0b06);
    box-shadow:
        inset 0 2cqmin 3cqmin rgba(0, 0, 0, .7),
        0 0 0 .2cqmin rgba(0, 0, 0, .5);

    &::before {
        content: '';
        position: absolute;
        inset-inline: 14%;
        inset-block-end: -11cqmin;
        block-size: 10cqmin;
        border-radius: 50%;
        background: radial-gradient(closest-side, rgba(0, 0, 0, .6), transparent);
    }
}

.drawer__chocolate {
    position: relative;
    display: grid;
    place-items: center;
    inline-size: 50cqmin;
    block-size: 50cqmin;
    margin-block-start: 10cqmin;
    border-radius: 8cqmin;
    background:
        radial-gradient(120% 70% at 30% 10%, rgba(255, 255, 255, .22), transparent 55%),
        linear-gradient(180deg, #9a4b35, #5c2016);
    box-shadow:
        inset 0 .8cqmin 0 rgba(255, 255, 255, .22),
        inset 0 -1.2cqmin 1.6cqmin rgba(0, 0, 0, .35),
        0 2cqmin 3cqmin rgba(0, 0, 0, .55);
    color: #f0d590;
    rotate: -3deg;
    transition: translate .2s ease, rotate .2s ease;

    svg {
        inline-size: 30cqmin;
        block-size: 30cqmin;
        filter: drop-shadow(0 .4cqmin 0 rgba(0, 0, 0, .35));
    }

    &.drawer__chocolate--bitten {
        mask:
            radial-gradient(circle at 96% 4%, transparent 12cqmin, #000 12.4cqmin),
            radial-gradient(circle at 70% -6%, transparent 8cqmin, #000 8.4cqmin),
            radial-gradient(circle at 106% 34%, transparent 8cqmin, #000 8.4cqmin);
        mask-composite: intersect;
    }

    .drawer--missed & {
        filter: saturate(.6) brightness(.8);
    }
}

.drawer__crumbs {
    position: absolute;
    inset-inline: 0;
    inset-block-end: -15cqmin;
    block-size: 15cqmin;
}

.drawer__crumb {
    position: absolute;
    inline-size: var(--crumb);
    block-size: calc(var(--crumb) * .6);
    background: linear-gradient(160deg, #c27350, #7a3324 60%, #4a1a10);
    clip-path: polygon(10% 20%, 55% 0, 100% 30%, 85% 85%, 35% 100%, 0 65%);
    filter: drop-shadow(0 .4cqmin .3cqmin rgba(0, 0, 0, .5));
    translate: -50% -50%;
}

.drawer__done {
    position: absolute;
    z-index: 1;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    display: grid;
    place-items: center;
    color: #6e3c22;
    filter:
        drop-shadow(0 -.4cqmin 0 rgba(0, 0, 0, .75))
        drop-shadow(0 .4cqmin 0 rgba(255, 214, 160, .2));
    translate: -50% -50%;

    svg {
        inline-size: 30cqmin;
        block-size: 30cqmin;
        stroke-width: 3;
    }

    &.drawer__done--late {
        opacity: .6;
    }
}

.drawer__front {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: inherit;
    background:
        repeating-linear-gradient(178deg, rgba(0, 0, 0, .06) 0 .2rem, transparent .2rem .7rem, rgba(255, 255, 255, .03) .7rem .9rem, transparent .9rem 1.6rem),
        linear-gradient(180deg, color-mix(in srgb, var(--wood) 85%, #fff) 0%, var(--wood) 35%, var(--wood-dark) 100%);
    box-shadow:
        inset 0 .5cqmin 0 rgba(255, 255, 255, .18),
        inset .5cqmin 0 0 rgba(255, 255, 255, .08),
        inset 0 -.8cqmin 0 rgba(0, 0, 0, .35),
        inset -.5cqmin 0 0 rgba(0, 0, 0, .2),
        0 .8cqmin 1.6cqmin rgba(0, 0, 0, .45);
    transition: box-shadow .3s ease;

    &.drawer__front--grooved {
        background:
            repeating-linear-gradient(90deg, transparent 0 8cqmin, rgba(0, 0, 0, .22) 8cqmin 8.8cqmin, rgba(255, 255, 255, .08) 8.8cqmin 9.4cqmin),
            linear-gradient(180deg, color-mix(in srgb, var(--wood) 85%, #fff) 0%, var(--wood) 35%, var(--wood-dark) 100%);
    }

    .drawer--locked & {
        filter: brightness(.82) saturate(.85);
    }

    .drawer--opening & {
        box-shadow:
            inset 0 .5cqmin 0 rgba(255, 255, 255, .18),
            inset 0 -.8cqmin 0 rgba(0, 0, 0, .35),
            0 3cqmin 6cqmin rgba(0, 0, 0, .55);
    }
}

.drawer__body {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    transform-origin: 50% 0;
    transition: transform .35s cubic-bezier(.3, 1.3, .5, 1);

    .drawer--today.drawer--live & {
        animation: drawer-breathe .7s ease-in-out infinite alternate;
    }

    .drawer--pulled & {
        visibility: hidden;
    }

    .drawer--opening & {
        animation: drawer-pull 1.6s cubic-bezier(.45, .05, .25, 1) both;
    }

    @media (hover: hover) {
        .drawer--live:hover & {
            transform: scale(1.04);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
        animation: none !important;
    }
}

.drawer__bauble {
    position: absolute;
    inset-block-start: calc(58% + 3cqmin);
    inset-inline-start: 50%;
    display: grid;
    place-items: end center;
    inline-size: 24cqmin;
    block-size: 36cqmin;
    margin-inline-start: -12cqmin;
    transform-origin: 50% 0;
    animation: bauble-sway 4s ease-in-out infinite;
    animation-delay: calc(var(--sway, 0) * -1s);

    &::before {
        content: '';
        position: absolute;
        inset-block: 0 22cqmin;
        inset-inline-start: 50%;
        inline-size: .15rem;
        background: #e8c77d;
        translate: -50% 0;
    }

    &::after {
        content: '';
        position: absolute;
        inset-block-end: 22.5cqmin;
        inset-inline-start: 50%;
        inline-size: 7cqmin;
        block-size: 4cqmin;
        border-radius: .8cqmin .8cqmin 0 0;
        background: linear-gradient(90deg, #8a6322, #f6dc9a, #8a6322);
        translate: -50% 0;
    }

    svg {
        inline-size: 24cqmin;
        block-size: 24cqmin;
        padding: 6cqmin;
        border-radius: 50%;
        background:
            radial-gradient(circle at 32% 26%, rgba(255, 255, 255, .3) 0 1.2cqmin, transparent 3.6cqmin),
            radial-gradient(circle at 40% 35%, color-mix(in srgb, var(--bauble) 60%, #fff), var(--bauble) 55%, color-mix(in srgb, var(--bauble) 60%, #000));
        box-shadow: 0 1cqmin 1.8cqmin rgba(0, 0, 0, .5);
        color: #f6dc9a;
        stroke: #2a120b;
        stroke-width: 1.4;
        stroke-linejoin: round;
        paint-order: stroke fill;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.drawer__notch {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 50%;
    inline-size: 18cqmin;
    block-size: 7cqmin;
    border-radius: 0 0 9cqmin 9cqmin;
    background: linear-gradient(180deg, #140805, #2a120c);
    box-shadow: inset 0 -.4cqmin 0 rgba(255, 255, 255, .12);
    translate: -50% 0;
}

.drawer__ornament {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    inline-size: 58cqmin;
    block-size: 58cqmin;
    fill: none;
    stroke: #e8c77d;
    stroke-width: 1.2;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: .75;
    translate: -50% -42%;
}

.drawer__number {
    position: absolute;
    inset-block-start: 14cqmin;
    inset-inline: 0;
    color: #f0d590;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22cqmin;
    font-style: italic;
    font-weight: 700;
    line-height: 1;
    text-align: center;
    text-shadow: 0 .4cqmin 0 rgba(0, 0, 0, .45);
}

.drawer__knob {
    position: absolute;
    inset-block-start: 58%;
    inset-inline-start: 50%;
    inline-size: 13cqmin;
    block-size: 13cqmin;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff1c4 0 8%, #e2b45c 30%, #9c6c22 70%, #5e3d10);
    box-shadow:
        0 1.2cqmin 1.6cqmin rgba(0, 0, 0, .55),
        inset 0 -.6cqmin .8cqmin rgba(0, 0, 0, .35);
    translate: -50% -50%;
}

@keyframes drawer-pull {
    0% { transform: none; opacity: 1; visibility: visible; }
    6% { transform: translateY(-1cqmin); visibility: visible; }
    22% { transform: translateY(8cqmin) scale(1.06); }
    30% { transform: translateY(7cqmin) scale(1.06) rotate(-.6deg); }
    38% { transform: translateY(8cqmin) scale(1.06); }
    75% { transform: translateY(8cqmin) scale(1.06); opacity: 1; }
    100% { transform: translateY(24cqmin) scale(1.1); opacity: 0; visibility: visible; }
}

@keyframes drawer-breathe {
    from { transform: none; }
    to { transform: translateY(1.5cqmin) scale(1.03); }
}

@keyframes bauble-sway {
    0%, 100% { rotate: 6deg; }
    50% { rotate: -6deg; }
}
</style>
