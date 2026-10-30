import Archive from '@/api/Archive.js'
import {pickYourPuzzles} from '@/lib/yourPuzzles'
import {isPuzzleDone} from '@/composables/puzzleProgress'

const ROW_TARGET = 5
const ARCHIVE_LOOKBACK = 30
const RECENT_DAYS = 6
const ARCHIVE_REASONS = {
    recent: ['missed', 'fromDay', 'catchUp', 'moreLike'],
    older: ['archive', 'worthALook', 'moreLike', 'missed'],
}
const DAY_MS = 24 * 60 * 60 * 1000

export function useYourPuzzles(entries) {
    const challenges = useChallengesStore()
    const favourites = useFavouritesStore()
    const preferences = usePreferencesStore()
    const playStatus = usePlayStatusStore()
    const {model, resolveBranch, categoryOf} = useTasteModel()

    const done = (slug) => isPuzzleDone(slug, playStatus, challenges.completions ?? [])

    const picks = computed(() => pickYourPuzzles({
        entries: toValue(entries),
        completions: challenges.completions ?? [],
        resolveBranch,
        model: model.value,
        favourites: favourites.slugs,
        boostedCategories: preferences.boostedCategories,
        categoryOf,
        includeSuggestions: preferences.showFeatured,
        dismissed: preferences.dismissedInsights,
    }))

    const toPlay = computed(() => picks.value.filter(e => !done(e.puzzle?.slug)))
    const finished = computed(() => picks.value.filter(e => done(e.puzzle?.slug)))
    const allDone = computed(() => picks.value.length > 0 && !toPlay.value.length)

    const archive = computed(() => {
        const room = ROW_TARGET - toPlay.value.length - (allDone.value ? 1 : 0)
        if (room <= 0 || !finished.value.length) return []
        const solved = new Set((challenges.completions ?? []).map(c => c.slug))
        const today = new Set(toValue(entries).map(e => e.puzzle?.slug))
        const now = Date.now()
        const seen = new Set()
        const out = finished.value.flatMap((entry) => {
            if (seen.has(entry.slug)) return []
            seen.add(entry.slug)
            const open = (entry.branch?.puzzleSlugs ?? [])
                .slice(0, ARCHIVE_LOOKBACK)
                .filter(slug => !today.has(slug) && !solved.has(slug) && !done(slug))
                .map(slug => Archive.getPuzzles(slug))
                .filter(p => p && new Date(p.date).getTime() <= now)
            const puzzle = open.find(p => playStatus.statusFor(p.slug)?.started) ?? open[0]
            return puzzle ? [{...entry, slug: `archive-${puzzle.slug}`, puzzle: toEnhancedPuzzle({puzzle: {...puzzle}}), archive: true}] : []
        })
        return withArchiveReasons(out.slice(0, room))
    })

    const cards = computed(() => [...toPlay.value, ...archive.value])

    const seedOf = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0)

    function withArchiveReasons(list) {
        const used = new Set()
        const today = new Date().setHours(0, 0, 0, 0)
        return list.map((entry) => {
            const date = new Date(entry.puzzle.date)
            const age = Math.round((today - new Date(date).setHours(0, 0, 0, 0)) / DAY_MS)
            let key
            if (playStatus.statusFor(entry.puzzle.slug)?.started) key = 'resume'
            else if (age === 1 && !used.has('yesterday')) key = 'yesterday'
            else {
                const pool = ARCHIVE_REASONS[age <= RECENT_DAYS ? 'recent' : 'older']
                const start = seedOf(entry.puzzle.slug) % pool.length
                const order = [...pool.slice(start), ...pool.slice(0, start)]
                key = order.find(k => !used.has(k)) ?? order[0]
            }
            used.add(key)
            return {...entry, archiveReason: key, archiveDay: date}
        })
    }

    return {cards, allDone}
}
