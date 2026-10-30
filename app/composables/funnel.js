import {getApps} from 'firebase/app'
import {getAnalytics, logEvent, setUserProperties} from 'firebase/analytics'
import {dateHelpers} from '@/lib/challenges'

const KEY = 'sp-funnel'
const SESSION_KEY = 'sp-funnel-session'

let state = null

function load() {
    if (state) return state
    try {
        state = JSON.parse(localStorage.getItem(KEY) || 'null') || {}
    } catch {
        state = {}
    }
    return state
}

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
        //
    }
}

function analytics() {
    if (!getApps().length) return null
    try {
        return getAnalytics(getApps()[0])
    } catch {
        return null
    }
}

function daysBetween(fromKey, toKey) {
    return Math.round((new Date(`${toKey}T00:00:00`) - new Date(`${fromKey}T00:00:00`)) / 864e5)
}

function seenBefore() {
    try {
        return !!(localStorage.getItem('sp:lastVisit') || localStorage.getItem('sp-free-play'))
    } catch {
        return false
    }
}

function secondsSince(iso) {
    return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
}

function isFirstSession() {
    try {
        return sessionStorage.getItem(SESSION_KEY) === 'first'
    } catch {
        return false
    }
}

export function trackFunnel(name, params = {}) {
    if (!import.meta.client) return
    const a = analytics()
    if (a) logEvent(a, name, params)
    if (import.meta.dev) console.log('funnel', name, params)
}

export function initFunnel() {
    if (!import.meta.client) return
    const s = load()
    const today = dateHelpers.todayKey()

    if (!s.firstSeen) {
        s.firstSeen = new Date().toISOString()
        s.firstDay = today
        s.lastDay = today
        s.legacy = seenBefore()
        save()
        if (s.legacy) return
        try {
            sessionStorage.setItem(SESSION_KEY, 'first')
        } catch {
            //
        }
        trackFunnel('sp_first_visit')
    }

    if (s.legacy) return

    const a = analytics()
    if (a) setUserProperties(a, {sp_cohort: s.firstDay})

    if (s.lastDay !== today) {
        const days = daysBetween(s.firstDay, today)
        s.lastDay = today
        save()
        trackFunnel('sp_return', {days_since_first: days})
        if (days === 1) trackFunnel('sp_retained_d1')
        if (days === 7) trackFunnel('sp_retained_d7')
    }
}

export function trackFirstPlay(slug, {signedIn, free}) {
    if (!import.meta.client) return
    const s = load()
    if (!s.firstSeen || s.legacy || s.firstPlay) return
    s.firstPlay = new Date().toISOString()
    save()
    trackFunnel('sp_first_play', {
        slug,
        seconds_since_first_visit: secondsSince(s.firstSeen),
        days_since_first: daysBetween(s.firstDay, dateHelpers.todayKey()),
        first_session: isFirstSession(),
        signed_in: signedIn,
        free_play: free,
    })
}

export function trackFreePlayClaim(slug) {
    if (!import.meta.client) return
    const s = load()
    s.freePlayCount = (s.freePlayCount || 0) + 1
    s.lastFreePlay = new Date().toISOString()
    save()
    trackFunnel('sp_free_play_claim', {slug, free_play_count: s.freePlayCount})
}

export function trackFreePlayWall(slug) {
    if (!import.meta.client) return
    const s = load()
    const today = dateHelpers.todayKey()
    if (s.wallDay === today) return
    s.wallDay = today
    save()
    trackFunnel('sp_free_play_wall', {slug, free_play_count: s.freePlayCount || 0})
}

export function trackConversion(method) {
    if (!import.meta.client) return
    const s = load()
    if (s.converted || !s.lastFreePlay) return
    s.converted = true
    save()
    trackFunnel('sp_free_play_convert', {
        method,
        free_play_count: s.freePlayCount || 0,
        hit_wall: !!s.wallDay,
        hours_since_free_play: Math.round(secondsSince(s.lastFreePlay) / 3600),
        days_since_first: daysBetween(s.firstDay, dateHelpers.todayKey()),
    })
}
