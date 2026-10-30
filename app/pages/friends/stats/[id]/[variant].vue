<script setup>
import Archive from '@/api/Archive.js'
import {themeClass} from '@/lib/utils'
import {variantLook} from '@/lib/variantLook'

const {t, locale} = useI18n()
const dateLocale = useDateLocale()
const route = useRoute()
const groupsStore = useGroupsStore()
const user = useUserStore()
provide('user', user)

const groupId = route.params.id
const variantSlug = route.params.variant

//  GROUP (auth + name)
const group = await groupsStore.groupSetCurrent(groupId)
if (!group || !groupsStore.memberHasPrivilege(user, 'view')) {
    throw createError({statusCode: 404, statusMessage: 'Page Not Found'})
}

//  VARIANT (resolve display name from slug)
const nameSlug = Archive.getPuzzleNameSlugs().find((n) => n.slug === variantSlug)
if (!nameSlug) {
    throw createError({statusCode: 404, statusMessage: 'Page Not Found'})
}
const variantName = nameSlug.name
const variantTheme = variantLook(variantName).theme

useHead({title: () => group?.name ? `${variantName} — ${group.name}` : variantName})

const isQuiz = getPuzzleMeta(variantSlug)?.type === 'quiz'

//  FAKE DATA -------------------------------------------------------------
//  mock group members (incl. the current user)
const userLabel = user.name.includes(' ')
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : user.name.substring(0, 2).toUpperCase()

const members = [
    {label: userLabel, name: user.name, isUser: true},
    {label: 'HB', name: 'Harold'},
    {label: 'E', name: 'Ethel'},
    {label: 'B', name: 'Bob'},
    {label: 'CS', name: 'Cyril Sneer'},
]

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const today = new Date()
today.setHours(0, 0, 0, 0)
const todayKey = keyOf(today)

//  generate one entry per day for the trailing ~10 weeks
const DAYS = 75
const entriesByDate = {}
for (let i = 0; i < DAYS; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = keyOf(d)

    const completions = []
    //  ~12% of days no one played, to exercise the empty state
    if (Math.random() > 0.12) {
        for (const m of members) {
            if (Math.random() < 0.65) {
                completions.push({
                    label: m.label,
                    name: m.name,
                    isUser: !!m.isUser,
                    seconds: 60 + Math.floor(Math.random() * 300),
                    score: Math.floor(Math.random() * 11),
                })
            }
        }
    }

    if (isQuiz) {
        completions.sort((a, b) => b.score - a.score)
    } else {
        completions.sort((a, b) => a.seconds - b.seconds)
    }

    //  competition ranking: tied results share a position, the next gap-jumps
    let userRank = null
    completions.forEach((c, idx) => {
        const prev = completions[idx - 1]
        const tiesPrev = prev && (isQuiz ? c.score === prev.score : c.seconds === prev.seconds)
        c.rank = tiesPrev ? prev.rank : idx + 1
        if (c.isUser) userRank = c.rank
    })

    entriesByDate[key] = {
        puzzleNumber: 1000 + (DAYS - i),
        completions,
        userRank,
    }
}
//  -----------------------------------------------------------------------

//  period filter: Overall (all-time) or a specific 'YYYY-MM' month
const currentMonth = todayKey.slice(0, 7)
const overall = ref(true)
const viewMonth = ref(currentMonth)

function selectOverall() { overall.value = true }
function selectMonth(m) { viewMonth.value = m; overall.value = false }

//  per-member aggregates (wins = 1st places, played = completions), optionally scoped to a month
function aggregate(monthPrefix) {
    const agg = {}
    for (const k in entriesByDate) {
        if (monthPrefix && !k.startsWith(monthPrefix)) continue
        for (const c of entriesByDate[k].completions) {
            const s = (agg[c.label] ??= {label: c.label, name: c.name, wins: 0, played: 0, isUser: !!c.isUser})
            s.played++
            if (c.rank === 1) s.wins++
        }
    }
    return Object.values(agg)
}
const aggList = computed(() => aggregate(overall.value ? null : viewMonth.value))
const mostWins = computed(() => [...aggList.value].sort((a, b) => b.wins - a.wins).slice(0, 3)
    .map((m) => ({label: m.label, name: m.name, value: m.wins, isUser: m.isUser})))
const mostPlayed = computed(() => [...aggList.value].sort((a, b) => b.played - a.played).slice(0, 3)
    .map((m) => ({label: m.label, name: m.name, value: m.played, isUser: m.isUser})))

//  earliest month we have data for (limits the picker)
const minMonth = Object.keys(entriesByDate).sort()[0]?.slice(0, 7) ?? currentMonth

//  period-aware podium titles, e.g. "Most Wins Overall" / "Most Wins in June 2026"
const periodLabel = computed(() => {
    const [y, m] = viewMonth.value.split('-').map(Number)
    return new Intl.DateTimeFormat(locale.value, {month: 'long', year: 'numeric'}).format(new Date(y, m - 1, 1))
})
const podiumTitle = (stat) => overall.value
    ? t('friends.stats.titleOverall', {stat})
    : t('friends.stats.titleIn', {stat, period: periodLabel.value})
const mostWinsTitle = computed(() => podiumTitle(t('friends.stats.mostWins')))
const mostPlayedTitle = computed(() => podiumTitle(t('friends.stats.mostPlayed')))

