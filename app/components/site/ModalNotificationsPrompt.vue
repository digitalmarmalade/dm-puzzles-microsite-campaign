<script setup>
const modals = useModalStore()
const preferences = usePreferencesStore()
const notif = useNotificationPermission()

const previewMode = import.meta.client
    && new URLSearchParams(window.location.search).get('showNotificationsPrompt') === '1'

if (import.meta.client) {
    window.__showNotifPrompt = () => modals.open('modal-notifications-prompt')
    window.__hideNotifPrompt = () => modals.close('modal-notifications-prompt')
}

onMounted(() => {
    if (previewMode) modals.open('modal-notifications-prompt')
})

async function enable() {
    if (previewMode) return
    modals.close('modal-notifications-prompt')
    const result = await notif.request()
    preferences.set('notifications', result === 'granted')
}

function dismiss() {
    if (previewMode) return
    preferences.set('notificationsSoftDismissed', true)
    modals.close('modal-notifications-prompt')
}
</script>

<template>
    <Modal id="modal-notifications-prompt" size="sm" :hide-title="true" :title="$t('notificationsPrompt.title')">
        <div class="notif-prompt">
            <div class="notif-prompt__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                    <path d="M10 21a2 2 0 0 0 4 0"/>
                </svg>
            </div>
            <h2>{{ $t('notificationsPrompt.title') }}</h2>
            <p class="notif-prompt__body">{{ $t('notificationsPrompt.body') }}</p>
        </div>

        <template #footer>
            <div class="notification-options">
                <Button icon="right-arrow" @click.prevent="enable">
                    <template #text>
                        <span>{{ $t('notificationsPrompt.enable') }}</span>
                    </template>
                </Button>
                <TextButton colour="primary" @click.prevent="dismiss">
                    <template #text>
                        <span>{{ $t('notificationsPrompt.notNow') }}</span>
                    </template>
                </TextButton>
            </div>
        </template>
    </Modal>
</template>

<style scoped>
    .notif-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.6rem;
        text-align: center;
    }
    .notif-prompt__icon {
        inline-size: 6.4rem;
        block-size: 6.4rem;
        border-radius: 50%;
        background: color-mix(in srgb, var(--primary, #900) 12%, transparent);
        color: var(--primary, #900);
        display: grid;
        place-items: center;
    }
    .notif-prompt__icon svg {
        inline-size: 3.6rem;
        block-size: 3.6rem;
    }
    .notif-prompt__body {
        margin: 0;
        font-size: 1.6rem;
        line-height: 1.5;
        text-wrap: balance;
    }

    .notification-options {
         display: flex;
         flex-direction: column;
         gap: 1.5rem;
         align-items: center;
    }
</style>
