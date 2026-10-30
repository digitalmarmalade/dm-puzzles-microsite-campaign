<script setup>
const modals = useModalStore()
const gate = useLoginGate()

const MODAL_ID = 'register-modal'

function onSuccess() {
    modals.close(MODAL_ID)
    gate.reset()
}

function switchToLogin() {
    modals.close(MODAL_ID)
    gate.open()
}
</script>

<template>
    <Modal :id="MODAL_ID" narrow-content>
        <template #title>{{ $t('account.createTitle') }}</template>

        <template v-if="modals.isOpen(MODAL_ID)">
            <RegisterForm @success="onSuccess" />
            <button type="button" class="register-modal__login" @click="switchToLogin">
                {{ $t('account.haveAccount') }}
            </button>
        </template>

        <template #footer><span></span></template>
    </Modal>
</template>

<style scoped>
.register-modal__login {
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
