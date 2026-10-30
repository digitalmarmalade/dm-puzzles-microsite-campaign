<script setup>
const props = defineProps({
    heading: String,
})
</script>

<template>
    <div class="heading">
        <h2>
            <span>{{ heading }}</span>
        </h2>
    </div>
</template>

<style scoped>
.heading {
    text-align: center;
    padding: 5rem 0 3rem;
}
</style>
