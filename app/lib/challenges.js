import {gameConfig, isCleanSolve} from '@/lib/gameConfig'

function dayKey(at) {
    const d = new Date(at)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function todayKey() { return dayKey(new Date()) }
function weekKey(at = new Date()) {
    const d = new Date(at)
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return dayKey(d)
}
function isToday(at) { return dayKey(at) === todayKey() }
function isThisWeek(at) { return weekKey(at) === weekKey() }
function lastWeekKey() {
    const thisMonday = new Date(`${weekKey()}T00:00:00`)
    thisMonday.setDate(thisMonday.getDate() - 7)
    return dayKey(thisMonday)
}
function isLastWeek(at) { return weekKey(at) === lastWeekKey() }

export const dateHelpers = {dayKey, todayKey, weekKey, lastWeekKey, isToday, isThisWeek, isLastWeek}

const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_ACTIVE = 1
export const CHOICES = 3
export const SKIP_DAYS = 3
export const EXPIRED_SHOWN_DAYS = 2
export const GROUPS = ['words', 'numbers', 'logic', 'quick']

const time = (at) => new Date(at).getTime()

function playStats(ctx) {
    const now = ctx.now ?? Date.now()
    const byBranch = new Map()
    const byFamily = new Map()
    const recentByGroup = new Map()
    const days = new Set()
    const perDay = new Map()
    let recentClean = 0
    for (const c of ctx.completions) {
        const {family, branch} = ctx.resolve(c)
        if (!family || !branch) continue
        const age = now - time(c.at)
        const s = byBranch.get(branch.slug) ?? {ever: 0, recent: 0, last: 0}
        s.ever++
        if (age <= 30 * DAY_MS) s.recent++
        s.last = Math.max(s.last, time(c.at))
        byBranch.set(branch.slug, s)
        byFamily.set(family.slug, (byFamily.get(family.slug) ?? 0) + 1)
        if (age <= 30 * DAY_MS) {
            for (const g of groupsOf(family, ctx)) recentByGroup.set(g, (recentByGroup.get(g) ?? 0) + 1)
        }
        if (age <= 14 * DAY_MS) days.add(dayKey(c.at))
        if (age <= 30 * DAY_MS) {
            perDay.set(dayKey(c.at), (perDay.get(dayKey(c.at)) ?? 0) + 1)
            if (isCleanSolve(c, gameConfig(c.variant).clean)) recentClean++
        }
    }
    return {
        byBranch, byFamily, recentByGroup, recentClean,
        recentDays: days.size,
        bestDay: Math.max(0, ...perDay.values()),
        ever: ctx.completions.length,
    }
}

function groupsOf(family, ctx) {
    const out = []
    const category = ctx.categoryOf(family)
    if (category) out.push(category)
    if (ctx.isQuick(family)) out.push('quick')
    return out
}

function playedFamilies(ctx, before = Infinity) {
    const played = new Set()
    for (const c of ctx.completions) {
        if (time(c.at) >= before) continue
        const {family} = ctx.resolve(c)
        if (family) played.add(family.slug)
    }
    for (const month of Object.values(ctx.lifetime?.months ?? {})) {
        for (const variant of Object.keys(month.byVariant ?? {})) {
            const family = ctx.familyOf(variant)
            if (family) played.add(family.slug)
        }
    }
    return played
}

const nameOf = (family, branch) => branch.variantName ?? family.name
const typeParams = (family, branch) => ({branch: branch.slug, variant: branch.variantName, name: nameOf(family, branch)})

function visibleBranches(ctx) {
    return ctx.families.flatMap(family => family.branches
        .filter(branch => ctx.visible(branch.slug))
        .map(branch => ({family, branch, score: ctx.scoreFor(branch.slug)})))
}

const topBranches = (ctx, stats, n) => visibleBranches(ctx)
    .filter(b => b.score >= 0.5 || (b.score > 0 && stats.byBranch.has(b.branch.slug)))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)

const familiesIn = (group, ctx) => ctx.families.filter(f =>
    groupsOf(f, ctx).includes(group) && f.branches.some(b => ctx.visible(b.slug)))

