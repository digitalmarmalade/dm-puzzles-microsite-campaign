<script setup>
const props = defineProps({
    cards: {type: Array, required: true},
    allDone: {type: Boolean, default: false},
    badgeFor: {type: Function, default: () => null},
})

const {t} = useI18n()
const dateLocale = useDateLocale()
const preferences = usePreferencesStore()

const {showTip} = useGuide()
onMounted(() => setTimeout(() => {
    if (props.cards.length && !preferences.onboardingCompleted) showTip('yourPuzzles', t('guide.tip.yourPuzzles'))
}, 1500))

const reasonText = (entry) => {
    if (entry.reason.key === 'likeCategory') return t(`home.yourPuzzles.reasons.likeCategory.${entry.reason.category}`)
    if (!entry.archive) return t(`home.yourPuzzles.reasons.${entry.reason.key}`)
    const day = new Intl.DateTimeFormat(dateLocale.value, {weekday: 'long'}).format(entry.archiveDay)
    return t(`home.yourPuzzles.reasons.${entry.archiveReason}`, {day})
}
const titleFor = (entry) => {
    const base = entry.family?.isFamily && entry.branch?.label ? `${entry.family.name} ${entry.branch.label}` : ''
    if (!entry.archive) return base
    return t('home.yourPuzzles.archiveTitle', {name: base || entry.puzzle.variant, number: entry.puzzle.number})
}
</script>

<template>
    <section v-if="cards.length || allDone" class="your-puzzles" data-guide="your-puzzles">
        <FavouriteCardGrid mode="featured" :label="t('home.yourPuzzles.title')">
            <div v-if="allDone" class="your-puzzles__done">
                <svg class="your-puzzles__done-icon" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                <span class="your-puzzles__done-title">{{ t('home.yourPuzzles.allDone') }}</span>
                <span class="your-puzzles__done-body">{{ t('home.yourPuzzles.allDoneBody') }}</span>
            </div>
            <PuzzleCard
                v-for="entry in cards"
                :key="entry.slug"
                :puzzle="entry.puzzle"
                slim
                show-archive
                :badge="entry.archive ? null : badgeFor(entry.puzzle.variant)"
                :reason="reasonText(entry)"
                :title-override="titleFor(entry)"
                :archive-slug-override="entry.branch?.slug ?? ''"
                :favourite-slug-override="entry.branch?.slug ?? ''"
                :icon-override="entry.family?.isFamily ? entry.family.slug : ''"
                :theme-override="entry.family?.isFamily ? entry.family.name : ''"
            />
        </FavouriteCardGrid>
    </section>
</template>

<style scoped>
.your-puzzles__done {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    flex-shrink: 0;
    min-inline-size: 17rem;
    max-inline-size: 17rem;
    padding: 2rem 1.6rem;
    border-radius: var(--border-radius, 10px);
    color: inherit;
    text-align: center;
    text-decoration: none;
    transition: border-color .15s ease;
}

.your-puzzles__done-icon {
    inline-size: 3.2rem;
    block-size: 3.2rem;
    color: var(--primary);
    fill: currentColor;
}

.your-puzzles__done-title {
    font-size: 1.6rem;
    font-weight: 700;
}

.your-puzzles__done-body {
    font-size: 1.3rem;
    line-height: 1.4;
    color: var(--text-colour-secondary, #777);
    text-wrap: balance;
}

.your-puzzles__done-cta {
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    margin-block-start: .4rem;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 1px;

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
        fill: currentColor;
    }
}
</style>
