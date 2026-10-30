<script setup>
import {themeSlug} from '@/lib/utils'
import {useModalStore} from '@/stores/modals'

const props = defineProps({
    family: {type: Object, default: null},
    completed: {type: Boolean, default: false},
})
const name = computed(() => props.family?.name)
const slug = computed(() => props.family?.slug)
const isFamily = computed(() => !!props.family?.isFamily)
const branches = computed(() => props.family?.branches ?? [])
const meta = computed(() => getPuzzleMeta(slug.value))
const timeMinutes = computed(() => meta.value?.time ?? null)
const timeSteps = computed(() => {
    const m = timeMinutes.value
    if (m == null) return 0
    if (m <= 4) return 1
    if (m <= 9) return 2
    return 3
})
const modalId = computed(() => `variant-info-${slug.value}`)
const modals = useModalStore()

const {tm, rt} = useI18n()
const tags = computed(() => {
    const raw = tm(`tags.${slug.value}`)
    if (!Array.isArray(raw)) return []
    return raw.map((item) => (typeof item === 'string' ? item : rt(item)))
})

const hidden = useHiddenVariantsStore()
const isHidden = computed(() => hidden.isHidden(slug.value))

function openInfo(e) {
    e.preventDefault()
    e.stopPropagation()
    modals.open(modalId.value)
}

const NuxtLinkLocaleResolved = resolveComponent('NuxtLinkLocale')
const wrapperComponent = computed(() => isFamily.value ? 'div' : NuxtLinkLocaleResolved)
const wrapperProps = computed(() => isFamily.value ? {} : {to: `/puzzles/${slug.value}`})
</script>

<template>
    <component :is="wrapperComponent"
        v-bind="wrapperProps"
        class="variant-card"
        :class="[name ? 'puzzle-card--' + themeSlug(name) : '', {'variant-card--hidden': isHidden, 'variant-card--family': isFamily}]"
    >
        <div class="variant-card__content">
            <div class="puzzle-icon-holder">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
                <div class="puzzle-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg">
                        <use :href="sprite(slug)"></use>
                    </svg>
                </div>
            </div>

            <div class="variant-card__body">
                <div class="variant-card__title-row">
                    <h3 class="title" v-text="name"></h3>
                    <button
                        type="button"
                        class="variant-card__info"
                        :aria-label="$t('variantInfo.open', {name})"
                        :title="$t('variantInfo.open', {name})"
                        @click.stop.prevent="openInfo"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                            <circle cx="12" cy="7.5" r="1.3" fill="currentColor"/>
                            <rect x="10.7" y="10.5" width="2.6" height="8" rx="1" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
                <p v-if="isFamily && tags.length" class="variant-card__tags">
                    <span v-for="(tag, i) in tags" :key="tag">
                        <span v-if="i > 0" class="variant-card__tag-sep" aria-hidden="true">·</span>
                        {{ tag }}
                    </span>
                </p>
            </div>
            <template v-if="!isFamily">
                <div class="variant-card__actions">
                    <HideVariantButton :slug="slug" :name="name" />
                    <FavouriteHeart :slug="slug" />
                </div>
            </template>
        </div>
        <div v-if="!isFamily && (tags.length || timeMinutes)" class="variant-card__meta-row">
            <p v-if="tags.length" class="variant-card__tags">
                <span v-for="(tag, i) in tags" :key="tag">
                    <span v-if="i > 0" class="variant-card__tag-sep" aria-hidden="true">·</span>
                    {{ tag }}
                </span>
            </p>
            <p v-if="timeSteps" class="variant-card__time"
                :aria-label="$t('variantInfo.playTime', {mins: timeMinutes})"
                :title="$t('variantInfo.playTime', {mins: timeMinutes})"
            >
                <svg v-for="i in 3" :key="i" viewBox="0 0 24 24" aria-hidden="true"
                    :class="['variant-card__clock', i > timeSteps ? 'variant-card__clock--faded' : '']"
                >
                    <path d="M9 3h6M12 3v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
                    <circle cx="12" cy="14" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M12 14l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
                </svg>
                <span class="sr-only">{{ $t('variantInfo.playTime', {mins: timeMinutes}) }}</span>
            </p>
        </div>
        <ul v-if="isFamily" class="variant-card__levels">
            <li v-for="b in branches" :key="b.slug"
                class="variant-card__level-row"
                :class="{'variant-card__level-row--hidden': hidden.isHidden(b.slug)}">
                <NuxtLinkLocale :to="`/puzzles/${b.slug}`" class="variant-card__level">
                    <span>{{ b.label }}</span>
                </NuxtLinkLocale>
                <HideVariantButton :slug="b.slug" :name="`${name} ${b.label}`" />
                <FavouriteHeart :slug="b.slug" />
            </li>
        </ul>
    </component>
    <VariantInfoModal :family="family" :modal-id="modalId" />
</template>

