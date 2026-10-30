const MODAL_ID = 'modal-streak-saved'

export function useStreakSavedState() {
    return useState('streakSaved:state', () => null)
}

export function showStreakSaved(streak) {
    if (!import.meta.client) return Promise.resolve()
    return new Promise(resolve => {
        useStreakSavedState().value = {streak, resolve}
        useModalStore().open(MODAL_ID)
    })
}

export function closeStreakSaved() {
    const state = useStreakSavedState()
    const s = state.value
    state.value = null
    useModalStore().close(MODAL_ID)
    if (s?.resolve) s.resolve()
}

export {MODAL_ID as STREAK_SAVED_MODAL_ID}
