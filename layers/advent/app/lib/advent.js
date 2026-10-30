import {dateHelpers} from '@/lib/challenges'
import {gameConfig, isCleanSolve} from '@/lib/gameConfig'
import {PUZZLE_META} from '@/lib/config'
import {QUICK_MINUTES} from '@/composables/puzzle'

export const YEAR = 2026
export const DOOR_COUNT = 24
export const TEASER_FROM = `${YEAR}-11-24`
export const SHOWN_UNTIL = `${YEAR + 1}-01-06`
export const LAST_CATCH_UP = 24
export const ADVENT_DOOR_MODAL = 'advent-door'

export const SCHEDULE = [
    'any', 'words', 'numbers', 'logic', 'two', 'quick', 'archive', 'clean',
    'favourite', 'different', 'words', 'two', 'new', 'numbers', 'archive', 'logic',
    'clean', 'quick', 'three', 'favourite', 'different', 'archive', 'two', 'three',
]

export const PAPERS = [
    {paper: '#ffbc45', dark: '#996200', ribbon: '#9f5760', edge: '#5c3338'},
    {paper: '#6fb3e8', dark: '#22608f', ribbon: '#1f4e8c', edge: '#12305a'},
    {paper: '#e0697f', dark: '#8c2639', ribbon: '#f4d27a', edge: '#a9852a'},
    {paper: '#7fcdb4', dark: '#2e7a62', ribbon: '#2b4c8c', edge: '#182d57'},
    {paper: '#ae93dc', dark: '#5b3f8c', ribbon: '#ffffff', edge: '#7c63a8'},
    {paper: '#2b4c8c', dark: '#0e2250', ribbon: '#e8b64c', edge: '#a97a22'},
]

export const paperFor = (day) => PAPERS[(day * 5) % PAPERS.length]

const WHITE = "fill='#fff' fill-opacity='.6'"

export const MOTIFS = [
    {scale: 1, body: `<path d='M14.75 9.5 16.21 13.99H20.93L17.11 16.77 18.57 21.26 14.75 18.48 10.93 21.26 12.39 16.77 8.57 13.99H13.29Z' ${WHITE}/>`},
    {scale: 1.6, body: `<path d='M14.75 7.5 19.6 14.6H17.3L20.9 20.4H8.6L12.2 14.6H9.9Z' ${WHITE}/><rect x='13.75' y='20.4' width='2' height='2.6' ${WHITE}/>`},
    {scale: 1.6, body: `<circle cx='14.75' cy='11.6' r='2.7' ${WHITE}/><circle cx='14.75' cy='18.6' r='4.2' ${WHITE}/>`},
    {scale: 1.35, body: `<rect x='13.55' y='8.2' width='2.4' height='2.2' rx='.5' ${WHITE}/><circle cx='14.75' cy='15.9' r='5' ${WHITE}/>`},
    {scale: 1.35, body: `<path d='M14.75 9.6V21.4M9.64 12.55 19.86 18.45M9.64 18.45 19.86 12.55' stroke='#fff' stroke-opacity='.6' stroke-width='1.4' stroke-linecap='round'/>`},
    {scale: 1.5, body: `<path d='M10.4 10.9H17.4V16.6L20.2 18.1Q22 19.1 21.3 20.8Q20.6 22.3 18.7 21.6L12.6 19.3Q10.4 18.4 10.4 16Z' ${WHITE}/><rect x='9.8' y='8.2' width='8.2' height='2.7' rx='.8' ${WHITE}/>`},
]

export const motifFor = (day) => MOTIFS[(day + Math.floor(day / 6)) % MOTIFS.length]

const motifTile = ({scale, body}) => `<g transform='translate(14.75 15.5) scale(${scale}) translate(-14.75 -15.5)'>${body}</g>`

export const motifImage = (day) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 29.5 31'>${motifTile(motifFor(day))}</svg>`)}")`

