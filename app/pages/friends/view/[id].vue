<script setup>
const {t, tm, rt, locale} = useI18n()
const route = useRoute()
const groupsStore = useGroupsStore()
const user = useUserStore()
import {getLabelFromName} from '@/lib/utils'
provide('user', user);

//  GROUP
const group = await groupsStore.groupSetCurrent(route.params.id)
if (!group || !groupsStore.memberHasPrivilege(user, 'view')) {
    throw createError({statusCode: 404, statusMessage: 'Page Not Found'})
}

useHead({title: () => group?.name || t('friends.title')})

const groupPuzzleCardCount = computed(() => Object.keys(cardData.value || {}).length)

//  FAKE DATA

//  lists
const months = tm('months').map(m => rt(m));
const puzzles = ['Head Coach', '5m Quiz', 'Sudoku']
const members = {
    'P1': 'Harold Bishop',
    'P2': 'Charlene Robinson',
}
members[user.uid] = user.name

//  create periods
const periods = [];
let currentMonth = (new Date().getUTCMonth()) + 1;
let currentYear = (new Date().getUTCFullYear());
for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    let key = [currentYear, currentMonth < 10 ? '0' : '', currentMonth].join('')
    periods.push({key, name: months[currentMonth - 1]})
    currentMonth--;
    if (currentMonth < 1) {
        currentMonth += 12;
        currentYear--;
    }
}

//  create dataset
const dataset = {
    overall: {
        name: 'overall',
        puzzles: {},
    }
}

let pidx = 0;
for (const period in periods) {
    pidx++;
    dataset[period] = {
        name: period,
        puzzles: {},
    }
    for (const puzzle of puzzles) {
        dataset[period].puzzles[puzzle] = {
            members: {},
        }
        dataset['overall'].puzzles[puzzle] = dataset['overall'].puzzles[puzzle] || {
            members: {},
        }
        let objPuzzle = {
            'name': puzzle,
            'members': {},
        }
        for (const member of Object.keys(members)) {
            dataset['overall'].puzzles[puzzle].members[member] = dataset['overall'].puzzles[puzzle].members[member] || {
                label: member,
                name: members[member],
                completed: 0,
                score: 0,
                wins: 0,
                isUser: member === user.uid,
            };

            const completed = 5 + Math.floor(Math.random() * 10)
            const score = puzzle === 'Quiz' ? parseFloat((Math.floor(Math.random() * 100) / 10).toFixed(1)) : 63 + Math.floor(Math.random() * 100)
            const wins = Math.floor(Math.random() * (completed + 1))

            dataset['overall'].puzzles[puzzle].members[member].completed += completed;
            dataset['overall'].puzzles[puzzle].members[member].score += score;
            dataset['overall'].puzzles[puzzle].members[member].wins += wins;

            if (pidx === Object.keys(periods).length) {
                dataset['overall'].puzzles[puzzle].members[member].score /= Object.keys(periods).length
                if (puzzle === 'Quiz') {
                    dataset['overall'].puzzles[puzzle].members[member].score = dataset['overall'].puzzles[puzzle].members[member].score.toFixed(1)
                } else {
                    dataset['overall'].puzzles[puzzle].members[member].score = Math.floor(dataset['overall'].puzzles[puzzle].members[member].score)
                }
            }

            dataset[period].puzzles[puzzle].members[member] = {
                label: member,
                name: members[member],
                completed,
                score,
                wins,
                isUser: member === user.uid,
            };
        }
    }
}

//  period filter: Overall (all-time) or a specific month
const monthOf = (yyyymm) => `${yyyymm.slice(0, 4)}-${yyyymm.slice(4)}`
const currentMonthStr = monthOf(periods[0].key)
const minMonthStr = monthOf(periods[periods.length - 1].key)
const overall = ref(true)
const viewMonth = ref(currentMonthStr)
const monthToIndex = {}
periods.forEach((p, i) => { monthToIndex[monthOf(p.key)] = i })

function selectOverall() { overall.value = true }
function selectMonth(m) { viewMonth.value = m; overall.value = false }

