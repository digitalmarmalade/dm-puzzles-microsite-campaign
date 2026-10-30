<script setup>
import {milestones} from '@/lib/campaign/achievements'

const props = defineProps({
    progress: {type: Object, required: true},
    storageKey: {type: String, required: true},
    colours: {type: Array, default: () => ['#ffd166']},
})

const {t} = useI18n()
const shareCard = inject('shareCard', null)
const seen = ref(null)
const fire = ref(0)

const reached = computed(() => milestones(props.progress).filter(m => m.reached))
const fresh = computed(() => seen.value ? reached.value.filter(m => !seen.value.includes(m.id)).at(-1) ?? null : null)

onMounted(() => {
    try {
        seen.value = JSON.parse(localStorage.getItem(props.storageKey)) ?? []
    } catch {
        seen.value = []
    }
})

watch(fresh, (m) => {
    if (m) nextTick(() => fire.value++)
}, {immediate: true})

function dismiss() {
    seen.value = reached.value.map(m => m.id)
    try {
        localStorage.setItem(props.storageKey, JSON.stringify(seen.value))
    } catch {
        //
    }
}

function share() {
    shareCard?.open()
    dismiss()
}
</script>

<template>
    <section v-if="fresh" class="unlock" role="status">
        <div class="unlock__confetti" aria-hidden="true">
            <ConfettiBurst :fire="fire" :count="120" :colours="colours" />
        </div>
        <span class="unlock__badge" aria-hidden="true">
            <CampaignMilestoneIcon :id="fresh.id" />
        </span>
        <div class="unlock__text">
            <p class="unlock__label">{{ t('campaign.milestones.unlockedLabel') }}</p>
            <h2 class="unlock__name">{{ t(`campaign.milestones.${fresh.id}.name`, {n: fresh.target}) }}</h2>
            <p class="unlock__line">{{ t(`campaign.milestones.${fresh.id}.line`, {n: fresh.target}) }}</p>
        </div>
        <div class="unlock__actions">
            <button v-if="shareCard?.available.value" type="button" class="campaign-button" @click="share">{{ t('campaign.milestones.share') }}</button>
            <button type="button" class="campaign-button is-secondary" @click="dismiss">{{ t('campaign.milestones.nice') }}</button>
        </div>
    </section>
</template>

<style scoped>
.unlock {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.6rem 2.4rem;
    padding: 2.4rem;
    border: .2rem solid color-mix(in srgb, var(--primary) 40%, transparent);
    border-radius: var(--border-radius);
    background: color-mix(in srgb, var(--primary) 6%, var(--card-background));
    animation: unlock-in .5s cubic-bezier(.2, 1.4, .4, 1) both;

    @media (width >= 720px) {
        flex-wrap: nowrap;
        padding: 2.4rem 3.2rem;
    }

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.unlock__confetti {
    position: fixed;
    inset: 0;
    z-index: 60;
    pointer-events: none;
}

.unlock__badge {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 7.2rem;
    block-size: 7.2rem;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--secondary)));
    color: var(--text-on-primary);
    box-shadow: 0 8px 20px rgba(var(--primary-rgb), .35);
}

.unlock__text {
    flex: 1 1 20rem;
    min-inline-size: 0;

    p,
    h2 {
        margin: 0;
    }
}

.unlock__label {
    color: var(--primary);
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .12rem;
}

.unlock__name {
    font-family: var(--font-display);
    font-size: 2.6rem;
    line-height: 1.15;
}

.unlock__line {
    margin-block-start: .2rem;
    opacity: .8;
}

.unlock__actions {
    display: flex;
    flex-wrap: wrap;
    gap: .8rem;

    .campaign-button {
        padding: 1rem 2rem;
    }
}

@keyframes unlock-in {
    from {
        opacity: 0;
        transform: scale(.94);
    }
}
</style>
