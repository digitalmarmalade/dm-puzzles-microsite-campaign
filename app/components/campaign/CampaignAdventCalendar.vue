<script setup>
import {doorOrder} from '@/lib/campaign/advent'

const props = defineProps({
    campaign: {type: Object, required: true},
    days: {type: Array, required: true},
    puzzles: {type: Array, required: true},
    dayUrl: {type: Function, required: true},
})

const {thanked: opened, thank: open} = useThanked(`campaign-advent-opened:${props.campaign.id}`)
const doors = computed(() => doorOrder(props.days.length).map(day => props.days[day - 1]).filter(Boolean))
</script>

<template>
    <div class="advent-sheet">
        <div class="advent-sheet__grid">
            <CampaignAdventDoor
                v-for="d in doors"
                :key="d.day"
                :day="d"
                :puzzle="puzzles[d.day - 1]"
                :to="dayUrl(d.day)"
                :opened="opened.includes(d.day)"
                @open="open([$event])"
            />
        </div>
        <CampaignSnow class="advent-sheet__front-snow" :density=".6" />
    </div>
</template>

<style scoped>
.advent-sheet {
    position: relative;
}

.advent-sheet__front-snow {
    z-index: 3;
}

.advent-sheet__grid {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.8rem 1.6rem;

    @media (width >= 600px) {
        grid-template-columns: repeat(4, 1fr);
        gap: 1.6rem 1.2rem;
    }

    @media (width >= 900px) {
        grid-template-columns: repeat(6, 1fr);
        gap: 2.4rem 2rem;
    }
}
</style>
