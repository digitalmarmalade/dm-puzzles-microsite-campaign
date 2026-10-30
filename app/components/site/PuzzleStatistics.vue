<script setup>
import Archive from '@/api/Archive.js'
import {themeSlug} from '@/lib/utils'
import {dateHelpers} from '@/lib/challenges'
import {monthKey} from '@/lib/lifetime'
import {monthlyCounts, periodSummary} from '@/lib/recap'
import {variantLook} from '@/lib/variantLook'
import {profileFor} from '@/lib/playerProfile'

const {t} = useI18n()
const dateLocale = useDateLocale()
const challenges = useChallengesStore()
const playStatus = usePlayStatusStore()
const puzzleStats = usePuzzleStats()
const features = useFeatures()
const auth = useAuthStore()
const {available: wrappedAvailable} = useWrapped()
const showWrapped = computed(() => wrappedAvailable.value && !(features.requireAccount && !auth.user))

onMounted(() => playStatus.loadAll())

const completions = computed(() => challenges.completions ?? [])
const hasData = computed(() => puzzleStats.totalPuzzles.value > 0)

const now = new Date()
const thisMonth = monthKey(now)
const thisYear = `${now.getFullYear()}-`
const period = ref('month')

const allThisYear = computed(() => {
    const inYear = (k) => !k || k.startsWith(thisYear)
    return completions.value.every(c => inYear(monthKey(c.at)))
        && Object.keys(challenges.lifetime?.months ?? {}).every(inYear)
        && Object.values(playStatus.map).every(s => !s?.startedAt || inYear(monthKey(s.startedAt)))
})

const periodOptions = computed(() => [
    {value: 'month', label: new Intl.DateTimeFormat(dateLocale.value, {month: 'long'}).format(now)},
    ...(allThisYear.value ? [] : [{value: 'year', label: String(now.getFullYear())}]),
    {value: 'all', label: t('stats.allTime')},
])

watch(allThisYear, (all) => {
    if (all && period.value === 'year') period.value = 'all'
})

const matchMonth = computed(() => {
    if (period.value === 'month') return (k) => k === thisMonth
    if (period.value === 'year') return (k) => !!k && k.startsWith(thisYear)
    return () => true
})

const summary = computed(() => periodSummary(challenges.lifetime, completions.value, matchMonth.value))
const periodCompletions = computed(() => completions.value.filter(c => matchMonth.value(monthKey(c.at))))

const startedCount = computed(() => {
    const match = matchMonth.value
    const slugs = new Set(periodCompletions.value.map(c => c.slug))
    for (const [slug, status] of Object.entries(playStatus.map)) {
        if (status?.startedAt && match(monthKey(status.startedAt))) slugs.add(slug)
    }
    let folded = 0
    for (const [key, bucket] of Object.entries(challenges.lifetime?.months ?? {})) {
        if (match(key)) folded += bucket.total ?? 0
    }
    return slugs.size + folded
})

const topPlayed = computed(() =>
    Object.entries(summary.value.byVariant)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([variant, count]) => {
            const look = variantLook(variant)
            return {variant, count, slug: look.icon, theme: look.theme}
        }))

const puzzleTypes = computed(() =>
    Object.keys(Archive.getVariants() ?? {}).sort((a, b) => a.localeCompare(b, dateLocale.value)).map(variant => {
        const look = variantLook(variant)
        return {variant, slug: look.icon, theme: look.theme, count: summary.value.byVariant[variant] ?? 0}
    }))

const startOfDay = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

const rollingDates = computed(() => {
    const today = startOfDay(new Date())
    const out = []
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        out.push(d)
    }
    return out
})
const lastWeekDates = computed(() => {
    const today = startOfDay(new Date())
    const out = []
    for (let i = 13; i >= 7; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        out.push(d)
    }
    return out
})

const countsByDayKey = computed(() => {
    const map = {}
    for (const c of completions.value) {
        const k = dateHelpers.dayKey(c.at)
        map[k] = (map[k] ?? 0) + 1
    }
    return map
})

