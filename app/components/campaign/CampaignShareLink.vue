<script setup>
const props = defineProps({
    campaign: {type: Object, required: true},
    handle: {type: String, required: true},
    title: {type: String, default: ''},
})

const {t} = useI18n()
const localePath = useLocalePath()
const pageUrl = useCampaignPageUrl(props.campaign)
const url = computed(() => pageUrl(props.handle))
const path = computed(() => localePath(`/c/${props.campaign.id}/${props.handle}`))
const canShare = typeof navigator !== 'undefined' && !!navigator.share
const copied = ref(false)
let timer = null

async function copy() {
    try {
        await navigator.clipboard.writeText(url.value)
        copied.value = true
        clearTimeout(timer)
        timer = setTimeout(() => copied.value = false, 2500)
    } catch (e) {
        console.error(e)
    }
}

async function share() {
    try {
        await navigator.share({title: props.title, url: url.value})
    } catch (e) {
        if (e?.name !== 'AbortError') console.error(e)
    }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
    <div class="share-link">
        <div class="share-link__text">
            <p class="share-link__label">{{ t('campaign.share.label') }}</p>
            <NuxtLink :to="path" class="share-link__url">{{ url }}</NuxtLink>
        </div>
        <div class="share-link__actions">
            <button type="button" class="campaign-button is-secondary" @click="copy">
                {{ t(copied ? 'campaign.share.copied' : 'campaign.share.copy') }}
            </button>
            <button v-if="canShare" type="button" class="campaign-button" @click="share">
                {{ t('campaign.share.share') }}
            </button>
        </div>
        <p class="sr-only" aria-live="polite">{{ copied ? t('campaign.share.copied') : '' }}</p>
    </div>
</template>

<style scoped>
.share-link {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1.2rem 2rem;
    padding: 1.6rem 2rem;
    border: 1px dashed color-mix(in srgb, var(--secondary) 60%, transparent);
    border-radius: var(--border-radius-inner);
    background: color-mix(in srgb, var(--secondary) 6%, var(--card-background));
}

.share-link__text {
    min-inline-size: 0;
    flex: 1 1 28rem;
}

.share-link__label {
    margin: 0 0 .2rem;
    font-size: 1.3rem;
    text-transform: uppercase;
    letter-spacing: .05rem;
}

.share-link__url {
    color: var(--primary);
    font-weight: 600;
    overflow-wrap: anywhere;
}

.share-link__actions {
    display: flex;
    gap: .8rem;

    .campaign-button {
        padding: .8rem 1.8rem;
        font-size: 1.4rem;
    }
}
</style>
