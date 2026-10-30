import Archive from '@/api/Archive.js'
import {pickYourPuzzles} from '@/lib/yourPuzzles'
import {getPuzzleMeta, QUICK_MINUTES} from '@/composables/puzzle'


export function useNextPuzzle() {
    const challenges = useChallengesStore()
    const favourites = useFavouritesStore()
    const preferences = usePreferencesStore()
    const playStatus = usePlayStatusStore()
    const hidden = useHiddenVariantsStore()
    const {model, resolveBranch, branchFor, categoryOf} = useTasteModel()

    const solved = () => new Set((challenges.completions ?? []).map(c => c.slug))
    const minutesOf = (puzzle) => getPuzzleMeta(branchFor(puzzle).family?.slug)?.time ?? null
    const branchOf = (puzzle) => branchFor(puzzle).branch?.slug ?? puzzle.icon
    const released = (puzzle) => !puzzle.date || new Date(puzzle.date).getTime() <= Date.now()

    function nextFor(current) {
        if (!current) return null
        const done = solved()
        const isDone = (slug) => done.has(slug) || !!playStatus.statusFor(slug)?.completed
        const open = (puzzle) => puzzle && puzzle.slug !== current.slug && !isDone(puzzle.slug) && !hidden.isHidden(branchOf(puzzle)) && released(puzzle)

        const byBranch = new Map()
        for (const puzzle of Archive.getTodaysPuzzles()) {
            const {family, branch} = branchFor(puzzle)
            const slug = branch?.slug ?? puzzle.icon
            if (!byBranch.has(slug) && !hidden.isHidden(slug)) byBranch.set(slug, {puzzle, family, branch, slug})
        }
        const today = [...byBranch.values()]
        const picks = pickYourPuzzles({
            entries: today,
            completions: challenges.completions ?? [],
            resolveBranch,
            model: model.value,
            favourites: favourites.slugs,
            boostedCategories: preferences.boostedCategories,
            categoryOf,
            includeSuggestions: preferences.showFeatured,
            dismissed: preferences.dismissedInsights,
        }).filter(e => open(e.puzzle))

        const streak = picks.find(e => e.reason.key === 'streak')
        if (streak) return {reason: 'streak', puzzle: streak.puzzle}

        const started = Object.entries(playStatus.map)
            .filter(([, s]) => s?.started && !s.completed)
            .map(([slug, s]) => ({puzzle: Archive.getPuzzles(slug), at: s.startedAt ?? 0}))
            .filter(({puzzle}) => open(puzzle))
            .sort((a, b) => b.at - a.at)
        if (started.length) return {reason: 'resume', puzzle: started[0].puzzle}

        if (picks.length) return {reason: picks[0].reason.key, category: picks[0].reason.category, puzzle: picks[0].puzzle}

        const minutes = minutesOf(current)
        if (minutes !== null && minutes <= QUICK_MINUTES) {
            const snack = today
                .filter(e => open(e.puzzle) && (minutesOf(e.puzzle) ?? Infinity) <= QUICK_MINUTES)
                .sort((a, b) => model.value.scoreFor(b.slug) - model.value.scoreFor(a.slug))[0]
            if (snack) return {reason: 'snack', puzzle: snack.puzzle}
        }

        const todaySlugs = new Set(today.map(e => e.puzzle.slug))
        const list = Archive.getVariants(current.variant) ?? []
        const isArchive = !todaySlugs.has(current.slug)
        const from = isArchive ? list.indexOf(current.slug) + 1 : 0
        const archive = list.slice(Math.max(0, from))
            .map(slug => Archive.getPuzzles(slug))
            .find(p => open(p) && !todaySlugs.has(p.slug))
        if (archive) return {reason: isArchive ? 'nextArchive' : 'archive', puzzle: archive}

        return null
    }

    function anotherFor(current) {
        if (!current) return null
        const done = solved()
        const list = Archive.getVariants(current.variant) ?? []
        const at = list.indexOf(current.slug)
        const order = at < 0 ? list : [...list.slice(at + 1), ...list.slice(0, at)]
        return order
            .map(slug => Archive.getPuzzles(slug))
            .find(p => p && p.slug !== current.slug && !done.has(p.slug) && !playStatus.statusFor(p.slug)?.completed && released(p)) ?? null
    }

    function differentFor(current) {
        if (!current) return null
        const done = solved()
        const names = Object.keys(Archive.getVariants() ?? {})
        const at = names.indexOf(current.variant)
        const order = at < 0 ? names : [...names.slice(at + 1), ...names.slice(0, at)]
        for (const name of order) {
            const found = (Archive.getVariants(name) ?? [])
                .map(slug => Archive.getPuzzles(slug))
                .find(p => p && !done.has(p.slug) && !playStatus.statusFor(p.slug)?.completed && released(p) && !hidden.isHidden(branchOf(p)))
            if (found) return found
        }
        return null
    }

    return {nextFor, anotherFor, differentFor}
}
