<script setup>
import Archive from '@/api/Archive.js'

const {labelledby, short = false} = defineProps({labelledby: String, short: Boolean})
const puzzleIcons = Archive.getVariantFamilies().map(f => f.slug)
</script>

<template>
    <section class="feature-hero" :aria-labelledby="labelledby">
        <div class="feature-hero__panel" :class="{'feature-hero__panel--short': short}">
            <AmbientField pattern="icons" :icons="puzzleIcons" :icon-max="200" fade="right" :intensity="0.8" :interactive="false" />
            <div class="feature-hero__text">
                <slot />
            </div>
        </div>
    </section>
</template>

<style scoped>
.feature-hero {
    --tone: var(--primary);
    --tone-deep: color-mix(in srgb, var(--tone) 45%, #000);
    --tone-mid: color-mix(in srgb, var(--tone) 72%, #000);
    padding: 1rem;
    border-radius: var(--border-radius, 1rem);
    background:
        radial-gradient(circle at 85% 20%, rgba(255, 255, 255, .2), transparent 40%),
        linear-gradient(120deg, var(--tone-deep) 0%, var(--tone-mid) 45%, var(--tone) 100%);
    box-shadow: var(--card-shadow);
}

.feature-hero__panel {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 3rem;
    min-block-size: 32rem;
    padding: 5rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .5);
    border-radius: var(--border-radius-inner, 1rem);
    color: var(--text-on-primary);

    @media (width < 720px) {
        flex-direction: column;
        align-items: stretch;
        gap: 2.4rem;
        min-block-size: 44rem;
        padding: 2.4rem;

        &.feature-hero__panel--short {
            min-block-size: 0;
        }
    }
}

.feature-hero__text {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: .4rem;
    min-inline-size: 0;

    @media (width < 720px) {
        flex: 1 1 auto;
    }
}

.feature-hero__text > :deep(:first-child) {
    @media (width < 720px) {
        margin-block-start: auto;
    }
}

.feature-hero :deep(.feature-hero__kicker) {
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: .12rem;
    text-transform: uppercase;
    opacity: .85;
}

.feature-hero :deep(.feature-hero__title) {
    margin: 0;
    font-size: clamp(3.6rem, 7vw, 5.6rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.1rem;
    overflow-wrap: anywhere;
}

.feature-hero :deep(.feature-hero__body) {
    max-inline-size: 42rem;
    margin: .8rem 0 0;
    font-size: 1.6rem;
    line-height: 1.45;
    opacity: .9;
    text-wrap: pretty;
}

.feature-hero :deep(.feature-hero__actions) {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-block-start: 2rem;

    @media (width < 720px) {
        margin-block-start: auto;
        padding-block-start: 2rem;
    }
}

.feature-hero :deep(.feature-hero__cta) {
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    padding: .9rem 1.8rem;
    border: 1px solid var(--text-on-primary);
    border-radius: 2rem;
    background: var(--text-on-primary);
    color: var(--tone-deep);
    font-family: inherit;
    font-size: 1.3rem;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: .06rem;
    text-decoration: none;
    text-transform: uppercase;
    transition: background .15s ease, color .15s ease;
}

.feature-hero :deep(.feature-hero__cta svg) {
    inline-size: 1.2rem;
    block-size: 1.2rem;
    fill: currentColor;
}

.feature-hero :deep(.feature-hero__cta:focus-visible) {
    outline: 2px solid var(--text-on-primary);
    outline-offset: 3px;
}

.feature-hero :deep(.feature-hero__cta--ghost) {
    background: transparent;
    color: var(--text-on-primary);
}

.feature-hero :deep(.feature-hero__cta--ghost:hover) {
    @media (hover: hover) {
        background: rgba(255, 255, 255, .2);
    }
}
</style>
