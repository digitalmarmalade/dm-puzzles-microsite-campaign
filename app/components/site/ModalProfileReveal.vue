<script setup>
const {t} = useI18n()
const state = useProfileRevealState()
const modals = useModalStore()
const localePath = useLocalePath()

function openStats() {
    closeProfileReveal()
    navigateTo(localePath('/stats'))
}

watch(() => modals.isOpen(PROFILE_REVEAL_MODAL_ID), (open) => {
    if (!open && state.value) closeProfileReveal()
})
</script>

<template>
    <Modal :id="PROFILE_REVEAL_MODAL_ID" size="sm" :hide-title="true" :fullscreen-mobile="true" classes-modal="sp-modal sp-modal--center-mobile" :title="t('profileAnnounce.changed')">
        <div v-if="state" class="profile-reveal">
            <p class="profile-reveal__kicker">{{ t('profileAnnounce.changed') }}</p>
            <div class="puzzle-icon-holder profile-reveal__icon" aria-hidden="true">
                <div class="puzzle-icon">
                    <img class="profile-reveal__img" :src="`/img/profiles/${state.id}.svg`" alt="">
                </div>
            </div>
            <h2 class="profile-reveal__title">{{ state.title }}</h2>
            <p class="profile-reveal__body">{{ state.subtitle }}</p>
        </div>
        <template #footer>
            <ButtonGroup>
                <Button icon="right-arrow" @click.prevent="openStats">
                    <template #text>
                        <span>{{ t('profileAnnounce.cta') }}</span>
                    </template>
                </Button>
            </ButtonGroup>
        </template>
    </Modal>
</template>

<style scoped>
.profile-reveal {
    --card-icon-size: 9rem;
    --card-svg-size: 5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
    text-align: center;
}

.profile-reveal__kicker {
    margin: 0;
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: .05rem;
    color: var(--text-colour-secondary, #777);
}

.profile-reveal__icon {
    margin-block: .8rem;
    background: transparent;
    animation: profile-reveal-pop .5s cubic-bezier(.34, 1.56, .64, 1) both;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
}

.profile-reveal__img {
    display: block;
    inline-size: var(--card-svg-size);
    block-size: var(--card-svg-size);
    object-fit: contain;
}

.profile-reveal__title {
    margin: 0;
    font-size: 2.6rem;
}

.profile-reveal__body {
    margin: 0;
    font-size: 1.6rem;
    text-wrap: balance;
}

@keyframes profile-reveal-pop {
    from { transform: scale(.6); opacity: 0; }
    to   { transform: scale(1);  opacity: 1; }
}
</style>
