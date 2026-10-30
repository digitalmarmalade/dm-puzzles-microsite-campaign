<script setup>
import Archive from '@/api/Archive.js'
import {useModalStore} from '@/stores/modals'

const props = defineProps({
    family: {type: Object, required: true},
    modalId: {type: String, required: true},
})

const modals = useModalStore()
const {t, te} = useI18n()
const description = computed(() => {
    const key = `puzzleDescription.${props.family.slug}`
    return te(key) ? t(key) : ''
})
const isFamily = computed(() => !!props.family.isFamily)
const branches = computed(() => props.family.branches ?? [])
const {steps: tutorialSteps} = useTutorial(() => props.family.slug)

const latestSlugForBranch = (branch) => {
    const list = branch?.puzzleSlugs?.length
        ? branch.puzzleSlugs
        : (Archive.getVariants(branch?.variantName) ?? [])
    return list[0] ?? null
}
const latestSlug = computed(() => latestSlugForBranch(branches.value[0]))

function close() {
    modals.close(props.modalId)
}
</script>

<template>
    <Modal
        :id="modalId"
        :title="family.name"
        classes-footer=""
        :window-scroll="true"
    >
        <template #title>
            <span class="variant-info__title-wrap">
                <span class="variant-info__title-text">{{ family.name }}</span>
                <span v-if="!isFamily" class="variant-info__title-actions">
                    <FavouriteHeart :slug="family.slug" />
                    <HideVariantButton :slug="family.slug" :name="family.name" />
                </span>
            </span>
        </template>

        <div class="variant-info">
            <TutorialPractice
                v-if="tutorialSteps"
                :slug="family.slug"
                :name="family.name"
                surface="info"
                class="variant-info__tutorial"
            />
            <div v-else class="variant-info__media" aria-hidden="true">
                <p class="variant-info__media-placeholder">{{ $t('variantInfo.videoComingSoon') }}</p>
            </div>

            <p v-if="description" class="variant-info__description">{{ description }}</p>

            <div v-if="isFamily" class="variant-info__branches">
                <div v-for="b in branches" :key="b.slug" class="branch-card">
                    <div class="branch-card__header">
                        <span class="branch-card__level">{{ b.label }}</span>
                        <div class="branch-card__actions">
                            <HideVariantButton :slug="b.slug" :name="`${family.name} ${b.label}`" />
                            <FavouriteHeart :slug="b.slug" />
                        </div>
                    </div>

                    <NuxtLinkLocale
                        v-if="latestSlugForBranch(b)"
                        :to="`/puzzle/${latestSlugForBranch(b)}`"
                        class="branch-card__play"
                        @click="close"
                    >
                        <span>{{ $t('variantInfo.play') }}</span>
                    </NuxtLinkLocale>
                    <span v-else class="branch-card__play branch-card__play--disabled">
                        <span>{{ $t('variantInfo.play') }}</span>
                    </span>

                    <NuxtLinkLocale
                        :to="`/puzzles/${b.slug}`"
                        class="branch-card__archive"
                        @click="close"
                    >
                        <span>{{ $t('home.archive') }}</span>
                        <svg aria-hidden="true"><use :href="sprite('right-arrow')"/></svg>
                    </NuxtLinkLocale>
                </div>
            </div>

            <div v-else class="variant-info__actions">
                <span v-if="latestSlug" @click="close">
                    <Button
                        :url="`/puzzle/${latestSlug}`"
                        variant="primary"
                    >
                        <template #text>{{ $t('variantInfo.playLatest') }}</template>
                    </Button>
                </span>
                <span @click="close">
                    <Button
                        :url="`/puzzles/${family.slug}`"
                        variant="tertiary"
                    >
                        <template #text>{{ $t('home.archive') }}</template>
                    </Button>
                </span>
            </div>
        </div>
    </Modal>
</template>

<style scoped>

.variant-info {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    text-align: center;
    align-items: center;
}

.variant-info__title-wrap {
    display: flex;
    align-items: center;
    gap: 1rem;
    inline-size: 100%;
}
.variant-info__title-text {
    flex-grow: 1;
    min-inline-size: 0;
}
.variant-info__title-actions {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
}
.variant-info__title-actions .fav-heart,
.variant-info__title-actions .hide-variant {
    position: relative;
    inset: auto;
    transform: none;
}

.variant-info__media {
    aspect-ratio: 16 / 9;
    inline-size: 100%;
    background: rgba(var(--puzzle-tile-shadow), .08);
    border: 1px dashed rgba(var(--puzzle-tile-shadow), .3);
    border-radius: var(--border-radius-inner, 6px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-colour-secondary, #777);
    font-size: 1.3rem;
}
.variant-info__tutorial {
    block-size: 76rem;
}

.variant-info__description {
    margin: 0;
    font-size: 1.6rem;
    line-height: 1.5;
    color: var(--text-colour, #212121);
}

.variant-info__branches {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 1rem;
    inline-size: 100%;
    text-align: start;
}

.branch-card {
    display: flex;
    flex-direction: column;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    box-shadow: var(--card-shadow);
    overflow: hidden;
}
.branch-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .6rem;
    padding: .8rem 1rem;
}
.branch-card__level {
    font-weight: 700;
    font-size: 1.5rem;
    color: var(--text-colour, #212121);
}
.branch-card__actions {
    display: inline-flex;
    align-items: center;
    gap: .2rem;
}
.branch-card__actions .fav-heart,
.branch-card__actions .hide-variant {
    position: relative;
    inset: auto;
    transform: none;
}
.branch-card__play {
    align-self: center;
    margin: 1rem;
    padding: .8rem 1.6rem;
    border: 1px solid color-mix(in srgb, var(--puzzle-tile-text) 30%, var(--card-background));
    border-radius: 2rem;
    background: color-mix(in srgb, var(--puzzle-tile-text) 15%, var(--card-background));
    color: var(--text-colour, #212121);
    font-size: 1.5rem;
    font-weight: 600;
    text-decoration: none;
    transition: background-color .15s ease, border-color .15s ease;

    &:focus-visible {
        background: color-mix(in srgb, var(--puzzle-tile-text) 25%, var(--card-background));
        border-color: color-mix(in srgb, var(--puzzle-tile-text) 45%, var(--card-background));
    }

    @media (hover: hover) {
        &:hover {
            background: color-mix(in srgb, var(--puzzle-tile-text) 25%, var(--card-background));
            border-color: color-mix(in srgb, var(--puzzle-tile-text) 45%, var(--card-background));
        }
    }
}
.branch-card__play--disabled {
    opacity: .5;
    cursor: not-allowed;
}
.branch-card__archive {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    padding: 1rem;
    border-block-start: 1px solid var(--card-border);
    color: var(--text-colour-secondary, #777);
    font-size: 1.2rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .1rem;
    text-decoration: none;
    transition: background-color .15s ease, color .15s ease;

    &:focus-visible {
        background: rgba(var(--puzzle-tile-shadow), .08);
        color: var(--text-colour, #212121);
    }

    @media (hover: hover) {
        &:hover {
            background: rgba(var(--puzzle-tile-shadow), .08);
            color: var(--text-colour, #212121);
        }
    }
}
.branch-card__archive svg {
    inline-size: 1.2rem;
    block-size: 1.2rem;
}

.variant-info__actions {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    justify-content: flex-end;
    gap: .8rem;
    flex-wrap: wrap;
    justify-content: space-between;
    inline-size: 100%;
    padding: 1.5rem 0 0;
}

</style>
