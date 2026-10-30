import Archive from '@/api/Archive.js'
import {
    MAX_ACTIVE, SKIP_DAYS, challengeProgress, challengeState, copyFor, dateHelpers, daysLeft,
    findTemplate, matchesPuzzle, puzzleCounts, shouldKeep, startChallenge, suggestChallenges, waitingForTomorrow,
} from '@/lib/challenges'
import {isQuick} from '@/composables/puzzle'
import {variantLook} from '@/lib/variantLook'

const DAY_MS = 24 * 60 * 60 * 1000

export function challengeContext({families, familyOf, branchFor, categoryOf, completions, lifetime, scoreFor = () => 0, visible = () => true, boosted = [], favourites = []}) {
    const resolve = (c) => branchFor(Archive.getPuzzles(c.slug) ?? {variant: c.variant, slug: c.slug})
    const dateOf = (slug) => Archive.getPuzzles(slug)?.date ?? null
    return {families, familyOf, resolve, dateOf, categoryOf, isQuick: (f) => isQuick(f.slug), completions, lifetime, scoreFor, visible, boosted, favourites}
}

export const challengeIcon = () => achievementImage('challenge')

export function useChallengeBoard() {
    const preferences = usePreferencesStore()
    const favourites = useFavouritesStore()
    const challenges = useChallengesStore()
    const hidden = useHiddenVariantsStore()
    const playStatus = usePlayStatusStore()
    const features = useFeatures()
    const preview = usePreview()
    const previewing = computed(() => preview.is('challenges'))
    const {families, familyOf, branchFor, categoryOf, scoreFor} = useTasteModel()

    const visible = (slug) => !hidden.isHidden(slug)
    const ctx = computed(() => challengeContext({
        families, familyOf, branchFor, categoryOf, scoreFor, visible,
        completions: challenges.completions ?? [],
        lifetime: challenges.lifetime,
        boosted: [...preferences.boostedCategories, ...preferences.onboardingSelectedCategories],
        favourites: favourites.slugs ?? [],
    }))

    const enabled = computed(() => !!features.challenges && preferences.showChallenges)
    const joined = computed(() => (preferences.challengesJoined ?? []).filter(e => findTemplate(e.id) && shouldKeep(e)))
    const active = computed(() => joined.value.filter(e => challengeState(e) === 'active'))

    const excluded = computed(() => {
        const now = Date.now()
        const keys = new Set(joined.value.map(e => e.key))
        for (const [key, day] of Object.entries(preferences.challengeSkips ?? {})) {
            if (now - new Date(`${day}T00:00:00`).getTime() < SKIP_DAYS * DAY_MS) keys.add(key)
        }
        for (const line of challenges.challengeLog ?? []) {
            const [, day, ...rest] = line.split(':')
            if (now - new Date(`${day}T00:00:00`).getTime() < 14 * DAY_MS) keys.add(rest.join(':'))
        }
        return keys
    })

    const suggestions = computed(() => enabled.value && active.value.length < MAX_ACTIVE
        ? suggestChallenges(ctx.value, {exclude: excluded.value})
        : [])

    const save = (list) => preferences.set('challengesJoined', list)
    const prunedSkips = () => Object.fromEntries(Object.entries(preferences.challengeSkips ?? {})
        .filter(([, day]) => Date.now() - new Date(`${day}T00:00:00`).getTime() < SKIP_DAYS * DAY_MS))

    function join(option, surface = 'home') {
        if (previewing.value || active.value.length >= MAX_ACTIVE) return
        save([...joined.value, startChallenge(option)])
        trackFunnel('sp_challenge_join', {id: option.id, key: option.key, surface})
    }
    function skip(option, surface = 'home') {
        if (previewing.value) return
        preferences.set('challengeSkips', {...prunedSkips(), [option.key]: dateHelpers.todayKey()})
        trackFunnel('sp_challenge_skip', {id: option.id, key: option.key, surface})
    }
    function leave(entry) {
        if (previewing.value) return
        save(joined.value.filter(e => e.key !== entry.key))
        preferences.set('challengeSkips', {...prunedSkips(), [entry.key]: dateHelpers.todayKey()})
        trackFunnel('sp_challenge_leave', {id: entry.id, key: entry.key})
    }
    function dismiss(entry) {
        if (previewing.value) return
        save(joined.value.map(e => e.key === entry.key ? {...e, dismissed: true} : e).filter(e => shouldKeep(e)))
    }
    function retry(entry) {
        if (previewing.value || active.value.length >= MAX_ACTIVE) return
        save([...joined.value.filter(e => e.key !== entry.key), startChallenge(entry)])
        trackFunnel('sp_challenge_retry', {id: entry.id, key: entry.key})
    }

    const progressOf = (entry) => challengeProgress(entry, ctx.value)
    const matches = (entry, puzzle) => matchesPuzzle(entry, puzzle, ctx.value)
    const counts = (entry, puzzle) => puzzleCounts(entry, puzzle, ctx.value)
    const waiting = (entry) => waitingForTomorrow(entry, ctx.value)

    function puzzlesFor(entry, limit = 6) {
        const solved = new Set((challenges.completions ?? []).map(c => c.slug))
        const open = (p) => p?.slug && !solved.has(p.slug) && !playStatus.statusFor(p.slug)?.completed &&
            (!p.date || new Date(p.date).getTime() <= Date.now())
        const branchOf = (p) => branchFor(p).branch
        const score = (p) => scoreFor(branchOf(p)?.slug ?? '')
        const today = (Archive.getTodaysPuzzles() ?? [])
            .filter(p => open(p) && visible(branchOf(p)?.slug ?? p.icon) && counts(entry, p))
            .sort((a, b) => score(b) - score(a))
        const seen = new Set(today.map(p => p.slug))
        const queues = families.flatMap(f => f.branches)
            .filter(b => visible(b.slug))
            .filter(b => entry.params?.branch ? b.slug === entry.params.branch : true)
            .sort((a, b) => scoreFor(b.slug) - scoreFor(a.slug))
            .map(b => b.puzzleSlugs.map(slug => Archive.getPuzzles(slug)).filter(p => open(p) && !seen.has(p.slug) && counts(entry, p)))
        const archive = queues.map(q => q[0]).filter(Boolean)
        const variants = new Set()
        const isToday = (p) => !p.date || dateHelpers.isToday(p.date)
        return [...today, ...archive].map(puzzle => ({puzzle, today: isToday(puzzle)})).filter(({puzzle}) => !variants.has(puzzle.variant) && variants.add(puzzle.variant)).slice(0, limit)
    }

    const puzzleFor = (entry) => puzzlesFor(entry, 1)[0]?.puzzle ?? null

    function describe(entry) {
        const look = entry.params?.variant ? variantLook(entry.params.variant) : null
        return {copy: copyFor(entry), look, icon: challengeIcon(entry)}
    }

    const demoCards = computed(() => {
        const branches = families.flatMap(f => f.branches.map(b => ({family: f, branch: b})))
        const pick = (name, i) => branches.find(b => b.branch.variantName === name) ?? branches[i] ?? branches[0]
        const typeParams = ({branch}) => ({branch: branch?.slug, variant: branch?.variantName, name: branch?.variantName})
        const card = (state, id, params, progress, left = 0) => {
            const entry = {key: `demo-${state}-${id}`, id, params}
            return {key: entry.key, state, entry, progress, daysLeft: left, ...describe(entry)}
        }
        return [
            card('suggested', 'type-week', typeParams(pick('Sudoku', 0))),
            card('active', 'group-week', {group: 'words'}, {current: 3, target: 6, complete: false}, 4),
            card('active', 'coffee', {group: 'quick'}, {current: 1, target: 3, complete: false}, 0),
            card('complete', 'type-day', typeParams(pick('Crossword', 1)), {current: 2, target: 2, complete: true}),
            card('expired', 'streak', {}, {current: 3, target: 5, complete: false}),
        ]
    })

    const cards = computed(() => {
        if (previewing.value) return demoCards.value
        if (!enabled.value) return []
        const shown = active.value.length ? active.value : joined.value
        return [
            ...shown.map(entry => ({
                key: entry.key,
                state: challengeState(entry),
                entry,
                progress: progressOf(entry),
                daysLeft: daysLeft(entry),
                ...describe(entry),
            })),
            ...suggestions.value.map(option => ({key: `suggested-${option.key}`, state: 'suggested', entry: option, ...describe(option)})),
        ]
    })

    function coverChallenges(puzzle) {
        if (previewing.value) return demoCards.value.filter(c => c.state === 'active')
        if (!enabled.value || !puzzle) return []
        return cards.value.filter(c => c.state === 'active' && counts(c.entry, puzzle))
    }

    return {cards, coverChallenges, active, suggestions, join, skip, leave, dismiss, retry, progressOf, matches, waiting, puzzleFor, puzzlesFor}
}
