import {timeOfDay} from '@/lib/tasteModel'
import {assistAmount} from '@/lib/assists'

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 30
const MIN_PLAYS = 2
const MIN_SLOT_SHARE = 0.5

const branchName = (family, branch) => family.isFamily && branch?.label ? `${family.name} ${branch.label}` : family.name

export function buildInsights({families, completions, resolveBranch, model, assistsByTag = {}, assistRule, puzzleForTag, boostedCategories = [], tourPicks = [], dismissed = [], now = Date.now()}) {
    const hidden = new Set(dismissed)
    const cutoff = now - WINDOW_DAYS * DAY_MS
    const plays = new Map()
    for (const c of completions) {
        if (new Date(c.at).getTime() < cutoff) continue
        const {family, branch} = resolveBranch(c)
        if (!family || !branch) continue
        if (!plays.has(branch.slug)) plays.set(branch.slug, {family, branch, total: 0, slots: {}})
        const entry = plays.get(branch.slug)
        entry.total += 1
        const slot = timeOfDay(c.at)
        entry.slots[slot] = (entry.slots[slot] ?? 0) + 1
    }
    const played = [...plays.values()].sort((a, b) => b.total - a.total)

    const likes = played
        .filter(p => p.total >= MIN_PLAYS)
        .map(p => ({id: `likes:${p.branch.slug}`, key: 'likes', params: {name: branchName(p.family, p.branch), count: p.total}}))

    const time = played.flatMap((p) => {
        if (hidden.has(`likes:${p.branch.slug}`)) return []
        const [slot, n] = Object.entries(p.slots).sort((a, b) => b[1] - a[1])[0]
        return n >= MIN_PLAYS && n / p.total >= MIN_SLOT_SHARE
            ? [{id: `time:${p.branch.slug}`, key: 'time', slot, params: {name: branchName(p.family, p.branch)}}]
            : []
    })

    const difficulty = families.flatMap((family) => {
        const reason = model.leans.get(family.slug)
        if (!reason?.lean || family.branches.length < 2) return []
        const why = reason.source === 'rating' ? 'rating' : reason.detail
        return [{id: `lean:${family.slug}`, key: `lean.${reason.lean}.${why}`, params: {name: family.name}}]
    })

    const help = Object.entries(assistsByTag).flatMap(([tag, level]) => {
        const puzzle = puzzleForTag(tag)
        const rule = assistRule(puzzle?.type)
        const value = level?.[rule?.key]
        if (!rule || typeof value !== 'number' || value <= rule.min) return []
        return [{id: `assists:${tag}`, key: `assists.${puzzle.type}`, params: {name: puzzle.variant, level: assistAmount(puzzle.type, value)}}]
    })

    const told = [
        ...boostedCategories.map(c => ({id: `boosted:${c}`, key: `boosted.${c}`, params: {}})),
        ...(tourPicks.length ? [{id: 'tour', key: 'tour', params: {}, picks: tourPicks}] : []),
    ]

    const visible = (items) => items.filter(i => !hidden.has(i.id))
    return [
        {group: 'likes', items: visible(likes)},
        {group: 'time', items: visible(time)},
        {group: 'difficulty', items: visible(difficulty)},
        {group: 'help', items: help},
        {group: 'told', items: told},
    ].filter(g => g.items.length)
}
