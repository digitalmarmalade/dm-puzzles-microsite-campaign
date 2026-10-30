<script setup>
defineProps({label: {type: String, required: true}})
</script>

<template>
    <button type="button" class="share-icon-button" :aria-label="label" :title="label">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
    </button>
</template>

<style scoped>
.share-icon-button {
    display: grid;
    flex: none;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 1px solid var(--card-border);
    border-radius: 50%;
    background: transparent;
    color: var(--text-colour);
    cursor: pointer;
    transition: background .15s ease;

    svg {
        inline-size: 1.9rem;
        block-size: 1.9rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 3px;
    }

    @media (hover: hover) {
        &:hover {
            background: var(--app-bg);
        }
    }
}
</style>
