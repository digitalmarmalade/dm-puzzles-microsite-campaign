const MODAL_ID = 'modal-onboarding'
const SESSION_KEY = 'sp-onboarding-shown'

export function maybeShowOnboarding() {
    if (!import.meta.client) return
    const preferences = usePreferencesStore()
    if (preferences.onboardingCompleted) return
    try {
        if (sessionStorage.getItem(SESSION_KEY) === '1') return
        sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
        //
    }
    useModalStore().open(MODAL_ID)
}

export function openOnboarding(source) {
    if (!import.meta.client) return
    if (source) trackFunnel('sp_tour_open', {source})
    useModalStore().open(MODAL_ID)
}

export function closeOnboarding() {
    if (!import.meta.client) return
    useModalStore().close(MODAL_ID)
}

export {MODAL_ID as ONBOARDING_MODAL_ID}
