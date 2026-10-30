import Archive from '@/api/Archive.js'

//  Dev demo aid: seed the featured panel with fake completions + a recent
//  previousVisit so the "Most played" / "Played last visit" badges appear
//  without you having to actually play anything.
//
//  Activate with ?mockFeatured=1, or call window.__mockFeatured() /
//  window.__clearMockFeatured() from the console. Not persisted anywhere —
//  a reload without the flag restores real state.

const DAY_MS = 24 * 60 * 60 * 1000

export default defineNuxtPlugin((nuxtApp) => {
    if (!import.meta.client) return

    const seed = () => {
        const challenges = useChallengesStore()
        const previousVisit = useState('lastVisit:previous', () => null)
        const todays = Archive.getTodaysPuzzles?.() ?? []
        if (!todays.length) return false

        const seenVariants = new Set()
        const picks = []
        for (const p of todays) {
            if (!p?.variant || seenVariants.has(p.variant)) continue
            seenVariants.add(p.variant)
            picks.push(p.variant)
            if (picks.length >= 3) break
        }
        if (!picks.length) return false

        const now = new Date()
        const completions = []
        //  Variant 0 — many historic completions → "Most played"
        for (let i = 0; i < 5; i++) {
            completions.push({slug: `mock-${picks[0]}-${i}`, variant: picks[0], at: new Date(now.getTime() - (30 - i * 5) * DAY_MS).toISOString()})
        }
        //  Variant 1 — completed each of the last 3 days ending yesterday → "Streak 3"
        if (picks[1]) {
            for (let d = 1; d <= 3; d++) {
                const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 12)
                completions.push({slug: `mock-${picks[1]}-d${d}`, variant: picks[1], at: day.toISOString()})
            }
        }
        //  Variant 2 — completed 2 days ago (after previousVisit=4d, not yesterday) → "Played last time"
        if (picks[2]) {
            const twoDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 12)
            completions.push({slug: `mock-${picks[2]}-recent`, variant: picks[2], at: twoDaysAgo.toISOString()})
        }

        challenges.completions = completions
        previousVisit.value = new Date(now.getTime() - 4 * DAY_MS)
        return true
    }

    const clear = () => {
        const challenges = useChallengesStore()
        challenges.completions = []
    }

    window.__mockFeatured = seed
    window.__clearMockFeatured = clear

    const active = () => new URLSearchParams(window.location.search).get('mockFeatured') === '1'

    const trySeed = (attempts = 20) => {
        if (!active()) return
        if (seed()) return
        if (attempts > 0) setTimeout(() => trySeed(attempts - 1), 100)
    }

    nuxtApp.hook('page:finish', () => trySeed())
    trySeed()
})