const thisWeekDow = computed(() =>
    rollingDates.value.map(d => countsByDayKey.value[dateHelpers.dayKey(d)] ?? 0))
const lastWeekDow = computed(() =>
    lastWeekDates.value.map(d => countsByDayKey.value[dateHelpers.dayKey(d)] ?? 0))

const avg90Dow = computed(() => {
    if (!completions.value.length) return new Array(7).fill(0)

    const today = startOfDay(new Date())
    const cap = new Date(today)
    cap.setDate(today.getDate() - 89)
    const earliest = startOfDay(new Date(
        Math.min(...completions.value.map(c => new Date(c.at).getTime()))
    ))
    const windowStart = earliest > cap ? earliest : cap

    const weekdayDays = new Array(7).fill(0)
    for (const d = new Date(windowStart); d <= today; d.setDate(d.getDate() + 1)) {
        weekdayDays[d.getDay()]++
    }
    const weekdayPlays = new Array(7).fill(0)
    for (const c of completions.value) {
        const at = startOfDay(new Date(c.at))
        if (at < windowStart || at > today) continue
        weekdayPlays[at.getDay()]++
    }

    return rollingDates.value.map(d => {
        const wd = d.getDay()
        return weekdayDays[wd] > 0 ? weekdayPlays[wd] / weekdayDays[wd] : 0
    })
})

const profile = computed(() => {
    const p = profileFor(summary.value, periodCompletions.value)
    if (!p) return null
    return {...p, title: t(`profile.${p.id}.title`, p.vars), subtitle: t(`profile.${p.id}.subtitle`, p.vars)}
})

const weekdayNames = computed(() => {
    const fmt = new Intl.DateTimeFormat(dateLocale.value, {weekday: 'short'})
    return rollingDates.value.map(d => fmt.format(d))
})

const MAX_MONTH_POINTS = 24

const counts = computed(() => monthlyCounts(challenges.lifetime, completions.value))

