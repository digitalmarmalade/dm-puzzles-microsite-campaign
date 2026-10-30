const MODAL_ID = 'modal-install-prompt'
const SESSION_KEY = 'sp-install-prompt-shown'
const SNOOZE_DAYS = 30

export function isIosBrowser() {
    if (!import.meta.client) return false
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (!ios) return false
    if (/FBAN|FBAV|Instagram|LinkedInApp|Line\/|GSA\//.test(ua)) return false
    return navigator.standalone !== true && !window.matchMedia?.('(display-mode: standalone)').matches
}

export function maybeShowInstallPrompt() {
    if (!useFeatures().installPrompt) return false
    if (!isIosBrowser()) return false

    const preferences = usePreferencesStore()
    if (preferences.installPromptNever) return false
    if (preferences.installPromptSnoozedUntil > new Date().toISOString().slice(0, 10)) return false

    try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') return false
        sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
        //
    }

    preferences.set('installPromptSnoozedUntil', new Date(Date.now() + SNOOZE_DAYS * 864e5).toISOString().slice(0, 10))
    useModalStore().open(MODAL_ID)
    return true
}

export {MODAL_ID as INSTALL_PROMPT_MODAL_ID}
