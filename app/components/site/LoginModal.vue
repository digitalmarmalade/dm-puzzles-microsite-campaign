<script setup>

const gate = useLoginGate()
const modals = useModalStore()
const {t} = useI18n()

const MODAL_ID = 'login-modal'

const reasonText = computed(() =>
    gate.reason ? t(gate.reason.key, gate.reason.params || {}) : t('auth.loginPrompt'))

watch(() => gate.modalOpen, (open) => {
    if (open) modals.open(MODAL_ID)
    else modals.close(MODAL_ID)
}, {immediate: true})

watch(() => modals.isOpen(MODAL_ID), (open) => {
    if (!open && gate.modalOpen) gate.closeModal()
})

function onSuccess() {
    gate.reset()
}

function switchToRegister() {
    gate.closeModal()
    modals.open('register-modal')
}
</script>

<template>
    <Modal :id="MODAL_ID" narrow-content>
        <template #title>{{ reasonText }}</template>

        <template v-if="gate.modalOpen">
            <LoginForm @success="onSuccess" />
            <button type="button" class="login-modal__register" @click="switchToRegister">
                {{ $t('account.noAccount') }}
            </button>
        </template>

        <template #footer><span></span></template>
    </Modal>
</template>

<style scoped>
.login-modal__register {
    display: inline-block;
    margin-block-start: 1rem;
    font-size: 1.4rem;
    color: var(--text-colour-secondary);
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
}
</style>
