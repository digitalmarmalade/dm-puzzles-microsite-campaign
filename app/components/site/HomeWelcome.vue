<script setup>
import Archive from '@/api/Archive.js'
import {dateHelpers} from '@/lib/challenges'
import {themeClass} from '@/lib/utils'

const NEW_MAX_COMPLETIONS = 3
const NEW_MAX_DAYS = 2

const preferences = usePreferencesStore()
const challenges = useChallengesStore()
const preview = usePreview()

const isNew = computed(() => {
    if (Object.values(challenges.lifetime?.months ?? {}).some(m => m.total > 0)) return false
    const completions = challenges.completions ?? []
    const days = new Set(completions.map(c => dateHelpers.dayKey(c.at)))
    return completions.length < NEW_MAX_COMPLETIONS && days.size < NEW_MAX_DAYS
})

const closedInPreview = ref(false)

const show = computed(() => !closedInPreview.value
    && (preview.is('welcome') || (isNew.value && !preferences.onboardingCompleted && !preferences.welcomeDismissed)))

const COLUMN_COUNT = 4
const COLUMN_LENGTH = 5
const families = Archive.getVariantFamilies()
const columns = Array.from({length: COLUMN_COUNT}, (_, c) => {
    const list = Array.from({length: COLUMN_LENGTH}, (_, i) => families[(i * COLUMN_COUNT + c * 2) % families.length])
    return [...list, ...list]
})

function takeTour() {
    openOnboarding('welcome')
}

function dismiss() {
    if (preview.is('welcome')) {
        closedInPreview.value = true
        return preview.hide('welcome')
    }
    preferences.set('welcomeDismissed', true)
    trackFunnel('sp_welcome_dismiss')
}
</script>

