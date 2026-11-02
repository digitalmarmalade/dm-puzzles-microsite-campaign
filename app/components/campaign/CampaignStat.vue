<script setup>
const props = defineProps({
    value: {type: String, required: true},
    label: {type: String, required: true},
    percent: {type: Number, default: null},
    colour: {type: String, default: 'var(--primary)'},
    flame: {type: Boolean, default: false},
})

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const dash = computed(() => `${CIRCUMFERENCE * Math.min(100, Math.max(0, props.percent ?? 0)) / 100} ${CIRCUMFERENCE}`)
</script>

<template>
    <div class="campaign-stat" :class="{'campaign-stat--side': flame}" :style="{'--stat-colour': colour}">
        <p class="campaign-stat__text">
            <span class="campaign-stat__value">{{ value }}</span>
            <span class="campaign-stat__label">{{ label }}</span>
        </p>
        <svg v-if="flame" class="campaign-stat__flame" aria-hidden="true"><use :href="sprite('streak')" /></svg>
        <svg v-if="percent !== null" class="campaign-stat__ring" viewBox="0 0 60 60" aria-hidden="true">
            <circle cx="30" cy="30" :r="RADIUS" class="campaign-stat__track" />
            <circle v-if="percent > 0" cx="30" cy="30" :r="RADIUS" class="campaign-stat__arc" :stroke-dasharray="dash" />
        </svg>
    </div>
</template>

<style scoped>
.campaign-stat {
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.4rem 1.6rem;

    @media (width >= 720px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 1.6rem;
        padding: 2rem 3rem;
    }

    border: 1px solid var(--card-border);
    border-radius: var(--border-radius-inner);
    background: var(--card-background);
    color: var(--text-colour);
}

.campaign-stat--side {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
}

.campaign-stat__text {
    display: flex;
    flex-direction: column;
    gap: .4rem;
    margin: 0;
}

.campaign-stat__value {
    font-family: var(--font-display);
    font-size: 2.6rem;
    font-weight: 700;
    line-height: 1.05;

    @media (width >= 720px) {
        font-size: 3.4rem;
    }
}

.campaign-stat__label {
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: .05rem;

    @media (width >= 720px) {
        font-size: 1.3rem;
    }
}

.campaign-stat__ring {
    inline-size: 4.4rem;
    block-size: 4.4rem;
    flex-shrink: 0;
    transform: rotate(-90deg);

    circle {
        fill: none;
        stroke-width: 5;
    }

    @media (width >= 720px) {
        inline-size: 6.4rem;
        block-size: 6.4rem;
    }
}

.campaign-stat__flame {
    flex-shrink: 0;
    inline-size: 3.6rem;
    block-size: 3.6rem;
    color: var(--stat-colour);
    animation: flame-flicker 2.4s ease-in-out infinite;

    @media (width >= 720px) {
        inline-size: 4.8rem;
        block-size: 4.8rem;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

@keyframes flame-flicker {
    50% {
        transform: scale(1.06) rotate(-3deg);
    }
}

.campaign-stat__track {
    stroke: color-mix(in srgb, var(--stat-colour) 12%, transparent);
}

.campaign-stat__arc {
    stroke: var(--stat-colour);
    stroke-linecap: round;
    transition: stroke-dasharray .6s ease;
}
</style>