export const TEMPLATES = [
    {
        id: 'type-week', subject: 'type', metric: 'count', target: 5, days: 7,
        prepare: (ctx, stats) => topBranches(ctx, stats, 3).map(({family, branch, score}) => ({params: typeParams(family, branch), weight: 2 * score + 0.2})),
    },
    {
        id: 'type-day', subject: 'type', metric: 'count', target: 2, days: 1,
        prepare: (ctx, stats) => topBranches(ctx, stats, 3).map(({family, branch, score}) => ({params: typeParams(family, branch), weight: score + 0.1})),
    },
    {
        id: 'type-clean', subject: 'type', metric: 'clean', target: 2, days: 7,
        prepare: (ctx, stats) => visibleBranches(ctx)
            .filter(({branch}) => (stats.byBranch.get(branch.slug)?.recent ?? 0) >= 3)
            .map(({family, branch}) => ({params: {...typeParams(family, branch), clean: gameConfig(branch.variantName).clean}, weight: 1})),
    },
    {
        id: 'step-up', subject: 'type', metric: 'count', target: 3, days: 7,
        prepare: (ctx, stats) => ctx.families.flatMap(family => family.branches.slice(0, -1).flatMap((from, i) => {
            const to = family.branches[i + 1]
            if (!ctx.visible(to.slug)) return []
            if ((stats.byBranch.get(from.slug)?.recent ?? 0) < 3) return []
            if ((stats.byBranch.get(to.slug)?.ever ?? 0) >= 2) return []
            return [{params: typeParams(family, to), weight: 3}]
        })),
    },
    {
        id: 'revisit', subject: 'type', metric: 'count', target: 2, days: 7,
        prepare: (ctx, stats) => visibleBranches(ctx)
            .filter(({branch}) => {
                const s = stats.byBranch.get(branch.slug)
                return s && s.ever >= 3 && (ctx.now ?? Date.now()) - s.last > 21 * DAY_MS
            })
            .map(({family, branch}) => ({params: typeParams(family, branch), weight: 1})),
    },
    {
        id: 'group-week', subject: 'group', metric: 'count', target: 6, days: 7,
        prepare: (ctx, stats) => GROUPS
            .filter(group => familiesIn(group, ctx).length >= 2)
            .filter(group => (stats.recentByGroup.get(group) ?? 0) >= 3 || ctx.boosted.includes(group))
            .map(group => ({params: {group}, weight: 1 + (stats.recentByGroup.get(group) ?? 0) / 10})),
    },
    {
        id: 'group-variety', subject: 'group', metric: 'distinct', target: 3, days: 7,
        prepare: (ctx, stats) => GROUPS
            .filter(group => familiesIn(group, ctx).length >= 4)
            .filter(group => (stats.recentByGroup.get(group) ?? 0) >= 1)
            .map(group => ({params: {group}, weight: 1})),
    },
    {
        id: 'coffee', subject: 'group', metric: 'count', target: 3, days: 1,
        prepare: (ctx, stats) => familiesIn('quick', ctx).length >= 2
            ? [{params: {group: 'quick'}, weight: (stats.recentByGroup.get('quick') ?? 0) ? 1.5 : 0.5}]
            : [],
    },
    {
        id: 'streak', subject: 'any', metric: 'run', target: 5, days: 7,
        prepare: (ctx, stats) => stats.recentDays >= 3 ? [{params: {}, weight: 1.5}] : [],
    },
    {
        id: 'mix-day', subject: 'any', metric: 'distinct', target: 3, days: 1,
        prepare: (ctx, stats) => stats.byFamily.size >= 2 && ctx.families.length >= 4 ? [{params: {}, weight: 1}] : [],
    },
    {
        id: 'marathon', subject: 'any', metric: 'count', target: 5, days: 1,
        prepare: (ctx, stats) => stats.bestDay >= 3 ? [{params: {}, weight: 0.8}] : [],
    },
    {
        id: 'four-days', subject: 'any', metric: 'days', target: 4, days: 7,
        prepare: (ctx, stats) => stats.recentDays >= 2 && stats.recentDays <= 10 ? [{params: {}, weight: 1.2}] : [],
    },
    {
        id: 'spotless', subject: 'any', metric: 'clean', target: 3, days: 7,
        prepare: (ctx, stats) => stats.recentClean >= 2 ? [{params: {}, weight: 1}] : [],
    },
    {
        id: 'type-run', subject: 'type', metric: 'run', target: 3, days: 7,
        prepare: (ctx, stats) => topBranches(ctx, stats, 2)
            .filter(({branch}) => stats.byBranch.has(branch.slug))
            .map(({family, branch, score}) => ({params: typeParams(family, branch), weight: score + 0.2})),
    },
    {
        id: 'archive', subject: 'archive', metric: 'count', target: 3, days: 7,
        prepare: (ctx, stats) => stats.ever >= 5 ? [{params: {}, weight: 0.8}] : [],
    },
    {
        id: 'fav-sweep', subject: 'favs', metric: 'branches', target: 2, days: 1,
        prepare: (ctx) => {
            const favs = (ctx.favourites ?? []).filter(slug => ctx.visible(slug) && ctx.families.some(f => f.branches.some(b => b.slug === slug)))
            return favs.length >= 2 && favs.length <= 4 ? [{params: {favs, target: favs.length}, weight: 1.5}] : []
        },
    },
    {
        id: 'explore', subject: 'new', metric: 'newTypes', target: 2, days: 7,
        prepare: (ctx) => {
            const played = playedFamilies(ctx)
            const fresh = ctx.families.filter(f => !played.has(f.slug) && f.branches.some(b => ctx.visible(b.slug)))
            return fresh.length >= 2 ? [{params: {}, weight: 1}] : []
        },
    },
]

