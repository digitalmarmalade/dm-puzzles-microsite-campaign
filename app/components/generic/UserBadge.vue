<script setup>
import {getLabelFromName} from '@/lib/utils'

const {name, email} = defineProps({name: String, email: String})

const initials = computed(() => {
    if (name) return getLabelFromName(name).toUpperCase()
    if (email) return email.charAt(0).toUpperCase()
    return ''
})
</script>

<template>
    <span class="user-badge" aria-hidden="true">
        <span v-if="initials">{{ initials }}</span>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>
        </svg>
    </span>
</template>

<style scoped>
.user-badge {
    display: grid;
    flex-shrink: 0;
    place-items: center;
    inline-size: var(--user-badge-size, 7rem);
    block-size: var(--user-badge-size, 7rem);
    border: var(--user-badge-border-width, 1px) solid var(--user-badge-border, var(--card-border));
    border-radius: 50%;
    background: var(--user-badge-background, var(--app-bg, #fff));
    color: var(--user-badge-colour, var(--text-colour, #333));
    font-size: var(--user-badge-font-size, 2rem);
    font-weight: 700;
    line-height: 1;

    svg {
        inline-size: 46%;
        block-size: 46%;
    }
}
</style>
