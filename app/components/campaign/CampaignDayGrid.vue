<script setup>
const props = defineProps({
    campaign: {type: Object, required: true},
    days: {type: Array, required: true},
    puzzles: {type: Array, required: true},
    percents: {type: Object, default: () => ({})},
    playable: {type: Boolean, default: true},
})

const localePath = useLocalePath()
const dayUrl = (day) => props.playable ? localePath(`/c/${props.campaign.id}/day/${day}`) : null
</script>

<template>
    <div class="campaign-day-grid">
        <ArchivePuzzleCardGrid>
            <CampaignDayCard
                v-for="d in days"
                :key="d.day"
                :day="d"
                :puzzle="puzzles[d.day - 1]"
                :to="dayUrl(d.day)"
                :percent="percents[d.day] ?? null"
            />
        </ArchivePuzzleCardGrid>
    </div>
</template>

<style scoped>
.campaign-day-grid {
    background: color-mix(in srgb, var(--primary) 3%, var(--card-background));
    border-radius: var(--border-radius);
    padding: 3.2rem 1.6rem;

    @media (width >= 600px) {
        padding: 5rem 3rem;
    }
}
</style>
