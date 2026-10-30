<script setup>
const props = defineProps({heading: String})
</script>

<template>
<NuxtLayout name="puzzle">
    <slot />
</NuxtLayout>
</template>

<style scoped>
:global(.archive-dates) {
    container-name: card-grid;
    container-type: inline-size;
}

.archive-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1.5rem;
    @container card-grid (width >= 30rem) {
        gap: 3rem;
    }

    @container card-grid (width >= 70rem) {
        --c: 7;
        --grid-gap: 5rem 2rem;

        display: grid;
        grid-template-columns: repeat(var(--c), minmax(0, 1fr));
        gap: var(--grid-gap);

    }
}
</style>
