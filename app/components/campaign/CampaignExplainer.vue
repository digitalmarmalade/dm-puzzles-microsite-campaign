<script setup>
import {profileSettings} from '@/lib/campaign/profile'

const props = defineProps({
    campaign: {type: Object, required: true},
    showTitle: {type: Boolean, default: true},
})

const {t, locale} = useI18n()
const text = useCampaignText(props.campaign)
const days = props.campaign.schedule.days

const steps = computed(() => {
    const own = props.campaign.text?.[locale.value]?.steps ?? props.campaign.text?.en?.steps
    if (Array.isArray(own) && own.length) return own
    const keys = [
        props.campaign.account === 'required' ? 'signUp' : 'start',
        'play',
        profileSettings(props.campaign).publicPage ? 'share' : null,
        'finish',
    ].filter(Boolean)
    return keys.map(key => ({title: t(`campaign.explainer.steps.${key}.title`), body: t(`campaign.explainer.steps.${key}.body`, {days})}))
})
</script>

<template>
    <div class="explainer">
        <h1 v-if="showTitle" class="explainer__tagline">{{ text('tagline') || text('title') }}</h1>
        <p v-if="text('summary')" class="explainer__summary">{{ text('summary') }}</p>

        <section class="explainer__section">
            <h2 class="campaign-heading">{{ t('campaign.explainer.howItWorks') }}</h2>
            <CampaignInfoList :items="steps" numbered />
        </section>
    </div>
</template>

<style scoped>
.explainer {
    display: flex;
    flex-direction: column;
    gap: 3.2rem;
    padding-block: 3.6rem 4.8rem;

    @media (width >= 720px) {
        padding-block-end: 6.4rem;
    }
}

.explainer__tagline {
    margin: 0;
    font-family: var(--font-display);
    font-size: 4rem;
    line-height: 1.05;
    text-wrap: balance;

    @media (width >= 720px) {
        font-size: 5.6rem;
    }
}

.explainer__summary {
    margin: 0;
    padding-inline: 2rem;
    font-size: 2rem;
    line-height: 1.45;
    text-wrap: pretty;

    @media (width >= 720px) {
        padding-inline: 3.2rem;
        font-size: 2.4rem;
    }

    @media (width >= 960px) {
        padding-inline: 0;
    }
}

.explainer__section {
    display: flex;
    flex-direction: column;
    gap: 2.4rem;
    padding: 2.4rem 2rem;
    border: 1px solid rgba(0, 0, 0, .07);
    border-radius: var(--border-radius);
    background: rgba(0, 0, 0, .02);

    @media (width >= 720px) {
        padding: 3.2rem;
    }
}
</style>
