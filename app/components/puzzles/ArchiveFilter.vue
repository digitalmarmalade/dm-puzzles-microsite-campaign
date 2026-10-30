<template>
    <div class="archive-filter">
        <slot/>
    </div>
</template>

<style scoped>

.archive-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    font-size: 1.3rem;

    @media (width >= 600px) {
        font-size: 1.5rem;
    }
}

.archive-filter:deep( > p) {
    @media (width < 600px) {
        flex-basis: 100%;
        margin: 0;
    }
}

</style>
