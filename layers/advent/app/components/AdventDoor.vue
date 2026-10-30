<script setup>
import {YEAR, motifImage, paperFor} from '../lib/advent'

const props = defineProps({
    door: {type: Object, required: true},
    opened: {type: Boolean, default: false},
    still: {type: Boolean, default: false},
    plain: {type: Boolean, default: false},
    tagless: {type: Boolean, default: false},
})
const emit = defineEmits(['select'])
const {t} = useI18n()
const dateLocale = useDateLocale()

const locked = computed(() => props.door.state === 'locked')
const swung = computed(() => !locked.value && props.opened)
const opening = ref(false)
let timer = null

watch(swung, (now, before) => {
    if (!now || before) return
    opening.value = true
    clearTimeout(timer)
    timer = setTimeout(() => { opening.value = false }, 1400)
})
onBeforeUnmount(() => clearTimeout(timer))

const paperStyle = computed(() => {
    const p = paperFor(props.door.day)
    return {'--paper': p.paper, '--paper-dark': p.dark, '--ribbon': p.ribbon, '--ribbon-edge': p.edge, '--motif': motifImage(props.door.day)}
})
const dateText = computed(() => new Intl.DateTimeFormat(dateLocale.value, {day: 'numeric', month: 'long'})
    .format(new Date(YEAR, 11, props.door.day)))

const label = computed(() => {
    if (locked.value) return `${t('advent.door.label', {day: props.door.day})}, ${t('advent.door.locked', {date: dateText.value})}`
    if (!swung.value) return t('advent.door.open', {day: props.door.day})
    const state = props.door.state === 'open' ? 'today' : props.door.state
    return `${t('advent.door.label', {day: props.door.day})}: ${t(`advent.task.${props.door.kind}.title`)}, ${t(`advent.door.${state}`)}`
})
</script>

<template>
    <button
        type="button"
        class="present"
        :style="paperStyle"
        :class="[`present--${door.state}`, {'present--opened': swung, 'present--opening': opening, 'present--still': still}]"
        :disabled="locked || still"
        :tabindex="still ? -1 : null"
        :aria-hidden="still ? 'true' : null"
        :aria-label="label"
        @click="emit('select', door)"
    >
        <span v-if="!locked" class="present__inside" aria-hidden="true">
            <span v-if="door.state === 'done' || door.state === 'late'" class="present__done" :class="{'present__done--late': door.state === 'late'}">
                <svg><use :href="sprite('tick')" /></svg>
            </span>
            <span v-else class="present__pill" :class="`present__pill--${door.state}`">
                {{ door.state === 'open' ? t('advent.door.today') : t('advent.door.missed') }}
            </span>
            <span class="present__task">{{ t(`advent.task.${door.kind}.short`) }}</span>
            <span class="present__day">{{ door.day }}</span>
        </span>
        <span class="present__flap" aria-hidden="true">
            <span class="present__front">
                <span class="present__ribbon present__ribbon--h"></span>
                <span class="present__ribbon present__ribbon--v"></span>
                <span v-if="!plain" class="present__seal">{{ door.day }}</span>
            </span>
            <span class="present__back"></span>
            <span class="present__edge"></span>
        </span>
        <span v-if="locked && !plain && !tagless" class="present__lock" aria-hidden="true">
            <svg><use :href="sprite('padlock')" /></svg>
        </span>
    </button>
</template>

<style scoped>
.present {

    position: relative;
    container-type: inline-size;
    aspect-ratio: 1;
    inline-size: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    perspective: 200rem;
    cursor: pointer;
    font: inherit;
    color: var(--advent-ink);
    transition: transform .25s ease;











    &:focus-visible {
        outline: .3rem solid var(--advent-gold);
        outline-offset: .3rem;
        border-radius: .8rem;
    }

    &:disabled {
        cursor: default;
    }

    &.present--locked {
        filter: brightness(.9);
    }

    &.present--opened {
        z-index: 2;
    }

    &.present--still {
        cursor: default;
        filter: none;
        animation: none;
    }

    &.present--open:not(.present--opened):not(.present--still) {
        animation: present-hop 3.4s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none !important;
    }
}

