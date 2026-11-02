<script setup>
const props = defineProps({
    fundraising: {type: Object, required: true},
    name: {type: String, default: ''},
})

const {t} = useI18n()
const money = useMoney(props.fundraising.currency)
const percent = computed(() => props.fundraising.target ? Math.min(100, props.fundraising.raised / props.fundraising.target * 100) : null)
</script>

<template>
    <section class="sponsor-cta">
        <div class="sponsor-cta__text">
            <h2 class="sponsor-cta__title">
                {{ fundraising.target ? t('campaign.sponsorship.helpTitle', {name, target: money(fundraising.target)}) : t('campaign.finale.sponsorName', {name}) }}
            </h2>
            <p class="sponsor-cta__line">
                {{ t('campaign.sponsorship.helpLine', {raised: money(fundraising.raised), count: fundraising.sponsors ?? 0}) }}
            </p>
            <div v-if="percent !== null" class="sponsor-cta__bar" aria-hidden="true">
                <span :style="{inlineSize: `${percent}%`}"></span>
            </div>
        </div>
        <a :href="fundraising.url" class="sponsor-cta__button" target="_blank" rel="noopener">
            {{ t('campaign.finale.sponsorName', {name}) }}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.4-9.3-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z" /></svg>
        </a>
    </section>
</template>

<style scoped>
.sponsor-cta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.6rem 3.2rem;
    padding: 2.4rem;
    border-radius: var(--border-radius);
    background: linear-gradient(120deg, color-mix(in srgb, var(--secondary) 85%, #000), var(--secondary));
    color: #fff;
    box-shadow: 0 14px 34px color-mix(in srgb, var(--secondary) 30%, transparent);

    @media (width >= 720px) {
        flex-wrap: nowrap;
        padding: 3.2rem 4rem;
    }
}

.sponsor-cta__text {
    display: flex;
    flex-direction: column;
    gap: .8rem;
    flex: 1 1 24rem;
    min-inline-size: 0;
    text-align: center;

    @media (width >= 720px) {
        text-align: start;
    }
}

.sponsor-cta__title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 2.6rem;
    line-height: 1.15;

    @media (width >= 720px) {
        font-size: 3.2rem;
    }
}

.sponsor-cta__line {
    margin: 0;
    opacity: .9;
}

.sponsor-cta__bar {
    block-size: 1rem;
    margin-block-start: .4rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, .25);
    overflow: hidden;

    span {
        display: block;
        block-size: 100%;
        border-radius: inherit;
        background: #fff;
    }
}

.sponsor-cta__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .8rem;
    margin-inline: auto;
    padding: 1.1rem 2.4rem;
    border-radius: 9999px;
    background: #fff;
    color: var(--secondary);
    font-size: 1.6rem;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 6px 16px rgba(0, 0, 0, .15);
    transition: transform .15s ease;

    svg {
        inline-size: 1.6rem;
        block-size: 1.6rem;
        fill: var(--primary);
    }

    @media (width >= 720px) {
        margin-inline: 0;
        padding: 1.4rem 2.8rem;
        font-size: 1.7rem;
    }

    @media (hover: hover) {
        &:hover {
            transform: translateY(-.2rem) scale(1.02);
        }
    }
}
</style>
