<script setup>
const props = defineProps({
    url: {type: String, required: true},
    title: {type: String, default: ''},
    onCard: {type: Function, default: null},
})

const {t} = useI18n()
const id = useId()
const root = ref(null)
const open = ref(false)
const copied = ref(false)
const canShare = typeof navigator !== 'undefined' && !!navigator.share
let timer = null

function toggle() {
    open.value = !open.value
    copied.value = false
}

function onOutside(event) {
    if (open.value && !root.value?.contains(event.target)) open.value = false
}

function onKey(event) {
    if (event.key === 'Escape') open.value = false
}

async function copy() {
    try {
        await navigator.clipboard.writeText(props.url)
        copied.value = true
        clearTimeout(timer)
        timer = setTimeout(() => copied.value = false, 2500)
    } catch (e) {
        console.error(e)
    }
}

function makeCard() {
    open.value = false
    props.onCard()
}

async function share() {
    try {
        await navigator.share({title: props.title, url: props.url})
    } catch (e) {
        if (e?.name !== 'AbortError') console.error(e)
    }
}

onMounted(() => {
    document.addEventListener('click', onOutside)
    document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', onOutside)
    document.removeEventListener('keydown', onKey)
    clearTimeout(timer)
})
</script>

<template>
    <div ref="root" class="share-menu">
        <button type="button" class="campaign-pill" :aria-expanded="open" :aria-controls="`${id}-panel`" @click="toggle">
            <svg viewBox="0 0 24 24" class="share-menu__icon" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            {{ t('campaign.share.share') }}
        </button>

        <div v-if="open" :id="`${id}-panel`" class="share-menu__panel" role="dialog" :aria-label="t('campaign.share.label')">
            <p class="share-menu__title">{{ t('campaign.share.label') }}</p>
            <p class="share-menu__url">{{ url.replace(/^https?:\/\//, '') }}</p>
            <div class="share-menu__actions">
                <button type="button" class="campaign-button" @click="copy">
                    {{ t(copied ? 'campaign.share.copied' : 'campaign.share.copy') }}
                </button>
                <button v-if="canShare" type="button" class="campaign-button is-secondary" @click="share">
                    {{ t('campaign.share.more') }}
                </button>
            </div>
            <button v-if="onCard" type="button" class="share-menu__card" @click="makeCard">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" /></svg>
                {{ t('campaign.card.create') }}
            </button>
            <p class="sr-only" aria-live="polite">{{ copied ? t('campaign.share.copied') : '' }}</p>
        </div>
    </div>
</template>

<style scoped>
.share-menu__icon {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.share-menu__panel {
    position: absolute;
    z-index: 10;
    inset-block-start: calc(100% + .8rem);
    inset-inline-end: 0;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    inline-size: min(34rem, calc(100vw - 3.2rem));
    padding: 2rem;
    border: 1px solid var(--card-border);
    border-radius: var(--border-radius);
    background: var(--card-background);
    box-shadow: 0 16px 40px rgba(0, 0, 0, .16);
    text-align: start;
    animation: share-pop .18s ease both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.share-menu__title {
    margin: 0;
    font-weight: 700;
}

.share-menu__url {
    margin: 0;
    padding: 1rem 1.2rem;
    border-radius: var(--border-radius-inner);
    background: color-mix(in srgb, var(--secondary) 8%, var(--card-background));
    color: var(--primary);
    font-size: 1.4rem;
    font-weight: 700;
    overflow-wrap: anywhere;
}

.share-menu__actions {
    display: flex;
    flex-wrap: wrap;
    gap: .8rem;

    .campaign-button {
        flex: 1 1 auto;
        padding: .9rem 1.6rem;
        font-size: 1.4rem;
    }
}

.share-menu__card {
    appearance: none;
    display: flex;
    align-items: center;
    gap: .8rem;
    padding: 1rem 0 0;
    border: 0;
    border-block-start: 1px solid var(--card-border);
    background: none;
    color: var(--primary);
    font: inherit;
    font-weight: 700;
    cursor: pointer;

    svg {
        inline-size: 2rem;
        block-size: 2rem;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }
}

@keyframes share-pop {
    from {
        opacity: 0;
        transform: translateY(-.4rem);
    }
}
</style>