.present__inside,
.present__flap {
    position: absolute;
    inset: 5cqi;
}

.present__inside {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3cqi;
    padding: 16cqi 6cqi 6cqi;
    overflow: hidden;
    border-radius: 5.6cqi;
    background:
        radial-gradient(circle at 50% 45%, #fffaf0, transparent 75%),
        var(--advent-paper);
    box-shadow:
        inset 3cqi 0 4cqi -2cqi rgba(7, 27, 87, .45),
        inset 0 0 0 .1rem rgba(7, 27, 87, .2);
    text-align: center;

    &::after {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 55% 45%, rgba(246, 217, 142, .95), transparent 70%);
        opacity: 0;
        pointer-events: none;
    }

    .present--opening &::after {
        animation: present-glow 1.3s ease-out;
    }

    .present--missed & {
        background:
            repeating-linear-gradient(135deg, transparent 0 .6rem, rgba(29, 42, 77, .05) .6rem 1.2rem),
            var(--advent-paper);
    }
}

.present__done {
    display: grid;
    place-items: center;
    block-size: 15cqi;
    padding-inline: 4.5cqi;
    border: .5cqi solid var(--paper-dark);
    border-radius: 99rem;
    background: var(--paper-dark);
    color: #fff;

    svg {
        inline-size: 9cqi;
        block-size: 9cqi;
    }

    &.present__done--late {
        background: transparent;
        color: var(--paper-dark);
    }
}

.present__pill {
    padding: 1.5cqi 5cqi;
    border-radius: 99rem;
    font-size: max(.9rem, 8.5cqi);
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: .04em;
    text-transform: uppercase;

    &.present__pill--open {
        background: var(--advent-night-deep);
        color: var(--advent-gold-light);
    }

    &.present__pill--missed {
        background: rgba(29, 42, 77, .1);
        color: var(--advent-ink);
    }
}

.present__task {
    font-size: max(1rem, 11cqi);
    font-weight: 700;
    line-height: 1.15;
}

.present__day {
    position: absolute;
    inset-block-start: 4cqi;
    inset-inline-end: 7cqi;
    font-size: max(1.2rem, 15cqi);
    font-weight: 700;
    line-height: 1;
    opacity: .45;
}

.present__flap {
    transform-origin: left center;
    transform-style: preserve-3d;
    transition: transform .45s cubic-bezier(.3, 1.2, .5, 1);

    .present--opened & {
        transform: rotateY(-95deg);
    }

    .present--opening & {
        animation: present-open 1.25s cubic-bezier(.45, .05, .25, 1) both;
    }

    @media (hover: hover) {
        .present:not(:disabled):not(.present--opened):hover & {
            transform: rotateY(-12deg);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
        animation: none !important;
    }
}

.present__front,
.present__back {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 5.6cqi;
    backface-visibility: hidden;
}

.present__front {
    background:
        linear-gradient(45deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, .33) 42%, rgba(255, 255, 255, .33) 79%, rgba(255, 255, 255, 0) 100%),
        var(--motif) 3.5cqi 1.4cqi / 16.6cqi 17.4cqi,
        var(--paper);
    box-shadow:
        inset 0 2.2cqi 1.2cqi -.4cqi rgba(255, 255, 255, .5),
        inset 0 -2.8cqi 2.4cqi -.4cqi color-mix(in srgb, var(--paper-dark) 60%, transparent),
        0 1.6cqi 3cqi rgba(7, 27, 87, .4);

    .present--open:not(.present--opened):not(.present--still) & {
        box-shadow:
            inset 0 2.2cqi 1.2cqi -.4cqi rgba(255, 255, 255, .5),
            inset 0 -2.8cqi 2.4cqi -.4cqi color-mix(in srgb, var(--paper-dark) 60%, transparent),
            0 0 0 1.4cqi var(--advent-gold-light),
            0 0 8cqi 2cqi rgba(232, 182, 76, .7);
    }
}

