<script setup>
import {ANNOUNCEMENT_TUTORIAL_MODAL_ID} from '@/composables/announcement'

const {t} = useI18n()
const modals = useModalStore()
const {announcement, dismiss} = useAnnouncement()
const {steps: tutorialSteps} = useTutorial(() => announcement.value?.slug)

const name = computed(() => announcement.value?.variant ?? '')
const playPath = computed(() => {
    const item = announcement.value
    if (!item) return ''
    return item.latest ? `/puzzle/${item.latest.slug}` : `/puzzles/${item.slug}`
})

function track(action) {
    trackFunnel('sp_announcement_click', {id: announcement.value?.id, action})
}

function openTutorials() {
    track('tutorials')
    modals.open(ANNOUNCEMENT_TUTORIAL_MODAL_ID)
}

function playFromModal() {
    track('play-after-tutorial')
    modals.close(ANNOUNCEMENT_TUTORIAL_MODAL_ID)
}
</script>

<template>
    <section v-if="announcement" class="announcement" :class="`theme--${announcement.slug}`" :aria-label="t('announcement.label', {name})">
        <div class="announcement__inner">
            <div class="announcement__panel">
                <AmbientField pattern="icons" :icon="announcement.slug" fade="right" :intensity="0.8" :interactive="false" />
                <div class="announcement__text">
                    <span class="announcement__kicker">{{ t('announcement.kicker') }}</span>
                    <span class="announcement__title">{{ name }}</span>
                    <span class="announcement__body">{{ t(`announcement.body.${announcement.slug}`) }}</span>
                    <span class="announcement__actions">
                        <NuxtLinkLocale :to="playPath" class="announcement__cta" @click="track('play')">
                            {{ t('announcement.play') }}
                            <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                        </NuxtLinkLocale>
                        <button v-if="tutorialSteps" type="button" class="announcement__cta announcement__cta--ghost" @click="openTutorials">
                            {{ t('announcement.learn') }}
                        </button>
                    </span>
                </div>
                <div class="announcement__icon" aria-hidden="true">
                    <PuzzleIcon :icon="announcement.slug" :status="{completed: true}" :show-home-icon="false" />
                </div>
            </div>
            <button type="button" class="announcement__dismiss" :aria-label="t('announcement.dismiss')" @click="dismiss">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
        </div>

        <Modal
            v-if="tutorialSteps"
            :id="ANNOUNCEMENT_TUTORIAL_MODAL_ID"
            :title="name"
            classes-footer=""
            :window-scroll="true"
        >
            <div class="announcement__modal" :class="`theme--${announcement.slug}`">
                <TutorialPractice
                    :slug="announcement.slug"
                    :name="name"
                    :icon="announcement.slug"
                    surface="announcement"
                    class="announcement__tutorial"
                />
                <span @click="playFromModal">
                    <Button :url="playPath" variant="primary" icon="right-arrow">
                        <template #text>{{ t('announcement.play') }}</template>
                    </Button>
                </span>
            </div>
        </Modal>
    </section>
</template>

<style scoped>
.announcement {
    --tone: rgb(var(--puzzle-tile-shadow));
    --tone-deep: color-mix(in srgb, var(--tone) 45%, #000);
    --tone-mid: color-mix(in srgb, var(--tone) 72%, #000);
    --tone-night: color-mix(in srgb, var(--tone) 28%, #000);
    --card-shadow: 0 1px 2px 0 rgba(var(--puzzle-tile-shadow), 0.20), 0 12px 30px 0 rgba(var(--puzzle-tile-shadow), 0.20);
    --card-shadow-hover: 0 1px 2px 0 rgba(var(--puzzle-tile-shadow), 0.10), 0 17px 30px 0 rgba(var(--puzzle-tile-shadow), 0.15);
    position: relative;
    min-inline-size: 0;
}

.announcement__inner {
    block-size: 100%;
    padding: 1rem;
    border-radius: var(--border-radius, 1rem);
    background:
    radial-gradient(circle at 85% 20%, rgba(255, 255, 255, .2), transparent 40%),
    linear-gradient(120deg, var(--tone-deep) 0%, var(--tone-mid) 45%, var(--tone) 100%);
    box-shadow: var(--card-shadow);

    --banner-dark: radial-gradient(circle at 12% 15%, rgba(255, 255, 255, .14), transparent 45%), linear-gradient(120deg, var(--tone) 0%, var(--tone-mid) 40%, var(--tone-deep) 75%, var(--tone-night) 100%);

    @media (prefers-color-scheme: dark) {
        :root:not([data-theme-status]) & {
            background: var(--banner-dark);
        }
    }

    :root[data-theme-status="dark"] & {
        background: var(--banner-dark);
    }
    transition: transform .25s ease, box-shadow .25s ease;

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem);
            box-shadow: var(--card-shadow-hover);
        }
    }
}

.announcement__panel {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    block-size: 100%;
    min-block-size: 18rem;
    padding: 5rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, .5);
    border-radius: var(--border-radius-inner, 1rem);
    color: #fff;

    @media (width < 720px) {
        padding: 2.4rem;
    }
}

.announcement__text {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: .4rem;
    min-inline-size: 0;
}

.announcement__kicker {
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .12rem;
    opacity: .85;
}

.announcement__title {
    font-size: clamp(3.6rem, 7vw, 5.6rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.1rem;
}

.announcement__body {
    margin-block-start: .6rem;
    max-inline-size: 38rem;
    font-size: 1.5rem;
    line-height: 1.4;
    opacity: .9;
    text-wrap: pretty;
}

.announcement__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-block-start: 1.4rem;
}

.announcement__cta {
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    padding: .8rem 1.6rem;
    border: 1px solid #fff;
    border-radius: 2rem;
    background: #fff;
    color: var(--tone-deep);
    font: inherit;
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06rem;
    text-decoration: none;
    cursor: pointer;
    transition: background .15s ease, color .15s ease;

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
        fill: currentColor;
    }

    &:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
    }
}

.announcement__cta--ghost {
    background: transparent;
    color: #fff;

    @media (hover: hover) {
        &:hover {
            background: rgba(255, 255, 255, .2);
        }
    }
}

.announcement__icon {
    --card-icon-size: 12rem;
    position: relative;
    z-index: 1;
    flex: 0 0 auto;
    filter: drop-shadow(0 1.2rem 2.4rem rgba(0, 0, 0, .3));
    transform: rotate(6deg);

    @media (width < 720px) {
        display: none;
    }
}

.announcement__dismiss {
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

.announcement__modal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
    text-align: center;
}

.announcement__tutorial {
    block-size: 70rem;
}
</style>
