<script setup>
import {doorOrder} from '@/lib/campaign/advent'

const props = defineProps({
    campaign: {type: Object, required: true},
    days: {type: Array, required: true},
    puzzles: {type: Array, required: true},
    percents: {type: Object, default: () => ({})},
    dayUrl: {type: Function, required: true},
})

const text = useCampaignText(props.campaign)
const {thanked: opened, thank: open} = useThanked(`campaign-advent-opened:${props.campaign.id}`)
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

onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
    <div class="advent-calendar">
    <div class="advent-crest">
        <img src="/img/advent/crown.svg" alt="" class="advent-crest__wood">
        <div class="advent-crest__mark">
            <img v-if="campaign.theme?.crest" :src="campaign.theme.crest" alt="" class="advent-crest__logo">
            <span class="advent-crest__title">{{ text('title') }}</span>
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
    margin-block-end: calc(1.2rem - 1%);
}

.advent-crest__wood {
    display: block;
    inline-size: 100%;
    block-size: auto;
    filter: drop-shadow(0 -.4rem 1.2rem rgba(0, 0, 0, .35));
}

.advent-crest__mark {
    position: absolute;
    inset-block-end: 4.5cqi;
    inset-inline-start: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .8cqi;
    translate: -50% 0;
    white-space: nowrap;
}

.advent-crest__logo {
    inline-size: max(19cqi, 8rem);
    block-size: auto;
    filter: drop-shadow(0 .2cqi .2cqi rgba(0, 0, 0, .5));
}

.advent-crest__title {
    color: #f0d590;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: max(2.6cqi, 1.1rem);
    font-style: italic;
    font-weight: 700;
    line-height: 1;
    text-shadow: 0 .2cqi .2cqi rgba(0, 0, 0, .55);
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

    @media (width >= 720px) {
        --pad: 2.4rem;
    }

    &::before {
        content: '';
        position: absolute;
        inset-inline: -.8rem;
        inset-block-start: -1.2rem;
        block-size: 1.6rem;
        border-radius: .4rem;
        background: linear-gradient(180deg, #7a3322, #4f1e13);
        box-shadow:
            inset 0 .2rem 0 #e2b45c,
            inset 0 -.1rem 0 #b98a3e,
            0 .4rem .8rem rgba(0, 0, 0, .4);
    }

    &::after {
        content: '';
        position: absolute;
        inset: calc(var(--pad) / 2);
        border: .1rem solid rgba(193, 148, 72, .8);
        border-radius: .3rem;
        pointer-events: none;
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