.present__back {
    transform: rotateY(180deg);
    background: linear-gradient(90deg, color-mix(in srgb, var(--paper) 30%, #fff) 0%, color-mix(in srgb, var(--paper) 55%, #fff) 100%);
    box-shadow: inset 0 0 0 .1rem rgba(0, 0, 0, .08);
}

.present__ribbon {
    position: absolute;
    background: var(--ribbon);

    &.present__ribbon--h {
        inset-inline: 0;
        inset-block-start: 50%;
        block-size: 13.5cqi;
        translate: 0 -50%;
        border-block: 1.1cqi solid var(--ribbon-edge);
        background: linear-gradient(270deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, .2) 85%), var(--ribbon);
    }

    &.present__ribbon--v {
        inset-block: 0;
        inset-inline-start: 50%;
        inline-size: 13.5cqi;
        translate: -50% 0;
        border-inline: 1.1cqi solid var(--ribbon-edge);
        background: linear-gradient(180deg, rgba(255, 255, 255, .2), rgba(255, 255, 255, 0) 85%), var(--ribbon);
    }
}

.present__seal {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    display: grid;
    place-items: center;
    inline-size: 37.7cqi;
    aspect-ratio: 1;
    border: 1.1cqi solid var(--ribbon-edge);
    border-radius: 50%;
    background: #fff;
    color: #212121;
    font-size: 21cqi;
    font-weight: 700;
    line-height: 1;
    translate: -50% -50%;
}

.present__edge {
    position: absolute;
    inset-block: 1.5cqi;
    inset-inline-end: 0;
    inline-size: 2.6cqi;
    border-radius: 1.3cqi;
    background: linear-gradient(90deg,
        color-mix(in srgb, var(--paper) 75%, #000) 0%,
        color-mix(in srgb, var(--paper) 45%, #fff) 30%,
        rgba(255, 255, 255, .95) 50%,
        color-mix(in srgb, var(--paper) 55%, #fff) 72%,
        color-mix(in srgb, var(--paper) 80%, #000) 100%);
    transform-origin: 100% 50%;
    transform: rotateY(-90deg);
}

.present__lock {
    position: absolute;
    z-index: 2;
    inset-block-start: 50cqi;
    inset-inline-start: 65.5cqi;
    display: grid;
    place-items: center;
    inline-size: 36cqi;
    block-size: 20cqi;
    padding-inline-start: 8cqi;
    background: var(--advent-paper);
    clip-path: polygon(24% 0, 100% 0, 100% 100%, 24% 100%, 0 50%);
    filter: drop-shadow(0 .8cqi 1.2cqi rgba(7, 27, 87, .45));
    color: var(--advent-night-deep);
    transform-origin: 0 50%;
    rotate: 32deg;

    &::before {
        content: '';
        position: absolute;
        inset-block-start: 50%;
        inset-inline-start: 8cqi;
        inline-size: 3.4cqi;
        block-size: 3.4cqi;
        border-radius: 50%;
        background: var(--advent-night);
        translate: 0 -50%;
    }

    svg {
        inline-size: 11cqi;
        block-size: 11cqi;
    }
}

@keyframes present-open {
    0% { transform: rotateY(0); }
    14% { transform: rotateY(-10deg); }
    24% { transform: rotateY(-5deg); }
    36% { transform: rotateY(-16deg); }
    100% { transform: rotateY(-92deg); }
}

@keyframes present-hop {
    0%, 72%, 100% { transform: translateY(0); }
    78% { transform: translateY(-5cqi) rotate(-2deg); }
    84% { transform: translateY(0); }
    89% { transform: translateY(-2.5cqi) rotate(1.5deg); }
    94% { transform: translateY(0); }
}

@keyframes present-glow {
    0% { opacity: 0; }
    35% { opacity: 1; }
    100% { opacity: 0; }
}
</style>