const periodKey = computed(() => overall.value ? 'overall' : (monthToIndex[viewMonth.value] ?? '__none__'))
const cardData = computed(() => dataset[periodKey.value]?.puzzles ?? {})

//  group-wide leaders across all puzzles for the active period
const podiumAgg = computed(() => {
    const byMember = {}
    for (const puzzleName in cardData.value) {
        for (const mId in cardData.value[puzzleName].members) {
            const md = cardData.value[puzzleName].members[mId]
            const s = (byMember[mId] ??= {label: getLabelFromName(md.name), name: md.name, wins: 0, played: 0, isUser: mId === user.uid})
            s.wins += md.wins || 0
            s.played += md.completed || 0
        }
    }
    return Object.values(byMember)
})
const mostWins = computed(() => [...podiumAgg.value].sort((a, b) => b.wins - a.wins).slice(0, 3)
    .map((m) => ({label: m.label, name: m.name, value: m.wins, isUser: m.isUser})))
const mostPlayed = computed(() => [...podiumAgg.value].sort((a, b) => b.played - a.played).slice(0, 3)
    .map((m) => ({label: m.label, name: m.name, value: m.played, isUser: m.isUser})))

//  period-aware titles, e.g. "Most Wins Overall" / "Most Wins in June 2026"
const periodLabel = computed(() => {
    const [y, m] = viewMonth.value.split('-').map(Number)
    return new Intl.DateTimeFormat(locale.value, {month: 'long', year: 'numeric'}).format(new Date(y, m - 1, 1))
})
const podiumTitle = (stat) => overall.value
    ? t('friends.stats.titleOverall', {stat})
    : t('friends.stats.titleIn', {stat, period: periodLabel.value})
const mostWinsTitle = computed(() => podiumTitle(t('friends.stats.mostWins')))
const mostPlayedTitle = computed(() => podiumTitle(t('friends.stats.mostPlayed')))
</script>

<template>
  <NuxtLayout>
      <Wrapper v-if="user.isLoaded">

        <PageHeading>
            <template #button>
                <TextButton
                    url="/friends"
                    icon="left-arrow"
                    iconPosition='before'
                >
                    <template #text>
                        <span>{{ $t('friends.allFriendGroups') }}</span>
                    </template>
                </TextButton>
            </template>
            <template #heading>{{groupsStore.displayName}}</template>
        </PageHeading>

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
                :min="minMonthStr"
                :max="currentMonthStr"
                :placeholder="$t('friends.stats.date')"
                :active="!overall"
                @update:model-value="selectMonth"
            />
        </div>

        <div class="podium-grid">
            <StatsPodium :title="mostWinsTitle" :entries="mostWins" />
            <StatsPodium :title="mostPlayedTitle" :entries="mostPlayed" />
        </div>

        <section class="card card--main">
            <header class="card-header">
                <div class="card-header__title">
                    <h2>{{ $t('friends.view.completedPuzzles') }}</h2>
                </div>
            </header>
            <div class="group-stats-grid"
                :class="`group-stats-grid--${groupPuzzleCardCount}`"
            >
                <GroupStatsCompleted
                    v-for="(data, puzzleName) in cardData"
                    :data="data"
                    :puzzleName="puzzleName"
                    :variant="puzzleName"
                    :groupId="group.id"
                ></GroupStatsCompleted>
            </div>
        </section>
    </Wrapper>
  </NuxtLayout>
</template>

<style>

.stats-filter {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin: 0 0 var(--vertical-rhythm, 2rem);
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

.podium-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--vertical-rhythm, 2rem);

    @media (width >= 900px) {
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
    }
}



.group-stats-grid {
    display: grid;

    gap: 3rem;
    margin: 0 0 3rem;
    width: 100%;

    @media (width >= 900px) {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    &.group-stats-grid--2 {
        @media (width >= 900px) {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
}
.group-stats-card {
    background-color: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--card-gap, 1rem);
    position: relative;
    padding: var(--card-padding, 1.5rem);
    text-align: center;
    block-size: 100%;
    transition: all .25s ease;
}
.group-stats-panel {
    background: var(--puzzle-tile-background, #FEF8F4);
    padding: 2rem;
    width: 100%;
    border-radius: var(--border-radius-inner);
}




</style>
