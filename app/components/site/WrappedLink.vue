<script setup>
const {t} = useI18n()
const dateLocale = useDateLocale()
const {monthDate, available, watched, open} = useWrapped()

const monthName = computed(() => new Intl.DateTimeFormat(dateLocale.value, {month: 'long'}).format(monthDate))
</script>

<template>
    <button v-if="available" type="button" class="wrapped-link" @click="open = true">
        <span class="wrapped-link__text">
            <span class="wrapped-link__kicker">{{ t('wrapped.banner.kicker') }}</span>
            <span class="wrapped-link__title">{{ t('wrapped.banner.title', {month: monthName}) }}</span>
        </span>
        <span class="wrapped-link__cta">
            {{ t(watched ? 'wrapped.link.cta' : 'wrapped.banner.cta') }}
            <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
        </span>
    </button>
</template>

<style scoped>
.wrapped-link {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    inline-size: 100%;
    min-block-size: 18rem;
    padding: 3rem;
    overflow: hidden;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 1rem);
    background: color-mix(in srgb, var(--primary) 0%, var(--card-background, #fff));
    color: var(--text-colour);
    text-align: center;
    cursor: pointer;
    transition: transform .25s ease;

    &::after {
        content: '';
        position: absolute;
        inset: 1rem;
        border: 1px solid rgba(var(--primary-rgb), .3);
        border-radius: var(--border-radius-inner, .8rem);
        pointer-events: none;
    }

    &:focus-visible {
        outline: 2px solid var(--primary, #f17b2d);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem);
        }
    }
}

.wrapped-link__text {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .2rem;
}

.wrapped-link__kicker {
    color: var(--text-colour-secondary, #666);
    font-size: 1.2rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .12rem;
}

.wrapped-link__title {
    font-size: clamp(3.2rem, 4vw, 4.4rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.1rem;
    color: var(--primary);
}

.wrapped-link__cta {
    position: relative;
    z-index: 1;
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: .6rem;
    padding: .8rem 1.6rem;
    border-radius: 2rem;
    background: var(--primary);
    color: var(--text-on-primary, #fff);
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06rem;

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
        fill: currentColor;
    }
}
</style>
