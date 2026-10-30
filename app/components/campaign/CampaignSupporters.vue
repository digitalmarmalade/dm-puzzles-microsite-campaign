<script setup>
const props = defineProps({
    fundraising: {type: Object, required: true},
    name: {type: String, default: ''},
    own: {type: Boolean, default: false},
    sample: {type: Boolean, default: false},
})

const {t} = useI18n()
const dateLocale = useDateLocale()
const money = useMoney(props.fundraising.currency)

const raised = computed(() => props.fundraising.raised ?? 0)
const target = computed(() => props.fundraising.target ?? null)
const percent = computed(() => target.value ? Math.min(100, raised.value / target.value * 100) : null)
const toGo = computed(() => target.value ? Math.max(0, target.value - raised.value) : null)
const supporters = computed(() => (props.fundraising.supporters ?? []).slice(0, 6))
const when = (daysAgo) => new Intl.RelativeTimeFormat(dateLocale.value, {numeric: 'auto'}).format(-daysAgo, 'day')
const initialOf = (name) => (name ?? '').trim().charAt(0).toUpperCase() || '♥'
const hue = (name) => [...(name ?? '')].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 4
</script>

<template>
    <section class="supporters">
        <header class="supporters__head">
            <h2 class="campaign-heading">{{ own ? t('campaign.sponsorship.yourTitle') : t('campaign.sponsorship.namedTitle', {name}) }}</h2>
            <span v-if="sample" class="supporters__sample">{{ t('campaign.sponsorship.sample') }}</span>
        </header>

        <div class="supporters__total">
            <p class="supporters__raised">
                <strong>{{ money(raised) }}</strong>
                <span v-if="target">{{ t('campaign.sponsorship.ofTarget', {target: money(target)}) }}</span>
            </p>
            <div v-if="percent !== null" class="supporters__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="Math.round(percent)">
                <span :style="{inlineSize: `${percent}%`}"></span>
            </div>
            <p class="supporters__meta">
                <span v-if="toGo">{{ t('campaign.sponsorship.toGo', {amount: money(toGo)}) }}</span>
                <span v-else-if="target">{{ t('campaign.sponsorship.reached') }}</span>
                <span v-if="fundraising.giftAid">{{ t('campaign.sponsorship.giftAid', {amount: money(fundraising.giftAid)}) }}</span>
            </p>
        </div>

        <ol v-if="supporters.length" class="supporters__list">
            <li v-for="(supporter, i) in supporters" :key="i" class="supporter">
                <span class="supporter__avatar" :class="`is-${hue(supporter.name)}`" aria-hidden="true">{{ initialOf(supporter.name) }}</span>
                <div class="supporter__text">
                    <p class="supporter__name">{{ supporter.name }}</p>
                    <p v-if="supporter.message" class="supporter__message">{{ supporter.message }}</p>
                    <p v-if="typeof supporter.daysAgo === 'number'" class="supporter__when">{{ when(supporter.daysAgo) }}</p>
                </div>
                <strong class="supporter__amount">{{ money(supporter.amount) }}</strong>
            </li>
        </ol>

        <a v-if="!own && fundraising.url" :href="fundraising.url" class="campaign-button supporters__cta" target="_blank" rel="noopener">
            {{ t('campaign.finale.sponsorName', {name}) }}
        </a>
    </section>
</template>

<style scoped>
.supporters {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2.4rem 2rem;
    border-radius: var(--border-radius);
    background: color-mix(in srgb, var(--secondary) 6%, var(--card-background));

    @media (width >= 720px) {
        padding: 3.2rem;
    }
}

.supporters__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.2rem;
}

.supporters__sample {
    padding: .2rem 1rem;
    border-radius: 9999px;
    border: 1px dashed currentColor;
    font-size: 1.2rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08rem;
    opacity: .6;
}

.supporters__total {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.supporters__raised {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: .4rem 1rem;
    margin: 0;

    strong {
        font-family: var(--font-display);
        font-size: 4rem;
        line-height: 1;
        color: var(--secondary);
    }

    span {
        font-size: 1.7rem;
        opacity: .8;
    }
}

.supporters__bar {
    block-size: 1.4rem;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--secondary) 15%, var(--card-background));
    overflow: hidden;

    span {
        display: block;
        block-size: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--secondary), color-mix(in srgb, var(--secondary) 60%, var(--primary)));
        transition: inline-size .8s ease;
    }
}

.supporters__meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: .4rem 1.6rem;
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
}

.supporters__list {
    display: grid;
    gap: 1.2rem;
    margin: 0;
    padding: 0;
    list-style: none;

    @media (width >= 900px) {
        grid-template-columns: repeat(2, 1fr);
    }
}

.supporter {
    display: flex;
    gap: 1.2rem;
    align-items: flex-start;
    padding: 1.4rem 1.6rem;
    border-radius: var(--border-radius-inner);
    background: var(--card-background);
    box-shadow: 0 1px 2px rgba(0, 0, 0, .05);
}

.supporter__avatar {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 4rem;
    block-size: 4rem;
    border-radius: 50%;
    color: #fff;
    font-weight: 700;

    &.is-0 {
        background: var(--primary);
    }

    &.is-1 {
        background: var(--secondary);
    }

    &.is-2 {
        background: color-mix(in srgb, var(--primary) 60%, var(--secondary));
    }

    &.is-3 {
        background: color-mix(in srgb, var(--primary) 70%, #000);
    }
}

.supporter__text {
    flex: 1;
    min-inline-size: 0;

    p {
        margin: 0;
    }
}

.supporter__name {
    font-weight: 700;
}

.supporter__message {
    margin-block-start: .2rem;
    font-style: italic;
    line-height: 1.4;
    overflow-wrap: anywhere;
}

.supporter__when {
    margin-block-start: .4rem;
    font-size: 1.3rem;
    opacity: .6;
}

.supporter__amount {
    flex-shrink: 0;
    color: var(--secondary);
    font-size: 1.8rem;
}

.supporters__cta {
    align-self: center;
    padding: 1.4rem 3.2rem;
    font-size: 1.7rem;
}
</style>
