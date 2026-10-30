<script setup>
const props = defineProps({
    size: String,
    type: String,
})
const {size = 'regular', type = 'attention'} = props;
</script>

<template>
    <div class="empty">
        <div class="icon-holder">
            <div class="empty-icon">
                <slot name="icon"/>
            </div>
        </div>
        <slot name="heading"/>
        <slot name="text"/>
        <slot name="buttons"/>
    </div>
</template>


<style scoped>

.empty {

    --padding: 3rem;

    @media (width >= 600px) {
        --padding: 10rem 3rem;
    }

    inline-size: 100%;
    border-radius: var(--border-radius);
    padding: 10rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
    justify-content: center;
    text-align: center;

    line-height: 1.3;
    font-size: 1.6rem;
}

.icon-holder {

    --dot-inset: .5rem;
    --size: 10rem;

    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;

    inline-size: var(--size);
    block-size: var(--size);

    border: 1px dashed rgba(var(--puzzle-tile-shadow), 0.30);
    border-radius: 1rem;
    background-color: rgba(var(--puzzle-tile-shadow), 0.05);

    transition: background-color .25s ease;

    .dot {
        position: absolute;
        inline-size: 1.4rem;
        block-size: 1.4rem;
        border-radius: 50%;
        background: rgba(var(--puzzle-tile-shadow), 0.20);
        pointer-events: none;
        box-shadow: 1px 1px 0 0 rgba(var(--puzzle-tile-shadow), 0.70) inset;

        &:nth-child(1) {
            inset-block-end: var(--dot-inset);
            inset-inline-start: var(--dot-inset);
        }

        &:nth-child(2) {
            inset-block-end: var(--dot-inset);
            inset-inline-end: var(--dot-inset);
        }

        &:nth-child(3) {
            inset-block-start: var(--dot-inset);
            inset-inline-start: var(--dot-inset);
        }

        &:nth-child(4) {
            inset-block-start: var(--dot-inset);
            inset-inline-end: var(--dot-inset);
        }

    }
}

:global([data-theme-status="dark"] .icon-holder .dot) {
    background: rgba(var(--puzzle-tile-shadow), 0.05);
    box-shadow: -1px -1px 0 0 rgba(var(--puzzle-tile-shadow), 0.3) inset;
}

:root:not([data-theme-status="light"]) .icon-holder .dot {
    @media (prefers-color-scheme: dark) {
        background: rgba(var(--puzzle-tile-shadow), 0.05);
        box-shadow: -1px -1px 0 0 rgba(var(--puzzle-tile-shadow), 0.3) inset;
    }
}

.empty-icon {
    inline-size: 50%;
    block-size: 50%;
    color: var(--puzzle-tile-text);
}

:global(.empty-icon svg) {
    inline-size: 100%;
    block-size: 100%;
}

:global([data-theme-status="dark"] .empty-icon svg) {
    opacity: .6;
}

:not([data-theme-status]) .empty-icon svg {
    @media (prefers-color-scheme: dark) {
        opacity: .6;
    }
}

</style>
