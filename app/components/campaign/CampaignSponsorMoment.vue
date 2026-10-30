<script setup>
const props = defineProps({
    campaign: {type: Object, required: true},
    fundraising: {type: Object, required: true},
    storageKey: {type: String, required: true},
    shareUrl: {type: String, default: null},
})

const {t} = useI18n()
const text = useCampaignText(props.campaign)
const money = useMoney(props.fundraising.currency)
const {thanked, thank} = useThanked(`${props.storageKey}:thanked`)
const seen = ref(null)
const copied = ref(false)

const fresh = computed(() => (props.fundraising.supporters ?? [])
    .filter(s => s.daysAgo === 0 && seen.value && !seen.value.includes(s.name) && !thanked.value.includes(s.name)))
const total = computed(() => fresh.value.reduce((sum, s) => sum + s.amount, 0))
const headline = computed(() => {
    const [first] = fresh.value
    if (!first) return ''
    return fresh.value.length === 1
        ? t('campaign.moments.one', {name: first.name, amount: money(first.amount)})
        : t('campaign.moments.many', {name: first.name, others: fresh.value.length - 1, amount: money(total.value)}, fresh.value.length - 1)
})

onMounted(() => {
    try {
        seen.value = JSON.parse(localStorage.getItem(`${props.storageKey}:seen`)) ?? []
    } catch {
        seen.value = []
    }
})

function remember() {
    seen.value = [...seen.value, ...fresh.value.map(s => s.name)]
    try {
        localStorage.setItem(`${props.storageKey}:seen`, JSON.stringify(seen.value))
    } catch {
        //
    }
}

async function sayThanks() {
    const names = fresh.value.map(s => s.name)
    const message = t('campaign.moments.thanksText', {names: names.join(', '), title: text('title')}) + (props.shareUrl ? ` ${props.shareUrl}` : '')
    try {
        if (navigator.share) await navigator.share({text: message})
        else {
            await navigator.clipboard.writeText(message)
            copied.value = true
        }
    } catch (e) {
        if (e?.name === 'AbortError') return
        console.error(e)
    }
    thank(names)
    remember()
}
</script>

<template>
    <section v-if="fresh.length" class="moment" role="status">
        <span class="moment__icon" aria-hidden="true">🎉</span>
        <div class="moment__text">
            <p class="moment__label">{{ t('campaign.moments.label') }}</p>
            <h2 class="moment__title">{{ headline }}</h2>
            <p v-if="fresh[0].message" class="moment__message">“{{ fresh[0].message }}”</p>
        </div>
        <div class="moment__actions">
            <button type="button" class="campaign-button" @click="sayThanks">{{ t('campaign.moments.thank') }}</button>
            <button type="button" class="campaign-button is-secondary" @click="remember">{{ t('campaign.moments.later') }}</button>
        </div>
        <p v-if="copied" class="sr-only" aria-live="polite">{{ t('campaign.share.copied') }}</p>
    </section>
</template>

<style scoped>
.moment {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.6rem 2.4rem;
    padding: 2.4rem;
    border: .2rem solid color-mix(in srgb, var(--secondary) 40%, transparent);
    border-radius: var(--border-radius);
    background: color-mix(in srgb, var(--secondary) 8%, var(--card-background));
    animation: moment-in .5s cubic-bezier(.2, 1.4, .4, 1) both;

    @media (width >= 720px) {
        flex-wrap: nowrap;
        padding: 2.4rem 3.2rem;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.moment__icon {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 7.2rem;
    block-size: 7.2rem;
    border-radius: 50%;
    background: var(--card-background);
    font-size: 3.6rem;
    box-shadow: 0 6px 16px color-mix(in srgb, var(--secondary) 25%, transparent);
}

.moment__text {
    flex: 1 1 20rem;
    min-inline-size: 0;

    p,
    h2 {
        margin: 0;
    }
}

.moment__label {
    color: var(--secondary);
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .12rem;
}

.moment__title {
    font-family: var(--font-display);
    font-size: 2.4rem;
    line-height: 1.2;
}

.moment__message {
    margin-block-start: .4rem;
    font-style: italic;
    opacity: .85;
}

.moment__actions {
    display: flex;
    flex-wrap: wrap;
    gap: .8rem;

    .campaign-button {
        padding: 1rem 2rem;
    }
}

@keyframes moment-in {
    from {
        opacity: 0;
        transform: scale(.94);
    }
}
</style>
