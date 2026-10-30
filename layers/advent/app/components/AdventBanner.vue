<script setup>
import {DOOR_COUNT, LAYOUT, YEAR, doorDate} from '../lib/advent'

const DISMISS_KEY = 'sp-advent-dismissed'

const {t, n} = useI18n()
const dateLocale = useDateLocale()
const localePath = useLocalePath()
const props = defineProps({
    sample: {type: Object, default: null},
})
const advent = useAdvent()
const {refreshCounts, openDoor} = advent
const pick = (key) => computed(() => (props.sample && key in props.sample ? props.sample[key] : advent[key].value))
const phase = pick('phase')
const today = pick('today')
const progress = pick('progress')
const opened = pick('opened')
const counts = pick('counts')
const canPlay = pick('canPlay')
const standing = useAdventStanding({today, progress, counts, canPlay})

const dismissed = ref(null)
onMounted(() => {
    try {
        dismissed.value = localStorage.getItem(DISMISS_KEY)
    } catch {
        //
    }
    if (!props.sample) refreshCounts()
})

const dismissKey = computed(() => (phase.value === 'doors' ? `${YEAR}-day-${today.value}` : `${YEAR}-${phase.value}`))
const joined = computed(() => (progress.value?.done ?? 0) > 0)
const show = computed(() => !!props.sample || (phase.value !== 'off' && dismissed.value !== dismissKey.value && (phase.value !== 'ended' || joined.value)))
const day = computed(() => Math.min(Math.max(today.value, 1), DOOR_COUNT))
const door = computed(() => (phase.value === 'teaser'
    ? {day: 1, kind: 'any', state: 'locked'}
    : progress.value?.doors[day.value - 1] ?? {day: day.value, kind: 'any', state: 'locked'}))
const cluster = computed(() => {
    const doors = progress.value?.doors ?? Array.from({length: DOOR_COUNT}, (_, i) => ({day: i + 1, kind: 'any', state: 'locked'}))
    const at = LAYOUT.indexOf(door.value.day)
    const row = Math.floor(at / 6)
    const col = at % 6
    const cells = []
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const day = LAYOUT[((row + dr + 4) % 4) * 6 + (col + dc + 6) % 6]
            cells.push({today: !dr && !dc, door: dr || dc ? doors[day - 1] : door.value})
        }
    }
    return cells
})
const awardKey = computed(() => progress.value?.award?.key ?? 'coal')
const showsTask = computed(() => phase.value === 'doors' && doorOpened.value && !todayDone.value && progress.value?.perfectThrough !== DOOR_COUNT)
const awarded = computed(() => phase.value === 'ended' || progress.value?.perfectThrough === DOOR_COUNT)
const todayDone = computed(() => ['done', 'late'].includes(door.value.state))
const doorOpened = computed(() => opened.value.includes(door.value.day))

const title = computed(() => {
    if (phase.value === 'teaser') return t('advent.banner.teaserTitle')
    if (awarded.value) return t(`advent.banner.award.${awardKey.value}`)
    if (todayDone.value) return t('advent.banner.doneTitle', {day: day.value})
    if (doorOpened.value) return t(`advent.task.${door.value.kind}.title`)
    return t('advent.banner.openTitle', {day: day.value})
})

const body = computed(() => {
    if (phase.value === 'teaser') {
        const date = new Intl.DateTimeFormat(dateLocale.value, {weekday: 'long', day: 'numeric', month: 'long'}).format(doorDate(1))
        return t('advent.banner.teaserBody', {date})
    }
    if (awarded.value) {
        if (awardKey.value !== 'perfect') return t('advent.banner.awardDone', {done: progress.value?.done ?? 0, total: DOOR_COUNT})
        const count = counts.value?.perfect
        return count ? t('advent.banner.awardPerfectCount', {count: n(count)}) : t('advent.banner.awardPerfect')
    }
    if (!canPlay.value) return t('advent.status.signIn')
    if (standing.value) return standing.value
    if (progress.value) return t('advent.banner.progress', {done: progress.value.done, total: day.value})
    return ''
})

const cta = computed(() => {
    if (phase.value === 'teaser') return t('advent.banner.teaserCta')
    if (awarded.value) return t('advent.banner.calendarCta')
    return t('advent.banner.cta')
})

function onDoor(d) {
    if (props.sample) return
    if (phase.value === 'doors') openDoor(d)
    else navigateTo(localePath('/advent'))
}

function dismiss() {
    if (props.sample) return
    dismissed.value = dismissKey.value
    try {
        localStorage.setItem(DISMISS_KEY, dismissed.value)
    } catch {
        //
    }
}
</script>

