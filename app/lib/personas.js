import {isCleanSolve} from '@/lib/gameConfig'

const DAY_MS = 24 * 60 * 60 * 1000
const RECENT = 20
const CLOSE_CALL = 0.15
const COMEBACK_GAP_DAYS = 14

function dayIndex(at) {
    const d = new Date(at)
    return Math.round(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY_MS)
}

const isNum = v => typeof v === 'number' && !Number.isNaN(v)
const mean = a => a.reduce((x, y) => x + y, 0) / a.length

function meanOf(completions, key) {
    const vals = completions.map(c => c[key]).filter(isNum)
    return vals.length ? mean(vals) : null
}

export function longestStreakOf(completions) {
    const days = [...new Set(completions.map(c => dayIndex(c.at)))].sort((a, b) => a - b)
    let best = 0, run = 0, prev = null
    for (const day of days) {
        run = prev !== null && day - prev === 1 ? run + 1 : 1
        if (run > best) best = run
        prev = day
    }
    return best
}

export function currentStreakOf(completions, now = Date.now()) {
    const days = new Set(completions.map(c => dayIndex(c.at)))
    if (!days.size) return 0
    const today = dayIndex(now)
    let cursor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null
    if (cursor === null) return 0
    let run = 0
    while (days.has(cursor)) { run++; cursor-- }
    return run
}

function halves(vals) {
    if (vals.length < 6) return null
    const half = Math.floor(vals.length / 2)
    return {before: mean(vals.slice(0, half)), after: mean(vals.slice(-half))}
}

function fewer(recent, key, {minBefore = .5, minDrop = .4, solvedOnly = false} = {}) {
    const t = halves(recent.filter(c => !solvedOnly || c.solved !== false).map(c => c[key]).filter(isNum))
    if (!t || t.before < minBefore) return null
    const drop = 1 - t.after / t.before
    const round = n => Math.round(n * 10) / 10
    return drop >= minDrop ? {strength: Math.min(.9, .55 + drop * .35), params: {before: round(t.before), after: round(t.after)}} : null
}

const tracks = (cfg, measure) => (cfg.chart ?? []).includes(measure)

function shareOf(list, test) {
    return list.filter(test).length / list.length
}

const hourOf = c => new Date(c.at).getHours()
const SLOTS = ['Mornings', 'Afternoons', 'Evenings', 'Nights']
const slotOf = (h) => h >= 5 && h < 12 ? 'Mornings' : h >= 12 && h < 17 ? 'Afternoons' : h >= 17 && h < 22 ? 'Evenings' : 'Nights'

function routineShift(recent) {
    if (recent.length < 8) return null
    const half = Math.floor(recent.length / 2)
    const earlier = recent.slice(0, half), later = recent.slice(-half)
    const top = SLOTS.map(slot => ({slot, share: shareOf(later, c => slotOf(hourOf(c)) === slot)})).sort((a, b) => b.share - a.share)[0]
    const before = shareOf(earlier, c => slotOf(hourOf(c)) === top.slot)
    return top.share >= .6 && before <= .3 ? top.slot : null
}