const chart = computed(() => {
    const monthShort = new Intl.DateTimeFormat(dateLocale.value, {month: 'short'})
    const year = now.getFullYear()

    if (period.value === 'month') {
        return {
            title: t('stats.weeksPlays'),
            labels: weekdayNames.value,
            series: [
                {key: 'current', variant: 'current', label: t('stats.thisWeek'), values: thisWeekDow.value},
                {key: 'previous', variant: 'previous', label: t('stats.lastWeek'), values: lastWeekDow.value},
                {key: 'average', variant: 'average', label: t('stats.average90'), values: avg90Dow.value},
            ],
        }
    }

    if (period.value === 'year') {
        const keyFor = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`
        const months = [...Array(12).keys()]
        const previous = months.map(m => counts.value[keyFor(year - 1, m)] ?? 0)
        const series = [{key: 'current', variant: 'current', label: String(year), values: months.slice(0, now.getMonth() + 1).map(m => counts.value[keyFor(year, m)] ?? 0)}]
        if (previous.some(Boolean)) series.push({key: 'previous', variant: 'previous', label: String(year - 1), values: previous})
        return {
            title: t('stats.playsByMonth'),
            labels: months.map(m => monthShort.format(new Date(year, m, 1))),
            series,
        }
    }

    const keys = Object.keys(counts.value).filter(k => counts.value[k] > 0).sort()
    const first = keys[0] ?? thisMonth
    const [fy, fm] = first.split('-').map(Number)
    const buckets = []
    for (let d = new Date(fy, fm - 1, 1); d <= now; d.setMonth(d.getMonth() + 1)) buckets.push(new Date(d))
    let labels, values
    if (buckets.length > MAX_MONTH_POINTS) {
        const years = [...new Set(buckets.map(d => d.getFullYear()))]
        labels = years.map(String)
        values = years.map(y => Object.entries(counts.value).filter(([k]) => k.startsWith(`${y}-`)).reduce((a, [, n]) => a + n, 0))
    } else {
        values = buckets.map(d => counts.value[monthKey(d)] ?? 0)
        const step = Math.ceil(buckets.length / 12)
        labels = buckets.map((d, i) => (i % step === 0 || i === buckets.length - 1) ? monthShort.format(d) : '')
    }
    const average = values.reduce((a, b) => a + b, 0) / (values.length || 1)
    return {
        title: t('stats.playsOverTime'),
        labels,
        series: [
            {key: 'current', variant: 'current', label: t(buckets.length > MAX_MONTH_POINTS ? 'stats.playsPerYear' : 'stats.playsPerMonth'), values},
            {key: 'average', variant: 'average', label: t('stats.averageLine'), values: values.map(() => average)},
        ],
    }
})
</script>

<template>
    <StatsTeaser v-if="!hasData" play-link />

    <div v-else class="puzzle-stats">
        
        <div class="puzzle-stats__head">
            <PillFilter v-model="period" :options="periodOptions" :aria-label="t('stats.period')" />
        </div>

        <div class="puzzle-stats__hero">
            <div class="stat-tile">
                <p class="stat-tile__value"><CountUp :value="startedCount" /></p>
                <p class="stat-tile__label">{{ t('stats.started') }}</p>
            </div>
            <div class="stat-tile">
                <p class="stat-tile__value"><CountUp :value="summary.puzzles" /></p>
                <p class="stat-tile__label">{{ t('stats.completed') }}</p>
            </div>
            <div class="stat-tile">
                <p class="stat-tile__value"><CountUp :value="summary.clean" /></p>
                <p class="stat-tile__label">{{ t('stats.cleanSolves') }}</p>
            </div>
            <div class="stat-tile">
                <p class="stat-tile__value"><CountUp :value="summary.days" /></p>
                <p class="stat-tile__label">{{ t('stats.daysPlayed') }}</p>
            </div>
            <div class="stat-tile">
                <p class="stat-tile__value"><CountUp :value="summary.longestRun" /></p>
                <p class="stat-tile__label">{{ t('stats.longestStreak') }}</p>
            </div>
        </div>

        <div class="puzzle-stats__row">
            <div
                v-if="profile"
                class="stat-tile stat-tile--wide stat-tile--profile"
            >
                <p class="stat-tile__label">{{ t('profile.label') }}</p>
                <Transition name="profile-swap" mode="out-in">
                    <div
                        :key="`${profile.id}-${profile.title}`"
                        class="stat-tile__profile"
                    >
                        <div class="puzzle-icon-holder" aria-hidden="true">
                            <div class="puzzle-icon">
                                <img
                                    class="stat-tile__profile-icon"
                                    :src="`/img/profiles/${profile.id}.svg`"
                                    alt=""
                                >
                            </div>
                        </div>
                        <p class="stat-tile__profile-title">{{ profile.title }}</p>
                        <p class="stat-tile__profile-sub">{{ profile.subtitle }}</p>
                    </div>
                </Transition>
            </div>

            <div
                v-if="topPlayed.length"
                class="stat-tile stat-tile--wide stat-tile--most"
            >
                <p class="stat-tile__label">{{ t('summary.mostPlayed') }}</p>
                <div
                    class="stat-tile__most"
                    :class="`puzzle-card--${themeSlug(topPlayed[0].theme)}`"
                >
                    <div class="puzzle-icon-holder" aria-hidden="true">
                        <div class="puzzle-icon">
                            <svg xmlns="http://www.w3.org/2000/svg">
                                <use :href="sprite(topPlayed[0].slug)"></use>
                            </svg>
                        </div>
                    </div>
                    <span class="stat-tile__most-name">{{ topPlayed[0].variant }}</span>
                    <span class="stat-tile__most-count">× <CountUp :value="topPlayed[0].count" /></span>
                </div>
                <ul v-if="topPlayed.length > 1" class="stat-tile__most-list">
                    <li
                        v-for="p in topPlayed.slice(1)"
                        :key="p.slug"
                        class="stat-tile__most-row"
                        :class="`puzzle-card--${themeSlug(p.theme)}`"
                    >
                        <div class="puzzle-icon-holder" aria-hidden="true">
                            <div class="puzzle-icon">
                                <svg xmlns="http://www.w3.org/2000/svg">
                                    <use :href="sprite(p.slug)"></use>
                                </svg>
                            </div>
                        </div>
                        <span class="stat-tile__most-name">{{ p.variant }}</span>
                        <span class="stat-tile__most-count">× <CountUp :value="p.count" /></span>
                    </li>
                </ul>
            </div>

            <div class="stat-tile stat-tile--wide stat-tile--span-2">
                <p class="stat-tile__label">{{ chart.title }}</p>
                <PlaysChart :labels="chart.labels" :series="chart.series" :aria-label="chart.title" />
            </div>
        </div>

        <div class="puzzle-stats__types-row" :class="{'puzzle-stats__types-row--wrapped': showWrapped}">
            <section class="stat-tile puzzle-stats__types" :aria-label="t('stats.typesPlayed')">
                <p class="stat-tile__label">{{ t('stats.typesPlayed') }}</p>
                <ul class="puzzle-stats__type-list">
                    <li
                        v-for="p in puzzleTypes"
                        :key="p.slug"
                        class="puzzle-stats__type"
                        :class="[`puzzle-card--${themeSlug(p.theme)}`, {'puzzle-stats__type--unplayed': !p.count}]"
                        :aria-label="t('stats.typePlays', {name: p.variant, count: p.count})"
                    >
                        <div class="puzzle-icon-holder" aria-hidden="true">
                            <div v-if="p.count" class="puzzle-icon">
                                <svg xmlns="http://www.w3.org/2000/svg">
                                    <use :href="sprite(p.slug)"></use>
                                </svg>
                            </div>
                            <div v-else class="puzzle-icon__home-icon">
                                <svg xmlns="http://www.w3.org/2000/svg">
                                    <use :href="sprite(p.slug)"></use>
                                </svg>
                            </div>
                        </div>
                        <span v-if="p.count" class="puzzle-stats__type-count" aria-hidden="true"><CountUp :value="p.count" /></span>
                        <span class="puzzle-stats__type-name" aria-hidden="true">{{ p.variant }}</span>
                    </li>
                </ul>
            </section>
            <WrappedLink v-if="showWrapped" />
        </div>
    </div>
</template>

<style scoped>
.puzzle-stats {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.puzzle-stats__hero {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    @media (width >= 700px) { grid-template-columns: repeat(5, minmax(0, 1fr)); }

    & > .stat-tile:last-child:nth-child(odd) {
        grid-column: span 2;
        @media (width >= 700px) { grid-column: auto; }
    }
}

.puzzle-stats__head {
    display: flex;

    & :deep(.pill-filter) {
        margin: 0;
    }
}

.puzzle-stats__types-row {
    display: grid;
    gap: 1rem;

    &.puzzle-stats__types-row--wrapped {
        @media (width >= 1024px) {
            grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        }
    }
}

.puzzle-stats__types {
    --card-icon-size: 6rem;
    gap: 1.6rem;
}

.puzzle-stats__type-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 2rem 1rem;
    margin: 0 0 .5rem;
    padding: 0;
    list-style: none;
    background: var(--app-bg);
    padding: 2rem 1rem;
    border-radius: 1rem;
}

.puzzle-stats__type {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .8rem;
    text-align: center;

    & :deep(.puzzle-icon-holder) {
        background: transparent;
        flex: none;
    }
}

.puzzle-stats__type--unplayed .puzzle-stats__type-name {
    color: var(--text-colour-secondary, #777);
    font-weight: 400;
}

.puzzle-stats__type-count {
    position: absolute;
    inset-block-start: -.4rem;
    inset-inline-end: 1rem;
    z-index: 1;
    min-inline-size: 2.8rem;
    block-size: 2.8rem;
    padding-inline: .6rem;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: var(--puzzle-tile-background);
    color: var(--text-colour);
    border: 1px solid rgba(var(--puzzle-tile-shadow),.5);
    font-size: 1.3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.puzzle-stats__type-name {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--text-colour, #212121);
}


.puzzle-stats__row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    @media (width >= 1024px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    @media (width >= 1200px) {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }
}
.stat-tile--span-2 {
    @media (width >= 1024px) {
        grid-column: span 2;
    }
}

.stat-tile {
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    padding: 1.2rem 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-inline-size: 0;
}

.stat-tile--most {
    --card-icon-size: 7rem;
    gap: 0;
}

.stat-tile__value {
    margin: 0;
    font-size: 2.6rem;
    font-weight: 700;
    line-height: 1;
    color: var(--text-colour, #212121);
    font-variant-numeric: tabular-nums;
}
.stat-tile__value-sub {
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--text-colour-secondary, #777);
    letter-spacing: 0;
}
.stat-tile__label {
    margin: 0;
    font-size: 1.15rem;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;
}

.stat-tile__most {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    min-inline-size: 0;
    flex-direction: row;
    justify-content: center;
    padding: 1rem 0;
}
.stat-tile--most :deep(.puzzle-icon-holder) {
    background: transparent;
    flex: none;
}
.stat-tile__most-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-colour, #212121);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.stat-tile__most-count {
    color: var(--text-colour-secondary, #777);
    background: var(--app-bg);
    padding: .5rem 1rem;
    border-radius: 999px;
    margin-inline-start: auto;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    font-size: 1.3rem;
}

.stat-tile__most-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: .8rem;
}
.stat-tile__most-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-inline-size: 0;
    --card-icon-size: 5rem;
    padding: 1rem 0;
    border-block-start: 1px dotted var(--text-recessed);
}
.stat-tile__most-row .stat-tile__most-name {
    font-size: 1.5rem;
    flex-grow: 1;
    min-inline-size: 0;
}

.stat-tile--profile {
    --card-icon-size: 8rem;
    --card-svg-size: 6rem;
}
.stat-tile--profile :deep(.puzzle-icon-holder) {
    background: transparent;
    flex: none;
}
.profile-swap-enter-active {
    transition: opacity .3s ease, transform .3s ease;

    & :deep(.puzzle-icon) {
        transition: transform .4s cubic-bezier(.34, 1.56, .64, 1);
    }

    @media (prefers-reduced-motion: reduce) {
        transition: opacity .2s ease;

        & :deep(.puzzle-icon) {
            transition: none;
        }
    }
}

.profile-swap-leave-active {
    transition: opacity .18s ease, transform .18s ease;

    @media (prefers-reduced-motion: reduce) {
        transition: opacity .15s ease;
    }
}

.profile-swap-enter-from {
    opacity: 0;
    transform: translateY(-.8rem);

    & :deep(.puzzle-icon) {
        transform: scale(.7);
    }

    @media (prefers-reduced-motion: reduce) {
        transform: none;

        & :deep(.puzzle-icon) {
            transform: none;
        }
    }
}

.profile-swap-leave-to {
    opacity: 0;
    transform: translateY(.8rem);

    @media (prefers-reduced-motion: reduce) {
        transform: none;
    }
}

.stat-tile__profile {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: .8rem;
    flex-grow: 1;
    justify-content: center;
}
.stat-tile__profile-icon {
    inline-size: var(--card-svg-size);
    block-size: var(--card-svg-size);
    object-fit: contain;
    display: block;
}
.stat-tile__profile-title {
    margin: 1rem 0 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-colour, #212121);
    line-height: 1.2;
}
.stat-tile__profile-sub {
    margin: 0 0 1.5rem;
    font-size: 1.6rem;
    color: var(--text-colour-secondary, #777);
    line-height: 1.3;
    text-wrap: balance;
}

.puzzle-stats__note {
    margin: 0;
    font-size: 1.1rem;
    color: var(--text-colour-secondary, #777);
    text-align: end;
}
</style>