<template>
    <section v-if="show" class="advent-banner" :class="{'advent-banner--ended': awarded}" :aria-label="t('advent.title')">
        <AdventSnow :density="1.5" />
        <div class="advent-banner__text">
            <span class="advent-banner__kicker">{{ t('advent.kicker', {year: YEAR}) }}</span>
            <span class="advent-banner__title" :class="{'advent-banner__title--task': showsTask}">{{ title }}</span>
            <span v-if="body" class="advent-banner__body">{{ body }}</span>
            <span class="advent-banner__actions">
                <NuxtLinkLocale to="/advent" class="advent-banner__cta">
                    {{ cta }}
                    <svg aria-hidden="true"><use :href="sprite('right-arrow')" /></svg>
                </NuxtLinkLocale>
            </span>
        </div>
        <div v-if="awarded" class="advent-banner__award">
            <AdventAwardArt :award="awardKey" />
        </div>
        <div v-else class="advent-banner__door">
            <AdventDoor :door="door" :opened="doorOpened" :still="!!sample" @select="onDoor" />
            <span v-if="phase === 'doors' && !doorOpened && !sample" class="advent-banner__tap" aria-hidden="true">{{ t('advent.banner.tap') }}</span>
        </div>
        <div v-if="!awarded" class="advent-banner__cluster">
            <template v-for="cell in cluster" :key="cell.door.day">
                <AdventDoor v-if="cell.today" :door="door" :opened="doorOpened" :still="!!sample" @select="onDoor" />
                <AdventDoor v-else :door="cell.door" :opened="opened.includes(cell.door.day)" still tagless />
            </template>
        </div>
        <button type="button" class="advent-banner__dismiss" :aria-label="t('advent.banner.dismiss')" @click="dismiss">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <AdventDoorModal v-if="!sample" />
    </section>
</template>

<style scoped>
.advent-banner {
    container: advent-banner / inline-size;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4rem;
    min-inline-size: 0;
    min-block-size: 18rem;
    padding: 4rem 5rem;
    overflow: hidden;
    border-radius: var(--border-radius, 1rem);
    background: linear-gradient(180deg, var(--advent-night-deep) 0%, var(--advent-night) 55%, var(--advent-night-light) 100%);
    box-shadow: var(--card-shadow);
    color: #fff;

    @media (max-width: 600px) {
        flex-direction: column-reverse;
        justify-content: center;
        gap: 2.4rem;
        padding: 3.2rem 2.4rem;
        text-align: center;
    }

    &::after {
        content: '';
        position: absolute;
        inset: 1rem;
        border: 1px solid rgba(255, 255, 255, .35);
        border-radius: calc(var(--border-radius, 1rem) * .6);
        pointer-events: none;
    }
}

.advent-banner__text {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: .6rem;
    min-inline-size: 0;
    color: #fff;

    @media (max-width: 600px) {
        align-items: center;
    }

    @container advent-banner (min-width: 640px) {
        max-inline-size: calc(100cqi - 46rem);
    }

    @container advent-banner (min-width: 1000px) {
        max-inline-size: calc(100cqi - 62rem);
    }

    .advent-banner--ended & {
        max-inline-size: none;
    }
}

.advent-banner__kicker {
    color: var(--advent-gold-light);
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
}

.advent-banner__title {
    font-size: clamp(3.2rem, 6vw, 4.8rem);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.1rem;
    text-wrap: balance;

    &.advent-banner__title--task {
        font-size: clamp(2.4rem, 4vw, 3.2rem);
        line-height: 1.1;
        letter-spacing: 0;
    }
}

.advent-banner__body {
    margin-block-start: .6rem;
    max-inline-size: 38rem;
    font-size: 1.5rem;
    line-height: 1.4;
    opacity: .9;
    text-wrap: balance;
}

.advent-banner__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1rem;
    margin-block-start: 1.4rem;

    @media (min-width: 601px) {
        justify-content: flex-start;
    }
}

.advent-banner__cta {
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    padding: .8rem 1.6rem;
    border: 1px solid #fff;
    border-radius: 2rem;
    background: #fff;
    color: var(--advent-night-deep);
    font-size: 1.3rem;
    font-weight: 700;
    letter-spacing: .06rem;
    text-decoration: none;
    text-transform: uppercase;
    transition: background .15s ease, color .15s ease;

    svg {
        inline-size: 1.2rem;
        block-size: 1.2rem;
        fill: currentColor;
    }

    &:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
    }
}

.advent-banner__door {
    position: relative;
    z-index: 1;
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: .8rem;
    inline-size: 17rem;

    @media (max-width: 600px) {
        inline-size: 13rem;
    }

    @container advent-banner (min-width: 640px) {
        visibility: hidden;
        inline-size: 14rem;
        block-size: 24rem;
    }
}

.advent-banner__cluster {
    position: absolute;
    z-index: 1;
    inset-block-start: 50%;
    inset-inline-end: calc(13rem - 32rem);
    display: none;
    grid-template-columns: repeat(5, 14rem);
    gap: 2.4rem 2rem;
    translate: 0 -50%;
    rotate: 6deg;

    @container advent-banner (min-width: 640px) {
        display: grid;
        grid-template-columns: repeat(4, 14rem);

        & > :nth-child(5n + 1) {
            display: none;
        }
    }

    @container advent-banner (min-width: 1000px) {
        grid-template-columns: repeat(5, 14rem);

        & > :nth-child(5n + 1) {
            display: block;
        }
    }
}

.advent-banner__award {
    position: relative;
    z-index: 1;
    flex: none;
    inline-size: 18rem;

    @container advent-banner (max-width: 639px) {
        inline-size: 11rem;
    }

    @media (max-width: 600px) {
        inline-size: 15rem;
    }
}

.advent-banner__tap {
    color: var(--advent-gold-light);
    font-size: 1.1rem;
    white-space: nowrap;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
}

.advent-banner__dismiss {
    position: absolute;
    z-index: 3;
    inset-block-start: 1.6rem;
    inset-inline-end: 1.6rem;
    display: grid;
    place-items: center;
    inline-size: 3.2rem;
    block-size: 3.2rem;
    padding: 0;
    border: 0;
    border-radius: .8rem;
    background: rgba(7, 27, 87, .6);
    backdrop-filter: blur(4px);
    color: #fff;
    cursor: pointer;

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2.2;
        stroke-linecap: round;
    }
}
</style>
