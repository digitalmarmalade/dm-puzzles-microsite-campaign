import {dateHelpers} from '@/lib/challenges'
import {mergeLifetime, monthKey} from '@/lib/lifetime'

export const LOG_RETAIN_DAYS = 90

export const SYNCED_PREFERENCES = [
    'showFeatured',
    'showChallenges',
    'challengesJoined',
    'challengeSkips',
    'onboardingCompleted',
    'welcomeDismissed',
    'onboardingSelectedCategories',
    'onboardingSelectedTags',
    'boostedCategories',
    'declinedCategories',
    'answeredLevels',
    'dismissedInsights',
    'dismissedAnnouncements',
    'tutorialsDone',
    'guideTips',
    'recapSeenMonth',
    'recapWatchedMonth',
    'profileAnnounced',
    'profileAnnouncedAt',
]

const SET_SECTIONS = ['favourites', 'hidden']
const OBJECT_SECTIONS = ['preferences', 'assists', 'assistHistory']
const UNION_SECTIONS = ['frozenDays', 'unlockedAchievements', 'challengeLog']

export const SECTIONS = [...SET_SECTIONS, ...OBJECT_SECTIONS, ...UNION_SECTIONS, 'completions', 'lifetime']

const completionKey = (c) => `${c.slug}|${dateHelpers.dayKey(c.at)}`

function mergeCompletionLists(...lists) {
    const byKey = new Map()
    for (const c of lists.flat()) {
        if (!c?.slug || !Number.isFinite(new Date(c.at).getTime())) continue
        const key = completionKey(c)
        const prev = byKey.get(key)
        if (!prev) {
            byKey.set(key, c)
            continue
        }
        const [older, newer] = prev.at <= c.at ? [prev, c] : [c, prev]
        byKey.set(key, {...older, ...newer, rating: newer.rating ?? older.rating})
    }
    return [...byKey.values()].sort((a, b) => (a.at < b.at ? -1 : 1))
}

function union(a = [], b = []) {
    return [...new Set([...a, ...b])]
}

export function mergeProfiles(local, remote, mode, now = Date.now()) {
    if (!remote) return local
    const out = {}
    const at = (side, name) => side.sections?.[name]?.updatedAt ?? 0
    const data = (side, name) => side.sections?.[name]?.data

    for (const name of SET_SECTIONS) {
        const l = data(local, name) ?? [], r = data(remote, name) ?? []
        if (mode === 'replace') out[name] = {data: r, updatedAt: at(remote, name)}
        else if (mode === 'adopt') out[name] = {data: union(r, l), updatedAt: now}
        else out[name] = {data: at(local, name) > at(remote, name) ? l : r, updatedAt: Math.max(at(local, name), at(remote, name))}
    }

    for (const name of OBJECT_SECTIONS) {
        const l = data(local, name) ?? {}, r = data(remote, name) ?? {}
        if (mode === 'replace') out[name] = {data: r, updatedAt: at(remote, name)}
        else if (mode === 'adopt') out[name] = {data: {...l, ...r}, updatedAt: now}
        else out[name] = {data: at(local, name) > at(remote, name) ? l : r, updatedAt: Math.max(at(local, name), at(remote, name))}
    }

    if (mode !== 'replace') {
        const l = data(local, 'preferences')?.tutorialsDone ?? {}, r = data(remote, 'preferences')?.tutorialsDone ?? {}
        const slugs = [...new Set([...Object.keys(l), ...Object.keys(r)])]
        const tutorialsDone = Object.fromEntries(slugs.map(slug => [slug, union(l[slug], r[slug]).sort((a, b) => a - b)]))
        out.preferences = {...out.preferences, data: {...out.preferences.data, tutorialsDone}}
    }

    if (mode !== 'replace') {
        const l = data(local, 'assistHistory') ?? {}, r = data(remote, 'assistHistory') ?? {}
        const [older, newer] = at(local, 'assistHistory') > at(remote, 'assistHistory') ? [r, l] : [l, r]
        const months = [...new Set([...Object.keys(older), ...Object.keys(newer)])]
        out.assistHistory = {
            data: Object.fromEntries(months.map(m => [m, {...older[m], ...newer[m]}])),
            updatedAt: Math.max(at(local, 'assistHistory'), at(remote, 'assistHistory')),
        }
    }

    for (const name of UNION_SECTIONS) {
        const l = mode === 'replace' ? [] : data(local, name) ?? []
        out[name] = {data: union(data(remote, name) ?? [], l).sort(), updatedAt: now}
    }

    const localLog = mode === 'replace' ? [] : data(local, 'completions') ?? []
    out.completions = {data: mergeCompletionLists(localLog, data(remote, 'completions') ?? []), updatedAt: now}

    const localLifetime = mode === 'replace' ? null : data(local, 'lifetime')
    out.lifetime = {data: mergeLifetime(localLifetime, data(remote, 'lifetime')), updatedAt: now}

    return {sections: out}
}

export function groupByMonth(completions) {
    const months = {}
    for (const c of completions) (months[monthKey(c.at)] ??= []).push(c)
    return months
}
