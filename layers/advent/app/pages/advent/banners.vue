<script setup>
import {DOOR_COUNT} from '../../lib/advent'
import {sampleProgress} from '../../composables/advent'

useHead({title: 'Advent banners', meta: [{name: 'robots', content: 'noindex'}]})

const count = {perfect: 2907, players: 6241}
const upTo = (n) => Array.from({length: n}, (_, i) => i + 1)

const states = [
    {label: 'Teaser (24–30 November)', phase: 'teaser', today: 0, progress: sampleProgress(0, {mode: 'none'}), opened: []},
    {label: '1 December, not started yet', phase: 'doors', today: 1, progress: sampleProgress(1, {mode: 'none'}), opened: []},
    {label: 'Perfect so far, today’s door not opened', phase: 'doors', today: 12, progress: sampleProgress(12, {mode: 'perfect'}), opened: upTo(11)},
    {label: 'Perfect so far, today’s door opened, task not done yet', phase: 'doors', today: 12, progress: sampleProgress(12, {mode: 'perfect'}), opened: upTo(12)},
    {label: 'Perfect so far, today’s door done', phase: 'doors', today: 12, progress: sampleProgress(12, {mode: 'perfect', todayDone: true}), opened: upTo(12)},
    {label: '24 December, perfect, door 24 done', phase: 'doors', today: 24, progress: sampleProgress(24, {mode: 'perfect', todayDone: true}), opened: upTo(DOOR_COUNT)},
    {label: 'Perfect so far, count not available', phase: 'doors', today: 12, progress: sampleProgress(12, {mode: 'perfect'}), opened: upTo(11), counts: {perfect: null, players: null}},
    {label: 'Out, on course for an award', phase: 'doors', today: 12, progress: sampleProgress(12, {mode: 'mixed'}), opened: upTo(11)},
    {label: 'Out, heading for a Lump of coal', phase: 'doors', today: 12, progress: sampleProgress(12, {mode: 'few'}), opened: [1, 5, 9]},
    {label: 'Not started, after 1 December', phase: 'doors', today: 12, progress: sampleProgress(12, {mode: 'none'}), opened: []},
    {label: 'Signed out', phase: 'doors', today: 12, progress: sampleProgress(12, {mode: 'none'}), opened: [], canPlay: false},
    {label: 'From 25 December, Golden star', phase: 'ended', today: 33, progress: sampleProgress(33, {mode: 'perfect'}), opened: upTo(DOOR_COUNT)},
    {label: 'From 25 December, Silver bauble', phase: 'ended', today: 33, progress: sampleProgress(33, {mode: 'mixed'}), opened: upTo(DOOR_COUNT)},
    {label: 'From 25 December, Lump of coal', phase: 'ended', today: 33, progress: sampleProgress(33, {mode: 'few'}), opened: upTo(DOOR_COUNT)},
].map(s => ({counts: count, canPlay: true, ...s}))
</script>

<template>
    <NuxtLayout>
        <Wrapper>
            <h1>Advent banners</h1>
            <p class="banner-gallery__intro">Every state of the home banner with sample data, at full width and at the half width it has beside another banner. Doors here don’t open. Anyone who never opened a door doesn’t see the banner after 24 December.</p>
            <section v-for="state in states" :key="state.label" class="banner-gallery__state">
                <h2>{{ state.label }}</h2>
                <AdventBanner :sample="state" />
                <div class="banner-gallery__half">
                    <AdventBanner :sample="state" />
                    <div class="banner-gallery__spacer"></div>
                </div>
            </section>
        </Wrapper>
    </NuxtLayout>
</template>

<style scoped>
.banner-gallery__intro {
    margin: 0 0 4rem;
    color: var(--text-colour-secondary);
}

.banner-gallery__state {
    display: grid;
    gap: var(--grid-gap);
    margin: 0 0 6rem;

    h2 {
        margin: 0;
        font-size: 1.8rem;
    }
}

.banner-gallery__half {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--grid-gap);

    @media (max-width: 900px) {
        display: none;
    }
}

.banner-gallery__spacer {
    border: .2rem dashed var(--card-border);
    border-radius: var(--border-radius, 1rem);
}
</style>