const selected = ref(todayKey)
const selectedEntry = computed(() => entriesByDate[selected.value] ?? {completions: [], puzzleNumber: null, userRank: null})

const selectedDateLabel = computed(() => {
    const [y, m, d] = selected.value.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString(dateLocale.value, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
})

const modals = useModalStore()

//  on mobile the day stats open in a modal instead of the side panel
const isMobile = ref(false)
let mq = null
function onViewportChange(e) {
    isMobile.value = e.matches
    if (!e.matches) modals.close('modal-day-stats')
}
onMounted(() => {
    mq = window.matchMedia('(max-width: 899px)')
    isMobile.value = mq.matches
    mq.addEventListener('change', onViewportChange)
})
onBeforeUnmount(() => {
    if (mq) mq.removeEventListener('change', onViewportChange)
})

function onSelect(key) {
    selected.value = key
    if (isMobile.value) modals.open('modal-day-stats')
}
</script>

<template>
    <NuxtLayout>
        <Wrapper v-if="user.isLoaded">

            <PageHeading>
                <template #button>
                    <TextButton
                        :url="`/friends/view/${groupId}`"
                        icon="left-arrow"
                        iconPosition="before"
                    >
                        <template #text>
                            <span>{{ $t('friends.stats.allPuzzles') }}</span>
                        </template>
                    </TextButton>
                </template>
                <template #heading>{{ variantName }}</template>
            </PageHeading>

            <p class="group-subtitle">{{ groupsStore.displayName }}</p>

            <div class="stats-filter">
                <span class="stats-filter__label">{{ $t('archive.filterBy') }}</span>
                <button
                    type="button"
                    class="stats-filter__pill"
                    :class="{'stats-filter__pill--active': overall}"
                    @click="selectOverall"
                >{{ $t('friends.view.overall') }}</button>
                <MonthYearPicker
                    :model-value="viewMonth"
                    :min="minMonth"
                    :max="currentMonth"
                    :placeholder="$t('friends.stats.date')"
                    :active="!overall"
                    @update:model-value="selectMonth"
                />
            </div>

            <div class="podium-grid">
                <StatsPodium :title="mostWinsTitle" :entries="mostWins" :class="themeClass(variantTheme)" />
                <StatsPodium :title="mostPlayedTitle" :entries="mostPlayed" :class="themeClass(variantTheme)" />
            </div>

            <section class="card card--main" :class="themeClass(variantTheme)">
                <div class="stats-detail">

                    <div class="stats-detail__calendar">
                        <StatsCalendar
                            :entries="entriesByDate"
                            :selected="selected"
                            :max="todayKey"
                            :month="viewMonth"
                            @update:month="viewMonth = $event"
                            @select="onSelect"
                        />
                    </div>

                    <div class="stats-detail__results">
                        <StatsDayResults
                            :variant-name="variantName"
                            :entry="selectedEntry"
                            :date-label="selectedDateLabel"
                            :is-quiz="isQuiz"
                        />
                    </div>

                </div>
            </section>

            

            <!-- mobile: day stats in a modal -->
            <Modal id="modal-day-stats" class="day-modal" :classesFooter="''">
                <template #title>
                    {{ selectedEntry.puzzleNumber ? `${variantName} ${selectedEntry.puzzleNumber}` : variantName }}
                </template>
                <StatsDayResults
                    :variant-name="variantName"
                    :entry="selectedEntry"
                    :date-label="selectedDateLabel"
                    :is-quiz="isQuiz"
                    hide-title
                />
            </Modal>

            <div class="leave-group">
                <Button variant="danger" icon="right-arrow">
                    <template #text>
                        <span>{{ $t('friends.stats.leaveGroup') }}</span>
                    </template>
                </Button>
            </div>

        </Wrapper>
    </NuxtLayout>
</template>

<style scoped>
.group-subtitle {
    text-align: center;
    font-size: var(--page-h3-size, 2rem);
    font-weight: 700;
    font-family: var(--font-display);
    margin: -1rem 0 0;
}

.stats-filter {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin: var(--vertical-rhythm, 2rem) 0 0;
}

.stats-filter__label {
    font-weight: 600;
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
}

.stats-filter__pill--active {
    background: var(--text-colour, #212121);
    color: var(--card-background, #fff);
    border-color: var(--text-colour, #212121);
}

.stats-detail {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--vertical-rhythm, 2rem);
    inline-size: 100%;

    @media (width >= 900px) {
        grid-template-columns: 1.4fr 1fr;
        gap: 4rem;
    }
}

.stats-detail__results {
    background: var(--puzzle-tile-background, #fef8f4);
    border-radius: var(--border-radius, 1rem);
    padding: var(--card-padding, 2rem);

    /* inline results panel is desktop-only; mobile uses the modal */
    @media (width < 900px) {
        display: none;
    }
}

/* the day-stats modal is mobile-only — must beat the dialog's own
   .sp-modal[open] { display: grid } when it would otherwise open on desktop */
.day-modal {
    @media (width >= 900px) {
        display: none !important;
    }
}

.podium-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--vertical-rhythm, 2rem);

    @media (width >= 900px) {
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
    }
}

.leave-group {
    display: flex;
    justify-content: center;
    margin: var(--vertical-rhythm, 2rem) 0;
}
</style>
