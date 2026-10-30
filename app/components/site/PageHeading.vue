<script setup>
const props = defineProps({
    button: String,
    heading: String,
})
</script>

<template>
    <div class="heading">
        <h1>
            <slot name="heading"></slot>
        </h1>
        <p>
            <slot name="button"></slot>
        </p>
    </div>
</template>

<style scoped>
.heading {
    inline-size: 100%;
    text-align: center;
    display: flex;
    flex-direction: column-reverse;
    gap: 1rem;

    h1 {
        font-weight: 900;
        font-size: var(--page-h1-size);
    }
}
</style>
