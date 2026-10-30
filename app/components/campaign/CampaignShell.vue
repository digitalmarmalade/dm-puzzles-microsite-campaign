<script setup>
const props = defineProps({
    campaign: {type: Object, required: true},
    previewing: {type: String, default: null},
    title: {type: String, default: null},
})

const {t} = useI18n()
const text = useCampaignText(props.campaign)
const route = useRoute()
const localePath = useLocalePath()
const home = localePath(`/c/${props.campaign.id}`)

useHead({
    title: () => props.title ?? text('title'),
    titleTemplate: () => props.title ? `%s · ${text('title')}` : '%s',
})
</script>

<template>
    <div class="campaign" :style="useCampaignTheme(campaign)">
        <p v-if="previewing" class="campaign__preview" role="status">
            {{ t('campaign.previewing', {date: previewing}) }}
            <a :href="`${route.path}?today=off`">{{ t('campaign.stopPreview') }}</a>
        </p>
        <header class="campaign__header">
            <NuxtLink :to="home" class="campaign__brand">
                <img v-if="campaign.theme?.logo" :src="campaign.theme.logo" :alt="text('title')" class="campaign__logo">
                <span v-else class="campaign__title">{{ text('title') }}</span>
            </NuxtLink>
            <nav class="campaign__nav">
                <NuxtLink :to="home">{{ t('campaign.home') }}</NuxtLink>
                <slot name="nav" />
            </nav>
        </header>
        <main class="campaign__main">
            <slot />
        </main>
    </div>
</template>

<style>
body:has(.campaign, .campaign-play) {
    --body-padding: 0;
}

.campaign {
    color-scheme: light;
    --text-rgb: 33, 33, 33;
    background: var(--app-bg);
    color: var(--text-colour);
    min-block-size: 100dvh;
    display: flex;
    flex-direction: column;
}

.campaign__preview {
    background: #222;
    color: #fff;
    text-align: center;
    padding: .8rem 1.6rem;
    font-size: 1.4rem;

    a {
        color: inherit;
        margin-inline-start: .8rem;
    }
}

.campaign .puzzle-card {
    --puzzle-tile-shadow: var(--campaign-tile-rgb);
    --puzzle-tile-text: var(--primary);
    --puzzle-tile-background: color-mix(in srgb, rgb(var(--puzzle-tile-shadow)) 10%, var(--card-background));
}

.campaign__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    inline-size: 100%;
    max-inline-size: 128rem;
    margin-inline: auto;
    padding: 2rem 1.6rem;

    @media (width >= 720px) {
        padding: 3rem 2rem;
    }
}

.campaign__brand {
    display: flex;
    text-decoration: none;
}

.campaign__logo {
    block-size: 5rem;
    inline-size: auto;

    @media (width >= 720px) {
        block-size: 7rem;
    }
}

.campaign__title {
    color: var(--primary);
    font-family: var(--font-display);
    font-size: 2.4rem;
    font-weight: 700;
}

.campaign__nav {
    display: flex;
    gap: 3rem;

    a {
        color: inherit;
        font-size: 1.4rem;
        text-transform: uppercase;
        letter-spacing: .1rem;
        text-decoration: none;

        &:hover {
            @media (hover: hover) {
                color: var(--primary);
            }
        }
    }
}

.campaign__main {
    flex-grow: 1;
    inline-size: 100%;
    max-inline-size: 128rem;
    margin-inline: auto;
    padding: 0 1.6rem 4rem;

    @media (width >= 720px) {
        padding-inline: 2rem;
    }
}

.campaign-button {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .6rem;
    background: var(--primary);
    color: var(--text-on-primary);
    border: 0;
    border-radius: 9999px;
    padding: 1.2rem 2.4rem;
    font: inherit;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;

    &:disabled {
        opacity: .5;
        cursor: default;
    }

    &.is-secondary {
        background: transparent;
        color: var(--primary);
        box-shadow: inset 0 0 0 2px var(--primary);
    }
}
</style>
