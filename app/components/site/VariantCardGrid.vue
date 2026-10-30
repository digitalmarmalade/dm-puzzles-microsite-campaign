<script setup>
const props = defineProps({
    heading: String,
})
</script>

<template>
    <div class="variant-card-grid">
        <slot/>
    </div>
</template>

<style scoped>
.variant-card-grid {
    --c: 1;
    --grid-gap: 1rem;

    display: grid;
    gap: var(--grid-gap);
    grid-template-columns: repeat(var(--c), minmax(0, 1fr));
    margin: 0 0 3rem;

    @media (width >= 1024px) {
        --c: 2;
        --grid-gap: 3rem
    }
    @media (width >= 1200px) {
        --c: 3;
        --grid-gap: 3rem
    }
}

</style>
