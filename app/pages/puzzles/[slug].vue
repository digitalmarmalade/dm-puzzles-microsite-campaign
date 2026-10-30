<script setup>
import Archive from '@/api/Archive.js'
import ArchiveFilter from '@/components/puzzles/ArchiveFilter.vue'
import ArchiveTypeStats from '@/components/site/ArchiveTypeStats.vue'
import ArchiveTypeAchievements from '@/components/site/ArchiveTypeAchievements.vue'
import {themeClass} from '@/lib/utils'

const config = useRuntimeConfig()

await Archive.load(config.public.archiveFile);

const {locale, t, te} = useI18n()
const familyDescription = (slug) => {
  const key = `puzzleDescription.${slug}`
  return te(key) ? t(key) : ''
}
const route = useRoute()
const slug = route.params.slug
if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
}

const resolved = slug ? Archive.getBranchBySlug(slug) : null
if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: 'Page Not Found' })
}
const family = resolved.family
const branch = resolved.branch
const variant = branch.variantName

const heading = computed(() =>
    family.isFamily && branch.label
        ? `${family.name} ${branch.label}`
        : family.name
)
useHead({title: () => heading.value})

const archiveSlugs = branch.puzzleSlugs
const todaySlugs = (Archive.getToday()?.[variant] ?? [])
    .filter(s => !branch.difficulty || Archive.getPuzzles(s)?.difficulty === branch.difficulty)
const allSlugs = [...new Set([...todaySlugs, ...archiveSlugs])]

const currentPuzzles = allSlugs.map(slug => ({
  ...Archive.getPuzzles(slug),
}))

for (let currentPuzzle in currentPuzzles) {
  currentPuzzles[currentPuzzle] = toEnhancedPuzzle({
    'puzzle': currentPuzzles[currentPuzzle],
  });
}

const playStatus = usePlayStatusStore()
onMounted(() => playStatus.loadFor(currentPuzzles))

//  date filter: Recent (last 2 weeks of puzzles) or a specific month
const availableMonths = [...new Set(currentPuzzles.map((p) => p.calendar).filter(Boolean))].sort()
const minMonth = availableMonths[0] ?? ''
const maxMonth = availableMonths[availableMonths.length - 1] ?? ''

//  "recent" = puzzles within 30 days of the most recent puzzle
const DAY_MS = 24 * 60 * 60 * 1000
const puzzleTimes = currentPuzzles.map((p) => new Date(p.date).getTime()).filter((t) => !Number.isNaN(t))
const latestTime = puzzleTimes.length ? Math.max(...puzzleTimes) : 0
const recentCutoff = latestTime - 30 * DAY_MS
const recentPuzzles = currentPuzzles.filter((p) => {
  const t = new Date(p.date).getTime()
  return !Number.isNaN(t) && t >= recentCutoff
})

const recent = useState(`archive:${slug}:recent`, () => true)
const viewMonth = useState(`archive:${slug}:month`, () => maxMonth)
function selectRecent() { recent.value = true }
function selectMonth(m) { viewMonth.value = m; recent.value = false }

const statusFilter = useState(`archive:${slug}:status`, () => 'all')
const STATUS_OPTIONS = [
  {value: 'all',        labelKey: 'archive.statusAll'},
  {value: 'unplayed',   labelKey: 'archive.statusUnplayed'},
  {value: 'unfinished', labelKey: 'archive.statusUnfinished'},
  {value: 'completed',  labelKey: 'archive.statusCompleted'},
]

const statusOf = (puzzle) => {
  const s = playStatus.statusFor(puzzle.slug)
  if (s?.completed) return 'completed'
  if (s?.started)   return 'unfinished'
  return 'unplayed'
}

const mostRecentByStatus = (target) =>
  [...currentPuzzles]
    .filter((p) => statusOf(p) === target)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] ?? null

const latestUnplayed   = computed(() => mostRecentByStatus('unplayed'))
const latestUnfinished = computed(() => mostRecentByStatus('unfinished'))