export const findTemplate = (id) => TEMPLATES.find(t => t.id === id) ?? null

const keyOf = (id, params = {}) => [id, params.branch ?? params.group].filter(Boolean).join(':')

export function challengeOptions(ctx) {
    const stats = playStats(ctx)
    return TEMPLATES.flatMap(template => template.prepare(ctx, stats).map(option => ({
        key: keyOf(template.id, option.params),
        id: template.id,
        params: option.params,
        weight: option.weight,
    })))
}

function seeded(seed) {
    let h = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
    return () => {
        h = (h * 1664525 + 1013904223) >>> 0
        return h / 2 ** 32
    }
}

export function suggestChallenges(ctx, {exclude = new Set(), seed = todayKey(), count = CHOICES} = {}) {
    const random = seeded(seed)
    let options = challengeOptions(ctx).filter(o => !exclude.has(o.key) && !exclude.has(o.id) && o.weight > 0)
    const picked = []
    while (picked.length < count && options.length) {
        const total = options.reduce((sum, o) => sum + o.weight, 0)
        let roll = random() * total
        const pick = options.find(o => (roll -= o.weight) <= 0) ?? options.at(-1)
        picked.push(pick)
        const rest = options.filter(o => o.id !== pick.id)
        options = rest.length ? rest : options.filter(o => o.key !== pick.key)
    }
    return picked
}

export function startChallenge(option, now = Date.now()) {
    const template = findTemplate(option.id)
    const end = template.days === 1
        ? new Date(now).setHours(23, 59, 59, 999)
        : now + template.days * DAY_MS
    return {key: option.key, id: option.id, params: option.params, joinedAt: new Date(now).toISOString(), endsAt: new Date(end).toISOString()}
}


export function matchesPuzzle(entry, puzzle, ctx, played = null) {
    const template = findTemplate(entry.id)
    if (!template) return false
    const {family, branch} = ctx.resolve(puzzle)
    if (template.subject === 'any') return true
    if (template.subject === 'archive') {
        const date = ctx.dateOf?.(puzzle.slug)
        return !!date && dayKey(date) < dayKey(puzzle.at ?? Date.now())
    }
    if (!family) return false
    if (template.subject === 'favs') return (entry.params.favs ?? []).includes(branch?.slug)
    if (template.subject === 'type') return branch?.slug === entry.params.branch
    if (template.subject === 'group') return groupsOf(family, ctx).includes(entry.params.group)
    if (template.subject === 'new') return !(played ?? playedFamilies(ctx, time(entry.joinedAt))).has(family.slug)
    return false
}

function longestRun(dayKeys) {
    const sorted = [...new Set(dayKeys)].sort()
    let best = 0, run = 0, prev = null
    for (const key of sorted) {
        run = prev && time(`${key}T12:00:00`) - time(`${prev}T12:00:00`) === DAY_MS ? run + 1 : 1
        best = Math.max(best, run)
        prev = key
    }
    return best
}

function windowCompletions(entry, template, ctx) {
    const from = time(entry.joinedAt)
    const to = time(entry.endsAt)
    const played = template.subject === 'new' ? playedFamilies(ctx, from) : null
    return ctx.completions.filter(c => time(c.at) >= from && time(c.at) <= to && matchesPuzzle(entry, c, ctx, played))
}

const PER_DAY = ['days', 'run']

export function waitingForTomorrow(entry, ctx, now = Date.now()) {
    const template = findTemplate(entry.id)
    if (!template || !PER_DAY.includes(template.metric) || challengeProgress(entry, ctx).complete) return false
    return windowCompletions(entry, template, ctx).some(c => dayKey(c.at) === dayKey(now))
}

