<template>
    <div class="puzzle-card-grid">
        <slot/>
    </div>
</template>

<style scoped>
.puzzle-card-grid {
    --col: 8rem;
    --grid-gap: 1rem;

    display: grid;
    
    grid-template-columns: repeat(auto-fill, minmax(var(--col), 1fr));
    gap: var(--grid-gap);
    
    max-inline-size: calc(var(--col) * 7 + var(--grid-gap) * 6);
    margin-inline: auto;

    @media (width >= 600px) {
        --col: 8rem;
        --grid-gap: 3rem;
    }

    @media (width >= 1310px) {
        --col: 10rem;
        --grid-gap: 5rem;
    }
}
</style>
