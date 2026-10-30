<script setup>
import {dateHelpers} from '@/lib/challenges'

const {t} = useI18n()
const dateLocale = useDateLocale()
const challenges = useChallengesStore()

const DAYS_SHOWN = 7
const route = useRoute()
const still = (() => {
    try {
        return JSON.parse(sessionStorage.getItem('sp-intro-seen') || '[]').includes(route.path)
    } catch {
        return false
    }
})()

const streak = computed(() => challenges.dayStreak)
const weeksStreak = computed(() => challenges.weekStreak)

const byDay = computed(() => {
    const map = {}
    for (const c of challenges.completions ?? []) {
        const key = dateHelpers.dayKey(c.at)
        map[key] = (map[key] ?? 0) + 1
    }
    return map
})

const frozenSet = computed(() => new Set(challenges.frozenDays ?? []))

const days = computed(() => {
    const fmt = new Intl.DateTimeFormat(dateLocale.value, {weekday: 'narrow'})
    const list = []
    const today = new Date()
    for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = dateHelpers.dayKey(d)
        const count = byDay.value[key] ?? 0
        const frozen = count === 0 && frozenSet.value.has(key)
        list.push({
            date: d,
            key,
            letter: fmt.format(d),
            count,
            frozen,
            active: count > 0 || frozen,
            isToday: dateHelpers.isToday(d),
        })
    }

    for (let i = 0; i < list.length; i++) {
        list[i].linkedPrev = i > 0 && list[i].active && list[i - 1].active
        list[i].linkedNext = i < list.length - 1 && list[i].active && list[i + 1].active
    }
    return list
})
</script>

<template>
    <section class="home-highlight" :aria-label="t('streak.aria')">
        <div class="home-highlight__header">
            <h2>{{ t('streak.title') }}</h2>
        </div>

        <div class="home-highlight__body streak-panel" :class="{'streak-panel--still': still}">

            <div class="home-highlight__stat">
                <p class="home-highlight__stat-value">
                    <CountUp :value="streak" :still="still" />
                </p>
                <p class="home-highlight__stat-label">{{ t('streak.dayCount', streak) }}</p>
            </div>

            <ul class="streak-panel__days" :aria-label="t('streak.recentDaysAria')">
                <li
                    v-for="(d, i) in days"
                    :key="d.key"
                    :style="{'--i': i}"
                    class="streak-panel__day"
                    :class="{
                        'streak-panel__day--today': d.isToday,
                        'streak-panel__day--link-prev': d.linkedPrev,
                        'streak-panel__day--link-next': d.linkedNext,
                    }"
                >
                    <span
                        class="streak-panel__circle"
                        :class="{
                            'streak-panel__circle--got': d.count > 0,
                            'streak-panel__circle--frozen': d.frozen,
                        }"
                        aria-hidden="true"
                    >
                        <svg v-if="d.frozen"><use :href="sprite('lifebuoy')" /></svg>
                    </span>
                    <span v-if="d.frozen" class="sr-only">{{ d.letter }}</span>
                    <span v-else class="streak-panel__num"
                    :class="{'streak-panel__num--got': d.count > 0}"
                    >{{ d.letter }}</span>
                </li>
            </ul>

            <div v-if="weeksStreak > 0" class="home-highlight__stat">
                <p class="home-highlight__stat-value">
                    <CountUp :value="weeksStreak" :still="still" />
                </p>
                <p class="home-highlight__stat-label">{{ t('streak.weekCount', weeksStreak) }}</p>
            </div>
        </div>
    </section>
</template>

<style scoped>

.home-highlight__stat {
    flex: unset;   
}
.home-highlight__body {
    justify-content: center;
}

.streak-panel__days {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: space-between;
    gap: .3rem;
    flex-grow: 1;
    max-inline-size: 30rem;
}

.streak-panel__day {
    position: relative;
    display: grid;
    place-items: center;
    flex: 1 1 0;
    min-inline-size: 0;
}

.streak-panel__day::before,
.streak-panel__day::after {
    content: '';
    position: absolute;
    inset-block-start: 50%;
    block-size: 1px;
    background: var(--card-border);
    transform: translateY(-50%);
    z-index: 0;
    opacity: 1;
    transition: opacity .15s ease;
    pointer-events: none;
    animation: streak-link-in .3s ease calc(var(--i) * 70ms + 120ms) both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}
.streak-panel--still .streak-panel__day::before,
.streak-panel--still .streak-panel__day::after {
    animation: none;
}
.streak-panel__day::before {
    inset-inline-start: -.25rem;
    inline-size: calc(50% + .25rem);
}
.streak-panel__day::after {
    inset-inline-end: -.25rem;
    inline-size: calc(50% + .25rem);
}

.streak-panel__day:last-child::after {
    display: none;
}

.streak-panel__day--link-prev::before,
.streak-panel__day--link-next::after  {
    opacity: 1;
    background: var(--primary);
    block-size: 5px;
}

.streak-panel__circle {
    position: absolute;
    inline-size: 2.6rem;
    block-size: 2.6rem;
    border-radius: 50%;
    border: 1px solid var(--card-border);
    background-color: var(--app-bg);
    z-index: 1;
    animation: streak-day-pop .4s cubic-bezier(.34, 1.56, .64, 1) calc(var(--i) * 70ms) both;

    .streak-panel--still & {
        animation: none;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}
.streak-panel__circle--got  {
    background: var(--primary);
    border-color: var(--primary);
    inline-size: 2.3rem;
    block-size: 2.3rem;
}
.streak-panel__circle--frozen {
    display: grid;
    place-items: center;
    border-color: transparent;
    color: var(--primary);

    svg {
        inline-size: 100%;
        block-size: 100%;
    }
}

.streak-panel__num {
    position: relative;
    z-index: 2;
    font-size: 1.2rem;
    text-transform: uppercase;
    animation: streak-link-in .3s ease calc(var(--i) * 70ms + 60ms) both;

    .streak-panel--still & {
        animation: none;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.streak-panel__num--got {
    color: var(--text-on-primary);
    font-weight: 700;
}

@keyframes streak-day-pop {
    from { transform: scale(0); }
    to   { transform: scale(1); }
}

@keyframes streak-link-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}
</style>
