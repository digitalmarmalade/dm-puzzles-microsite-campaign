<script setup>
import {SHARE_FORMATS, drawShareCard, themeOf} from '@/lib/campaign/shareCard'

const props = defineProps({
    campaign: {type: Object, required: true},
    track: {type: Object, required: true},
    progress: {type: Object, required: true},
    url: {type: String, default: null},
    fundraising: {type: Object, default: null},
})

const {t, locale} = useI18n()
const text = useCampaignText(props.campaign)

const dialog = ref(null)
const format = ref('square')
const image = ref(null)
const preview = ref(null)
const busy = ref(false)
const formats = Object.keys(SHARE_FORMATS)

const total = props.campaign.schedule.days
const headline = computed(() => {
    const done = props.progress.completed
    if (done === 0) return [t('campaign.card.started', {days: total})]
    if (done >= total) return [t('campaign.card.finished', {days: total})]
    return [t('campaign.card.down', {n: done}), t('campaign.card.toGo', {n: total - done})]
})
const body = computed(() => {
    const own = props.campaign.text?.[locale.value]?.pledge ?? props.campaign.text?.en?.pledge
    const values = {org: props.campaign.organisation || text('title'), headline: props.track.headline || props.track.name, days: total}
    return own ? own.replace(/\{(\w+)\}/g, (all, key) => values[key] ?? all) : t('campaign.card.pledge', values)
})
const fileName = computed(() => `${props.campaign.id}-${format.value}.png`)
const canShareFiles = computed(() => !!image.value && typeof navigator !== 'undefined' && !!navigator.canShare?.({files: [image.value]}))

async function render() {
    busy.value = true
    try {
        const blob = await drawShareCard({
            ...themeOf(dialog.value),
            format: format.value,
            logo: props.campaign.theme?.logo,
            title: text('title'),
            headline: headline.value,
            body: body.value,
            button: t(props.fundraising?.url ? 'campaign.card.sponsorMe' : 'campaign.card.joinMe'),
            url: props.url?.replace(/^https?:\/\//, ''),
        })
        image.value = new File([blob], fileName.value, {type: 'image/png'})
        if (preview.value) URL.revokeObjectURL(preview.value)
        preview.value = URL.createObjectURL(blob)
    } catch (e) {
        console.error(e)
    } finally {
        busy.value = false
    }
}

function open() {
    dialog.value.showModal()
    render()
}

function close() {
    dialog.value.close()
}

watch(format, render)

function download() {
    const a = Object.assign(document.createElement('a'), {href: preview.value, download: fileName.value})
    a.click()
}

async function share() {
    try {
        await navigator.share({files: [image.value], title: text('title'), url: props.url ?? undefined})
    } catch (e) {
        if (e?.name !== 'AbortError') console.error(e)
    }
}

onBeforeUnmount(() => {
    if (preview.value) URL.revokeObjectURL(preview.value)
})

defineExpose({open})
</script>

<template>
    <dialog ref="dialog" class="share-card" :aria-label="t('campaign.card.title')" @click.self="close">
        <div class="share-card__inner">
            <header class="share-card__head">
                <h2>{{ t('campaign.card.title') }}</h2>
                <button type="button" class="share-card__close" :aria-label="t('campaign.card.close')" @click="close">
                    <svg aria-hidden="true"><use :href="sprite('close')" /></svg>
                </button>
            </header>

            <div class="share-card__formats" role="radiogroup" :aria-label="t('campaign.card.size')">
                <label v-for="key in formats" :key="key" class="share-card__format">
                    <input v-model="format" type="radio" name="share-format" :value="key" class="sr-only">
                    <span class="share-card__shape" :class="`share-card__shape--${key}`" aria-hidden="true"></span>
                    <span>
                        <strong>{{ t(`campaign.card.formats.${key}.name`) }}</strong>
                        <small>{{ t(`campaign.card.formats.${key}.hint`) }}</small>
                    </span>
                </label>
            </div>

            <div class="share-card__preview" :class="`is-${format}`">
                <img v-if="preview" :src="preview" :alt="[...headline, body].join(' ')" :class="{'is-busy': busy}">
                <p v-else>{{ t('campaign.card.making') }}</p>
            </div>

            <div class="share-card__actions">
                <button v-if="canShareFiles" type="button" class="campaign-button" :disabled="busy" @click="share">{{ t('campaign.share.share') }}</button>
                <button type="button" class="campaign-button" :class="{'is-secondary': canShareFiles}" :disabled="busy || !preview" @click="download">{{ t('campaign.card.download') }}</button>
            </div>
        </div>
    </dialog>
</template>

<style scoped>
.share-card {
    inline-size: min(56rem, calc(100vw - 2.4rem));
    max-block-size: calc(100dvh - 2.4rem);
    margin: auto;
    padding: 0;
    border: 0;
    border-radius: calc(var(--border-radius) * 1.5);
    background: var(--card-background);
    color: var(--text-colour);
    box-shadow: 0 30px 80px rgba(0, 0, 0, .3);

    &::backdrop {
        background: rgba(20, 20, 30, .55);
        backdrop-filter: blur(4px);
    }

    &[open] {
        animation: share-card-in .25s ease both;

        @media (prefers-reduced-motion: reduce) {
            animation: none;
        }
    }
}

.share-card__inner {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2.4rem;

    @media (width >= 720px) {
        padding: 3.2rem;
    }
}

.share-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.6rem;

    h2 {
        margin: 0;
        font-family: var(--font-display);
        font-size: 2.4rem;
    }
}

