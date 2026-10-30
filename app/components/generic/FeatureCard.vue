<template>
    <li class="feature-card">
        <div class="feature-card__visual" aria-hidden="true">
            <slot name="visual" />
        </div>
        <slot />
    </li>
</template>

<style scoped>
.feature-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6rem;
    padding: 2.4rem 2.4rem 2.8rem;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius, 1rem);
    background: var(--card-background, #fff);
    box-shadow: var(--card-shadow);
    text-align: center;
    transition: transform .25s ease, box-shadow .25s ease;

    &::before {
        content: '';
        position: absolute;
        inset: 1rem;
        border: 1px solid rgba(var(--puzzle-tile-shadow), .25);
        border-radius: var(--border-radius-inner, 5px);
        pointer-events: none;
    }

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem);
            box-shadow: var(--card-shadow-hover);
        }
    }
}

.feature-card__visual {
    position: relative;
    display: grid;
    flex: none;
    place-items: center;
    inline-size: 100%;
    block-size: 15rem;
    border-radius: var(--border-radius-inner, 5px);
    background: var(--app-bg);
}
</style>
