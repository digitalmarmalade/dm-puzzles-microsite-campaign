<script setup>
const props = defineProps({
    heading: String,
})
</script>

<template>
    <div class="puzzle-card-grid">
        <slot/>
    </div>
</template>

<style scoped>
.puzzle-card-grid {
    --c: 2;

    display: grid;
    grid-template-columns: repeat(var(--c), minmax(0, 1fr));
    gap: var(--grid-gap);
    margin: 0 0 3rem;

    @media (width >= 720px) {
        --c: 2;
    }

    @media (width >= 1024px) {
        --c: 3;
    }

    @media (width >= 1200px) {
        --c: 4;
    }
}
</style>
