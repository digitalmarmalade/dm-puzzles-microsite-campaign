<script setup>
import {doorOrder} from '@/lib/campaign/advent'

const props = defineProps({
    campaign: {type: Object, required: true},
    days: {type: Array, required: true},
    puzzles: {type: Array, required: true},
    dayUrl: {type: Function, required: true},
})

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
    <div class="advent-cabinet">
        <div class="advent-cabinet__grid">
            <CampaignAdventDrawer
                v-for="d in drawers"
                :key="d.day"
                :day="d"
                :puzzle="puzzles[d.day - 1]"
                :to="dayUrl(d.day)"
                :opened="opened.includes(d.day)"
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
</template>

<style scoped>
.advent-cabinet {
    position: relative;
    padding: 1.2rem;
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
        padding: 2.4rem;
    }

    &::before {
        content: '';
        position: absolute;
        inset-inline: -.8rem;
        inset-block-start: -1.2rem;
        block-size: 1.6rem;
        border-radius: .4rem;
        background: linear-gradient(180deg, #7a3322, #4f1e13);
        box-shadow: 0 .4rem .8rem rgba(0, 0, 0, .4), inset 0 .2rem 0 rgba(255, 255, 255, .15);
    }
}

.advent-cabinet__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: .8rem;

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
