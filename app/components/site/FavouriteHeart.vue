<script setup>
const {slug, large, on} = defineProps({
    //  variant slug to favourite (e.g. 'headcoach')
    slug: {type: String, default: ''},
    //  larger heart (e.g. for the variant page main card)
    large: {type: Boolean, default: false},
    on: {type: Boolean, default: false},
})

const {t} = useI18n()
const favourites = useFavouritesStore()
const isFav = computed(() => on || favourites.isFavourite(slug))

//  --- favourite burst (lottie) ---------------------------------------------
//  lottie + the animation data are code-split and fetched once, lazily, the
//  first time anyone favourites something — so they stay out of the initial JS.
const burstEl = ref(null)
let anim = null
let assetsPromise = null

function loadAssets() {
    if (!assetsPromise) {
        assetsPromise = Promise.all([
            import('lottie-web/build/player/lottie_light'),
            import('@/assets/fav-burst.json'),
        ]).then(([mod, data]) => ({lottie: mod.default, data: data.default}))
    }
    return assetsPromise
}

function prefersReducedMotion() {
    return typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

async function playBurst() {
    if (prefersReducedMotion()) return
    const {lottie, data} = await loadAssets()
    if (!burstEl.value) return
    if (!anim) {
        anim = lottie.loadAnimation({
            container: burstEl.value,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            //  clone so each heart owns its own copy of the data
            animationData: JSON.parse(JSON.stringify(data)),
        })
    }
    anim.stop()
    anim.play()
}

onBeforeUnmount(() => {
    anim?.destroy()
    anim = null
})

function toggle() {
    const wasFav = isFav.value
    favourites.toggle(slug)
    if (!wasFav) playBurst()   //  burst only when favouriting on
}
</script>

<template>
    <span
        class="fav-heart"
        :class="{'fav-heart--on': isFav, 'fav-heart--large': large}"
        role="button"
        tabindex="0"
        :aria-pressed="isFav"
        :aria-label="isFav ? t('home.unfavourite') : t('home.favourite')"
        @click.prevent.stop="toggle"
        @keydown.enter.prevent.stop="toggle"
        @keydown.space.prevent.stop="toggle"
    >
        <span ref="burstEl" class="fav-heart__burst" aria-hidden="true"></span>
        <svg aria-hidden="true"><use :href="sprite('heart')" /></svg>
    </span>
</template>

<style scoped>
.fav-heart {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
    z-index: 2;
    inline-size: 3.2rem;
    block-size: 3.2rem;
    display: grid;
    place-items: center;
    cursor: pointer;
    border-radius: 50%;

    @media (hover: hover) {
        &:focus-visible {
            outline: 2px solid var(--favourited, var(--primary));
            outline-offset: 2px;
        }
    }
}

.fav-heart__burst {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    inline-size: 11rem;
    block-size: 11rem;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 0;
}

.fav-heart__burst :deep(svg) {
    display: block;
    inline-size: 100% !important;
    block-size: 100% !important;
}

.fav-heart svg {
    position: relative;
    z-index: 1;
    inline-size: 2.2rem;
    block-size: 2.2rem;
    fill: none;
    stroke: var(--not-favourited, #9a9a9a);
    stroke-width: 1.8;
    transition: transform .15s ease, fill .15s ease, stroke .15s ease;
}

.fav-heart:hover svg {
    @media (hover: hover) {
        stroke: var(--favourited, var(--primary));
        transform: scale(1.12);
    }
}

.fav-heart--on svg {
    fill: var(--favourited, var(--primary));
    stroke: var(--favourited, var(--primary));
}

.fav-heart--large {
    position: relative;
    inset: unset;
}

.fav-heart--large .fav-heart__burst {
    inline-size: 15rem;
    block-size: 15rem;
}

.fav-heart--large svg {
    inline-size: 2.6rem;
    block-size: 2.6rem;
}
</style>