const RULES = [
    {id: 'recordBreaker', test: ({cfg, times}) => {
        if (!tracks(cfg, 'time') || times.length < 5) return null
        const latest = times.at(-1)
        const best = Math.min(...times.slice(0, -1))
        return latest < best * .95 ? {strength: .9} : null
    }},
    {id: 'improver', test: ({cfg, recentTimes}) => {
        const t = tracks(cfg, 'time') && halves(recentTimes)
        const drop = t ? 1 - t.after / t.before : 0
        return drop >= .1 ? {strength: Math.min(.85, .5 + drop), params: {percent: Math.round(drop * 100)}} : null
    }},
    {id: 'unhurried', test: ({cfg, recentTimes}) => {
        const t = tracks(cfg, 'time') && halves(recentTimes)
        return t && t.after / t.before >= 1.2 ? {strength: .5} : null
    }},
    {id: 'fewerReveals', test: ({cfg, recent}) => tracks(cfg, 'reveals') ? fewer(recent, 'cellsRevealed') : null},
    {id: 'fewerChecks', test: ({cfg, recent}) => tracks(cfg, 'checks') ? fewer(recent, 'checksUsed') : null},
    {id: 'fewerHints', test: ({cfg, recent}) => tracks(cfg, 'hints') ? fewer(recent, 'hintsShown') : null},
    {id: 'fewerMistakes', test: ({cfg, recent}) => tracks(cfg, 'mistakes') ? fewer(recent, 'wrongAnswers') : null},
    {id: 'fewerGuesses', test: ({cfg, recent}) => tracks(cfg, 'guesses') ? fewer(recent, 'guesses', {minBefore: 2, minDrop: .15, solvedOnly: true}) : null},
    {id: 'findingMore', test: ({cfg, recent}) => {
        if (!tracks(cfg, 'wordsFound')) return null
        const t = halves(recent.filter(c => isNum(c.wordsFound) && c.totalWords > 0).map(c => c.wordsFound / c.totalWords * 100))
        return t && t.after - t.before >= 15 ? {strength: .8, params: {before: Math.round(t.before), after: Math.round(t.after)}} : null
    }},
    {id: 'sharpshooter', test: ({cfg, recent}) => {
        if (cfg.clean !== 'guesses') return null
        const guesses = recent.filter(c => c.solved !== false).map(c => c.guesses).filter(isNum)
        if (guesses.length < 5) return null
        const avg = mean(guesses)
        return avg <= 3.5 ? {strength: .5 + (3.5 - avg) * .2, params: {guesses: Math.round(avg * 10) / 10}} : null
    }},
    {id: 'purist', test: ({cfg, recent}) => {
        const clean = recent.filter(c => isCleanSolve(c, cfg.clean)).length
        const rate = clean / recent.length
        return rate >= .8 ? {strength: .45 + (rate - .8) * 1.5, params: {clean, total: recent.length}} : null
    }},
    {id: 'clockwork', test: ({cfg, recentTimes}) => {
        if (!tracks(cfg, 'time') || recentTimes.length < 6) return null
        const avg = mean(recentTimes)
        const spread = Math.sqrt(mean(recentTimes.map(t => (t - avg) ** 2))) / avg
        return spread < .2 ? {strength: .5, params: {time: Math.round(avg)}} : null
    }},
    {id: 'moved', test: ({recent}) => {
        const slot = routineShift(recent)
        return slot ? {strength: .7, id: `moved${slot}`} : null
    }},
    {id: 'earlyBird', test: ({recent}) => {
        if (recent.length < 6) return null
        const share = shareOf(recent, c => hourOf(c) >= 5 && hourOf(c) < 9)
        return share >= .5 ? {strength: .4 + share * .4} : null
    }},
    {id: 'lunchBreak', test: ({recent}) => {
        if (recent.length < 6) return null
        const share = shareOf(recent, c => hourOf(c) >= 11 && hourOf(c) < 14)
        return share >= .5 ? {strength: .4 + share * .4} : null
    }},
    {id: 'eveningSolver', test: ({recent}) => {
        if (recent.length < 6) return null
        const share = shareOf(recent, c => hourOf(c) >= 17 && hourOf(c) < 22)
        return share >= .6 ? {strength: .4 + share * .35} : null
    }},
    {id: 'nightOwl', test: ({recent}) => {
        if (recent.length < 6) return null
        const share = shareOf(recent, c => hourOf(c) >= 22 || hourOf(c) < 5)
        return share >= .5 ? {strength: .4 + share * .4} : null
    }},
    {id: 'weekender', test: ({recent}) => {
        if (recent.length < 6) return null
        const share = shareOf(recent, c => [0, 6].includes(new Date(c.at).getDay()))
        return share >= .6 ? {strength: .55} : null
    }},
    {id: 'comeback', test: ({sorted, now}) => {
        if (sorted.length < 2) return null
        const last = dayIndex(sorted.at(-1).at)
        const prev = dayIndex(sorted.at(-2).at)
        return last - prev >= COMEBACK_GAP_DAYS && dayIndex(now) - last <= 3 ? {strength: .6} : null
    }},
    {id: 'hintHunter', test: ({recent}) =>
        (meanOf(recent, 'checksUsed') ?? 0) + (meanOf(recent, 'cellsRevealed') ?? 0) >= 3 ? {strength: .5} : null},
    {id: 'veteran', test: ({completed}) =>
        completed >= 50 ? {strength: .4 + Math.min(.1, completed / 2000), params: {count: completed}} : null},
    {id: 'allRounder', test: () => ({strength: 0})},
]

export function personaFor(completions, cfg, {only = null, rotate = true, now = Date.now()} = {}) {
    const completed = completions.length
    if (!completed) return null
    if (completed < 3) return {id: 'newcomer', params: {}}
    const sorted = [...completions].sort((a, b) => new Date(a.at) - new Date(b.at))
    const recent = sorted.slice(-RECENT)
    const ctx = {
        cfg, now, completed, completions, sorted, recent,
        times: sorted.map(c => c.timeSec).filter(isNum),
        recentTimes: recent.map(c => c.timeSec).filter(isNum),
    }
    const excluded = cfg.excludePersonas ?? []
    const scored = RULES
        .filter(r => !excluded.includes(r.id) && (!only || only.includes(r.id)))
        .map(r => ({id: r.id, ...r.test(ctx)}))
        .filter(r => typeof r.strength === 'number')
        .sort((a, b) => b.strength - a.strength)
    if (!scored.length) return null
    const close = rotate ? scored.filter(r => r.strength > 0 && scored[0].strength - r.strength <= CLOSE_CALL) : []
    const pick = close.length > 1 ? close[dayIndex(now) % close.length] : scored[0]
    return {id: pick.id, params: pick.params ?? {}}
}
