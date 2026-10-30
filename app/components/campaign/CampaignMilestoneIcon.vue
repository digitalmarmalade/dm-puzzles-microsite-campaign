<script setup>
defineProps({
    id: {type: String, required: true},
})
</script>

<template>
    <svg viewBox="0 0 24 24" class="milestone-icon" aria-hidden="true">
        <path v-if="id === 'first'" d="M5 21V4m0 1h11l-2 4 2 4H5" />
        <template v-else-if="id === 'week'">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4M10 14h4l-2.5 5" />
        </template>
        <template v-else-if="id === 'half'">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18z" class="milestone-icon__fill" />
        </template>
        <path v-else-if="id === 'streak'" d="M12 2c1 3.5-1.5 5.5-1.5 8.5A2.5 2.5 0 0 0 13 13c1.5 0 2.5-1.2 2.5-3 2 1.8 3.5 4.3 3.5 7a7 7 0 0 1-14 0c0-4.6 3.6-7.6 7-15z" />
        <template v-else>
            <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
            <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M10 17h4" />
        </template>
    </svg>
</template>

<style scoped>
.milestone-icon {
    inline-size: 50%;
    block-size: 50%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.milestone-icon__fill {
    fill: currentColor;
    stroke: none;
}
</style>
