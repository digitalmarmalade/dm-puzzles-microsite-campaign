import {gameConfig} from '@/lib/gameConfig'
import {personaFor} from '@/lib/personas'

const DAY_MS = 24 * 60 * 60 * 1000
const HALF_LIFE_DAYS = 30
const CONFIDENCE_K = 8
const SIBLING_SPILL = 0.3
const LEAN_SPILL = 0.5
const OFF_LEAN_SPILL = 0.15
const CATEGORY_SPILL = 0.1
const ONBOARDING_MATCH = 0.5
const CATEGORY_BOOST = 1
const NUDGE_WINDOW_DAYS = 14
const TIME_OF_DAY_WEIGHT = 1.5

const RATING_WINDOW_DAYS = 30

const LEANS_HARDER = ['purist', 'improver']
const LEANS_EASIER = ['hintHunter', 'newcomer']

function recencyWeight(at, now) {
    const ageDays = Math.max(0, (now - new Date(at).getTime()) / DAY_MS)
    return 0.5 ** (ageDays / HALF_LIFE_DAYS)
}

export function timeOfDay(at) {
    const hour = new Date(at).getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 22) return 'evening'
    return 'night'
}

export function familyLeanReason(completions, cfg, now = Date.now()) {
    const cutoff = now - RATING_WINDOW_DAYS * DAY_MS
    const rated = completions
        .filter(c => c.rating && new Date(c.at).getTime() >= cutoff)
        .sort((a, b) => new Date(b.at) - new Date(a.at))[0]
    if (rated) {
        const lean = rated.rating === 'easy' ? 'harder' : rated.rating === 'hard' ? 'easier' : null
        return {lean, source: 'rating', detail: rated.rating}
    }
    const persona = personaFor(completions, cfg, {only: [...LEANS_HARDER, ...LEANS_EASIER], rotate: false, now})?.id ?? null
    const lean = LEANS_HARDER.includes(persona) ? 'harder' : LEANS_EASIER.includes(persona) ? 'easier' : null
    return {lean, source: 'persona', detail: persona}
}

export function familyLean(completions, cfg, now = Date.now()) {
    return familyLeanReason(completions, cfg, now).lean
}

function spillFor(lean, fromIndex, toIndex) {
    if (lean === 'harder') return toIndex === fromIndex + 1 ? LEAN_SPILL : OFF_LEAN_SPILL
    if (lean === 'easier') return toIndex === fromIndex - 1 ? LEAN_SPILL : OFF_LEAN_SPILL
    return SIBLING_SPILL
}

export function buildTasteModel({
    families,
    completions = [],
    resolveBranch,
    categoryOf,
    tagsFor = () => [],
    favourites = [],
    boostedCategories = [],
    selectedCategories = [],
    selectedTags = [],
    dismissed = [],
    now = Date.now(),
}) {
    const ignored = new Set(dismissed)
    const behaviour = new Map()
    const add = (slug, w) => behaviour.set(slug, (behaviour.get(slug) ?? 0) + w)

    const currentSlot = timeOfDay(now)
    const byFamily = new Map()
    let totalWeight = 0
    for (const c of completions) {
        const {family, branch} = resolveBranch(c)
        if (!family || !branch) continue
        const recency = recencyWeight(c.at, now)
        totalWeight += recency
        const timed = timeOfDay(c.at) === currentSlot && !ignored.has(`time:${branch.slug}`)
        const w = timed ? recency * TIME_OF_DAY_WEIGHT : recency
        if (!byFamily.has(family.slug)) byFamily.set(family.slug, {family, completions: [], weights: new Map()})
        const entry = byFamily.get(family.slug)
        entry.completions.push(c)
        entry.weights.set(branch.slug, (entry.weights.get(branch.slug) ?? 0) + w)
    }

    const leans = new Map()
    for (const {family, completions: famCompletions, weights} of byFamily.values()) {
        const reason = ignored.has(`lean:${family.slug}`)
            ? {lean: null, source: 'dismissed', detail: null}
            : familyLeanReason(famCompletions, gameConfig(family.branches[0].variantName), now)
        leans.set(family.slug, reason)
        const lean = reason.lean
        const category = categoryOf(family)
        family.branches.forEach((branch, i) => {
            const w = weights.get(branch.slug)
            if (!w || ignored.has(`likes:${branch.slug}`)) return
            add(branch.slug, w)
            family.branches.forEach((sibling, j) => {
                if (j !== i) add(sibling.slug, w * spillFor(lean, i, j))
            })
            if (!category) return
            for (const other of families) {
                if (other.slug === family.slug || categoryOf(other) !== category) continue
                for (const b of other.branches) add(b.slug, w * CATEGORY_SPILL)
            }
        })
    }

    const maxBehaviour = Math.max(0, ...behaviour.values())
    const confidence = totalWeight / (totalWeight + CONFIDENCE_K)
    const favSet = new Set(favourites)

    const scores = new Map()
    const breakdown = new Map()
    for (const family of families) {
        const category = categoryOf(family)
        const onboardingMatch = selectedCategories.includes(category) ||
            tagsFor(family.slug).some(t => selectedTags.includes(t))
        const boost = boostedCategories.includes(category) ? CATEGORY_BOOST : 0
        for (const branch of family.branches) {
            const explicit = favSet.has(branch.slug) ? 1 : onboardingMatch ? ONBOARDING_MATCH : 0
            const learned = maxBehaviour ? (behaviour.get(branch.slug) ?? 0) / maxBehaviour : 0
            const fromExplicit = (1 - confidence) * explicit
            const fromPlay = confidence * learned
            scores.set(branch.slug, fromExplicit + fromPlay + boost)
            breakdown.set(branch.slug, {explicit: fromExplicit, play: fromPlay, boost, favourite: favSet.has(branch.slug), onboardingMatch})
        }
    }

    return {
        scores,
        breakdown,
        leans,
        confidence,
        weight: totalWeight,
        slot: currentSlot,
        scoreFor: (slug) => scores.get(slug) ?? 0,
    }
}

export function recentCategoryCounts({completions = [], resolveBranch, categoryOf, now = Date.now()}) {
    const cutoff = now - NUDGE_WINDOW_DAYS * DAY_MS
    const counts = new Map()
    let total = 0
    for (const c of completions) {
        if (new Date(c.at).getTime() < cutoff) continue
        const {family} = resolveBranch(c)
        const category = family ? categoryOf(family) : null
        if (!category) continue
        counts.set(category, (counts.get(category) ?? 0) + 1)
        total++
    }
    return {counts, total}
}
