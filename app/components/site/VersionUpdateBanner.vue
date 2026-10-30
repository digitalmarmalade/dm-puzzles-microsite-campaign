<script setup>
const {updateAvailable, refresh} = useVersionCheck()
</script>

<template>
    <Transition name="update-banner">
        <button
            v-if="updateAvailable"
            type="button"
            class="update-banner"
            @click="refresh"
        >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15A9 9 0 1 1 18.63 6.36L23 10"/>
            </svg>
            <span>{{ $t('common.updateAvailable') }}</span>
        </button>
    </Transition>
</template>

<style scoped>
    .update-banner {
        position: fixed;
        inset-block-end: calc(2rem + env(safe-area-inset-bottom, 0px));
        inset-inline: 0;
        margin-inline: auto;
        inline-size: fit-content;
        max-inline-size: calc(100% - 4rem);
        z-index: 9998;
        display: inline-flex;
        align-items: center;
        gap: .8rem;
        padding: 1rem 2rem;
        border: none;
        border-radius: 9999px;
        background: var(--primary, #F17B2D);
        color: var(--text-on-primary, #fff);
        font-size: 1.4rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(0, 0, 0, .25);
        appearance: none;

        @media (hover: hover) {
            &:hover {
                filter: brightness(1.05);
            }
        }
    }
    .update-banner svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
    }
    .update-banner-enter-active,
    .update-banner-leave-active {
        transition: opacity .2s ease, transform .2s ease;
    }
    .update-banner-enter-from,
    .update-banner-leave-to {
        opacity: 0;
        transform: translateY(1rem);
    }
</style>
