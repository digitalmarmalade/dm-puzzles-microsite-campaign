<script setup>
import {ACHIEVEMENTS, SECRETS, TITLE_KEYS, TRACKS, achievementProgress, currentMonthKey, daysInMonth, descKeyFor, doneKeyFor, isAvailable, monthGoals, stampTier} from '@/lib/achievements'

const {t} = useI18n()
const dateLocale = useDateLocale()
const challenges = useChallengesStore()
const modals = useModalStore()
const stats = useAchievementStats()
const ALL_MODAL = 'achievements-all'
const EARNED_MODAL = 'achievements-earned'
const MONTHS_MODAL = 'achievements-months'
const NEXT_SHOWN = 3
const EARNED_SHOWN = 3
const preview = usePreview()
const MEDAL_PREVIEWS = [['medal-gold', 108], ['medal-silver', 63], ['medal-bronze', 24], ['medal-none', 12]]
const medalPreview = computed(() => MEDAL_PREVIEWS.find(([name]) => preview.is(name))?.[1] ?? null)
const hasPlayed = computed(() => (stats.value?.totalPuzzles ?? 0) > 0 || medalPreview.value !== null)
const withValue = (g, value) => {
    const levels = g.levels.map(l => ({...l, reached: value >= l.target}))
    return {...g, value, levels, next: levels.find(l => !l.reached) ?? null}
}

const failedIcons = ref(new Set())
const onIconError = (id) => { failedIcons.value = new Set(failedIcons.value).add(id) }
const hasIcon = (id) => !failedIcons.value.has(id)

const items = computed(() => {
    const s = stats.value
    if (!s) return []
    return ACHIEVEMENTS.filter(a => isAvailable(a, s)).map((a) => {
        const progress = achievementProgress(a, s)
        return {
            ...a,
            progress,
            percent: Math.min(100, (progress.current / progress.target) * 100),
            title: t(TITLE_KEYS[a.id]),
            desc: t(descKeyFor(a), {target: progress.target}),
            done: t(doneKeyFor(a), {target: progress.target}),
            unlocked: progress.complete,
            iconSrc: achievementImage(a.id),
        }
    })
})

const nextByTrack = computed(() => TRACKS
    .map(track => items.value.find(i => i.category === track && !i.unlocked))
    .filter(Boolean)
    .sort((a, b) => b.percent - a.percent))
const nextUp = computed(() => nextByTrack.value.slice(0, NEXT_SHOWN))
const tracks = computed(() => TRACKS
    .map(track => ({track, title: t(`achievements.tracks.${track}`), items: items.value.filter(i => i.category === track)}))
    .filter(g => g.items.length))

const secrets = computed(() => {
    const s = stats.value
    if (!s) return {found: [], hidden: 0}
    const found = SECRETS.filter(x => s.secrets[x.key]).map(x => ({
        id: x.id,
        title: t(`achievements.secret.${x.key}.title`),
        done: t(`achievements.secret.${x.key}.done`),
        iconSrc: achievementImage(x.id),
        earnedOn: earnedOn(x.id),
    }))
    return {found, hidden: SECRETS.length - found.length}
})

const challengeCount = computed(() => (challenges.challengeLog ?? []).length)

const dayFmt = computed(() => new Intl.DateTimeFormat(dateLocale.value, {day: 'numeric', month: 'long', year: 'numeric'}))
const earnedOn = (id) => {
    const at = stats.value?.earnedAt?.[id]
    return at ? t('achievements.earnedOn', {date: dayFmt.value.format(new Date(at))}) : ''
}
const recency = (id) => {
    const at = stats.value?.earnedAt?.[id]
    return at ? new Date(at).getTime() : 0
}
const earned = computed(() => [
    ...(challengeCount.value ? [{id: 'challenge', title: t('achievements.challengeTitle'), done: t('achievements.challengeDone', challengeCount.value, {count: challengeCount.value}), iconSrc: achievementImage('challenge'), count: challengeCount.value}] : []),
    ...items.value.filter(i => i.unlocked),
    ...secrets.value.found.map(x => ({...x, secret: true})),
].map((a, i) => ({...a, order: i, earnedOn: earnedOn(a.id)})).sort((a, b) => recency(b.id) - recency(a.id) || b.order - a.order))
const earnedShown = computed(() => earned.value.slice(0, EARNED_SHOWN))