const filteredPuzzles = computed(() => {
  const byDate = recent.value
    ? recentPuzzles
    : currentPuzzles.filter((p) => p.calendar === viewMonth.value)
  return statusFilter.value === 'all'
    ? byDate
    : byDate.filter((p) => statusOf(p) === statusFilter.value)
})

const monthKey = (d) => `${d.getFullYear()}-${d.getMonth()}`

function puzzleGrid(puzzles) {
  const sorted = [...puzzles].sort((a, b) => new Date(b.date) - new Date(a.date))
  const items = []
  let prevMonth = null
  for (const puzzle of sorted) {
    const d = new Date(puzzle.date)
    const key = monthKey(d)

    if (key !== prevMonth) {
      items.push({type: 'divider', key: `divider-${key}`, label: d.toLocaleDateString(locale.value, {month: 'short'})})
    }
    prevMonth = key
    items.push({type: 'puzzle', key: puzzle.slug, puzzle})
  }
  return items
}

function monthGrid(calendarKey) {
  const byDay = new Map()
  for (const p of currentPuzzles) {
    if (p.calendar === calendarKey) byDay.set(new Date(p.date).getDate(), p)
  }
  const [year, month] = calendarKey.split('-').map(Number)   //  month: 1–12
  let cap = new Date(year, month, 0).getDate()               //  last day of the month
  const latest = latestTime ? new Date(latestTime) : null
  if (latest && latest.getFullYear() === year && latest.getMonth() + 1 === month) {
    cap = Math.min(cap, latest.getDate())
  }
  const label = new Date(year, month - 1, 1).toLocaleDateString(locale.value, {month: 'short'})
  const items = [{type: 'divider', key: `divider-${calendarKey}`, label}]
  for (let day = cap; day >= 1; day--) {
    const puzzle = byDay.get(day)
    items.push(puzzle
      ? {type: 'puzzle', key: puzzle.slug, puzzle}
      : {type: 'empty', key: `empty-${calendarKey}-${day}`, day})
  }
  return items
}

const gridItems = computed(() => {
  if (!recent.value && statusFilter.value === 'all' && viewMonth.value) return monthGrid(viewMonth.value)
  return puzzleGrid(filteredPuzzles.value)
})
</script>

