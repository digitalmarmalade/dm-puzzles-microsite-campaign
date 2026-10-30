import {defineStore} from 'pinia'
import {dateHelpers} from '@/lib/challenges'
import {foldIntoLifetime, lifetimeTotals} from '@/lib/lifetime'
import {LOG_RETAIN_DAYS} from '@/lib/profileSync'

const KEY = 'sp-challenges'
const HELD_KEY = 'sp-held-completion'


const FREEZE_TARGET = 3
const FREEZE_MIN_STREAK = 7

const FREEZE_COOLDOWN_BASE = 7
const FREEZE_COOLDOWN_FLOOR = 3
const FREEZE_COOLDOWN_TENURE = 30

function freezeCooldownDays(priorStreak) {
    const shaved = Math.floor((priorStreak || 0) / FREEZE_COOLDOWN_TENURE)
    return Math.max(FREEZE_COOLDOWN_FLOOR, FREEZE_COOLDOWN_BASE - shaved)
}

function daysBetweenKeys(fromKey, toKey) {
    return Math.round((new Date(toKey) - new Date(fromKey)) / 86400000)
}

export const useChallengesStore = defineStore('challenges', {
    state: () => ({
        completions: [],
        challengesCompleted: 0,
        unlockedAchievements: [],
        challengeLog: [],

        frozenDays: [],
        freezeOffer: null,
        freezeOfferedOn: null,
        lastFreezeAt: null,
        lifetime: {months: {}},
        keepFullLog: false,
    }),

    getters: {
        todayKey: () => dateHelpers.todayKey(),
        lifetimeTotals: (state) => lifetimeTotals(state.lifetime, state.completions),
        weekKey: () => dateHelpers.weekKey(),

        activeDayKeys(state) {
            const set = new Set()
            for (const c of state.completions) set.add(dateHelpers.dayKey(c.at))
            for (const d of state.frozenDays ?? []) set.add(d)
            return set
        },
        dayStreak(state) {
            const active = this.activeDayKeys
            const cursor = new Date()
            if (!active.has(dateHelpers.dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
            let count = 0
            while (active.has(dateHelpers.dayKey(cursor))) {
                count++
                cursor.setDate(cursor.getDate() - 1)
            }
            return count
        },
        weekStreak(state) {
            const weeks = new Set()
            for (const c of state.completions) weeks.add(dateHelpers.weekKey(c.at))
            for (const d of state.frozenDays ?? []) weeks.add(dateHelpers.weekKey(d))
            if (!weeks.size) return 0
            const cursor = new Date()
            if (!weeks.has(dateHelpers.weekKey(cursor))) cursor.setDate(cursor.getDate() - 7)
            let count = 0
            while (weeks.has(dateHelpers.weekKey(cursor))) {
                count++
                cursor.setDate(cursor.getDate() - 7)
            }
            return count
        },

        variantDayStreak(state) {
            return (variantName) => {
                if (!variantName) return 0
                const days = new Set()
                for (const c of state.completions) {
                    if (c.variant === variantName) days.add(dateHelpers.dayKey(c.at))
                }
                if (!days.size) return 0
                const cursor = new Date()
                if (!days.has(dateHelpers.dayKey(cursor))) {
                    cursor.setDate(cursor.getDate() - 1)
                    if (!days.has(dateHelpers.dayKey(cursor))) return 0
                }
                let count = 0
                while (days.has(dateHelpers.dayKey(cursor))) {
                    count++
                    cursor.setDate(cursor.getDate() - 1)
                }
                return count
            }
        },

        freezeProgress(state) {
            const offer = state.freezeOffer
            if (!offer || offer.earnDay !== this.todayKey) return null
            const current = state.completions.filter(c => dateHelpers.isToday(c.at)).length
            return {
                current,
                target: offer.target,
                missedDay: offer.missedDay,
                complete: current >= offer.target,
            }
        },
    },

    actions: {
        //  ----- persistence ---------------------------------------------------
        load() {
            if (typeof localStorage === 'undefined') return
            try {
                this.keepFullLog = !!JSON.parse(localStorage.getItem('sp-sync') || 'null')?.uid
            } catch {
                //
            }
            try {
                const raw = localStorage.getItem(KEY)
                if (!raw) return
                const saved = JSON.parse(raw)
                this.completions = Array.isArray(saved.completions) ? saved.completions : []
                this.challengesCompleted = Number.isFinite(saved.challengesCompleted) ? saved.challengesCompleted : 0
                this.unlockedAchievements = Array.isArray(saved.unlockedAchievements) ? saved.unlockedAchievements : []
                this.challengeLog = Array.isArray(saved.challengeLog) ? saved.challengeLog : []
                this.frozenDays = Array.isArray(saved.frozenDays) ? saved.frozenDays : []
                this.freezeOffer = saved.freezeOffer ?? null
                this.freezeOfferedOn = saved.freezeOfferedOn ?? null
                this.lastFreezeAt = saved.lastFreezeAt ?? null
                this.lifetime = saved.lifetime?.months ? saved.lifetime : {months: {}}
                this.pruneLog()
            } catch {
                //  
            }
        },
        persist() {
            if (typeof localStorage === 'undefined') return
            try {
                localStorage.setItem(KEY, JSON.stringify({
                    completions: this.completions,
                    challengesCompleted: this.challengesCompleted,
                    unlockedAchievements: this.unlockedAchievements,
                    frozenDays: this.frozenDays,
                    challengeLog: this.challengeLog,
                    freezeOffer: this.freezeOffer,
                    freezeOfferedOn: this.freezeOfferedOn,
                    lastFreezeAt: this.lastFreezeAt,
                    lifetime: this.lifetime,
                }))
            } catch {
                //  
            }
        },

        recordRating(slug, rating) {
            let idx = -1
            this.completions.forEach((c, i) => {
                if (c.slug === slug && (idx < 0 || c.at >= this.completions[idx].at)) idx = i
            })
            if (idx < 0) return
            this.completions = [
                ...this.completions.slice(0, idx),
                {...this.completions[idx], rating},
                ...this.completions.slice(idx + 1),
            ]
            this.persist()
        },

        pruneLog() {
            if (this.keepFullLog) return
            const cutoff = Date.now() - LOG_RETAIN_DAYS * 24 * 60 * 60 * 1000
            const kept = []
            const expired = []
            for (const c of this.completions) {
                const t = new Date(c.at).getTime()
                if (!Number.isFinite(t)) continue
                ;(t >= cutoff ? kept : expired).push(c)
            }
            if (kept.length === this.completions.length) return
            if (expired.length) this.lifetime = foldIntoLifetime(this.lifetime, expired)
            this.completions = kept
            this.persist()
        },

        rollForward() {
            if (this.freezeOffer && this.freezeOffer.earnDay !== this.todayKey) {
                this.freezeOffer = null
                this.persist()
            }
        },

        recordChallenge(id) {
            const entry = `challenge:${dateHelpers.todayKey()}:${id}`
            if (this.challengeLog.includes(entry)) return
            this.challengeLog = [...this.challengeLog, entry].sort()
            this.persist()
        },


        //  ----- completion logging -------------------------------------------
        //  Called from the puzzle page when the iframe posts `puzzlecomplete`.
        recordCompletion(slug, variant, extras = {}) {
            const empty = {dayStreakGrew: false, weekStreakGrew: false}
            if (!slug || !variant) return empty
            const at = extras.at ?? new Date().toISOString()
            const dayKey = dateHelpers.dayKey(at)

            const clean = {}
            if (typeof extras.timeSec === 'number') clean.timeSec = extras.timeSec
            if (typeof extras.cellsRevealed === 'number') clean.cellsRevealed = extras.cellsRevealed
            if (typeof extras.prefilled === 'number') clean.prefilled = extras.prefilled
            if (typeof extras.hintsShown === 'number') clean.hintsShown = extras.hintsShown
            if (typeof extras.checksUsed === 'number') clean.checksUsed = extras.checksUsed
            if (typeof extras.wrongAnswers === 'number') clean.wrongAnswers = extras.wrongAnswers
            if (typeof extras.wordsFound === 'number') clean.wordsFound = extras.wordsFound
            if (typeof extras.totalWords === 'number') clean.totalWords = extras.totalWords
            if (typeof extras.score === 'number') clean.score = extras.score
            if (typeof extras.maxScore === 'number') clean.maxScore = extras.maxScore
            if (typeof extras.guesses === 'number') clean.guesses = extras.guesses
            if (typeof extras.solved === 'boolean') clean.solved = extras.solved

            const prevDayStreak = this.dayStreak
            const prevWeekStreak = this.weekStreak
            const prevVariantStreak = this.variantDayStreak(variant)

            const idx = this.completions.findIndex(c =>
                c.slug === slug && dateHelpers.dayKey(c.at) === dayKey)
            if (idx >= 0) {
                const updated = {...this.completions[idx], at, ...clean}
                this.completions = [
                    ...this.completions.slice(0, idx),
                    updated,
                    ...this.completions.slice(idx + 1),
                ]
            } else {
                this.completions = [...this.completions, {slug, variant, at, ...clean}]
            }
            this.pruneLog()
            this.persist()

            const frozenDay = this.applyFreezeIfEarned()

            const dayStreak = this.dayStreak
            const weekStreak = this.weekStreak
            const variantStreak = this.variantDayStreak(variant)
            return {
                dayStreakGrew: dayStreak > prevDayStreak,
                dayStreak, prevDayStreak,
                weekStreakGrew: weekStreak > prevWeekStreak,
                weekStreak, prevWeekStreak,
                variantStreakGrew: variantStreak > prevVariantStreak,
                variantStreak, prevVariantStreak, variant,
                freezeEarned: Boolean(frozenDay),
                frozenDay: frozenDay || null,
            }
        },

        holdCompletion(slug, variant, extras = {}) {
            try {
                const held = JSON.parse(localStorage.getItem(HELD_KEY) || 'null')
                const at = held?.slug === slug ? held.extras?.at : new Date().toISOString()
                localStorage.setItem(HELD_KEY, JSON.stringify({slug, variant, extras: {...extras, at}}))
            } catch {
                //
            }
        },
        releaseHeldCompletion() {
            let held = null
            try {
                held = JSON.parse(localStorage.getItem(HELD_KEY) || 'null')
                localStorage.removeItem(HELD_KEY)
            } catch {
                return null
            }
            return held?.slug ? this.recordCompletion(held.slug, held.variant, held.extras) : null
        },
        dropHeldCompletion() {
            try {
                localStorage.removeItem(HELD_KEY)
            } catch {
                //
            }
        },

        //  ----- streak freeze -------------------------------------------------
        evaluateFreezeOpportunity() {
            const active = this.activeDayKeys
            const key = (d) => dateHelpers.dayKey(d)
            const today = new Date()
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
            const dayBefore = new Date(today); dayBefore.setDate(today.getDate() - 2)

            if (active.has(key(yesterday))) return null
            if (!active.has(key(dayBefore))) return null
            if (this.frozenDays.includes(key(yesterday))) return null

            let priorStreak = 0
            const cursor = new Date(dayBefore)
            while (active.has(key(cursor))) { priorStreak++; cursor.setDate(cursor.getDate() - 1) }
            if (priorStreak < FREEZE_MIN_STREAK) return null

            const cooldown = freezeCooldownDays(priorStreak)
            if (this.lastFreezeAt && daysBetweenKeys(dateHelpers.dayKey(this.lastFreezeAt), this.todayKey) < cooldown) {
                return null
            }

            return {missedDay: key(yesterday), priorStreak, cooldown, target: FREEZE_TARGET}
        },

        offerStreakFreeze(missedDay) {
            this.freezeOffer = {missedDay, earnDay: this.todayKey, target: FREEZE_TARGET}
            this.freezeOfferedOn = this.todayKey
            this.persist()
        },

        applyFreezeIfEarned() {
            const offer = this.freezeOffer
            if (!offer || offer.earnDay !== this.todayKey) return null
            const doneToday = this.completions.filter(c => dateHelpers.isToday(c.at)).length
            if (doneToday < offer.target) return null

            if (!this.frozenDays.includes(offer.missedDay)) {
                this.frozenDays = [...this.frozenDays, offer.missedDay]
            }
            this.lastFreezeAt = new Date().toISOString()
            this.freezeOffer = null
            this.persist()
            return offer.missedDay
        },


        statsForVariant(variantName) {
            if (!variantName) return null
            const now = Date.now()
            const weekAgo = now - 7 * 24 * 60 * 60 * 1000
            const entries = this.completions.filter(c => c.variant === variantName)
            if (!entries.length) return null

            const minOf = (list, field) => {
                const vals = list.map(c => c[field]).filter(v => typeof v === 'number')
                return vals.length ? Math.min(...vals) : null
            }
            const maxOf = (list, field) => {
                const vals = list.map(c => c[field]).filter(v => typeof v === 'number')
                return vals.length ? Math.max(...vals) : null
            }
            const weekEntries = entries.filter(c => new Date(c.at).getTime() >= weekAgo)
            const last = [...entries].sort((a, b) => new Date(b.at) - new Date(a.at))[0]

            const bucket = (field, bestOf = minOf) => ({
                ever: bestOf(entries, field),
                week: bestOf(weekEntries, field),
                last: typeof last?.[field] === 'number' ? last[field] : null,
            })

            return {
                time: bucket('timeSec'),
                checks: bucket('checksUsed'),
                reveals: bucket('cellsRevealed'),
                words: bucket('wordsFound', maxOf),
            }
        },

        debugBreakStreak(priorDays = 8) {
            this.frozenDays = []
            this.freezeOffer = null
            this.freezeOfferedOn = null
            this.lastFreezeAt = null
            const base = new Date()
            base.setDate(base.getDate() - 2)
            base.setHours(12, 0, 0, 0)
            const rows = []
            for (let i = 0; i < priorDays; i++) {
                const d = new Date(base)
                d.setDate(base.getDate() - i)
                rows.push({slug: `_debug-break-${i}`, variant: `_Streak ${i + 1}`, at: d.toISOString()})
            }
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 2); cutoff.setHours(23, 59, 59, 999)
            this.completions = [
                ...this.completions.filter(c => new Date(c.at) <= cutoff),
                ...rows,
            ]
            this.persist()
        },
        debugClearFreeze() {
            this.frozenDays = []
            this.freezeOffer = null
            this.freezeOfferedOn = null
            this.lastFreezeAt = null
            this.persist()
        },
        debugVariantStreak(variant, days = 5) {
            if (!variant) return
            const base = new Date(); base.setHours(12, 0, 0, 0)
            const rows = []
            for (let i = 0; i < days; i++) {
                const d = new Date(base); d.setDate(base.getDate() - i)
                rows.push({slug: `_debug-vstreak-${variant}-${i}`, variant, at: d.toISOString()})
            }
            this.completions = [
                ...this.completions.filter(c => !String(c.slug).startsWith(`_debug-vstreak-${variant}-`)),
                ...rows,
            ]
            this.persist()
        },
        debugClearVariantStreaks() {
            this.completions = this.completions.filter(c => !String(c.slug).startsWith('_debug-vstreak-'))
            this.persist()
        },
        /*  Extend the streak by one day. stamps a fake completion on
          the first unplayed day found  */
        debugStreakStep() {
            const map = {}
            for (const row of this.completions) {
                const key = dateHelpers.dayKey(row.at)
                map[key] = (map[key] ?? 0) + 1
            }
            const cursor = new Date()
            while ((map[dateHelpers.dayKey(cursor)] ?? 0) > 0) {
                cursor.setDate(cursor.getDate() - 1)
            }
            cursor.setHours(12, 0, 0, 0)
            const at = cursor.toISOString()

            const usedVariants = new Set(this.completions.map(row => row.variant))
            let vi = 1
            while (usedVariants.has(`_Streak ${vi}`)) vi++
            const variant = `_Streak ${vi}`

            const uniqueSlug = `_debug-streak-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            this.completions = [...this.completions, {slug: uniqueSlug, variant, at}]
            this.pruneLog()
            this.persist()
        },
    },
})
