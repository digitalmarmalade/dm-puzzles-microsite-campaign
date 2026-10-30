import Archive from '@/api/Archive.js'

export function resultCounts(s) {
    if (typeof s?.score === 'number' && typeof s.maxScore === 'number' && s.maxScore > 0) {
        return {found: s.score, total: s.maxScore}
    }
    if (typeof s?.wordsFound === 'number' && typeof s.totalWords === 'number' && s.totalWords > 0) {
        return {found: s.wordsFound, total: s.totalWords}
    }
    return null
}

export function resultPct(s) {
    const counts = resultCounts(s)
    return counts ? (counts.found / counts.total) * 100 : null
}

export function variantAttempts(variant, playStatusMap) {
    return Object.entries(playStatusMap)
        .map(([slug, s]) => ({slug, puzzle: Archive.getPuzzles(slug), s}))
        .filter(({puzzle, s}) => puzzle?.variant === variant && (resultCounts(s) || typeof s.progress === 'number'))
        .map(({slug, puzzle, s}) => ({
            slug,
            at: puzzle.date,
            playedAt: s.startedAt ?? puzzle.date,
            wordsFound: resultCounts(s)?.found ?? s.progress,
            totalWords: resultCounts(s)?.total ?? 100,
            cellsRevealed: typeof s.cellsRevealed === 'number' ? s.cellsRevealed : 0,
        }))
}

export const wordPct = (a) => (a.wordsFound / a.totalWords) * 100
