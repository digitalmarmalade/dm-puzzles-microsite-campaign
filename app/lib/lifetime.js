import {dateHelpers} from '@/lib/challenges'
import {gameConfig, isCleanSolve} from '@/lib/gameConfig'

export function monthKey(at) {
    const d = new Date(at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function isGlobalCleanSolve(c) {
    return typeof c.checksUsed === 'number' && c.checksUsed === 0 &&
        typeof c.cellsRevealed === 'number' && c.cellsRevealed === 0 &&
        (c.hintsShown ?? 0) === 0
}

const emptyBucket = () => ({total: 0, clean: 0, byVariant: {}, cleanByVariant: {}, days: []})

export function foldIntoLifetime(lifetime, completions) {
    const months = {...(lifetime?.months ?? {})}
    for (const c of completions) {
        const key = monthKey(c.at)
        const b = {...emptyBucket(), ...months[key]}
        const typeClean = isCleanSolve(c, gameConfig(c.variant).clean)
        months[key] = {
            total: b.total + 1,
            clean: b.clean + (isGlobalCleanSolve(c) ? 1 : 0),
            byVariant: {...b.byVariant, [c.variant]: (b.byVariant[c.variant] ?? 0) + 1},
            cleanByVariant: typeClean
                ? {...b.cleanByVariant, [c.variant]: (b.cleanByVariant[c.variant] ?? 0) + 1}
                : b.cleanByVariant,
            days: [...new Set([...b.days, dateHelpers.dayKey(c.at)])].sort(),
        }
    }
    return {months}
}

function maxCounts(a = {}, b = {}) {
    const out = {...a}
    for (const [k, n] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, n)
    return out
}

export function mergeLifetime(a, b) {
    const months = {...(a?.months ?? {})}
    for (const [key, theirs] of Object.entries(b?.months ?? {})) {
        const mine = months[key]
        if (!mine) {
            months[key] = theirs
            continue
        }
        months[key] = {
            total: Math.max(mine.total ?? 0, theirs.total ?? 0),
            clean: Math.max(mine.clean ?? 0, theirs.clean ?? 0),
            byVariant: maxCounts(mine.byVariant, theirs.byVariant),
            cleanByVariant: maxCounts(mine.cleanByVariant, theirs.cleanByVariant),
            days: [...new Set([...(mine.days ?? []), ...(theirs.days ?? [])])].sort(),
        }
    }
    return {months}
}

export function lifetimeTotals(lifetime, completions = []) {
    const totals = {total: 0, clean: 0, byVariant: {}, cleanByVariant: {}, days: new Set()}
    const add = (map, k, n) => { map[k] = (map[k] ?? 0) + n }
    for (const b of Object.values(lifetime?.months ?? {})) {
        totals.total += b.total ?? 0
        totals.clean += b.clean ?? 0
        for (const [k, n] of Object.entries(b.byVariant ?? {})) add(totals.byVariant, k, n)
        for (const [k, n] of Object.entries(b.cleanByVariant ?? {})) add(totals.cleanByVariant, k, n)
        for (const d of b.days ?? []) totals.days.add(d)
    }
    for (const c of completions) {
        totals.total += 1
        if (isGlobalCleanSolve(c)) totals.clean += 1
        add(totals.byVariant, c.variant, 1)
        if (isCleanSolve(c, gameConfig(c.variant).clean)) add(totals.cleanByVariant, c.variant, 1)
        totals.days.add(dateHelpers.dayKey(c.at))
    }
    return totals
}

export function longestRun(dayKeys) {
    const days = [...dayKeys].sort()
    if (!days.length) return 0
    let longest = 1
    let current = 1
    for (let i = 1; i < days.length; i++) {
        const prev = new Date(`${days[i - 1]}T12:00:00`)
        prev.setDate(prev.getDate() + 1)
        current = dateHelpers.dayKey(prev) === days[i] ? current + 1 : 1
        longest = Math.max(longest, current)
    }
    return longest
}
