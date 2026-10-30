<script setup>
defineProps({
    award: {type: String, required: true},
})
const missing = ref(false)
</script>

<template>
    <span class="award-art" :class="[`award-art--${award}`, {'award-art--image': !missing}]" aria-hidden="true">
        <img v-if="!missing" :src="versioned(`/img/advent/${award}.webp`)" alt="" @error="missing = true">
        <svg v-else-if="award === 'perfect'" viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
        <svg v-else-if="award === 'silver'" viewBox="0 0 24 24"><rect x="10" y="2.5" width="4" height="3.5" rx="1" /><circle cx="12" cy="14" r="7.5" /></svg>
        <svg v-else-if="award === 'bronze'" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v4.5L4 17h16l-2-3.5V9a6 6 0 0 0-6-6z" /><rect x="10" y="18" width="4" height="3" rx="1.5" /></svg>
        <svg v-else viewBox="0 0 24 24"><path d="M7 6.5 13.5 4 19 8l1.5 6.5-4 5.5-7 .5L4 15.5l.5-6Z" /></svg>
    </span>
</template>

<style scoped>
.award-art {
    --award-colour: #c9962a;
    --award-tint: rgba(242, 193, 78, .18);

    display: grid;
    place-items: center;
    inline-size: 100%;
    aspect-ratio: 1;
    border-radius: var(--border-radius, 1rem);
    background: var(--award-tint);

    &.award-art--silver {
        --award-colour: #8a97a6;
        --award-tint: rgba(138, 151, 166, .18);
    }

    &.award-art--bronze {
        --award-colour: #b0703c;
        --award-tint: rgba(176, 112, 60, .18);
    }

    &.award-art--coal {
        --award-colour: #3d3f4a;
        --award-tint: rgba(61, 63, 74, .16);
    }

    &.award-art--image {
        background: none;
    }

    img {
        inline-size: 100%;
        block-size: 100%;
        object-fit: contain;
    }

    svg {
        inline-size: 60%;
        block-size: 60%;
        fill: var(--award-colour);
    }

    }
</style>