export function puzzleCounts(entry, puzzle, ctx, now = Date.now()) {
    const template = findTemplate(entry.id)
    if (!template || !matchesPuzzle(entry, puzzle, ctx) || challengeProgress(entry, ctx).complete) return false
    if (PER_DAY.includes(template.metric)) return !waitingForTomorrow(entry, ctx, now)
    const inWindow = windowCompletions(entry, template, ctx)
    if (template.metric === 'distinct' || template.metric === 'newTypes') {
        const family = ctx.resolve(puzzle).family?.slug
        return !inWindow.some(c => ctx.resolve(c).family?.slug === family)
    }
    if (template.metric === 'branches') {
        const branch = ctx.resolve(puzzle).branch?.slug
        return !inWindow.some(c => ctx.resolve(c).branch?.slug === branch)
    }
    return true
}

export function challengeProgress(entry, ctx) {
    const template = findTemplate(entry.id)
    if (!template) return {current: 0, target: 1, complete: false}
    const target = entry.params?.target ?? template.target
    const inWindow = windowCompletions(entry, template, ctx)
    let current
    if (template.metric === 'clean') current = inWindow.filter(c => isCleanSolve(c, gameConfig(c.variant).clean)).length
    else if (template.metric === 'distinct' || template.metric === 'newTypes') current = new Set(inWindow.map(c => ctx.resolve(c).family?.slug)).size
    else if (template.metric === 'branches') current = new Set(inWindow.map(c => ctx.resolve(c).branch?.slug)).size
    else if (template.metric === 'days') current = new Set(inWindow.map(c => dayKey(c.at))).size
    else if (template.metric === 'run') current = longestRun(inWindow.map(c => dayKey(c.at)))
    else current = inWindow.length
    return {current: Math.min(current, target), target, complete: current >= target}
}

export function challengeState(entry, now = Date.now()) {
    if (entry.completedAt) return 'complete'
    if (time(entry.endsAt) < now) return 'expired'
    return 'active'
}

export function shouldKeep(entry, now = Date.now()) {
    const state = challengeState(entry, now)
    if (state === 'complete') return !entry.dismissed && dayKey(entry.completedAt) === dayKey(now)
    if (state === 'expired') return !entry.dismissed && now - time(entry.endsAt) < EXPIRED_SHOWN_DAYS * DAY_MS
    return true
}

export function daysLeft(entry, now = Date.now()) {
    const end = new Date(entry.endsAt)
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    const today = new Date(now)
    const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return Math.round((endDay - startDay) / DAY_MS)
}

export function copyFor(entry) {
    const copy = baseCopy(entry)
    return {
        ...copy,
        goal: copy.body.replace(/\.body(Guesses)?$/, '.goal$1'),
        expired: entry.id === 'streak' || entry.id === 'type-run' ? 'challenges.streak.expired' : 'challenges.expiredBody',
    }
}

function baseCopy(entry) {
    const template = findTemplate(entry.id)
    const p = entry.params ?? {}
    const params = {name: p.name, target: p.target ?? template?.target, days: template?.days}
    switch (entry.id) {
        case 'type-week': return {title: 'challenges.typeWeek.title', body: 'challenges.typeWeek.body', params}
        case 'type-day': return {title: 'challenges.typeDay.title', body: 'challenges.typeDay.body', params}
        case 'type-clean': return {title: 'challenges.typeClean.title', body: p.clean === 'guesses' ? 'challenges.typeClean.bodyGuesses' : 'challenges.typeClean.body', params}
        case 'step-up': return {title: 'challenges.stepUp.title', body: 'challenges.stepUp.body', params}
        case 'revisit': return {title: 'challenges.revisit.title', body: 'challenges.revisit.body', params}
        case 'group-week': return {title: `challenges.groupWeek.${p.group}.title`, body: `challenges.groupWeek.${p.group}.body`, params}
        case 'group-variety': return {title: `challenges.groupVariety.${p.group}.title`, body: `challenges.groupVariety.${p.group}.body`, params}
        case 'coffee': return {title: 'challenges.coffee.title', body: 'challenges.coffee.body', params}
        case 'streak': return {title: 'challenges.streak.title', body: 'challenges.streak.body', params}
        case 'mix-day': return {title: 'challenges.mixDay.title', body: 'challenges.mixDay.body', params}
        case 'marathon': return {title: 'challenges.marathon.title', body: 'challenges.marathon.body', params}
        case 'four-days': return {title: 'challenges.fourDays.title', body: 'challenges.fourDays.body', params}
        case 'spotless': return {title: 'challenges.spotless.title', body: 'challenges.spotless.body', params}
        case 'type-run': return {title: 'challenges.typeRun.title', body: 'challenges.typeRun.body', params}
        case 'archive': return {title: 'challenges.archive.title', body: 'challenges.archive.body', params}
        case 'fav-sweep': return {title: 'challenges.favSweep.title', body: 'challenges.favSweep.body', params}
        default: return {title: 'challenges.explore.title', body: 'challenges.explore.body', params}
    }
}
