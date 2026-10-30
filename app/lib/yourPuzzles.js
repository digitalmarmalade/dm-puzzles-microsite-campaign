import {timeOfDay} from '@/lib/tasteModel'

const DAY_MS = 24 * 60 * 60 * 1000
const PLAY_WINDOW_DAYS = 30
const MIN_PLAYS = 2
const MIN_SLOT_SHARE = 0.5
const MIN_TOUR_WEIGHT = 0.3

function dayStart(now, offset = 0) {
    const d = new Date(now)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset).getTime()
}

export function reasonFor({entry, plays, categoryPlays, slotPlays, playedYesterday, playedToday, model, boostedCategories, categoryOf, favourite}) {
    const {family, branch, slug} = entry
    const detail = model.breakdown.get(slug)
    const played = plays.get(slug) ?? 0
    if (playedYesterday.has(slug) && !playedToday.has(slug)) return {key: 'streak'}
    if (favourite) return {key: 'favourite'}
    if (family && boostedCategories.includes(categoryOf(family))) return {key: 'boosted'}
    const lean = family ? model.leans.get(family.slug) : null
    const index = family?.branches.findIndex(b => b.slug === branch?.slug) ?? -1
    if (lean?.lean === 'harder' && index > 0 && played < MIN_PLAYS && (plays.get(family.branches[index - 1].slug) ?? 0) >= MIN_PLAYS) {
        return {key: 'stepUp', from: family.branches[index - 1]}
    }
    const inSlot = slotPlays.get(slug) ?? 0
    if (inSlot >= MIN_PLAYS && inSlot / played >= MIN_SLOT_SHARE) return {key: model.slot}
    if (played >= MIN_PLAYS) return {key: 'played'}
    if (detail?.onboardingMatch && detail.explicit >= MIN_TOUR_WEIGHT) return {key: 'tour'}
    const alike = family ? categoryPlays.get(categoryOf(family)) : null
    if (alike && !alike.has(family.slug) && [...alike.values()].reduce((a, b) => a + b, 0) >= MIN_PLAYS) {
        return {key: 'likeCategory', category: categoryOf(family)}
    }
    return null
}

export function pickYourPuzzles({entries, completions, resolveBranch, model, favourites, boostedCategories, categoryOf, includeSuggestions = true, dismissed = [], now = Date.now()}) {
    const ignored = new Set(dismissed)
    const cutoff = now - PLAY_WINDOW_DAYS * DAY_MS
    const yesterday = dayStart(now, -1)
    const today = dayStart(now)
    const plays = new Map()
    const categoryPlays = new Map()
    const slotPlays = new Map()
    const playedYesterday = new Set()
    const playedToday = new Set()
    for (const c of completions) {
        const at = new Date(c.at).getTime()
        const {family, branch} = resolveBranch(c)
        const slug = branch?.slug
        if (!slug || ignored.has(`likes:${slug}`)) continue
        if (at >= yesterday && at < today) playedYesterday.add(slug)
        if (at >= today) playedToday.add(slug)
        if (at < cutoff) continue
        plays.set(slug, (plays.get(slug) ?? 0) + 1)
        const category = family ? categoryOf(family) : null
        if (category) {
            if (!categoryPlays.has(category)) categoryPlays.set(category, new Map())
            const inCategory = categoryPlays.get(category)
            inCategory.set(family.slug, (inCategory.get(family.slug) ?? 0) + 1)
        }
        if (timeOfDay(c.at) === model.slot && !ignored.has(`time:${slug}`)) slotPlays.set(slug, (slotPlays.get(slug) ?? 0) + 1)
    }
    const favSet = new Set(favourites)
    const suggested = new Set()
    return entries
        .map((entry) => {
            const favourite = favSet.has(entry.slug)
            const reason = reasonFor({entry, plays, categoryPlays, slotPlays, playedYesterday, playedToday, model, boostedCategories, categoryOf, favourite})
            return {...entry, reason, score: model.scoreFor(entry.slug)}
        })
        .filter(e => e.reason && (includeSuggestions || e.reason.key === 'favourite' || e.reason.key === 'streak'))
        .sort((a, b) => b.score - a.score)
        .filter(e => {
            if (e.reason.key !== 'likeCategory') return true
            if (suggested.has(e.reason.category)) return false
            suggested.add(e.reason.category)
            return true
        })
}
