import {collection, getCountFromServer, getFirestore, query, where} from 'firebase/firestore'
import Archive from '@/api/Archive.js'
import {makeBranchResolver} from '@/lib/branches'
import {dateHelpers} from '@/lib/challenges'
import {
    ADVENT_DOOR_MODAL, DOOR_COUNT, YEAR, adventContext, adventProgress, awardFor, calendarDay, doorDate,
    matchesOne, perfectThreshold, phase as phaseFor,
} from '../lib/advent'

const PREVIEW_KEY = 'sp-advent-preview'
const OPENED_KEY = 'sp-advent-opened'
const COUNT_TTL = 5 * 60 * 1000

export const adventCollection = () => collection(getFirestore(), 'advent', String(YEAR), 'players')

export function readAdventPreview() {
    try {
        const fromUrl = new URLSearchParams(window.location.search).get('advent')
        if (fromUrl !== null) {
            if (fromUrl === 'off') sessionStorage.removeItem(PREVIEW_KEY)
            else sessionStorage.setItem(PREVIEW_KEY, fromUrl)
        }
        const raw = sessionStorage.getItem(PREVIEW_KEY)
        if (!raw) return null
        const [day, mode] = raw.split(',')
        const n = Number(day)
        return {day: Number.isFinite(n) ? n : null, demo: mode === 'demo' || mode === 'perfect', perfect: mode === 'perfect'}
    } catch {
        return null
    }
}

function previewNow(preview) {
    if (preview?.day == null) return Date.now()
    if (preview.day <= 0) return new Date(YEAR, 10, 28, 10).getTime()
    const d = new Date()
    return new Date(YEAR, 11, preview.day, d.getHours(), d.getMinutes()).getTime()
}

export function sampleProgress(today, {mode = 'mixed', todayDone = false} = {}) {
    const empty = {entries: [], byDay: new Map(), has: {words: true, numbers: true, logic: true, quick: true}, favourites: new Set(['x']), families: []}
    const kinds = adventProgress(empty, doorDate(Math.min(Math.max(today, 1), DOOR_COUNT)).getTime())
    const doors = kinds.doors.map(d => {
        if (d.day > today) return {...d, state: 'locked'}
        if (d.day === today) return {...d, state: todayDone && mode !== 'none' ? 'done' : 'open'}
        if (mode === 'none') return {...d, state: 'missed'}
        if (mode === 'perfect') return {...d, state: 'done'}
        if (mode === 'few') return {...d, state: d.day % 4 === 1 ? 'done' : 'missed'}
        if (d.day === 5) return {...d, state: 'late'}
        if (d.day === 9 || d.day === 16) return {...d, state: 'missed'}
        return {...d, state: 'done'}
    })
    let perfectThrough = 0
    while (perfectThrough < DOOR_COUNT && doors[perfectThrough].state === 'done') perfectThrough++
    const done = doors.filter(d => d.state === 'done' || d.state === 'late').length
    const opened = Math.min(today, DOOR_COUNT)
    const stillPerfect = opened > 0 && perfectThrough >= (today > DOOR_COUNT ? DOOR_COUNT : opened - 1)
    return {
        today, doors, perfectThrough, done, stillPerfect,
        award: awardFor(done, perfectThrough === DOOR_COUNT),
        next: [{key: 'coal', min: 1}, {key: 'bronze', min: 10}, {key: 'silver', min: 18}].find(a => a.min > done) ?? null,
    }
}

const demoProgress = (today, perfect) => sampleProgress(today, {mode: perfect ? 'perfect' : 'mixed', todayDone: perfect || today % 3 !== 0})

