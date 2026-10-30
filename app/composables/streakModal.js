const MODAL_ID = 'modal-streak-increase'

export function useStreakModalState() {
    return useState('streakModal:state', () => null)
}

export function showStreakModal(type, prev, next) {
    if (!import.meta.client) return Promise.resolve()
    return new Promise(resolve => {
        useStreakModalState().value = {type, prev, next, resolve}
        useModalStore().open(MODAL_ID)
    })
}

export function closeStreakModal() {
    const state = useStreakModalState()
    const s = state.value
    state.value = null
    useModalStore().close(MODAL_ID)
    if (s?.resolve) s.resolve()
}

export {MODAL_ID as STREAK_MODAL_ID}
