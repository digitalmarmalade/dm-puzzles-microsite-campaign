import {dateHelpers} from '@/lib/challenges'
import {gameConfig, isCleanSolve} from '@/lib/gameConfig'
import {isGlobalCleanSolve, longestRun, monthKey} from '@/lib/lifetime'
import {resultPct} from '@/lib/wordStats'

export function previousMonthKey(key) {
    const [y, m] = key.split('-').map(Number)
    return monthKey(new Date(y, m - 2, 1))
}

export function periodSummary(lifetime, completions, matchMonth) {
    const byVariant = {}
    const days = new Set()
    let puzzles = 0
    let clean = 0
    for (const [key, b] of Object.entries(lifetime?.months ?? {})) {
        if (!matchMonth(key)) continue
        puzzles += b.total ?? 0
        clean += b.clean ?? 0
        for (const [v, n] of Object.entries(b.byVariant ?? {})) byVariant[v] = (byVariant[v] ?? 0) + n
        for (const d of b.days ?? []) days.add(d)
    }
    for (const c of completions) {
        if (!matchMonth(monthKey(c.at))) continue
        puzzles += 1
        if (isGlobalCleanSolve(c)) clean += 1
        byVariant[c.variant] = (byVariant[c.variant] ?? 0) + 1
        days.add(dateHelpers.dayKey(c.at))
    }
    const topEntry = Object.entries(byVariant).sort((a, b) => b[1] - a[1])[0]
    return {
        puzzles,
        clean,
        days: days.size,
        longestRun: longestRun(days),
        dayKeys: [...days].sort(),
        byVariant,
        top: topEntry ? {variant: topEntry[0], count: topEntry[1]} : null,
    }
}

export function monthSummary(lifetime, completions, key) {
    return periodSummary(lifetime, completions, (k) => k === key)
}

export function monthlyCounts(lifetime, completions) {
    const counts = {}
    for (const [key, b] of Object.entries(lifetime?.months ?? {})) counts[key] = (counts[key] ?? 0) + (b.total ?? 0)
    for (const c of completions) {
        const key = monthKey(c.at)
        counts[key] = (counts[key] ?? 0) + 1
    }
    return counts
}

const SHIFT_MIN = 2
const SHIFT_BASE = 3
const HELP_MIN = 5
const HELP_SHIFT = 10
const IMPROVE_MIN = 3
const IMPROVE_GAIN = 0.1
const IMPROVE_SECONDS = 10

const avg = (list) => list.reduce((n, v) => n + v, 0) / list.length

function helpRate(list) {
    const known = list.filter(c => typeof c.cellsRevealed === 'number' && gameConfig(c.variant).clean !== 'guesses')
    if (known.length < HELP_MIN) return null
    return Math.round(known.filter(c => isCleanSolve(c, gameConfig(c.variant).clean)).length / known.length * 100)
}

function helpShift(current, previous) {
    const now = helpRate(current)
    const before = helpRate(previous)
    if (now === null || before === null || Math.abs(now - before) < HELP_SHIFT) return null
    return now > before
        ? {direction: 'less', pct: now, prev: before}
        : {direction: 'more', pct: 100 - now, prev: 100 - before}
}

function improvementFor(variant, current, previous) {
    const measures = gameConfig(variant).chart
    const byTime = measures.includes('time')
    const value = byTime
        ? (c) => (typeof c.timeSec === 'number' && c.timeSec > 0 ? c.timeSec : null)
        : resultPct
    const series = (list) => list.filter(c => c.variant === variant).map(value).filter(v => v !== null)
    const now = series(current)
    const before = series(previous)
    let from, to, source
    if (now.length >= IMPROVE_MIN && before.length >= IMPROVE_MIN) {
        from = avg(before)
        to = avg(now)
        source = 'month'
    } else if (now.length >= IMPROVE_MIN * 2) {
        from = avg(now.slice(0, IMPROVE_MIN))
        to = avg(now.slice(-IMPROVE_MIN))
        source = 'within'
    } else {
        return null
    }
    const gain = byTime ? (from - to) / from : (to - from) / Math.max(from, 1)
    if (gain < IMPROVE_GAIN || (byTime && from - to < IMPROVE_SECONDS)) return null
    return {variant, metric: byTime ? 'time' : 'words', before: Math.round(from), now: Math.round(to), source, gain}
}

export function challengeTotals(log, matchMonth) {
    let total = 0
    for (const entry of log ?? []) {
        const [, day] = entry.split(':')
        if (day && matchMonth(day.slice(0, 7))) total++
    }
    return {total}
}

export function wrappedFor(lifetime, completions, key) {
    const month = monthSummary(lifetime, completions, key)
    const previous = monthSummary(lifetime, completions, previousMonthKey(key))
    const seconds = completions
        .filter(c => monthKey(c.at) === key && typeof c.timeSec === 'number' && c.timeSec > 0)
        .reduce((n, c) => n + c.timeSec, 0)
    const variants = [...new Set([...Object.keys(month.byVariant), ...Object.keys(previous.byVariant)])]
    const shifts = variants.map(variant => {
        const count = month.byVariant[variant] ?? 0
        const prev = previous.byVariant[variant] ?? 0
        return {variant, count, prev, delta: count - prev}
    })
    const pick = (list) => list.find(s => s.variant !== month.top?.variant) ?? list[0] ?? null
    const rising = previous.puzzles
        ? pick(shifts.filter(s => s.delta >= SHIFT_MIN && s.count >= SHIFT_BASE).sort((a, b) => b.delta - a.delta))
        : null
    const falling = pick(shifts.filter(s => s.delta <= -SHIFT_MIN && s.prev >= SHIFT_BASE).sort((a, b) => a.delta - b.delta))
    const byTime = (list) => [...list].sort((a, b) => new Date(a.at) - new Date(b.at))
    const current = byTime(completions.filter(c => monthKey(c.at) === key))
    const prior = byTime(completions.filter(c => monthKey(c.at) === previousMonthKey(key)))
    const improved = Object.keys(month.byVariant)
        .map(variant => improvementFor(variant, current, prior))
        .filter(Boolean)
        .sort((a, b) => b.gain - a.gain)[0] ?? null
    return {
        key,
        previousKey: previousMonthKey(key),
        puzzles: month.puzzles,
        days: month.dayKeys.map(d => Number(d.slice(8))),
        minutes: Math.round(seconds / 60),
        top: month.top,
        rising,
        falling,
        improved,
        help: helpShift(current, prior),
    }
}
