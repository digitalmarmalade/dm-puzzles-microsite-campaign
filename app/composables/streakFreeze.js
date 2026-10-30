const MODAL_ID = 'modal-streak-freeze'

let checkedThisSession = false

export function useStreakFreezeState() {
    return useState('streakFreeze:state', () => null)
}

export function maybeOfferStreakFreeze() {
    if (!import.meta.client || checkedThisSession) return
    checkedThisSession = true

    const features = useFeatures()
    if (!features.streakFreeze) return
    if (features.challenges === false) return

    const challenges = useChallengesStore()

    if (challenges.freezeOfferedOn === challenges.todayKey) return

    const opportunity = challenges.evaluateFreezeOpportunity()
    if (!opportunity) return

    challenges.offerStreakFreeze(opportunity.missedDay)
    useStreakFreezeState().value = {
        missedDay: opportunity.missedDay,
        priorStreak: opportunity.priorStreak,
        target: opportunity.target,
    }
    useModalStore().open(MODAL_ID)
}

export function dismissStreakFreeze() {
    useModalStore().close(MODAL_ID)
    useStreakFreezeState().value = null
}

export {MODAL_ID as STREAK_FREEZE_MODAL_ID}
