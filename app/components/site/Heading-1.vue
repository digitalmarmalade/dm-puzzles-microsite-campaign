<script setup>
const props = defineProps({
    heading: String,
})
</script>

<template>
    <div class="heading">
        <h1>
            <span>{{ heading }}</span>
        </h1>
    </div>
</template>

<style scoped>
.heading {
    text-align: center;
    padding: 0 0 3rem;
}
</style>
