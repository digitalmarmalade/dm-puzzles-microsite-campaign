<script setup>
const {t} = useI18n()
const features = useFeatures()
const board = useChallengeBoard()

const slides = computed(() => {
    const list = []
    if (features.stats) {
        list.push({key: 'streak', ariaKey: 'streak.aria'})
    }
    if (features.stats) {
        list.push({key: 'summary', ariaKey: 'summary.aria'})
    }
    return list
})

const scrollEl = ref(null)
const slideEls = ref([])
const activeIdx = ref(0)
const slideVisible = ref([])

const scrollable = ref(false)

let observer = null
let ro = null

function setupObserver() {
    observer?.disconnect()
    if (!scrollEl.value) return
    slideVisible.value = slideEls.value.map(() => false)
    if (slideVisible.value.length) slideVisible.value[0] = true
    activeIdx.value = 0

    observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const idx = slideEls.value.indexOf(entry.target)
            if (idx >= 0) slideVisible.value[idx] = entry.intersectionRatio >= 0.5
        }
        const leftmost = slideVisible.value.findIndex(Boolean)
        if (leftmost >= 0) activeIdx.value = leftmost
    }, {root: scrollEl.value, threshold: [0.5]})
    for (const el of slideEls.value) if (el) observer.observe(el)
}

function checkScrollable() {
    if (!scrollEl.value) { scrollable.value = false; return }
    scrollable.value = scrollEl.value.scrollWidth > scrollEl.value.clientWidth + 1
}

onMounted(async () => {
    await nextTick()
    setupObserver()
    checkScrollable()
    ro = new ResizeObserver(checkScrollable)
    if (scrollEl.value) ro.observe(scrollEl.value)
})

onBeforeUnmount(() => {
    observer?.disconnect()
    ro?.disconnect()
})


watch(slides, async () => {
    await nextTick()

    slideEls.value = slideEls.value.slice(0, slides.value.length)
    setupObserver()
    checkScrollable()
})

function goTo(idx) {
    const el = slideEls.value[idx]
    if (!el) return
    el.scrollIntoView({behavior: 'smooth', inline: 'start', block: 'nearest'})
    activeIdx.value = idx
}
</script>

<template>
    <div class="home-summary-row" :class="{'home-summary-row--challenges': board.cards.value.length}">
        <div ref="scrollEl" class="home-summary-row__scroll">
            <div
                v-for="(slide, i) in slides"
                :key="slide.key"
                :ref="el => { if (el) slideEls[i] = el }"
                class="home-summary-row__slide"
            >
                <WeeklySummaryPanel v-if="slide.key === 'summary'" />
                <StreakPanel v-else />
            </div>
        </div>

        <div
            v-if="scrollable && slides.length > 1"
            class="home-summary-row__dots"
            role="tablist"
            :aria-label="t('summary.carouselAria')"
        >
            <button
                v-for="(slide, i) in slides"
                :key="slide.key"
                type="button"
                role="tab"
                class="home-summary-row__dot"
                :class="{'home-summary-row__dot--active': activeIdx === i}"
                :aria-selected="activeIdx === i"
                :aria-label="t(slide.ariaKey)"
                @click="goTo(i)"
            />
        </div>

        <ChallengePanel :board="board" />
    </div>
</template>

<style scoped>
.home-summary-row {
    display: grid;
    gap: var(--grid-gap);
    margin: calc(var(--vertical-rhythm) * -1 + var(--grid-gap)) 0 var(--vertical-rhythm);

    @media (width >= 1200px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));

        &.home-summary-row--challenges {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }
}

.home-summary-row__scroll {
    display: flex;
    gap: var(--grid-gap);
    align-items: stretch;

    @media (width < 1200px) {
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        gap: var(--grid-gap);
        scrollbar-width: none;
        -ms-overflow-style: none;
        margin-block: 0;

        &::-webkit-scrollbar { display: none; }
    }

    @media (width >= 1200px) {
        display: contents;
    }
}

.home-summary-row__slide {
    min-inline-size: 0;
    flex: 1 1 0;
    display: flex;
    flex-direction: column;

    @media (width < 1200px) {
        scroll-snap-align: start;
    }

    @media (width < 720px) {
        flex: 0 0 100%;
    }

    @media (720px <= width < 1200px) {
        flex: 0 0 calc(50% - calc(var(--grid-gap) / 2));

        &:last-child {
            scroll-snap-align: end;
        }
    }
}

.home-summary-row__slide > :deep(.summary-panel) {
    margin: 0;
    block-size: 100%;
}

.home-summary-row__dots {
    display: none;
    justify-content: center;
    gap: .6rem;

    @media (width < 1200px) {
        display: flex;
    }
}

.home-summary-row__dot {
    inline-size: .7rem;
    block-size: .7rem;
    border-radius: .4rem;
    background: rgba(var(--text-rgb), .18);
    border: none;
    padding: 0;
    cursor: pointer;
    transition: background .15s ease, transform .15s ease;
}

.home-summary-row__dot--active {
    background: rgba(var(--text-rgb), .8);
    transform: scale(1.15);
}
</style>