<template>
  <NuxtLayout>
    <Wrapper>
      <div class="card card--main archive-main" :class="themeClass(family.name)">

        <div class="puzzles-page-header-holder">
          <nav
            v-if="family.isFamily"
            class="level-nav"
            :aria-label="$t('archive.otherLevels')"
          >
            <template v-for="b in family.branches" :key="b.slug">
              <span
                v-if="b.slug === branch.slug"
                class="level-nav__item level-nav__item--active"
                aria-current="page"
              >{{ b.label }}</span>
              <NuxtLinkLocale
                v-else
                :to="`/puzzles/${b.slug}`"
                class="level-nav__item"
              >{{ b.label }}</NuxtLinkLocale>
            </template>
          </nav>

          <div class="puzzles-page-header">
            <div class="puzzles-page-header__title">
              <div class="puzzle-icon-holder puzzles-page-header__tile">
                <div class="puzzle-icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg">
                    <use :href="sprite(family.slug)"></use>
                  </svg>
                </div>
              </div>
              <h1 class="reduced-h1" v-text="heading"></h1>
            </div>
            <FavouriteHeart :slug="branch.slug" large />
          </div>
        </div>

        <div class="archive-options">

          <div
            v-if="latestUnplayed || latestUnfinished"
            class="quick-play"
          >
            <span class="quick-play__label">{{ $t('archive.playMostRecent') }}</span>
            <NuxtLinkLocale
              v-if="latestUnplayed"
              :to="`/puzzle/${latestUnplayed.slug}`"
              class="stats-filter__pill quick-play__pill"
            >{{ $t('archive.statusUnplayed') }}</NuxtLinkLocale>
            <NuxtLinkLocale
              v-if="latestUnfinished"
              :to="`/puzzle/${latestUnfinished.slug}`"
              class="stats-filter__pill quick-play__pill"
            >{{ $t('archive.statusUnfinished') }}</NuxtLinkLocale>
          </div>

          <ArchiveFilter>

            <p>{{ $t('archive.filterBy') }} </p>

            <button
              type="button"
              class="stats-filter__pill"
              :class="{'stats-filter__pill--active': recent}"
              @click="selectRecent"
            >{{ $t('archive.recent') }}</button>

            <MonthYearPicker
              :model-value="viewMonth"
              :min="minMonth"
              :max="maxMonth"
              :placeholder="$t('friends.stats.date')"
              :active="!recent"
              @update:model-value="selectMonth"
            />

            <label class="archive-status-filter">
              <span class="sr-only">{{ $t('archive.statusFilterLabel') }}</span>
              <select
                v-model="statusFilter"
                class="archive-status-filter__select"
              >
                <option
                  v-for="o in STATUS_OPTIONS"
                  :key="o.value"
                  :value="o.value"
                >{{ $t(o.labelKey) }}</option>
              </select>
            </label>

          </ArchiveFilter>

        </div>

        <div class="archive-dates"
            :class="themeClass(family.name)"
        >
        <ArchivePuzzleCardGrid v-if="gridItems.length">
          <template
            v-for="item in gridItems"
            :key="item.key"
          >
            <p v-if="item.type === 'divider'" class="archive-month" aria-hidden="true">
              <span v-text="item.label"></span>
            </p>
            <div v-else-if="item.type === 'empty'" class="archive-empty-day" aria-hidden="true">
              <span v-text="item.day"></span>
            </div>
            <ArchivePuzzleCard
              v-else
              :puzzle="item.puzzle"
              :theme="family.name"
            />
          </template>
        </ArchivePuzzleCardGrid>
        <p v-else class="archive-empty">{{ $t('archive.noPuzzles') }}</p>
        </div>

        <ArchiveTypeStats :variant="variant" :name="heading" />

        <ArchiveTypeAchievements :variant="variant" :name="heading" :slug="family.slug" :theme="themeClass(family.name)" />

        <p><strong>{{ $t('archive.about') }} <span v-text="family.name"></span>:</strong> <span v-text="familyDescription(family.slug)"></span></p>
      </div>
    </Wrapper>
  </NuxtLayout>
</template>