const monthKey = computed(() => currentMonthKey())
const monthLabel = (key, opts) => new Intl.DateTimeFormat(dateLocale.value, opts).format(new Date(`${key}-15T12:00:00`))
const daysLeft = computed(() => daysInMonth(monthKey.value) - new Date().getDate() + 1)

const goals = computed(() => {
    const s = stats.value
    if (!s) return []
    return monthGoals(monthKey.value, s).map((g, i) => (i === 0 && medalPreview.value !== null ? withValue(g, medalPreview.value) : g)).map((g) => {
        const shown = g.next ?? g.levels.at(-1)
        return {
            ...g,
            title: t(`achievements.month.goals.${g.goal}`),
            target: shown.target,
            percent: Math.min(100, (g.value / shown.target) * 100),
            done: !g.next,
            chips: g.levels.length > 1 ? g.levels.map(l => ({
                ...l,
                text: l.label === 'all' && g.goal === 'days'
                    ? t('achievements.month.tierEveryDay', {tier: t(`achievements.tiers.${l.tier}`)})
                    : t('achievements.month.tierAt', {tier: t(`achievements.tiers.${l.tier}`), target: l.target}),
            })) : [],
        }
    })
})
const headline = computed(() => goals.value[0] ?? null)
const MEDAL = 110
const RING_STEP = 11
const RING_BOX = MEDAL + RING_STEP * 7
const rings = computed(() => (headline.value?.levels ?? []).map((level, i) => {
    const off = RING_STEP * (i + 1)
    const size = MEDAL + off * 2
    const rx = 10 + off * .5
    const perimeter = 4 * (size - 2 * rx) + 2 * Math.PI * rx
    return {
        tier: level.tier,
        xy: (RING_BOX - size) / 2,
        size,
        rx,
        percent: Math.min(100, (headline.value.value / level.target) * 100),
        offset: -((size / 2 - rx) / perimeter) * 100,
    }
}))
const medalTier = computed(() => headline.value?.levels.filter(l => l.reached).length ?? 0)
const sideGoals = computed(() => goals.value.slice(1))

const nextMonth = (key) => {
    const [y, m] = key.split('-').map(Number)
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}
const stamps = computed(() => {
    const s = stats.value
    if (!s) return []
    const current = monthKey.value
    const first = Object.keys(s.months).filter(k => k <= current && s.months[k].total > 0).sort()[0] ?? current
    const out = []
    for (let key = first; key <= current; key = nextMonth(key)) {
        const played = (s.months[key]?.total ?? 0) > 0
        const tier = played ? stampTier(key, s) : 0
        out.push({
            key,
            tier,
            played,
            year: key.slice(0, 4),
            month: monthLabel(key, {month: 'short'}),
            label: tier
                ? t(`achievements.tiers.${tier}`)
                : key === current ? t('achievements.months.inProgress') : played ? t('achievements.months.played') : t('achievements.months.none'),
            current: key === current,
        })
    }
    return out
})
const stampYears = computed(() => {
    const groups = new Map()
    for (const m of stamps.value) {
        if (!groups.has(m.year)) groups.set(m.year, [])
        groups.get(m.year).push(m)
    }
    return [...groups].map(([year, months]) => ({year, months})).reverse()
})
const stampClass = (m) => [`stamp--tier-${m.tier}`, {'stamp--won': m.tier > 0, 'stamp--current': m.current && !m.tier, 'stamp--gap': !m.played && !m.current}]
const stampRow = ref(null)
watch([stampRow, () => stamps.value.length], async () => {
    await nextTick()
    if (stampRow.value) stampRow.value.scrollLeft = stampRow.value.scrollWidth
}, {flush: 'post'})
</script>

