<script setup>
const gate = useLoginGate()
</script>

<template>
    <div id="app" class="layout-puzzle">
        <main>
            <slot v-if="!gate.blocked" />
            <LockedNotice v-else />
        </main>
        <LoginModal />
        <RegisterModal />
        <ToastHost />
        <ModalNotificationsPrompt />
        <ModalInstallPrompt />
        <ModalStreakIncrease />
        <ModalProfileReveal />
        <ModalStreakSaved />
        <ModalAssistFeedback />
        <GuideTour />
    </div>
</template>

<style>
html:has(.layout-puzzle),
body:has(.layout-puzzle) {
    overscroll-behavior: none;
}

body:has(.layout-puzzle) {
    --body-padding: 0;

    :is(.card.locked-notice) {
        margin: auto !important;
    }
}
</style>