<template>
    <div v-if="show" class="home-welcome" role="region" :aria-label="$t('home.welcome.title')">
        <div class="home-welcome__text">
            <p class="home-welcome__title">{{ $t('home.welcome.title') }}</p>
            <p class="home-welcome__body">{{ $t('home.welcome.body') }}</p>
            <div class="home-welcome__actions">
                <button type="button" class="home-welcome__btn home-welcome__btn--tour" @click="takeTour">
                    {{ $t('home.welcome.tour') }}
                </button>
                <button type="button" class="home-welcome__btn home-welcome__btn--dismiss" @click="dismiss">
                    {{ $t('home.welcome.dismiss') }}
                </button>
            </div>
        </div>
        <button type="button" class="home-welcome__close" :aria-label="$t('common.close')" @click="dismiss">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div class="home-welcome__frame" aria-hidden="true">
            <div class="home-welcome__columns">
                <div v-for="(column, c) in columns" :key="c" class="home-welcome__column" :style="{'--c': c}">
                    <span v-for="(family, i) in column" :key="i" class="home-welcome__tile" :class="themeClass(family.name)">
                        <svg><use :href="sprite(family.slug)" /></svg>
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.home-welcome {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    container-type: inline-size;
    min-inline-size: 0;
    block-size: 100%;
    min-block-size: 18rem;
    padding: 5rem;
    overflow: hidden;
    border-radius: var(--border-radius, 1rem);
    background:
    radial-gradient(circle at 85% 15%, rgba(255, 255, 255, .28), transparent 45%),
    radial-gradient(circle at 10% 110%, rgba(120, 20, 0, .35), transparent 50%),
    linear-gradient(125deg, color-mix(in srgb, var(--primary), #8a1c00 35%) 0%, var(--primary) 55%, color-mix(in srgb, var(--primary), #ffc94a 45%) 100%);
    box-shadow: var(--card-shadow);
    color: var(--text-on-primary, #fff);

    --banner-dark: radial-gradient(circle at 12% 15%, rgba(255, 255, 255, .16), transparent 45%), linear-gradient(125deg, color-mix(in srgb, var(--primary), #ffc94a 20%) 0%, var(--primary) 35%, color-mix(in srgb, var(--primary), #3a0e00 45%) 75%, color-mix(in srgb, var(--primary), #140500 70%) 100%);

    @media (prefers-color-scheme: dark) {
        :root:not([data-theme-status]) & {
            background: var(--banner-dark);
        }
    }

    :root[data-theme-status="dark"] & {
        background: var(--banner-dark);
    }

    &::after {
        content: '';
        position: absolute;
        inset: 1rem;
        border: 1px solid rgba(255, 255, 255, .5);
        border-radius: var(--border-radius-inner, .8rem);
        pointer-events: none;
    }

    @media (width < 720px) {
        padding: 3.2rem 2.4rem;
    }
}

.home-welcome__text {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: .4rem;
    min-inline-size: 0;

    @media (width >= 720px) {
        max-inline-size: calc(100% - 17rem);
    }

    @container (width >= 900px) {
        max-inline-size: calc(100% - 24rem);
    }
}

.home-welcome__title {
    margin: 0;
    font-size: clamp(3.6rem, 7vw, 5.6rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.1rem;
}

.home-welcome__body {
    margin: .6rem 0 0;
    max-inline-size: 38rem;
    font-size: 1.5rem;
    line-height: 1.4;
    opacity: .92;
    text-wrap: pretty;
}

.home-welcome__actions {
    display: flex;
    flex-wrap: wrap;
    gap: .8rem;
    margin-block-start: 1.4rem;
}

.home-welcome__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: .8rem 1.6rem;
    border-radius: 2rem;
    font: inherit;
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06rem;
    cursor: pointer;
    transition: background .15s ease, filter .15s ease;

    &:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
    }
}

.home-welcome__btn--tour {
    background: #fff;
    border: 2px solid #fff;
    color: color-mix(in srgb, var(--primary), #000 25%);

    @media (hover: hover) {
        &:hover {
            filter: brightness(.95);
        }
    }
}

.home-welcome__btn--dismiss {
    background: transparent;
    border: 2px solid #fff;
    color: #fff;

    @media (hover: hover) {
        &:hover {
            background: rgba(255, 255, 255, .2);
        }
    }
}

.home-welcome__close {
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
    background: color-mix(in srgb, var(--primary), #000 15%);
    color: #fff;
    cursor: pointer;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
    }

    &:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 2px;
    }

    @media (hover: hover) {
        &:hover {
            background: color-mix(in srgb, var(--primary), #000 30%);
        }
    }
}

.home-welcome__frame {
    position: absolute;
    inset: 1rem;
    overflow: hidden;
    border-radius: var(--border-radius-inner, .8rem);
    pointer-events: none;

    @media (width < 720px) {
        display: none;
    }
}

.home-welcome__columns {
    position: absolute;
    inset-block: -4rem;
    inset-inline-end: -2.4rem;
    display: flex;
    gap: 1rem;
    transform: rotate(6deg);

    &:dir(rtl) {
        transform: rotate(-6deg);
    }
}

.home-welcome__column {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-block-start: calc(var(--c) * -3.8rem - 2rem);
    animation: home-welcome-drift 40s linear infinite;
    animation-direction: normal;

    &:nth-child(even) {
        animation-direction: reverse;
    }

    &:nth-child(4) {
        @container (width < 900px) {
            display: none;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.home-welcome__tile {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    inline-size: 6.4rem;
    block-size: 6.4rem;
    border: 1px solid color-mix(in srgb, var(--puzzle-tile-text) 28%, transparent);
    border-radius: 1.2rem;
    background: color-mix(in srgb, var(--puzzle-tile-text), #fff 92%);
    box-shadow: 0 .6rem 1.4rem rgba(0, 0, 0, .18);
    color: var(--puzzle-tile-text, var(--primary));

    svg {
        inline-size: 60%;
        block-size: 60%;
    }
}

@keyframes home-welcome-drift {
    from { transform: translateY(0); }
    to { transform: translateY(calc(-50% - .5rem)); }
}
</style>