export function presentIcon(day) {
    const {paper, dark, ribbon, edge} = paperFor(day)
    const k = 92 / 90
    const tileW = 16.6 * k
    const tileH = 17.4 * k
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>`
        + `<defs>`
        + `<clipPath id='c'><rect x='4' y='4' width='92' height='92' rx='5.7'/></clipPath>`
        + `<pattern id='m' patternUnits='userSpaceOnUse' x='${4 + 3.5 * k}' y='${4 + 1.4 * k}' width='${tileW}' height='${tileH}'>`
        + `<g transform='scale(${tileW / 29.5} ${tileH / 31})'>${motifTile(motifFor(day))}</g></pattern>`
        + `<linearGradient id='s' x1='0' y1='1' x2='1' y2='0'><stop offset='0' stop-color='#fff' stop-opacity='0'/><stop offset='.42' stop-color='#fff' stop-opacity='.33'/><stop offset='.79' stop-color='#fff' stop-opacity='.33'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></linearGradient>`
        + `<linearGradient id='h' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.5'/><stop offset='.05' stop-color='#fff' stop-opacity='0'/><stop offset='.9' stop-color='${dark}' stop-opacity='0'/><stop offset='1' stop-color='${dark}' stop-opacity='.6'/></linearGradient>`
        + `</defs>`
        + `<g clip-path='url(#c)'>`
        + `<rect x='4' y='4' width='92' height='92' fill='${paper}'/>`
        + `<rect x='4' y='4' width='92' height='92' fill='url(#m)'/>`
        + `<rect x='4' y='4' width='92' height='92' fill='url(#s)'/>`
        + `<rect x='4' y='${50 - 6.9}' width='92' height='13.8' fill='${ribbon}' stroke='${edge}' stroke-width='1.1'/>`
        + `<rect x='${50 - 6.9}' y='4' width='13.8' height='92' fill='${ribbon}' stroke='${edge}' stroke-width='1.1'/>`
        + `<rect x='4' y='4' width='92' height='92' fill='url(#h)'/>`
        + `</g>`
        + `<circle cx='50' cy='50' r='19.3' fill='#fff' stroke='${edge}' stroke-width='1.1'/>`
        + `<text x='50' y='50' dy='.35em' text-anchor='middle' font-family='Lato, Arial, sans-serif' font-weight='700' font-size='21.5' fill='#212121'>${day}</text>`
        + `</svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const LAYOUT = [13, 6, 21, 2, 17, 9, 24, 4, 11, 19, 1, 15, 8, 22, 3, 12, 18, 7, 23, 10, 5, 16, 20, 14]

export const AWARDS = [
    {key: 'perfect', min: DOOR_COUNT, perfect: true},
    {key: 'silver', min: 18},
    {key: 'bronze', min: 10},
    {key: 'coal', min: 1},
]

const DAY_MS = 24 * 60 * 60 * 1000
const CATEGORY_KINDS = ['words', 'numbers', 'logic']

export const doorDate = (day) => new Date(YEAR, 11, day, 12)
export const doorKey = (day) => dateHelpers.dayKey(doorDate(day))

export function calendarDay(now) {
    const d = new Date(now)
    if (d.getFullYear() !== YEAR || d.getMonth() !== 11) return d < doorDate(1) ? 0 : LAST_CATCH_UP + 1
    return d.getDate()
}

export function phase(now) {
    const key = dateHelpers.dayKey(now)
    if (key < TEASER_FROM || key > SHOWN_UNTIL) return 'off'
    const day = calendarDay(now)
    if (day === 0) return 'teaser'
    if (day <= DOOR_COUNT) return 'doors'
    return 'ended'
}

export function adventContext({completions, families, familyOf, branchFor, puzzleOf, favourites}) {
    const categoryOf = (family) => PUZZLE_META[family?.slug]?.type ?? null
    const quickOf = (family) => (PUZZLE_META[family?.slug]?.time ?? Infinity) <= QUICK_MINUTES
    const favs = new Set(favourites ?? [])
    const entries = [...(completions ?? [])]
        .filter(c => c.solved !== false)
        .map(c => {
            const puzzle = puzzleOf(c.slug) ?? {variant: c.variant, slug: c.slug}
            const {family, branch} = branchFor(puzzle)
            const fam = family ?? familyOf(c.variant)
            const released = puzzle.date ? dateHelpers.dayKey(puzzle.date) : null
            const day = dateHelpers.dayKey(c.at)
            return {
                at: c.at,
                day,
                family: fam?.slug ?? c.variant,
                category: categoryOf(fam),
                quick: quickOf(fam),
                clean: isCleanSolve(c, gameConfig(c.variant).clean),
                archive: !!released && released < day,
                favourite: favs.has(branch?.slug) || favs.has(fam?.slug),
            }
        })
        .sort((a, b) => a.at.localeCompare(b.at))
    const byDay = new Map()
    for (const e of entries) byDay.set(e.day, [...(byDay.get(e.day) ?? []), e])
    const has = {
        words: families.some(f => categoryOf(f) === 'words'),
        numbers: families.some(f => categoryOf(f) === 'numbers'),
        logic: families.some(f => categoryOf(f) === 'logic'),
        quick: families.some(quickOf),
    }
    return {entries, byDay, has, favourites: favs, families, categoryOf, quickOf}
}

export function kindFor(day, ctx) {
    const kind = SCHEDULE[day - 1]
    if ((CATEGORY_KINDS.includes(kind) || kind === 'quick') && !ctx.has[kind]) return 'any'
    if (kind === 'favourite' && !ctx.favourites.size) return 'any'
    return kind
}

function playedBefore(ctx, dayKey) {
    const from = dateHelpers.dayKey(new Date(new Date(`${dayKey}T12:00:00`).getTime() - 30 * DAY_MS))
    return new Set(ctx.entries.filter(e => e.day >= from && e.day < dayKey).map(e => e.family))
}

export function matchesOne(kind, entry, ctx, recent) {
    if (CATEGORY_KINDS.includes(kind)) return entry.category === kind
    if (kind === 'quick') return entry.quick
    if (kind === 'clean') return entry.clean
    if (kind === 'archive') return entry.archive
    if (kind === 'favourite') return entry.favourite
    if (kind === 'new') return !recent.has(entry.family)
    return true
}

export function meetsOn(kind, dayKey, ctx) {
    const list = ctx.byDay.get(dayKey) ?? []
    if (kind === 'two') return list.length >= 2
    if (kind === 'three') return list.length >= 3
    if (kind === 'different') return new Set(list.map(e => e.family)).size >= 2
    if (kind === 'new') {
        const recent = playedBefore(ctx, dayKey)
        if (ctx.families.every(f => recent.has(f.slug))) return new Set(list.map(e => e.family)).size >= 2
        return list.some(e => matchesOne(kind, e, ctx, recent))
    }
    return list.some(e => matchesOne(kind, e, ctx))
}

export function adventProgress(ctx, now) {
    const today = calendarDay(now)
    const lastLate = Math.min(today, LAST_CATCH_UP)
    const doors = Array.from({length: DOOR_COUNT}, (_, i) => {
        const day = i + 1
        const kind = kindFor(day, ctx)
        if (day > today) return {day, kind, state: 'locked'}
        if (meetsOn(kind, doorKey(day), ctx)) return {day, kind, state: 'done'}
        for (let d = day + 1; d <= lastLate; d++) {
            if (meetsOn(kind, doorKey(d), ctx)) return {day, kind, state: 'late'}
        }
        return {day, kind, state: day === today ? 'open' : 'missed'}
    })
    let perfectThrough = 0
    while (perfectThrough < DOOR_COUNT && doors[perfectThrough].state === 'done') perfectThrough++
    const done = doors.filter(d => d.state === 'done' || d.state === 'late').length
    const opened = Math.min(today, DOOR_COUNT)
    const stillPerfect = opened > 0 && perfectThrough >= (today > DOOR_COUNT ? DOOR_COUNT : opened - 1)
    const award = awardFor(done, perfectThrough === DOOR_COUNT)
    const next = AWARDS.slice().reverse().find(a => !a.perfect && a.min > done) ?? null
    return {today, doors, perfectThrough, done, stillPerfect, award, next}
}

export function awardFor(done, perfect) {
    return AWARDS.find(a => (a.perfect ? perfect : done >= a.min)) ?? null
}

export const perfectThreshold = (today) => (today > DOOR_COUNT ? DOOR_COUNT : Math.max(1, today - 1))
