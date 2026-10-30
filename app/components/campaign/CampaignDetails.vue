<script setup>
import {addDays} from '@/lib/campaign/dates'

const props = defineProps({
    campaign: {type: Object, required: true},
})

const {t} = useI18n()
const dateLocale = useDateLocale()

const s = props.campaign.schedule
const formatDate = (iso) => new Intl.DateTimeFormat(dateLocale.value, {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(`${iso}T12:00:00Z`))

const when = computed(() => s.mode === 'rolling'
    ? t('campaign.explainer.rolling', {from: formatDate(s.startFrom), until: formatDate(s.startUntil), days: s.days})
    : t('campaign.explainer.fixed', {from: formatDate(s.start), to: formatDate(addDays(s.start, s.days - 1))}))

const catchUp = computed(() => {
    const late = s.late ?? false
    if (late === true) return t('campaign.explainer.lateAnytime')
    if (late?.days) return t('campaign.explainer.lateDays', {n: late.days})
    if (late?.until) return t('campaign.explainer.lateUntil', {date: formatDate(late.until)})
    return t('campaign.explainer.lateNever')
})

const facts = computed(() => [
    {icon: 'when', title: t('campaign.explainer.labels.when'), body: when.value},
    {icon: 'catchUp', title: t('campaign.explainer.labels.catchUp'), body: catchUp.value},
    {icon: 'joining', title: t('campaign.explainer.labels.joining'), body: t(props.campaign.account === 'required' ? 'campaign.explainer.accountRequired' : 'campaign.explainer.accountOptional')},
])

const tracks = computed(() => props.campaign.tracks.map(track => ({icon: 'track', title: track.headline || track.name, body: track.description})))
</script>

<template>
    <div class="details">
        <section class="details__card">
            <h2 class="campaign-heading">{{ t('campaign.explainer.details') }}</h2>
            <CampaignInfoList :items="facts" />
        </section>

        <section v-if="campaign.tracks.length > 1" class="details__card">
            <h2 class="campaign-heading">{{ t('campaign.explainer.tracks', {n: campaign.tracks.length}) }}</h2>
            <CampaignInfoList :items="tracks" />
        </section>
    </div>
</template>

<style scoped>
.details {
    position: relative;
    isolation: isolate;
    display: grid;
    gap: 1.6rem;
    padding-block: 4rem;

    @media (width >= 720px) {
        grid-template-columns: repeat(auto-fit, minmax(32rem, 1fr));
        gap: 2.4rem;
        padding-block: 5.6rem;
    }

    &::before {
        content: '';
        position: absolute;
        z-index: -1;
        inset-block: 0;
        inset-inline: -100vw;
        background: color-mix(in srgb, var(--primary) 7%, var(--app-bg));
    }
}

.details__card {
    display: flex;
    flex-direction: column;
    gap: 2.4rem;
    padding: 2.4rem 2rem;
    border-radius: var(--border-radius);
    background: var(--card-background);

    @media (width >= 720px) {
        padding: 3.2rem;
    }
}
</style>
