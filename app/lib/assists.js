const LETTER_PICKS = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [4, 1], [4, 2]]

const RULES = {
    crossword: {kind: 'letters', key: 'letterLevel', min: 0, max: LETTER_PICKS.length - 1, step: 1, start: 2, helpMetric: 'cellsRevealed'},
    codeword: {kind: 'letters', key: 'letterLevel', min: 0, max: LETTER_PICKS.length - 1, step: 1, start: 2, helpMetric: 'cellsRevealed'},
    sudoku: {kind: 'percent', key: 'prefillPercent', min: 0, max: 40, step: 5, start: 10, helpMetric: 'cellsRevealed'},
}

export const VOWELS = ['A', 'E', 'I', 'O', 'U']
export const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('')

const CLEAN_RUN = 3

const RATINGS = ['easy', 'justright', 'hard']

export function assistRule(type) {
    return RULES[type] ?? null
}

export function assistKind(type) {
    return assistRule(type)?.kind ?? 'percent'
}

export function letterPicks(level) {
    const [consonants, vowels] = LETTER_PICKS[Math.max(0, Math.min(LETTER_PICKS.length - 1, level ?? 0))]
    return {consonants, vowels, total: consonants + vowels}
}

export function assistAmount(type, level) {
    return assistKind(type) === 'letters' ? letterPicks(level).total : level
}

export function isValidRating(rating) {
    return RATINGS.includes(rating)
}

export function clampAssists(type, assists) {
    const rule = assistRule(type)
    const requested = assists?.[rule?.key]
    if (!rule || typeof requested !== 'number' || !Number.isFinite(requested)) return null
    return {[rule.key]: Math.min(rule.max, Math.max(rule.min, Math.round(requested)))}
}

export function nextAssists(type, current, {rating, assists} = {}) {
    const rule = assistRule(type)
    if (!rule || !isValidRating(rating)) return current ?? null
    const clamp = (v) => Math.min(rule.max, Math.max(rule.min, Math.round(v)))
    const requested = clampAssists(type, assists)
    if (requested) return requested
    const level = current?.[rule.key]
    if (typeof level !== 'number') return current ?? null
    if (rating === 'hard') return {[rule.key]: clamp(level + rule.step)}
    if (rating === 'easy') return {[rule.key]: clamp(level - rule.step)}
    return current
}

export function assistsActive(type, current) {
    const rule = assistRule(type)
    return !!rule && typeof current?.[rule.key] === 'number' && current[rule.key] > rule.min
}

export function levelOf(type, current) {
    const rule = assistRule(type)
    if (!rule) return null
    const level = current?.[rule.key]
    return typeof level === 'number' ? level : rule.min
}

export function stepAssists(type, current, direction) {
    const rule = assistRule(type)
    if (!rule) return null
    const level = levelOf(type, current)
    const next = direction === 'easier'
        ? (level <= rule.min ? rule.start : Math.min(rule.max, level + rule.step))
        : Math.max(rule.min, level - rule.step)
    return next === level ? null : {[rule.key]: next}
}

export function assistChoices(direction) {
    return direction === 'easier' ? ['same', 'more', 'alotmore'] : ['none', 'fewer', 'same']
}

export function assistOptions(type, current, direction) {
    const level = levelOf(type, current)
    const seen = new Set([level])
    return assistChoices(direction).flatMap((choice) => {
        if (choice === 'same') return [{choice, amount: assistAmount(type, level)}]
        const next = adjustAssists(type, current, choice)
        const value = next && Object.values(next)[0]
        if (!next || seen.has(value)) return []
        seen.add(value)
        return [{choice, amount: assistAmount(type, value)}]
    })
}

export function adjustAssists(type, current, choice) {
    const rule = assistRule(type)
    if (!rule) return null
    const level = levelOf(type, current)
    const next = {
        none: rule.min,
        fewer: Math.floor(level / 2 / rule.step) * rule.step,
        more: level <= rule.min ? rule.start : level + rule.step,
        alotmore: level <= rule.min ? rule.start + 2 * rule.step : level + 3 * rule.step,
    }[choice]
    if (next === undefined) return null
    const value = Math.min(rule.max, Math.max(rule.min, next))
    return value === level ? null : {[rule.key]: value}
}

export function suggestAssists(type, current, recent) {
    const rule = assistRule(type)
    const last = recent[0]
    if (!rule || !last) return null
    const run = recent.slice(0, CLEAN_RUN)
    const ownHelp = c => typeof c[rule.helpMetric] === 'number' ? c[rule.helpMetric] - (c.prefilled ?? 0) : null
    const clean = run.length === CLEAN_RUN && run.every(c => ownHelp(c) === 0 && (c.checksUsed ?? 0) === 0 && (c.hintsShown ?? 0) === 0)
    if (clean && levelOf(type, current) > rule.min) {
        const next = stepAssists(type, current, 'harder')
        return next ? {direction: 'harder', reason: 'clean', next, basedOn: last.at} : null
    }
    return null
}

export function assistShift(history, month, typeForTag) {
    const changes = Object.entries(history?.[month] ?? {}).flatMap(([tag, entry]) => {
        const type = typeForTag(tag)
        const rule = assistRule(type)
        if (!rule || !entry) return []
        const from = levelOf(type, entry.from)
        const to = levelOf(type, entry.to)
        if (from === to) return []
        const change = to === rule.min ? 'off' : from === rule.min ? 'on' : to < from ? 'fewer' : 'more'
        return [{tag, type, from: assistAmount(type, from), to: assistAmount(type, to), change}]
    })
    return changes.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))[0] ?? null
}
