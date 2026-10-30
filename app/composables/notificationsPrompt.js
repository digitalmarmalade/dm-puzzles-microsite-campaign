const MODAL_ID = 'modal-notifications-prompt'
const SESSION_KEY = 'sp-notifications-prompt-shown'

export function maybeShowNotificationsPrompt() {
    if (!import.meta.client) return
    if (!('Notification' in window)) return
    if (window.Notification.permission !== 'default') return

    const preferences = usePreferencesStore()
    if (preferences.notifications) return
    if (preferences.notificationsSoftDismissed) return

    try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') return
        sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
        //  private mode / disabled storage — fall through and show once
    }

    useModalStore().open(MODAL_ID)
}

export {MODAL_ID as NOTIFICATIONS_PROMPT_MODAL_ID}
