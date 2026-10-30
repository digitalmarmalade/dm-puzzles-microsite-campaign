export const DEFAULT_TIMEZONE = 'Europe/London'

const formatters = new Map()

export function dateIn(timezone, instant = new Date()) {
    if (!formatters.has(timezone)) {
        formatters.set(timezone, new Intl.DateTimeFormat('en-CA', {timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'}))
    }
    return formatters.get(timezone).format(instant)
}

const toUtc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))

export function addDays(iso, days) {
    return new Date(toUtc(iso) + days * 86400000).toISOString().slice(0, 10)
}

export function daysBetween(a, b) {
    return Math.round((toUtc(b) - toUtc(a)) / 86400000)
}

export function isIsoDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value
}
