import Archive from '@/api/Archive.js'
import {assistShift} from '@/lib/assists'
import {monthKey} from '@/lib/lifetime'
import {challengeTotals, previousMonthKey, wrappedFor} from '@/lib/recap'
import {medalFor} from '@/lib/achievements'

const SHOW_UNTIL_DAY = 14

function demoWrapped(key) {
    const variants = Object.keys(Archive.getVariants() ?? {})
    const [a = 'Crossword', b = 'Sudoku', c = 'Wordsearch'] = variants
    return {
        key,
        previousKey: previousMonthKey(key),
        puzzles: 63,
        days: Array.from({length: new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate()}, (_, i) => i + 1),
        minutes: 312,
        top: {variant: a, count: 18},
        rising: {variant: b, count: 12, prev: 4, delta: 8},
        falling: {variant: c, count: 2, prev: 7, delta: -5},
        improved: {variant: b, metric: 'time', before: 512, now: 398, source: 'month'},
        help: {direction: 'less', pct: 64, prev: 41},
        assists: {tag: 'crossword', type: 'crossword', variant: 'Crossword', from: 4, to: 1, change: 'fewer'},
        challenges: {total: 9},
        medal: medalFor(63),
    }
}

export function useWrapped() {
    const challenges = useChallengesStore()
    const preferences = usePreferencesStore()
    const assists = useAssistsStore()
    const preview = usePreview()
    const open = useState('wrapped:open', () => false)

    const now = new Date()
    const thisMonth = monthKey(now)
    const key = previousMonthKey(thisMonth)
    const monthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const puzzleForTag = (tag) => Object.values(Archive.getPuzzles() ?? {}).find(p => p.tag === tag) ?? null
    const real = computed(() => {
        const shift = assistShift(assists.history, key, tag => puzzleForTag(tag)?.type)
        const done = challengeTotals(challenges.challengeLog, k => k === key)
        const month = wrappedFor(challenges.lifetime, challenges.completions ?? [], key)
        return {
            challenges: done.total ? done : null,
            ...month,
            assists: shift && {...shift, variant: puzzleForTag(shift.tag)?.variant ?? shift.tag},
            medal: medalFor(month.puzzles ?? 0),
        }
    })
    const forceDemo = computed(() => preview.is('wrapped-perfect'))
    const previewing = computed(() => preview.is('recap-card') || preview.is('wrapped') || forceDemo.value)
    const data = computed(() => forceDemo.value || (previewing.value && !real.value.puzzles) ? demoWrapped(key) : real.value)

    const available = computed(() => previewing.value || real.value.puzzles > 0)

    const showBanner = computed(() => previewing.value ||
        (real.value.puzzles > 0 && now.getDate() <= SHOW_UNTIL_DAY && preferences.recapSeenMonth !== thisMonth))

    const dismiss = () => {
        if (previewing.value) return preview.hide('recap-card')
        preferences.set('recapSeenMonth', thisMonth)
    }

    const watched = computed(() => !previewing.value && preferences.recapWatchedMonth === key)

    return {data, monthDate, wrappedKey: key, available, watched, showBanner, open, dismiss, previewing}
}