<template>
    <template v-if="stats && hasPlayed">
        <h2>{{ $t('achievements.title') }}
            <span class="achievements__count">{{ t('achievements.earnedCount', {count: earned.length}) }}</span>
        </h2>

        <div class="achievements">
            <div class="achievements__row">
                <section v-if="headline" class="achievements__section achievements__section--month" :aria-labelledby="'achievements-month'">
                    <div class="month-card__top" :class="`month-card__top--tier-${medalTier}`">
                        <p id="achievements-month" class="achievements__heading">
                            <span>{{ t('achievements.month.title', {month: monthLabel(monthKey, {month: 'long'})}) }}</span>
                            <span>{{ t('achievements.month.daysLeft', daysLeft, {count: daysLeft}) }}</span>
                        </p>
                        <div class="month-card__headline">
                            <div class="month-medal" aria-hidden="true">
                                <svg class="month-medal__rings" :viewBox="`0 0 ${RING_BOX} ${RING_BOX}`">
                                    <g v-for="r in rings" :key="r.tier">
                                        <rect class="month-medal__track" :x="r.xy" :y="r.xy" :width="r.size" :height="r.size" :rx="r.rx" />
                                        <rect
                                            v-if="r.percent > 0"
                                            class="month-medal__ring"
                                            :class="`month-medal__ring--${r.tier}`"
                                            :x="r.xy" :y="r.xy" :width="r.size" :height="r.size" :rx="r.rx"
                                            pathLength="100"
                                            :stroke-dasharray="r.percent < 100 ? `${r.percent} 100` : null"
                                            :stroke-dashoffset="r.percent < 100 ? r.offset : null"
                                        />
                                    </g>
                                </svg>
                                <span class="stamp-holder month-medal__stamp">
                                    <span class="stamp" :class="[`stamp--tier-${medalTier}`, {'stamp--won': medalTier > 0, 'stamp--current': !medalTier}]">
                                        {{ monthLabel(monthKey, {month: 'short'}) }}
                                    </span>
                                </span>
                            </div>
                            <div class="month-card__body">
                                <p class="month-card__title">
                                    {{ headline.title }}
                                    <span class="month-card__count">{{ headline.done ? headline.value : t('achievements.month.progress', {current: headline.value, target: headline.target}) }}</span>
                                </p>
                                <ul class="month-card__chips">
                                    <li v-for="chip in headline.chips" :key="chip.label" class="tier-chip" :class="[`tier-chip--${chip.tier}`, {'tier-chip--reached': chip.reached}]">
                                        <svg v-if="chip.reached" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                                        {{ chip.text }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <ul class="month-card__goals">
                        <li v-for="g in sideGoals" :key="g.goal" class="month-goal" :class="`month-goal--tier-${g.done ? g.levels.at(-1).tier : g.next.tier}`">
                            <span
                                class="achievement-tile achievement-tile--locked month-goal__tile"
                                role="progressbar"
                                aria-valuemin="0"
                                :aria-valuemax="g.target"
                                :aria-valuenow="Math.min(g.value, g.target)"
                                :aria-label="t('achievements.month.progress', {current: Math.min(g.value, g.target), target: g.target})"
                            >
                                <svg v-if="g.percent > 0" class="achievement-tile__ring" viewBox="0 0 100 100" aria-hidden="true">
                                    <rect
                                        x="2" y="2" width="96" height="96" rx="12" ry="12"
                                        pathLength="100"
                                        :stroke-dasharray="g.percent < 100 ? `${g.percent} 100` : null"
                                        :stroke-dashoffset="g.percent < 100 ? -10.5 : null"
                                    />
                                </svg>
                                <svg v-if="g.done" class="month-goal__tick" aria-hidden="true"><use :href="sprite('tick')" /></svg>
                                <span v-else class="achievement-tile__count" aria-hidden="true">{{ g.value }}/{{ g.target }}</span>
                            </span>
                            <p class="month-goal__title">{{ g.title }}</p>
                            <p v-if="g.chips.length" class="month-goal__tier">{{ t(`achievements.tiers.${g.done ? g.levels.at(-1).tier : g.next.tier}`) }}</p>
                        </li>
                    </ul>
                </section>

                <section class="achievements__section" aria-labelledby="achievements-next">
                    <div class="achievements__heading">
                        <span id="achievements-next">{{ t('achievements.nextUp') }}</span>
                        <button type="button" class="achievements__more" @click="modals.open(ALL_MODAL)">{{ t('achievements.seeAll') }}</button>
                    </div>
                    <p v-if="!nextUp.length" class="achievements__empty">{{ t('achievements.nextUpEmpty') }}</p>
                    <ul v-else class="achievement-list">
                        <li v-for="a in nextUp" :key="a.id" class="achievement-card">
                            <span
                                class="achievement-tile achievement-tile--locked"
                                role="progressbar"
                                aria-valuemin="0"
                                :aria-valuemax="a.progress.target"
                                :aria-valuenow="Math.min(a.progress.current, a.progress.target)"
                                :aria-label="t('achievements.month.progress', {current: Math.min(a.progress.current, a.progress.target), target: a.progress.target})"
                            >
                                <svg v-if="a.percent > 0" class="achievement-tile__ring" viewBox="0 0 100 100" aria-hidden="true">
                                    <rect x="2" y="2" width="96" height="96" rx="12" ry="12" pathLength="100" :stroke-dasharray="`${a.percent} 100`" stroke-dashoffset="-10.5" />
                                </svg>
                                <span class="achievement-tile__count" aria-hidden="true">{{ Math.min(a.progress.current, a.progress.target) }}/{{ a.progress.target }}</span>
                            </span>
                            <div class="achievement-card__text">
                                <p class="achievement-card__title">{{ a.title }}</p>
                                <p class="achievement-card__desc">{{ a.desc }}</p>
                            </div>
                        </li>
                    </ul>
                </section>

                <section v-if="earned.length" class="achievements__section" aria-labelledby="achievements-earned">
                    <div class="achievements__heading">
                        <span id="achievements-earned">{{ t('achievements.earned') }}</span>
                        <button type="button" class="achievements__more" @click="modals.open(EARNED_MODAL)">{{ t('achievements.seeAllEarned', {count: earned.length}) }}</button>
                    </div>
                    <ul class="achievement-list">
                        <li v-for="a in earnedShown" :key="a.id" class="achievement-card achievement-card--got">
                            <span class="achievement-tile" :class="{'achievement-tile--empty': !hasIcon(a.id)}" aria-hidden="true">
                                <img v-if="hasIcon(a.id)" :src="a.iconSrc" alt="" @error="onIconError(a.id)">
                                <span v-if="a.count" class="achievement-tile__badge">{{ a.count }}</span>
                            </span>
                            <div class="achievement-card__text">
                                <p class="achievement-card__title">
                                    {{ a.title }}
                                    <span v-if="a.secret" class="secret-pill">{{ t('achievements.secretPill') }}</span>
                                </p>
                                <p class="achievement-card__desc">{{ a.done }}</p>
                            </div>
                        </li>
                    </ul>
                </section>
            </div>

            <div class="achievements__row">
                <section v-if="stamps.length > 1" class="achievements__section" aria-labelledby="achievements-months">
                    <div class="achievements__heading">
                        <span id="achievements-months">{{ t('achievements.months.title') }}</span>
                        <button type="button" class="achievements__more" @click="modals.open(MONTHS_MODAL)">{{ t('achievements.months.seeAll') }}</button>
                    </div>
                    <ul ref="stampRow" class="stamp-row scrollable">
                        <li v-for="y in [...stampYears].reverse()" :key="y.year" class="stamp-year">
                            <span class="stamp-year__label">{{ y.year }}</span>
                            <ul class="stamp-year__months">
                                <li v-for="m in y.months" :key="m.key" class="stamp-row__item">
                                    <span class="stamp-holder">
                                        <span class="stamp" :class="stampClass(m)">{{ m.month }}</span>
                                    </span>
                                    <span class="stamp-row__label">{{ m.label }}</span>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </section>
            </div>
        </div>

        <Modal :id="ALL_MODAL" size="lg" :fullscreen-mobile="true" :scroll-body="true" classes-modal="sp-modal achievements-modal" classes-body="sp-modal__body scrollable" :title="t('achievements.allTitle')" classes-footer="">
            <div class="badge-gallery">
                <section v-for="g in tracks" :key="g.track" class="badge-gallery__group">
                    <h3 class="badge-gallery__heading">{{ g.title }}</h3>
                    <ul class="badge-gallery__grid">
                        <li v-for="a in g.items" :key="a.id" class="badge-gallery__item" :class="{'badge-gallery__item--earned': a.unlocked}">
                            <span v-if="a.unlocked" class="achievement-tile achievement-tile--large" :class="{'achievement-tile--empty': !hasIcon(a.id)}" aria-hidden="true">
                                <img v-if="hasIcon(a.id)" :src="a.iconSrc" alt="" @error="onIconError(a.id)">
                            </span>
                            <span
                                v-else
                                class="achievement-tile achievement-tile--large achievement-tile--locked"
                                role="progressbar"
                                aria-valuemin="0"
                                :aria-valuemax="a.progress.target"
                                :aria-valuenow="Math.min(a.progress.current, a.progress.target)"
                                :aria-label="t('achievements.month.progress', {current: Math.min(a.progress.current, a.progress.target), target: a.progress.target})"
                            >
                                <svg v-if="a.percent > 0" class="achievement-tile__ring" viewBox="0 0 100 100" aria-hidden="true">
                                    <rect x="2" y="2" width="96" height="96" rx="12" ry="12" pathLength="100" :stroke-dasharray="`${a.percent} 100`" stroke-dashoffset="-10.5" />
                                </svg>
                                <span class="achievement-tile__count" aria-hidden="true">{{ Math.min(a.progress.current, a.progress.target) }}/{{ a.progress.target }}</span>
                            </span>
                            <p class="badge-gallery__title">{{ a.title }}</p>
                            <p class="badge-gallery__desc">{{ a.unlocked ? a.done : a.desc }}</p>
                        </li>
                    </ul>
                </section>
                <section class="badge-gallery__group">
                    <h3 class="badge-gallery__heading">{{ t('achievements.secrets.title') }}</h3>
                    <ul class="badge-gallery__grid">
                        <li v-for="a in secrets.found" :key="a.id" class="badge-gallery__item badge-gallery__item--earned">
                            <span class="achievement-tile achievement-tile--large" :class="{'achievement-tile--empty': !hasIcon(a.id)}" aria-hidden="true">
                                <img v-if="hasIcon(a.id)" :src="a.iconSrc" alt="" @error="onIconError(a.id)">
                            </span>
                            <p class="badge-gallery__title">{{ a.title }}</p>
                            <p class="badge-gallery__desc">{{ a.done }}</p>
                        </li>
                        <li v-if="secrets.hidden" class="badge-gallery__item">
                            <span class="achievement-tile achievement-tile--large achievement-tile--locked" aria-hidden="true">
                                <span class="achievement-tile__count achievement-tile__count--big">?</span>
                            </span>
                            <p class="badge-gallery__title">{{ t('achievements.secrets.more', secrets.hidden, {count: secrets.hidden}) }}</p>
                            <p class="badge-gallery__desc">{{ t('achievements.secrets.hint') }}</p>
                        </li>
                    </ul>
                </section>
            </div>
        </Modal>

        <Modal :id="EARNED_MODAL" size="lg" :fullscreen-mobile="true" :scroll-body="true" classes-modal="sp-modal achievements-modal" classes-body="sp-modal__body scrollable" :title="t('achievements.earnedTitle')" classes-footer="">
            <ul class="badge-gallery__grid badge-gallery__grid--earned">
                <li v-for="a in earned" :key="a.id" class="badge-gallery__item badge-gallery__item--earned">
                    <span class="achievement-tile achievement-tile--hero" :class="{'achievement-tile--empty': !hasIcon(a.id)}" aria-hidden="true">
                        <img v-if="hasIcon(a.id)" :src="a.iconSrc" alt="" @error="onIconError(a.id)">
                        <span v-if="a.count" class="achievement-tile__badge">{{ a.count }}</span>
                    </span>
                    <span v-if="a.secret" class="secret-pill">{{ t('achievements.secretPill') }}</span>
                    <p class="badge-gallery__title">{{ a.title }}</p>
                    <p class="badge-gallery__desc">{{ a.done }}</p>
                    <p v-if="a.earnedOn" class="badge-gallery__date">{{ a.earnedOn }}</p>
                </li>
            </ul>
        </Modal>

        <Modal :id="MONTHS_MODAL" size="md" :fullscreen-mobile="true" :scroll-body="true" classes-modal="sp-modal achievements-modal" classes-body="sp-modal__body scrollable" :title="t('achievements.months.title')" classes-footer="">
            <div class="badge-gallery">
                <section v-for="y in stampYears" :key="y.year" class="badge-gallery__group">
                    <h3 class="badge-gallery__heading">{{ y.year }}</h3>
                    <ul class="month-history">
                        <li v-for="m in y.months" :key="m.key" class="stamp-row__item">
                            <span class="stamp-holder">
                                <span class="stamp" :class="stampClass(m)">{{ m.month }}</span>
                            </span>
                            <span class="stamp-row__label">{{ m.label }}</span>
                        </li>
                    </ul>
                </section>
            </div>
        </Modal>
    </template>
</template>

<style scoped>
h2 {
    margin-block-end: var(--vertical-rhythm);
}
.achievements {
    --tier-1: #C98B54;
    --tier-2: #9AA5B1;
    --tier-3: #E0A92B;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}
.achievements__count {
    margin-inline-start: 1rem;
    font-size: 1.3rem;
    font-weight: 400;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;
}
.achievements__row {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;

    @media (720px <= width < 1024px) {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (width >= 1024px) {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(0, 1fr);
        align-items: stretch;
    }
}
.achievements__section--month,
.achievements__section:only-child,
.achievements__section--month + .achievements__section:last-child {
    @media (720px <= width < 1024px) {
        grid-column: 1 / -1;
    }
}
.achievements__section {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    padding: 1.2rem 1.4rem 1.6rem;
    background: var(--card-background, #fff);
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 10px);
    min-inline-size: 0;
}
.achievements__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-block-size: 3.4rem;
    margin: 0;
    font-size: 1.15rem;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;
}
.achievements__empty {
    margin: 0;
    font-size: 1.4rem;
    color: var(--text-colour-secondary, #777);
}
.achievements__more {
    flex: none;
    align-self: center;
    display: inline-flex;
    align-items: center;
    block-size: 3.4rem;
    text-transform: none;
    letter-spacing: normal;
    padding: .6rem 1.4rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    background: var(--card-background);
    color: var(--text-colour);
    font: inherit;
    font-size: 1.3rem;
    cursor: pointer;

    @media (hover: hover) {
        &:hover {
            border-color: var(--primary);
        }
    }
}


.month-card__top {
    display: flex;
    flex-direction: column;
    gap: 1.4rem;
    margin: -1.2rem -1.4rem 0;
    padding: 1.2rem 1.4rem 2rem;
    border-radius: calc(var(--border-radius, 10px) - 1px) calc(var(--border-radius, 10px) - 1px) 0 0;
    background: rgba(var(--medal-rgb), .16);
}
.month-card__top--tier-0 { background: rgba(var(--primary-rgb), .04); }
.month-card__top--tier-1 { --medal-rgb: 179, 115, 63; }
.month-card__top--tier-2 { --medal-rgb: 166, 176, 188; }
.month-card__top--tier-3 { --medal-rgb: 217, 162, 27; }
.month-card__headline {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
    text-align: center;
}
.month-medal {
    position: relative;
    display: grid;
    place-items: center;
    inline-size: 14rem;
    block-size: 14rem;

    .month-medal__stamp {
        --stamp-size: 8rem;
    }
}
.month-medal__rings {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    overflow: visible;

    rect {
        fill: none;
        stroke-width: 3;
        stroke-linecap: round;
    }
}
.month-medal__track {
    stroke: rgba(var(--puzzle-tile-shadow), .25);
    stroke-dasharray: 2 4;
    stroke-linecap: butt;
}
.month-medal__ring {
    transition: stroke-dasharray .4s ease;
}
.month-medal__ring--1 { stroke: var(--tier-1); }
.month-medal__ring--2 { stroke: var(--tier-2); }
.month-medal__ring--3 { stroke: var(--tier-3); }
.month-card__body {
    min-inline-size: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .8rem;
}
.month-card__title {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    gap: .4rem 1rem;
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
}
.month-card__count {
    font-size: 1.4rem;
    font-weight: 400;
    color: var(--text-colour-secondary, #777);
    font-variant-numeric: tabular-nums;
}
.month-card__chips {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: .6rem;
    margin: 0;
    padding: 0;
}
.tier-chip {
    display: inline-flex;
    align-items: center;
    gap: .4rem;
    padding: .2rem 1rem;
    border: 1px solid var(--card-border);
    border-radius: 2rem;
    font-size: 1.2rem;
    color: var(--text-colour-secondary, #777);

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
    }
}
.tier-chip--reached {
    border-color: transparent;
    color: #fff;

    &.tier-chip--1 { background: var(--tier-1); }
    &.tier-chip--2 { background: var(--tier-2); }
    &.tier-chip--3 { background: var(--tier-3); }
}
.month-card__goals {
    list-style: none;
    flex: 1 1 auto;
    display: grid;
    align-content: center;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.2rem 1rem;
    margin: 0;
    padding: .4rem 0 0;
}
.month-goal {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .2rem;
    text-align: center;
    min-inline-size: 0;
}
.month-goal__tile {
    margin-block-end: .6rem;

    &.achievement-tile--locked {
        border-color: rgba(var(--goal-rgb), .5);
        background: rgba(var(--goal-rgb), .08);
    }

    .achievement-tile__ring rect {
        stroke: rgb(var(--goal-rgb));
    }
}
.month-goal--tier-1 { --goal-rgb: 201, 139, 84; }
.month-goal--tier-2 { --goal-rgb: 154, 165, 177; }
.month-goal--tier-3 { --goal-rgb: 224, 169, 43; }
.month-goal__tick {
    inline-size: 2.4rem;
    block-size: 2.4rem;
    color: rgb(var(--goal-rgb));
}
.month-goal__title {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    line-height: 1.2;
}
.month-goal__tier {
    margin: .4rem 0 0;
    padding: .2rem .9rem;
    border-radius: 2rem;
    background: rgba(var(--goal-rgb), .18);
    color: color-mix(in srgb, rgb(var(--goal-rgb)) 55%, var(--text-colour, #212121));
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1.4;
}

.achievement-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 2rem;
    background-color: var(--app-bg);
    border-radius: var(--border-radius-inner);
    flex-grow: 1;

    &:has(.achievement-card--got) {
        gap: 1rem;
    }

}
.achievement-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-inline-size: 0;
    padding: 2rem 0;
    
    + .achievement-card:not(.achievement-card--got) {
        border-block-start: 1px dotted var(--card-border);
    }

    &:first-child:not(.achievement-card--got) {
        padding-block-start: 0;
    }
}
.achievement-card--got {
    border: none;
    padding: 2rem;
    background: var(--card-background);
    border-radius: var(--border-radius-inner);
    box-shadow: 0 .1rem .1rem rgba(0,0,0,0.1);
}
.achievement-card__text {
    flex: 1 1 auto;
    min-inline-size: 0;
}
.achievement-card__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
}
.secret-pill {
    display: inline-flex;
    align-items: center;
    margin-inline-start: .6rem;
    padding: .1rem .8rem;
    border-radius: 2rem;
    background: var(--text-colour, #212121);
    color: var(--card-background, #fff);
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: .05rem;
    text-transform: uppercase;
    vertical-align: middle;

    .badge-gallery__item & {
        margin: 0 0 .4rem;
    }
}
.achievement-card__desc {
    margin: .2rem 0 0;
    font-size: 1.3rem;
    line-height: 1.3;
    color: var(--text-colour-secondary, #777);
}
.achievement-tile {
    position: relative;
    flex: none;
    display: grid;
    place-items: center;
    inline-size: 6.4rem;
    block-size: 6.4rem;
    border-radius: 1rem;

    
}
.achievement-tile--large {
    inline-size: 9rem;
    block-size: 9rem;

    @media (width < 720px) {
        inline-size: 7.2rem;
        block-size: 7.2rem;
    }
}
.achievement-tile--hero {
    inline-size: 14rem;
    block-size: 14rem;

    @media (width < 720px) {
        inline-size: 10rem;
        block-size: 10rem;
    }
}
.achievements-modal :deep(.sp-modal__dialog) {
    background: var(--card-background);
}
.achievement-tile--locked {
    border: 1px dashed rgba(var(--puzzle-tile-shadow), .5);
    background: rgba(var(--puzzle-tile-shadow), .06);
}
.achievement-tile--empty {
    border: 1px dashed rgba(var(--puzzle-tile-shadow), .5);
}
.achievement-tile__ring {
    position: absolute;
    inset: -.2rem;
    inline-size: calc(100% + .4rem);
    block-size: calc(100% + .4rem);
    overflow: visible;

    rect {
        fill: none;
        stroke: rgba(var(--puzzle-tile-shadow), 1);
        stroke-width: 2.5;
        stroke-linecap: round;
        transition: stroke-dasharray .25s ease;
    }
}
.achievement-tile__count {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-colour, #212121);
    font-variant-numeric: tabular-nums;
}
.achievement-tile__count--big {
    font-size: 2.4rem;
}
.achievement-tile__badge {
    position: absolute;
    inset-block-start: -.6rem;
    inset-inline-end: -.6rem;
    min-inline-size: 2.4rem;
    block-size: 2.4rem;
    padding: 0 .6rem;
    display: grid;
    place-items: center;
    border-radius: 1.2rem;
    background: var(--primary);
    color: var(--text-on-primary, #fff);
    font-size: 1.2rem;
    font-weight: 700;
}

.stamp-row {
    list-style: none;
    flex: 1 1 auto;
    display: flex;
    gap: 1.2rem;
    margin: 0;
    padding: 0 0 1.2rem;
    overflow-x: auto;
    overflow-y: hidden;
}
.stamp-year {
    flex: 1 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.2rem 1.6rem 1.4rem;
    background-color: var(--app-bg);
    border-radius: var(--border-radius);
}
.stamp-year__label {
    position: sticky;
    inset-inline-start: 1.6rem;
    align-self: flex-start;
    font-size: 1.15rem;
    color: var(--text-colour-secondary, #777);
    letter-spacing: .05rem;
}
.stamp-year__months {
    list-style: none;
    display: flex;
    gap: 1.2rem;
    margin: 0;
    padding: 0;
}
.month-history {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.2rem, 1fr));
    justify-items: center;
    gap: 2rem 1rem;
    margin: 0;
    padding: 2rem;
    background-color: var(--app-bg);
    border-radius: var(--border-radius);
}
.stamp-row__item {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .4rem;
}
.stamp-row__label {
    font-size: 1.2rem;
    color: var(--text-colour-secondary, #777);
}
.badge-gallery {
    display: flex;
    flex-direction: column;
    gap: 3rem;
}
.badge-gallery__group {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}
.badge-gallery__heading {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 400;
    color: var(--text-colour-secondary, #777);
    text-transform: uppercase;
    letter-spacing: .05rem;
}
.badge-gallery__grid {
    list-style: none;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 2.4rem 1.6rem;
    margin: 0;
    padding: 0;
    background-color: var(--app-bg);
    padding: 2rem;
    border-radius: var(--border-radius);

    @media (width < 720px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        padding: 1rem;
    }
}
.badge-gallery__grid--earned {
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
    gap: 3.2rem 2rem;

    @media (width < 720px) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
    }
}
.badge-gallery__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .4rem;
    text-align: center;

    border: 1px dotted var(--primary);
    padding: 2rem 1rem;
    border-radius: var(--border-radius);
    min-inline-size: 0;

    @media (width < 720px) {
        padding: 1.6rem .8rem;
    }

    .achievement-tile {
        margin-block-end: 1rem;
    }

    &.badge-gallery__item--earned {
        background: var(--card-background);
        border: 1px solid var(--card-border);
    }
}
.badge-gallery__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
}
.badge-gallery__desc {
    margin: 0;
    font-size: 1.3rem;
    line-height: 1.3;
    color: var(--text-colour-secondary, #777);
    flex-grow: 1;
}
.badge-gallery__date {
    margin: .5rem 0 0;
    font-size: 1.2rem;
    color: var(--text-colour, #212121);
}
</style>
