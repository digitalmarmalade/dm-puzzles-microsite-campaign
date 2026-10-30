<script setup>
defineProps({
    narrow: {type: [Boolean, String], default: false},
})
</script>

<template>
    <div class="wrapper" :class="{'wrapper--narrow': narrow === true || narrow === 'true'}">
        <slot/>
    </div>
</template>

<style scoped>

:global(.is-stuck) {
    @media (width >= 1024px) {
        --space-before-nav: 2rem;
    }
}

.wrapper {
    inline-size: 100%;
    margin-inline: auto;
    max-inline-size: var(--container-max-width);
    transition: padding .3s ease;
    display: flex;
    flex-direction: column;
    gap: var(--vertical-rhythm);
    padding: 0 2rem;
    min-inline-size: 0;
}

.wrapper--narrow {
    max-inline-size: var(--container-narrow-max-width, 60rem);
    gap: var(--vertical-rhythm-half);
}

</style>