<style scoped>
.variant-card {
    background-color: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    gap: 1rem;
    position: relative;
    padding: var(--variant-padding, 1.5rem);
    text-align: start;
    block-size: 100%;
    min-block-size: 15.8rem;
    overflow: hidden;
    justify-content: center;

    :is(h3) {
        margin: 0;
        font-size: 1.8rem;
        flex-grow: 1;
    }
}

.variant-card--family {
    --shadow-1: var(--card-background);
    --shadow-2: var(--text-colour);

    position: relative;

    &::before {
        position: absolute;
        inset: 0;
        content: '';
        display: block;
        border-radius: var(--border-radius);
        pointer-events: none;
        box-shadow: inset 0 -1px 0 var(--shadow-2), inset 0 -2px 0 var(--shadow-1), inset 0 -3px 0  var(--shadow-2), inset 0 -4px 0 var(--shadow-1), inset 0 -5px 0  var(--shadow-2);
        opacity: .3;
        z-index: 1;
    }
}
.variant-card__content {
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: var(--card-gap, 1rem);
    inline-size: 100%;
    flex-grow: 1;
}
.variant-card--family {
    cursor: default;
    padding: var(--variant-padding);
    padding-block-end: 0;
}
.variant-card__actions {
    display: flex;
    gap: .2rem;
}
.variant-card .fav-heart {
    position: static;
}

.variant-card .hide-variant {
    inset-block-start: .6rem;
    inset-inline-start: .6rem;
}

.variant-card--hidden {
    opacity: 1;

    @media (hover: hover) {
        &:hover {
            opacity: .85;
        }
    }
}

.variant-card__tags {
    color: var(--text-colour-secondary, #777);
    font-size: 1.1rem;
    text-transform: uppercase;
    letter-spacing: .1rem;
    opacity: .7;
}
.variant-card__meta-row {
    inline-size: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}
.variant-card__meta-row .variant-card__tags,
.variant-card__meta-row .variant-card__time {
    margin: 0;
}
.variant-card__tag-sep {
    margin: 0 .5rem;
    opacity: .6;
}

.variant-card__body {
    display: flex;
    flex-direction: column;
    gap: .4rem;
    flex-grow: 1;
    min-inline-size: 0;
}
.variant-card__title-row {
    display: flex;
    align-items: center;
    gap: .4rem;
    flex-grow: 1;
}
.variant-card__title-row .title {
    flex-grow: 0;
}
.variant-card__info {
    inline-size: 2.2rem;
    block-size: 2.2rem;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 0;
    color: var(--text-colour-secondary, #777);
    cursor: pointer;
    border-radius: 50%;
    flex: none;
    transition: color .15s ease, background-color .15s ease;

    &:focus-visible {
        color: var(--puzzle-tile-text, var(--text-colour, #212121));
        background-color: rgba(var(--puzzle-tile-shadow), .12);
    }

    @media (hover: hover) {
        &:hover {
            color: var(--puzzle-tile-text, var(--text-colour, #212121));
            background-color: rgba(var(--puzzle-tile-shadow), .12);
        }
    }
}
.variant-card__info svg {
    inline-size: 1.8rem;
    block-size: 1.8rem;
}
.variant-card__time {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: .2rem;
    color: var(--puzzle-tile-text, var(--text-colour, #212121));
}
.variant-card__clock {
    inline-size: 1.8rem;
    block-size: 1.8rem;
}
.variant-card__clock--faded {
    opacity: .25;
}

.variant-card__levels {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    inline-size: calc(100% + var(--variant-padding) * 2);
    border-block-start: 1px solid var(--card-border);
}

.variant-card__level-row {
    display: flex;
    align-items: center;
    padding: .7rem 1rem 1.2rem;
    flex: 1;
    background-color: color-mix(in srgb, var(--puzzle-tile-text) 8%, var(--card-background));
    transition: opacity .15s ease;

    + .variant-card__level-row {
        border-inline-start: 1px solid var(--card-border);
    }
}
.variant-card__level-row--hidden {
    opacity: .4;

    @media (hover: hover) {
        &:hover {
            opacity: .8;
        }
    }
}
.variant-card__level-row .fav-heart,
.variant-card__level-row .hide-variant {
    position: relative;
    inset: auto;
    transform: none;
    flex: none;
}

.variant-card__level {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: .6rem;
    padding: .6rem .8rem;

    color: var(--text-colour, #212121);
    font-size: 1.5rem;
    text-decoration: none;
    transition: all .15s ease;

    &:focus-visible {
        border-color: var(--puzzle-tile-text, var(--text-colour, #212121));
        color: var(--puzzle-tile-text, var(--text-colour, #212121));
    }

    @media (hover: hover) {
        &:hover {
            border-color: var(--puzzle-tile-text, var(--text-colour, #212121));
            color: var(--puzzle-tile-text, var(--text-colour, #212121));
        }
    }
}
.variant-card__level svg {
    inline-size: 1rem;
    block-size: 1rem;
}
</style>