export function useAdvent() {
    const challenges = useChallengesStore()
    const favourites = useFavouritesStore()
    const hidden = useHiddenVariantsStore()
    const auth = useAuthStore()
    const features = useFeatures()
    const preview = useState('advent:preview', () => (import.meta.client ? readAdventPreview() : null))
    const clock = useState('advent:clock', () => Date.now())
    const archiveTick = useState('advent:archive', () => Archive.loaded)
    const counts = useState('advent:counts', () => ({perfect: null, players: null, at: 0, threshold: null}))
    const opened = useState('advent:opened', () => {
        try {
            return JSON.parse(localStorage.getItem(OPENED_KEY) ?? '[]')
        } catch {
            return []
        }
    })

    if (import.meta.client && !Archive.loaded) {
        Archive.load(useRuntimeConfig().public.archiveFile).then(() => { archiveTick.value = true })
    }

    const now = computed(() => (preview.value?.day != null ? previewNow(preview.value) : clock.value))
    const phase = computed(() => phaseFor(now.value))
    const today = computed(() => calendarDay(now.value))
    const signedIn = computed(() => !!auth.user)
    const canPlay = computed(() => !features.requireAccount || signedIn.value)

    const resolver = computed(() => {
        if (!archiveTick.value) return null
        const families = Archive.getVariantFamilies() ?? []
        return {families, ...makeBranchResolver(families)}
    })

    const context = computed(() => {
        const r = resolver.value
        if (!r) return null
        return adventContext({
            completions: challenges.completions,
            families: r.families.filter(f => !hidden.isHidden(f.slug)),
            familyOf: r.familyOf,
            branchFor: r.branchFor,
            puzzleOf: (slug) => Archive.getPuzzles(slug),
            favourites: favourites.slugs,
        })
    })

    const progress = computed(() => {
        if (preview.value?.demo) return demoProgress(today.value, preview.value.perfect)
        return context.value ? adventProgress(context.value, now.value) : null
    })

    async function refreshCounts(force = false) {
        if (!import.meta.client || today.value === 0) return
        const threshold = perfectThreshold(today.value)
        if (preview.value?.demo) {
            counts.value = {perfect: Math.max(312, 4810 - threshold * 173), players: 6241, at: Date.now(), threshold}
            return
        }
        if (!signedIn.value) return
        if (!force && counts.value.threshold === threshold && Date.now() - counts.value.at < COUNT_TTL) return
        try {
            const col = adventCollection()
            const [perfect, players] = await Promise.all([
                getCountFromServer(query(col, where('perfectThrough', '>=', threshold))),
                getCountFromServer(query(col, where('done', '>=', 1))),
            ])
            counts.value = {perfect: perfect.data().count, players: players.data().count, at: Date.now(), threshold}
        } catch (e) {
            if (import.meta.dev) console.warn('advent counts', e)
            counts.value = {perfect: null, players: null, at: Date.now(), threshold}
        }
    }

    const selectedDay = useState('advent:selected', () => null)
    const selected = computed(() => progress.value?.doors[selectedDay.value - 1] ?? null)

    function openDoor(door) {
        if (!door || door.state === 'locked') return
        const modals = useModalStore()
        selectedDay.value = door.day
        if (opened.value.includes(door.day)) {
            modals.open(ADVENT_DOOR_MODAL)
            return
        }
        markOpened(door.day)
        trackFunnel('sp_advent_door_open', {day: door.day, kind: door.kind})
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        setTimeout(() => modals.open(ADVENT_DOOR_MODAL), reduced ? 0 : 1050)
    }

    function markOpened(day) {
        if (opened.value.includes(day)) return
        opened.value = [...opened.value, day]
        try {
            localStorage.setItem(OPENED_KEY, JSON.stringify(opened.value))
        } catch {
            //
        }
    }

    function puzzlesFor(door, limit = 6) {
        const ctx = context.value
        if (!ctx || !resolver.value) return []
        const solved = new Set((challenges.completions ?? []).map(c => c.slug))
        const todayKey = dateHelpers.dayKey(now.value)
        const entryOf = (p) => {
            const {family, branch} = resolver.value.branchFor(p)
            return {
                family: family?.slug,
                category: ctx.categoryOf(family),
                quick: ctx.quickOf(family),
                clean: true,
                archive: dateHelpers.dayKey(p.date) < todayKey,
                favourite: ctx.favourites.has(branch?.slug) || ctx.favourites.has(family?.slug),
                visible: family && !hidden.isHidden(branch?.slug ?? family.slug),
            }
        }
        const recent = new Set(ctx.entries
            .filter(e => (new Date(todayKey) - new Date(e.day)) / 86400000 <= 30)
            .map(e => e.family))
        const fits = (p) => {
            const e = entryOf(p)
            return e.visible && !solved.has(p.slug) && matchesOne(door.kind, e, ctx, recent)
        }
        const isToday = (p) => dateHelpers.dayKey(p.date) === todayKey
        const released = Object.values(Archive.getPuzzles() ?? {})
            .filter(p => p.date && dateHelpers.dayKey(p.date) <= todayKey && fits(p))
            .filter(p => door.kind !== 'archive' || !isToday(p))
            .sort((a, b) => (isToday(b) - isToday(a)) || new Date(b.date) - new Date(a.date))
        const variants = new Set()
        return released
            .filter(p => !variants.has(p.variant) && variants.add(p.variant))
            .slice(0, limit)
            .map(puzzle => ({puzzle, today: isToday(puzzle)}))
    }

    return {
        preview, now, phase, today, progress, counts, opened, signedIn, canPlay,
        refreshCounts, markOpened, puzzlesFor, openDoor, selected, tick: () => { clock.value = Date.now() },
    }
}

export function useAdventStanding(source = null) {
    const {t, n} = useI18n()
    const dateLocale = useDateLocale()
    const {today, progress, counts, canPlay} = source ?? useAdvent()

    return computed(() => {
        const p = progress.value
        if (!p || today.value === 0 || !canPlay.value) return ''
        const count = counts.value?.perfect
        const opened = Math.min(today.value, DOOR_COUNT)
        const finished = today.value > DOOR_COUNT
        const award = (key) => t(`advent.award.${key}.title`)
        const todayDone = ['done', 'late'].includes(p.doors[opened - 1]?.state)

        if (p.stillPerfect && p.done > 0) {
            if (finished || (opened === DOOR_COUNT && todayDone)) {
                return count ? t('advent.status.finishedPerfectCount', {count: n(count)}) : t('advent.status.perfectDone')
            }
            if (todayDone) {
                return count ? t('advent.status.perfectTomorrowCount', {next: opened + 1, count: n(count)}) : t('advent.status.perfectTomorrow', {next: opened + 1})
            }
            return count ? t('advent.status.perfectCount', {count: n(count)}) : t('advent.status.perfect')
        }
        if (p.done === 0) {
            if (opened > 1) return t('advent.status.lateStart')
            return count ? t('advent.status.joinCount', {count: n(count)}, count) : t('advent.status.notStarted')
        }
        if (finished) return t('advent.status.finished', {award: award(p.award?.key ?? 'coal')})

        const date = new Intl.DateTimeFormat(dateLocale.value, {day: 'numeric', month: 'long'}).format(new Date(YEAR, 11, p.perfectThrough + 1))
        const projected = Math.min(DOOR_COUNT, Math.round(p.done / Math.max(opened, 1) * DOOR_COUNT))
        const onCourse = awardFor(projected, false) ?? awardFor(1, false)
        if (onCourse.key === 'coal') return t('advent.status.outCatchUp', {date, award: award('bronze')})
        return t('advent.status.out', {date, award: award(onCourse.key)})
    })
}
