<script setup>
import {milestones} from '@/lib/campaign/achievements'

const props = defineProps({
    progress: {type: Object, required: true},
})

const {t} = useI18n()
const items = computed(() => milestones(props.progress))
</script>

<template>
    <section class="milestones">
        <h2 class="campaign-heading">{{ t('campaign.milestones.title') }}</h2>
        <ul class="milestones__list">
            <li v-for="m in items" :key="m.id" class="milestone" :class="{'is-reached': m.reached}">
                <span class="milestone__badge" aria-hidden="true">
                    <CampaignMilestoneIcon :id="m.id" />
                </span>
                <span class="milestone__name">{{ t(`campaign.milestones.${m.id}.name`, {n: m.target}) }}</span>
                <span class="milestone__state">
                    {{ m.reached ? t('campaign.milestones.unlocked') : t('campaign.milestones.progress', {count: m.count, target: m.target}) }}
                </span>
            </li>
        </ul>
    </section>
</template>

<style scoped>
.milestones {
    display: flex;
    flex-direction: column;
    gap: 1.6rem;
}

.milestones__list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 1.2rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.milestone {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .6rem;
    padding: 1.6rem 1rem;
    border-radius: var(--border-radius-inner);
    border: 1px dashed var(--card-border);
    text-align: center;
    opacity: .65;

    &.is-reached {
        border-style: solid;
        border-color: color-mix(in srgb, var(--primary) 30%, var(--card-border));
        background: color-mix(in srgb, var(--primary) 5%, var(--card-background));
        color: var(--text-colour);
        opacity: 1;
    }
}

.milestone__badge {
    display: grid;
    place-items: center;
    inline-size: 6.4rem;
    block-size: 6.4rem;
    border-radius: 50%;
    border: .2rem dashed color-mix(in srgb, var(--text-colour) 25%, transparent);
    color: color-mix(in srgb, var(--text-colour) 40%, transparent);

    .is-reached & {
        border: 0;
        background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--secondary)));
        color: var(--text-on-primary);
        box-shadow: 0 6px 16px rgba(var(--primary-rgb), .3);
    }
}

.milestone__name {
    font-weight: 700;
    line-height: 1.2;
}

.milestone__state {
    font-size: 1.3rem;
    opacity: .75;
}
</style>
