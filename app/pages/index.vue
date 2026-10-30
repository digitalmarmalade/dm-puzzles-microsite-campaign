<script setup>
import Archive from '@/api/Archive.js'

useHead({title: 'Sticky Puzzles', titleTemplate: '%s'})

const config = useRuntimeConfig()

await Archive.load(config.public.archiveFile);


const variantFamilies = Archive.getVariantFamilies();
const todaysPuzzles = Archive.getTodaysPuzzles();

const playStatus = usePlayStatusStore()
onMounted(() => playStatus.loadFor(todaysPuzzles))

const hidden = useHiddenVariantsStore()
const challenges = useChallengesStore()

const auth = useAuthStore()
const features = useFeatures()
const loggedOut = computed(() => features.requireAccount && !auth.user)

const revealHiddenToday = ref(false)
const revealHiddenAll = ref(false)

const {branchFor} = useTasteModel()
const branchSlugFor = (puzzle) => branchFor(puzzle).branch?.slug ?? puzzle.icon

const todaysByBranch = new Map()
for (const puzzle of todaysPuzzles) {
    const {family, branch} = branchFor(puzzle)
    const bs = branch?.slug ?? puzzle.icon
    if (!todaysByBranch.has(bs)) todaysByBranch.set(bs, {puzzle, family, branch, slug: bs})
}

const yesterdayVariants = computed(() => {
    const set = new Set()
    const now = new Date()
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    for (const c of (challenges.completions ?? [])) {
        const t = new Date(c.at).getTime()
        if (t >= yesterdayStart && t < todayStart) set.add(c.variant)
    }
    return set
})

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
const completionDaysByVariant = computed(() => {
    const map = new Map()
    for (const c of (challenges.completions ?? [])) {
        if (!map.has(c.variant)) map.set(c.variant, new Set())
        map.get(c.variant).add(dayKey(new Date(c.at)))
    }
    return map
})
const streakForVariant = (variantName) => {
    const days = completionDaysByVariant.value.get(variantName)
    if (!days || !days.size) return 0
    const cursor = new Date()
    if (!days.has(dayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1)
        if (!days.has(dayKey(cursor))) return 0
    }
    let count = 0
    while (days.has(dayKey(cursor))) {
        count++
        cursor.setDate(cursor.getDate() - 1)
    }
    return count
}

const streakBadgeForVariant = (variantName) => {
    if (!yesterdayVariants.value.has(variantName)) return null
    return {key: 'streak', count: streakForVariant(variantName)}
}

const yourPuzzleEntries = computed(() =>
    [...todaysByBranch.values()].filter(e => !hidden.isHidden(e.slug)))
const yourPuzzles = useYourPuzzles(yourPuzzleEntries)
const hasYourPuzzles = computed(() => !loggedOut.value && (yourPuzzles.cards.value.length > 0 || yourPuzzles.allDone.value))

const visibleTodaysPuzzles = computed(() =>
    todaysPuzzles.filter((p) => revealHiddenToday.value || !hidden.isHidden(branchSlugFor(p)))
)
const hiddenTodaysCount = computed(() =>
    todaysPuzzles.filter((p) => hidden.isHidden(branchSlugFor(p))).length
)

const todaysEntries = computed(() => {
    const out = []
    const familyIndex = new Map()
    const seen = new Set()
    for (const puzzle of visibleTodaysPuzzles.value) {
        if (seen.has(puzzle.slug)) continue
        seen.add(puzzle.slug)
        const {family, branch} = branchFor(puzzle)
        if (family?.isFamily) {
            if (!familyIndex.has(family.slug)) {
                const entry = {type: 'family', key: `f-${family.slug}`, family, entries: []}
                familyIndex.set(family.slug, entry)
                out.push(entry)
            }
            const group = familyIndex.get(family.slug)
            if (!group.entries.some(e => e.branch.slug === branch.slug)) {
                group.entries.push({puzzle, branch})
            }
        } else {
            out.push({type: 'single', key: puzzle.slug, puzzle})
        }
    }
    return out
        .map((entry) => {
            if (entry.type !== 'family' || entry.entries.length !== 1) return entry
            const {puzzle, branch} = entry.entries[0]
            return {type: 'single', key: puzzle.slug, puzzle, branch, family: entry.family}
        })
})

const {active: activeFilter, options: filterOptions, matches: matchesFilter} = usePuzzleFilters(variantFamilies)
const filteredFamilies = computed(() => variantFamilies.filter(f => matchesFilter(f.slug)))

const visibleFilteredFamilies = computed(() =>
    filteredFamilies.value.filter((f) => revealHiddenAll.value || !hidden.isHidden(f.slug))
)
const hiddenAllCount = computed(() =>
    filteredFamilies.value.filter((f) => hidden.isHidden(f.slug)).length
)
</script>

