<script setup>
import {signOut} from 'firebase/auth'

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
const {$auth} = useNuxtApp()
const user = useState('campaignUser')
const accounts = props.campaign.account === 'required'
const signedIn = computed(() => !!user.value && !user.value.isAnonymous)
const slots = useSlots()
const year = new Date().getFullYear()
const owner = props.campaign.organisation || text('title')
const menuOpen = ref(false)
const burger = ref(null)
const menuId = useId()

function closeMenu() {
    menuOpen.value = false
}

function onKeydown(event) {
    if (event.key !== 'Escape' || !menuOpen.value) return
    closeMenu()
    burger.value?.focus()
}

function onMenuClick(event) {
    if (event.target.closest('a, button')) closeMenu()
}

watch(() => route.fullPath, closeMenu)
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

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
        <div class="campaign__top" :class="{'has-banner': !!slots.banner}">
            <header class="campaign__header">
                <NuxtLink :to="home" class="campaign__brand">
                    <img v-if="campaign.theme?.logo" :src="campaign.theme.logo" :alt="text('title')" class="campaign__logo">
                    <span v-else class="campaign__title">{{ text('title') }}</span>
                </NuxtLink>
                <nav class="campaign__nav" :aria-label="t('campaign.menu')">
                    <NuxtLink :to="home">{{ t('campaign.home') }}</NuxtLink>
                    <slot name="nav" />
                    <template v-if="accounts && !previewing && user !== undefined">
                        <button v-if="signedIn" type="button" class="campaign__nav-button" @click="signOut($auth)">{{ t('campaign.account.signOut') }}</button>
                        <NuxtLink v-else :to="{path: home, query: {signin: 1}}">{{ t('campaign.account.signIn') }}</NuxtLink>
                    </template>
                </nav>
                <button
                    ref="burger"
                    type="button"
                    class="campaign__burger"
                    :aria-expanded="menuOpen"
                    :aria-controls="menuId"
                    :aria-label="t('campaign.menu')"
                    @click="menuOpen = !menuOpen"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </header>
            <slot name="banner" />
        </div>
        <div :id="menuId" class="campaign__menu" :class="{'is-open': menuOpen}" :inert="!menuOpen" @click="onMenuClick">
            <button type="button" class="campaign__menu-close" :aria-label="t('campaign.card.close')">
                <svg aria-hidden="true"><use :href="sprite('close')" /></svg>
            </button>
            <nav class="campaign__menu-links" :aria-label="t('campaign.menu')">
                <NuxtLink :to="home">{{ t('campaign.home') }}</NuxtLink>
                <slot name="nav" />
                <template v-if="accounts && !previewing && user !== undefined">
                    <button v-if="signedIn" type="button" class="campaign__nav-button" @click="signOut($auth)">{{ t('campaign.account.signOut') }}</button>
                    <NuxtLink v-else :to="{path: home, query: {signin: 1}}">{{ t('campaign.account.signIn') }}</NuxtLink>
                </template>
            </nav>
        </div>
        <main class="campaign__main">
            <slot />
        </main>
        <footer class="campaign__footer">
            <div class="campaign__footer-inner">
                <div class="campaign__footer-owner">
                    <p>{{ t('campaign.footer.copyright', {year, name: owner}) }}</p>
                    <p v-if="text('footer')">{{ text('footer') }}</p>
                </div>
                <i18n-t keypath="campaign.footer.poweredBy" tag="p" class="campaign__powered">
                    <template #brand>
                        <a href="https://stickypuzzles.com" target="_blank" rel="noopener">Sticky Puzzles</a>
                    </template>
                </i18n-t>
            </div>
        </footer>
    </div>
</template>

<style>
body:has(.campaign, .campaign-play) {
    --body-padding: 0;
}

.campaign {
    --page-gutter: 1.6rem;
    color-scheme: light;
    overflow-x: clip;
    --text-rgb: 33, 33, 33;
    background: var(--app-bg);
    color: var(--text-colour);
    min-block-size: 100dvh;
    display: flex;
    flex-direction: column;

    @media (width >= 720px) {
        --page-gutter: 2rem;
    }

    @media (width >= 1200px) {
        --page-gutter: 4.8rem;
    }
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
    padding: 2rem var(--page-gutter);

    @media (width >= 720px) {
        padding-block: 3rem;
    }
}

.campaign__top {
    position: relative;

    &.has-banner .campaign__header {
        position: absolute;
        z-index: 2;
        inset-block-start: 0;
        inset-inline: var(--page-gutter);
        inline-size: auto;
        max-inline-size: calc(128rem - 2 * var(--page-gutter));
        padding: 1.2rem 1.6rem;
        border-radius: 0 0 var(--border-radius) var(--border-radius);
        background: color-mix(in srgb, var(--card-background) 85%, transparent);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, .15);

        @media (width >= 720px) {
            padding: 1.6rem 2.4rem;
        }
    }

    &.has-banner .campaign__logo {
        block-size: 4.8rem;
    }

    &.has-banner .campaign__title {
        font-size: 2rem;

        @media (width >= 720px) {
            font-size: 2.4rem;
        }
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
    display: none;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: .8rem 3rem;

    a,
    .campaign__nav-button {
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

    @media (width >= 720px) {
        display: flex;
    }
}

.campaign__burger {
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    flex-shrink: 0;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text-colour);
    cursor: pointer;
    transition: gap .25s;

    span {
        display: block;
        inline-size: 2.5rem;
        block-size: .2rem;
        border-radius: 1px;
        background-color: currentColor;
    }

    @media (hover: hover) {
        &:hover {
            gap: .7rem;
        }
    }

    @media (width >= 720px) {
        display: none;
    }
}

