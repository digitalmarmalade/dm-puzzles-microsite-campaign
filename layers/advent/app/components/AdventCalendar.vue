<script setup>
const props = defineProps({
    doors: {type: Array, required: true},
    opened: {type: Array, default: () => []},
})
const emit = defineEmits(['select'])
</script>

<template>
    <div class="advent-sheet">
        <AdventSnow :density="3" />
        <div v-if="$slots.header" class="advent-sheet__header">
            <slot name="header" />
        </div>
        <div class="advent-sheet__grid">
            <AdventDoor
                v-for="door in props.doors"
                :key="door.day"
                :door="door"
                :opened="props.opened.includes(door.day)"
                @select="emit('select', $event)"
            />
        </div>
        <AdventSnow class="advent-sheet__front-snow" :density=".6" />
    </div>
</template>

<style scoped>
.advent-sheet__front-snow {
    z-index: 3;
}

.advent-sheet {
    position: relative;
    padding: 4rem;
    border-radius: var(--border-radius, 1rem);
    background: linear-gradient(180deg, var(--advent-night-deep) 0%, var(--advent-night) 55%, var(--advent-night-light) 100%);
    box-shadow:
        inset 0 0 0 .1rem rgba(255, 255, 255, .12),
        var(--card-shadow);

    @media (max-width: 600px) {
        padding: 2.8rem 1.6rem 2rem;
    }
}

.advent-sheet__header {
    position: relative;
    margin: 0 0 3.2rem;
    color: #fff;
}

.advent-sheet__grid {
    position: relative;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 2.4rem 2rem;
    inline-size: 100%;

    @media (max-width: 760px) {
        grid-template-columns: repeat(4, 1fr);
        gap: 1.6rem 1.2rem;
    }

    @media (max-width: 600px) {
        grid-template-columns: repeat(3, 1fr);
        gap: 1.8rem 1.6rem;
    }
}
</style>