<template>
  <NuxtLayout>
    <Wrapper>
      <Section>

        <HomeNudge />

        <YourPuzzles
          v-if="hasYourPuzzles"
          :cards="yourPuzzles.cards.value"
          :all-done="yourPuzzles.allDone.value"
          :badge-for="streakBadgeForVariant"
        />

        <div class="home-banners">
          <HomeWelcome />
          <WrappedBanner v-if="!loggedOut" />
          <HomeAnnouncement />
          <ExtraSlot name="home-banners" />
        </div>
        <WrappedStory v-if="!loggedOut" />

        <HomeSummaryRow v-if="hasYourPuzzles" data-guide="summary" />

        <Heading1 :heading="$t('home.todaysPuzzles')"></Heading1>

        <div v-if="hiddenTodaysCount" class="hidden-reveal">
          <button
            type="button"
            class="hidden-reveal__button"
            :aria-pressed="revealHiddenToday"
            @click="revealHiddenToday = !revealHiddenToday"
          >{{ revealHiddenToday
              ? $t('home.hideHidden', hiddenTodaysCount)
              : $t('home.showHidden', hiddenTodaysCount) }}</button>
        </div>

        <PuzzleCardGrid v-if="todaysEntries.length" data-guide="today">
          <template
            v-for="entry in todaysEntries"
            :key="entry.key"
          >
            <TodayFamilyCard
              v-if="entry.type === 'family'"
              :family="entry.family"
              :entries="entry.entries"
            />
            <PuzzleCard
              v-else
              :puzzle="entry.puzzle"
              show-archive
              :badge="streakBadgeForVariant(entry.puzzle.variant)"
              :title-override="entry.family?.isFamily && entry.branch?.label ? `${entry.family.name} ${entry.branch.label}` : ''"
              :archive-slug-override="entry.branch?.slug ?? ''"
              :favourite-slug-override="entry.branch?.slug ?? ''"
              :icon-override="entry.family?.isFamily ? entry.family.slug : ''"
              :theme-override="entry.family?.isFamily ? entry.family.name : ''"
              :class="{'puzzle-card--hidden': hidden.isHidden(entry.branch?.slug ?? entry.puzzle.icon)}"
            />
          </template>
        </PuzzleCardGrid>
        <p v-else-if="hiddenTodaysCount" class="empty-state">{{ $t('home.allHidden') }}</p>

        <HomeSummaryRow v-if="!loggedOut && !hasYourPuzzles" data-guide="summary" />

        <Heading2 :heading="$t('home.allPuzzles')"></Heading2>

        <div v-if="hiddenAllCount" class="hidden-reveal">
          <button
            type="button"
            class="hidden-reveal__button"
            :aria-pressed="revealHiddenAll"
            @click="revealHiddenAll = !revealHiddenAll"
          >{{ revealHiddenAll
              ? $t('home.hideHidden', hiddenAllCount)
              : $t('home.showHidden', hiddenAllCount) }}</button>
        </div>

        <PillFilter
          v-model="activeFilter"
          :options="filterOptions"
          :aria-label="$t('home.filterByType')"
        />

        <VariantCardGrid v-if="visibleFilteredFamilies.length" data-guide="all">
          <template
            v-for="family in visibleFilteredFamilies"
            :key="family.slug"
          >
            <VariantCard :family="family" />
          </template>
        </VariantCardGrid>
        <p v-else-if="hiddenAllCount" class="empty-state">
          {{ $t('home.allHiddenCategory') }}

          <button
            type="button"
            class="hidden-reveal__button"
            :aria-pressed="revealHiddenAll"
            @click="revealHiddenAll = !revealHiddenAll"
          >{{ revealHiddenAll
              ? $t('home.hideHidden', hiddenAllCount)
              : $t('home.showHidden', hiddenAllCount) }}</button>

        </p>

      </Section>
    </Wrapper>
  </NuxtLayout>
</template>

<style scoped>
.home-banners {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 44rem), 1fr));
    gap: var(--grid-gap);
    margin: 0 0 var(--vertical-rhythm, 4rem);

    &:empty {
        display: none;
    }
}

.hidden-reveal {
    display: flex;
    justify-content: center;
    margin: -2rem 0 1.5rem;
}

.hidden-reveal__button {
    padding: .8rem 1.8rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: transparent;
    color: var(--text-colour-secondary, #777);
    font-size: 1.4rem;
    cursor: pointer;
    transition: all .15s ease;

    @media (hover: hover) {
        &:hover {
            border-color: var(--text-colour, #212121);
            color: var(--text-colour, #212121);
        }
    }
}

:deep(.puzzle-card--hidden) {
    opacity: .5;
    transition: opacity .15s ease;
}
:deep(.puzzle-card--hidden:hover) {
    @media (hover: hover) {
        opacity: .85;
    }
}

.empty-state {
    text-align: center;
    padding: 6rem 1.5rem;
    color: var(--text-colour-secondary, #777);
    font-size: 1.5rem;
    background: rgba(0, 0, 0, .02);
    border: 1px dashed var(--card-border);
    border-radius: var(--border-radius, 10px);
    margin: 0 0 3rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
}
</style>

