<script setup>
import {doorOrder} from '@/lib/campaign/advent'
import {streaks} from '@/lib/campaign/achievements'

const props = defineProps({
    campaign: {type: Object, required: true},
    days: {type: Array, required: true},
    puzzles: {type: Array, required: true},
    percents: {type: Object, default: () => ({})},
    dayUrl: {type: Function, required: true},
})

const {t} = useI18n()
const text = useCampaignText(props.campaign)
const {thanked: opened, thank: open} = useThanked(`campaign-advent-opened:${props.campaign.id}`)
const completed = computed(() => props.days.filter(d => d.state === 'done' || d.state === 'late').length)
const streak = computed(() => streaks({days: props.days}).current)
const drawers = computed(() => doorOrder(props.days.length).map(day => props.days[day - 1]).filter(Boolean))

const card = ref(null)
const chosen = ref(null)
const chosenPuzzle = computed(() => chosen.value ? props.puzzles[chosen.value.day - 1] : null)
const timers = []

function select(day, el) {
    chosen.value = day
    const first = !opened.value.includes(day.day) && !['done', 'late'].includes(day.state)
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!first || still) {
        if (first) open([day.day])
        card.value.open(el)
        return
    }
    open([day.day])
    timers.push(
        setTimeout(() => card.value.open(el, {burst: true}), 200),
    )
}

const calendar = ref(null)
let swing = 0
let spin = 0
let lastY = 0
let frame = null

function settle() {
    spin = (spin - swing * .06) * .94
    swing = Math.max(-28, Math.min(28, swing + spin))
    calendar.value?.style.setProperty('--swing', `${swing.toFixed(2)}deg`)
    frame = Math.abs(swing) > .05 || Math.abs(spin) > .05 ? requestAnimationFrame(settle) : null
}

function onScroll() {
    const y = window.scrollY
    spin += Math.max(-3, Math.min(3, (y - lastY) * .06))
    lastY = y
    frame ??= requestAnimationFrame(settle)
}

onMounted(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    lastY = window.scrollY
    window.addEventListener('scroll', onScroll, {passive: true})
})

onBeforeUnmount(() => {
    timers.forEach(clearTimeout)
    window.removeEventListener('scroll', onScroll)
    cancelAnimationFrame(frame)
})
</script>

<template>
    <div ref="calendar" class="advent-calendar">
    <div class="advent-crest">
        <picture class="advent-crest__wood">
            <source media="(width < 600px)" srcset="/img/advent/crown-mobile.webp">
            <img src="/img/advent/crown.webp" alt="" width="2000" height="547">
        </picture>
        <div class="advent-crest__mark">
            <img v-if="campaign.theme?.crest" :src="campaign.theme.crest" alt="" class="advent-crest__logo">
            <span class="advent-crest__title">{{ text('title') }}</span>
            <span class="advent-crest__line">{{ text('cabinetLine') || t('campaign.advent.cabinetLine') }}</span>
        </div>
        <div class="advent-crest__stats">
            <p class="advent-crest__stat advent-crest__stat--done">
                <strong>{{ completed }}<small>/{{ days.length }}</small></strong>
                <span class="sr-only">{{ t('campaign.daysCompleted') }}</span>
            </p>
            <p class="advent-crest__stat advent-crest__stat--streak">
                <strong><svg aria-hidden="true"><use :href="sprite('streak')" /></svg>{{ t('campaign.streak.value', {n: streak}) }}</strong>
                <span class="sr-only">{{ t('campaign.streak.label') }}</span>
            </p>
        </div>
    </div>
    <div class="advent-cabinet">
        <div class="advent-cabinet__grid">
            <CampaignAdventDrawer
                v-for="d in drawers"
                :key="d.day"
                :day="d"
                :puzzle="puzzles[d.day - 1]"
                :to="dayUrl(d.day)"
                :opened="opened.includes(d.day)"
                :started="typeof percents[d.day] === 'number'"
                @select="select"
            />
        </div>
        <CampaignAdventCard
            ref="card"
            :campaign="campaign"
            :day="chosen"
            :puzzle="chosenPuzzle"
            :to="chosen ? dayUrl(chosen.day) : null"
        />
    </div>
    <div class="advent-cabinet__plinth" aria-hidden="true"></div>
    </div>
</template>

<style scoped>
.advent-crest {
    position: relative;
    container-type: inline-size;
    margin-block-end: -.1rem;

    @media (width >= 600px) {
        margin-inline: -.8rem;
    }
}

.advent-crest__wood {
    display: block;

    img {
        display: block;
        inline-size: 100%;
        block-size: auto;
        filter: drop-shadow(0 -.4rem 1.2rem rgba(0, 0, 0, .35));
    }
}

.advent-crest__mark {
    position: absolute;
    inset-block-start: 29cqi;
    inset-inline-start: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6cqi;
    translate: -50% -50%;
    white-space: nowrap;

    @media (width >= 600px) {
        inset-block-start: 56%;
        gap: .8cqi;
    }
}

