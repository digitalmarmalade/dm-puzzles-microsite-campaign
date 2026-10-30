<script setup>
const props = defineProps({
    size: String,
    type: String,
})
const {size = 'regular', type = 'attention'} = props;
</script>

<template>
    <div :class="`attention attention--${size} attention--${type}`">
        <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <use :href="sprite('attention')" v-if="type === 'attention'"/>
            <use :href="sprite('negative')" v-if="type === 'negative'"/>
            <use :href="sprite('positive')" v-if="type === 'positive'"/>
        </svg>

        <slot/>
    </div>
</template>


<style scoped>
.attention {

    --padding: 2rem;
    --width: 100%;
    --display: flex;
    --svg-size: 3rem;
    --max-width: 74rem;
    --margin: 0 auto;

    border: 1px solid var(--primary);
    border-radius: var(--border-radius);
    margin: var(--margin);
    padding: var(--padding);
    display: var(--display);
    background-color: rgba(var(--primary-rgb), .05);
    gap: 1rem;
    align-items: center;
    max-inline-size: var(--max-width);
    justify-content: center;
    inline-size: var(--width);

    p {
        margin: 0;
    }

    svg {
        inline-size: var(--svg-size);
        block-size: var(--svg-size);
        flex-shrink: 0;
    }

    @media (width < 600px) {
        flex-direction: column;
        text-align: center;
    }

    &.attention--negative {
        border-color: var(--danger);
        background: rgba(var(--danger-rgb), .05);
    }

    &.attention--positive {
        border-color: var(--positive);
        background: rgba(var(--positive-rgb), .05);
    }
}

.attention--small {
    --width: auto;
    --svg-size: 2rem;
    --display: inline-flex;

    @media (width >= 1024px) {
        margin: 0;
        align-self: flex-start;
    }
}
</style>
