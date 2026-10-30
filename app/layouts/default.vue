<script setup>
import FooterGlobal from '@/components/site/FooterGlobal.vue'
import HeaderGlobal from '@/components/site/HeaderGlobal.vue'

const gate = useLoginGate()
const debugTaste = useDebugTaste()
const features = useFeatures()
useDayRefresh()

onMounted(() => {
    if (features.changelog) checkChangelog()
    maybeOfferStreakFreeze()
})
</script>

<template>
    <div id="app">
      <HeaderGlobal />
      <main>
        <slot v-if="!gate.blocked" />
        <LockedNotice v-else />
      </main>
      <FooterGlobal />
      <LoginGateBanner />
      <LoginModal />
      <RegisterModal />
      <ToastHost />
      <DayRefreshOverlay />
      <ModalNotificationsPrompt />
      <ModalInstallPrompt />
      <ModalStreakIncrease />
      <ModalProfileReveal />
      <TasteDebugPanel v-if="debugTaste.active.value" />
      <ModalStreakFreeze />
      <ModalStreakSaved />
      <StreakSaveBar />
      <ModalChangelog v-if="features.changelog" />
      <OnboardingModal />
      <GuideTour />
      <VersionUpdateBanner />
    </div>
</template>