<style>

  .card { align-items: flex-start; }

  .puzzles-page-header-holder {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    inline-size: 100%;
  }

  .puzzles-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    inline-size: 100%;
  }
  .puzzles-page-header__title {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    min-inline-size: 0;
  }
  .puzzles-page-header__tile {
    flex: none;
    --card-icon-size: 7rem;

    @media (width < 600px) {
      --card-icon-size: 5.5rem;
    }
  }

  .archive-main {
    position: relative;
    overflow-x: clip;
  }

  .level-nav {
    display: inline-flex;
    align-items: stretch;
    align-self: flex-start;
    background: color-mix(in srgb, var(--puzzle-tile-text) 12%, var(--card-background));
    border: 1px solid color-mix(in srgb, var(--puzzle-tile-text) 25%, var(--card-background));
    border-radius: 999px;
    overflow: hidden;
    max-inline-size: 100%;
  }
  .level-nav__item {
    padding: .7rem 1.6rem;
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--text-colour, #212121);
    text-decoration: none;
    line-height: 1.2;
    cursor: pointer;
    transition: background-color .15s ease, color .15s ease;
  }
  .level-nav__item + .level-nav__item {
    border-inline-start: 1px solid color-mix(in srgb, var(--puzzle-tile-text) 25%, var(--card-background));
  }
  .level-nav__item:focus-visible:not(.level-nav__item--active) {
    background: color-mix(in srgb, var(--puzzle-tile-text) 22%, var(--card-background));
  }
  .level-nav__item:hover:not(.level-nav__item--active) {
      @media (hover: hover) {
          background: color-mix(in srgb, var(--puzzle-tile-text) 22%, var(--card-background));
      }
  }
  .level-nav__item--active {
    background: var(--puzzle-tile-text, var(--text-colour));
    color: var(--card-background, #fff);
    cursor: default;
  }

  .archive-options {
    inline-size: 100%;
    display: flex;
    flex-direction: row-reverse;
    justify-content: space-between;
    margin-block: calc(var(--vertical-rhythm) / 2 * -1);

    @media (width < 1024px) {
      flex-direction: column;
      gap: 1rem;
    }
  }

  .stats-filter__pill {
    padding: .8rem 1.6rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: var(--card-background, #fff);
    color: var(--text-colour, #212121);
    font-size: 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all .15s ease;

    @media (width < 600px) {
      font-size: 1.3rem;
      padding: .5rem 1.2rem;
    }
  }

  .stats-filter__pill--active {
    background: var(--text-colour, #212121);
    color: var(--card-background, #fff);
    border-color: var(--text-colour, #212121);
  }

  .archive-empty {
    text-align: center;
    padding: 3rem 0;
    opacity: .7;
  }

  .archive-empty-day {
    inline-size: 8rem;
    block-size: 8rem;
    margin: 0 auto;
    display: grid;
    place-items: center;
    border: 1px dashed rgba(var(--puzzle-tile-shadow), .35);
    border-radius: 1rem;
    color: var(--text-colour-secondary);
    opacity: .45;
  }
  .archive-empty-day span {
    font-size: 2.6rem;
    line-height: 1;
  }

  .quick-play {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: .8rem;
    justify-self: flex-start;
    @media (width < 600px) {
      font-size: 1.3rem;
    }
  }
  .quick-play__pill {
    text-decoration: none;
    background: color-mix(in srgb, var(--puzzle-tile-text) 15%, var(--card-background));
    border-color: color-mix(in srgb, var(--puzzle-tile-text) 30%, var(--card-background));
    color: var(--text-colour, #212121);
    transition: background-color .15s ease, border-color .15s ease;
  }
  .quick-play__pill:focus-visible {
    background: color-mix(in srgb, var(--puzzle-tile-text) 25%, var(--card-background));
    border-color: color-mix(in srgb, var(--puzzle-tile-text) 45%, var(--card-background));
  }
  .quick-play__pill:hover {
      @media (hover: hover) {
          background: color-mix(in srgb, var(--puzzle-tile-text) 25%, var(--card-background));
          border-color: color-mix(in srgb, var(--puzzle-tile-text) 45%, var(--card-background));
      }
  }

  .archive-status-filter {
    display: inline-flex;
    align-items: center;
  }
  .archive-status-filter__select {
    padding: .8rem 1.6rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: var(--card-background, #fff);
    color: var(--text-colour, #212121);
    font-size: 1.5rem;
    font-weight: 600;
    cursor: pointer;
    appearance: none;
    padding-inline-end: 2.6rem;
    background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
                      linear-gradient(-45deg, transparent 50%, currentColor 50%);
    background-position: right 1.1rem top 50%, right .7rem top 50%;
    background-size: .4rem .4rem, .4rem .4rem;
    background-repeat: no-repeat;

    @media (hover: hover) {
        &:hover {
            border-color: var(--text-colour, #212121);
        }
    }
  }

  .archive-month {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    font-family: var(--font-display, inherit);
    font-weight: 700;
    font-size: 1.4rem;
    letter-spacing: .15rem;
    text-transform: uppercase;
    color: var(--text-colour-secondary);
    position: relative;

    &::before,
    &::after {
      display: block;
      content: '';
      position: absolute;
      inset-inline-start: 50%;

      transform: translate(-50%, 0);
      border-inline-start: 1px dotted var(--text-colour);
    }
    &:before {
      inset-block-start: 0;
      block-size: 25%;
    }
    &:after {
      inset-block-end: 0;
      block-size: 25%;
    }
  }

  .archive-month span {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
  }

  .archive-dates {

    padding: 3rem 1rem;
    background-color: rgba(var(--puzzle-tile-shadow),.1);
    border-radius: 8px;
    inline-size: 100%;

    @media (width >= 600px) {
      padding: 5rem 2rem;
    }

    @media (width >= 1200px) {
      padding: 5rem 4rem;
    }
  }

</style>
