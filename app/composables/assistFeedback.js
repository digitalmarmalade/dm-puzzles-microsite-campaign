const MODAL_ID = 'modal-assist-feedback'

export function useAssistFeedbackState() {
    return useState('assistFeedback:state', () => null)
}

export async function showAssistFeedback(details) {
    if (!import.meta.client) return false
    const modals = useModalStore()
    if (modals.openList.length) {
        await new Promise(resolve => {
            const stop = watch(() => modals.openList.length, (n) => {
                if (n) return
                stop()
                resolve()
            })
        })
    }
    return new Promise(resolve => {
        useAssistFeedbackState().value = {...details, resolve}
        modals.open(MODAL_ID)
    })
}

export function closeAssistFeedback(choice = null) {
    const state = useAssistFeedbackState()
    const s = state.value
    state.value = null
    useModalStore().close(MODAL_ID)
    if (s?.resolve) s.resolve(choice)
}

export {MODAL_ID as ASSIST_FEEDBACK_MODAL_ID}