.share-card__close {
    display: grid;
    place-items: center;
    inline-size: 4rem;
    block-size: 4rem;
    padding: 0;
    border: 1px solid var(--card-border);
    border-radius: 50%;
    background: none;
    color: inherit;
    cursor: pointer;

    svg {
        inline-size: 1.4rem;
        block-size: 1.4rem;
    }
}

.share-card__formats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: .8rem;
}

.share-card__format {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .8rem;
    padding: 1.2rem .8rem;
    border: .2rem solid var(--card-border);
    border-radius: var(--border-radius-inner);
    text-align: center;
    cursor: pointer;
    transition: border-color .15s ease, background-color .15s ease;

    strong,
    small {
        display: block;
    }

    small {
        margin-block-start: .2rem;
        font-size: 1.2rem;
        line-height: 1.3;
        opacity: .7;
    }

    &:has(:checked) {
        border-color: var(--primary);
        background: color-mix(in srgb, var(--primary) 6%, var(--card-background));
    }

    &:has(:focus-visible) {
        outline: 2px solid var(--primary);
        outline-offset: 2px;
    }
}

.share-card__shape {
    display: block;
    block-size: 3.2rem;
    border: .2rem solid currentColor;
    border-radius: .4rem;
    opacity: .5;

    .share-card__format:has(:checked) & {
        border-color: var(--primary);
        background: color-mix(in srgb, var(--primary) 15%, transparent);
        opacity: 1;
    }
}

.share-card__shape--square {
    inline-size: 3.2rem;
}

.share-card__shape--story {
    inline-size: 1.8rem;
}

.share-card__shape--wide {
    inline-size: 6rem;
}

.share-card__preview {
    display: grid;
    place-items: center;
    min-block-size: 20rem;
    padding: 1.6rem;
    border-radius: var(--border-radius);
    background: color-mix(in srgb, var(--primary) 5%, var(--card-background));

    img {
        display: block;
        max-inline-size: 100%;
        max-block-size: 44vh;
        border-radius: .8rem;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .15);
        transition: opacity .2s ease;
    }

    p {
        margin: 0;
        opacity: .7;
    }

    .is-busy {
        opacity: .4;
    }
}

.share-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: .8rem;

    .campaign-button {
        flex: 1 1 14rem;
    }
}

@keyframes share-card-in {
    from {
        opacity: 0;
        transform: translateY(1.2rem) scale(.98);
    }
}
</style>