.advent-crest__logo {
    inline-size: 40cqi;
    block-size: auto;
    margin-block-end: .8cqi;
    opacity: .8;
    mix-blend-mode: multiply;

    @media (width >= 600px) {
        inline-size: 15cqi;
        margin-block-end: .4cqi;
    }
}

.advent-crest__title {
    color: #c9973f;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 7cqi;
    font-weight: 700;
    line-height: 1;
    letter-spacing: .02em;
    
    text-shadow: -1px 0 2px black;

    @media (width >= 600px) {
        font-size: 4cqi;
    }
}

.advent-crest__stats {
    position: absolute;
    inset-block-start: 48cqi;
    inset-inline-start: 50%;
    display: flex;
    gap: 8cqi;
    translate: -50% -50%;

    @media (width >= 600px) {
        display: contents;
    }
}

.advent-crest__stat {
    display: flex;
    align-items: center;
    gap: .6cqi;
    margin: 0;
    color: #f0d590;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 5cqi;
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 .2cqi .2cqi rgba(0, 0, 0, .55);
    white-space: nowrap;

    strong {
        display: flex;
        align-items: center;
        gap: .6cqi;
    }

    small {
        font-size: .6em;
        opacity: .8;
    }

    svg {
        inline-size: .8em;
        block-size: .8em;
    }

    @media (width >= 600px) {
        position: absolute;
        inset-block-start: 66%;
        font-size: 2.6cqi;
        translate: -50% -50%;
    }

    &.advent-crest__stat--done {
        @media (width >= 600px) {
            inset-inline-start: 25.5%;
        }
    }

    &.advent-crest__stat--streak {
        @media (width >= 600px) {
            inset-inline-start: 74.5%;
        }
    }
}

.advent-crest__line {
    color: #f3e3c1;
    font-size: 3.6cqi;
    line-height: 1.2;
    opacity: .85;

    @media (width >= 600px) {
        font-size: 1.3cqi;
    }
}

.advent-cabinet {
    --pad: 1.2rem;

    position: relative;
    padding: var(--pad);
    border-radius: .6rem;
    background:
        repeating-linear-gradient(92deg, rgba(0, 0, 0, .08) 0 .3rem, transparent .3rem 1.1rem, rgba(255, 255, 255, .03) 1.1rem 1.3rem, transparent 1.3rem 2.2rem),
        linear-gradient(180deg, #6a2a1c, #4a1c12 60%, #3a150d);
    box-shadow:
        inset 0 .2rem 0 rgba(255, 255, 255, .12),
        inset 0 0 0 .1rem rgba(0, 0, 0, .4),
        0 3rem 6rem rgba(0, 0, 0, .55),
        0 .6rem 1.2rem rgba(0, 0, 0, .4);

    @media (width < 600px) {
        box-shadow:
            inset 0 0 0 .35rem #d6a84f,
            inset 0 0 0 .45rem #7a5418,
            inset .1rem .1rem 0 .35rem #f0cd7a,
            0 3rem 6rem rgba(0, 0, 0, .55),
            0 .6rem 1.2rem rgba(0, 0, 0, .4);
    }

    @media (width >= 720px) {
        --pad: 2.4rem;
    }

    &::after {
        content: '';
        position: absolute;
        inset: calc(var(--pad) / 2);
        border: .1rem solid rgba(193, 148, 72, .8);
        border-radius: .3rem;
        pointer-events: none;

        @media (width < 600px) {
            inset: .75rem;
            border: .15rem solid #e2b45c;
        }
    }
}

.advent-cabinet__plinth {
    position: relative;
    block-size: 1.8rem;
    margin: -.2rem -.8rem 0;
    border-radius: .2rem .2rem .4rem .4rem;
    background: linear-gradient(180deg, #6a2a1c, #3a150d);
    box-shadow:
        inset 0 .2rem 0 #e2b45c,
        inset 0 .5rem 0 #4a1c12,
        inset 0 .6rem 0 rgba(193, 148, 72, .7),
        0 1rem 2rem rgba(0, 0, 0, .5);

    @media (width < 600px) {
        margin-inline: 0;
        box-shadow:
            inset 0 .3rem 0 #e9bd62,
            inset 0 .5rem 0 #4a1c12,
            inset 0 .65rem 0 #d6a84f,
            0 1rem 2rem rgba(0, 0, 0, .5);
    }
}

.advent-cabinet__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;

    @media (width >= 600px) {
        grid-template-columns: repeat(4, 1fr);
        gap: 1.2rem;
    }

    @media (width >= 900px) {
        grid-template-columns: repeat(6, 1fr);
        gap: 1.6rem;
    }

    > * {
        aspect-ratio: 6 / 5;
        block-size: auto;
    }
}
</style>