.campaign__menu {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 9rem 3rem 3rem;
    background: var(--app-bg);
    color: var(--text-colour);
    overflow: auto;
    transform: translateX(103%);
    transition: transform .3s ease-in-out;

    &.is-open {
        transform: translateX(0);
    }

    @media (width >= 720px) {
        display: none;
    }

    @media (prefers-reduced-motion: reduce) {
        transition: none;
    }
}

.campaign__menu-close {
    position: absolute;
    inset-block-start: 2.4rem;
    inset-inline-end: 2.4rem;
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;

    svg {
        inline-size: 2.4rem;
        block-size: 2.4rem;
    }
}

.campaign__menu-links {
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    max-inline-size: 50rem;

    a,
    .campaign__nav-button {
        display: block;
        padding: 2rem;
        border-block-end: 1px solid var(--card-border);
        color: inherit;
        font-size: 1.8rem;
        letter-spacing: .1rem;
        text-align: start;
        text-decoration: none;
        text-transform: uppercase;
        opacity: 0;
        transform: translateX(5rem);
        transition: opacity .3s ease-in-out .12s, transform .3s ease-in-out .12s;

        .is-open & {
            opacity: 1;
            transform: none;
        }

        &:nth-child(2) {
            transition-delay: .16s;
        }

        &:nth-child(3) {
            transition-delay: .2s;
        }

        @media (prefers-reduced-motion: reduce) {
            transition: none;
        }
    }
}

.campaign__nav-button {
    appearance: none;
    background: none;
    border: 0;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
}

.campaign__main {
    flex-grow: 1;
    inline-size: 100%;
    max-inline-size: 128rem;
    margin-inline: auto;
    padding: 0 var(--page-gutter) 4rem;
}

.campaign :is(input[type=text], input[type=email], input[type=password], textarea) {
    background-color: var(--card-background);
}

.campaign .form-input :is(label, legend) {
    font-weight: 700;
}

.campaign .campaign-panel {
    inline-size: 100%;
    align-items: stretch;
    gap: 2rem;
    padding: 2.4rem 2rem;
    text-align: start;

    @media (width >= 720px) {
        padding: 3.2rem;
    }

    form {
        gap: 1.6rem;
    }
}

.campaign-panel__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 2.6rem;
    line-height: 1.15;
    text-wrap: balance;
}

.campaign-panel__header {
    display: flex;
    flex-direction: column;
    gap: .8rem;

    p {
        margin: 0;
        line-height: 1.5;
    }
}

.campaign-heading {
    margin: 0;
    color: var(--primary);
    font-size: 1.4rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .15rem;
}

.campaign-step {
    margin: 0;
    color: var(--primary);
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1rem;
}

.campaign__footer {
    border-block-start: 1px solid var(--card-border);
    background: var(--card-background);
    font-size: 1.4rem;

    p {
        margin: 0;
    }
}

.campaign__footer-inner {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    inline-size: 100%;
    max-inline-size: 128rem;
    margin-inline: auto;
    padding: 2.4rem var(--page-gutter);
    text-align: center;

    @media (width >= 720px) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        text-align: start;
    }
}

.campaign__footer-owner {
    display: flex;
    flex-direction: column;
    gap: .4rem;
    opacity: .8;
}

.campaign__powered {
    flex-shrink: 0;

    a {
        color: var(--primary);
        font-weight: 700;
        text-decoration: none;

        &:hover {
            @media (hover: hover) {
                text-decoration: underline;
            }
        }
    }
}

.campaign-pill {
    appearance: none;
    display: inline-flex;
    align-items: center;
    gap: .6rem;
    padding: .7rem 1.4rem;
    border: 1px solid var(--card-border);
    border-radius: 9999px;
    background: var(--card-background);
    color: var(--text-colour);
    font: inherit;
    font-size: 1.4rem;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition: border-color .15s ease, color .15s ease;

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
    }

    @media (hover: hover) {
        &:hover {
            border-color: var(--primary);
            color: var(--primary);
        }
    }

    &:focus-visible {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
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
    transition: background-color .15s ease;

    &:disabled {
        opacity: .5;
        cursor: default;
    }

    &:not(.is-secondary, :disabled):hover {
        @media (hover: hover) {
            background: var(--button-primary-hover, var(--primary));
        }
    }

    &.is-secondary {
        background: transparent;
        color: var(--primary);
        box-shadow: inset 0 0 0 2px var(--primary);
    }
}
</style>
