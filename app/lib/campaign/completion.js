//  Word games report complete when ended early, so they also need a share of the words found.
export const WORDS_COMPLETE_PERCENT = 20

function resultCounts(user) {
    if (typeof user?.score === 'number' && typeof user.maxScore === 'number' && user.maxScore > 0) {
        return {found: user.score, total: user.maxScore}
    }
    if (typeof user?.wordsFound === 'number' && typeof user.totalWords === 'number' && user.totalWords > 0) {
        return {found: user.wordsFound, total: user.totalWords}
    }
    return null
}

export function countsAsDone({status, user}) {
    if (!status?.completed) return false
    const counts = resultCounts(user)
    return !counts || (counts.found / counts.total) * 100 >= WORDS_COMPLETE_PERCENT
}

export const SOLVE_SECONDS_MAX = 7 * 24 * 3600

export function solveSeconds({status}) {
    const seconds = status?.completed?.seconds
    return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0 && seconds < SOLVE_SECONDS_MAX ? Math.round(seconds) : null
}

export function percentDone({status, user}) {
    const counts = resultCounts(user)
    const percent = counts ? (counts.found / counts.total) * 100 : status?.progress
    return typeof percent === 'number' && percent > 0 ? Math.min(99, Math.round(percent)) : null
}
