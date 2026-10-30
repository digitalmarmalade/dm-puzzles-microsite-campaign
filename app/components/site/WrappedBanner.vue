<script setup>
const {t} = useI18n()
const dateLocale = useDateLocale()
const preview = usePreview()
const {monthDate, showBanner, watched, open, dismiss} = useWrapped()

onMounted(() => {
    if (preview.is('wrapped') || preview.is('wrapped-perfect')) open.value = true
})

const monthName = computed(() => new Intl.DateTimeFormat(dateLocale.value, {month: 'long'}).format(monthDate))
</script>

<template>
    <section v-if="showBanner" class="wrapped-banner" :aria-label="t('wrapped.story.label', {month: monthName})">
        <div class="wrapped-banner__inner">
        <button type="button" class="wrapped-banner__open" @click="open = true">
            <AmbientField pattern="honeycomb" fade="right" :interactive="false" />
            <span class="wrapped-banner__text">
                <span class="wrapped-banner__kicker">{{ t('wrapped.banner.kicker') }}</span>
                <span class="wrapped-banner__title">{{ t('wrapped.banner.title', {month: monthName}) }}</span>
                <span class="wrapped-banner__body">{{ t('wrapped.banner.body', {month: monthName}) }}</span>
                <span class="wrapped-banner__cta">
                    {{ t(watched ? 'wrapped.link.cta' : 'wrapped.banner.cta') }}
                    <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                </span>
            </span>
        </button>
        <button type="button" class="wrapped-banner__dismiss" :aria-label="t('wrapped.banner.dismiss')" @click="dismiss">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        </div>
    </section>
</template>

<style scoped>
.wrapped-banner {
    position: relative;
    min-inline-size: 0;
}
.wrapped-banner__inner {
    block-size: 100%;
    background:
    radial-gradient(circle at 85% 20%, rgba(255, 255, 255, .18), transparent 40%),
    linear-gradient(120deg, #2b1747 0%, #6a2a6e 45%, var(--primary, #f17b2d) 100%);

    --banner-dark: radial-gradient(circle at 12% 15%, rgba(255, 255, 255, .14), transparent 45%), linear-gradient(120deg, var(--primary, #f17b2d) 0%, #6a2a6e 40%, #2b1747 75%, #120a20 100%);

    @media (prefers-color-scheme: dark) {
        :root:not([data-theme-status]) & {
            background: var(--banner-dark);
        }
    }

    :root[data-theme-status="dark"] & {
        background: var(--banner-dark);
    }
    border-radius: var(--border-radius, 1rem);
    padding: 1rem;
    box-shadow: var(--card-shadow);
    transition: transform .25s ease, box-shadow .25s ease;

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem);
            box-shadow: var(--card-shadow-hover);
        }
    }
}
.wrapped-banner__open {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 18rem;
    padding: 5rem;
    overflow: hidden;
    border: 0;
    border-radius: var(--border-radius-inner, 1rem);
    border: 1px solid rgba(255,255,255,.5);
    color: #fff;
    text-align: start;
    cursor: pointer;
    background: transparent;

    @media (width < 720px) {
        flex-direction: column;
        align-items: flex-start;
        padding: 2.4rem;
    }
}

.wrapped-banner__text {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: .4rem;
}

.wrapped-banner__kicker {
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .12rem;
    opacity: .85;
}

.wrapped-banner__title {
    font-size: clamp(3.6rem, 7vw, 5.6rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.1rem;
}

.wrapped-banner__body {
    margin-block-start: .6rem;
    font-size: 1.5rem;
    opacity: .9;
}

.wrapped-banner__cta {
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    align-self: flex-start;
    margin-block-start: 1.4rem;
    padding: .8rem 1.6rem;
    border-radius: 2rem;
    background: #fff;
    color: #2b1747;
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

.wrapped-banner__dismiss {
    position: absolute;
    z-index: 2;
    inset-block-start: 1.5rem;
    inset-inline-end: 1.5rem;
    display: grid;
    place-items: center;
    inline-size: 4.2rem;
    block-size: 4.2rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #fff;
    cursor: pointer;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        fill: none;
    }

    @media (hover: hover) {
        &:hover {
            background: rgba(255, 255, 255, .25);
        }
    }
}
</style>
