import {defineStore} from 'pinia'

const KEY = 'sp-preferences'

const DEFAULTS = {
    showFeatured: true,
    showChallenges: true,
    challengesJoined: [],
    challengeSkips: {},
    notifications: false,
    notificationsSoftDismissed: false,
    installPromptSnoozedUntil: '',
    installPromptNever: false,
    onboardingCompleted: false,
    onboardingStep: 0,
    welcomeDismissed: false,
    onboardingSelectedCategories: [],
    onboardingSelectedTags: [],
    boostedCategories: [],
    declinedCategories: [],
    answeredLevels: [],
    recapSeenMonth: '',
    recapWatchedMonth: '',
    profileAnnounced: '',
    profileAnnouncedAt: '',
    nudgeOffered: '',
    dismissedInsights: [],
    dismissedAnnouncements: [],
    tutorialsDone: {},
    guideTips: [],
}

export const usePreferencesStore = defineStore('preferences', {
    state: () => ({...DEFAULTS}),
    actions: {
        load() {
            if (typeof localStorage === 'undefined') return
            try {
                const raw = localStorage.getItem(KEY)
                if (!raw) return
                const saved = JSON.parse(raw)
                for (const key of Object.keys(DEFAULTS)) {
                    if (typeof saved[key] === typeof DEFAULTS[key]) this[key] = saved[key]
                }
            } catch {
                //
            }
        },
        persist() {
            if (typeof localStorage === 'undefined') return
            try {
                const payload = {}
                for (const key of Object.keys(DEFAULTS)) payload[key] = this[key]
                localStorage.setItem(KEY, JSON.stringify(payload))
            } catch {
                //
            }
        },
        set(key, value) {
            if (!(key in DEFAULTS)) return
            this[key] = value
            this.persist()
        },
    },
})
