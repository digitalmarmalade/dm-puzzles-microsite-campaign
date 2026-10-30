import {periodSummary} from '@/lib/recap'
import {profileFor} from '@/lib/playerProfile'

const CANDIDATE_KEY = 'sp-profile-candidate'
const SEEDED_KEY = 'sp-profile-seeded'
const MODAL_ID = 'modal-profile-reveal'
const STABLE_COMPLETIONS = 3
const STABLE_MS = 2 * 24 * 60 * 60 * 1000
const MIN_GAP_MS = 7 * 24 * 60 * 60 * 1000

export function useProfileRevealState() {
    return useState('profileReveal:state', () => null)
}

export function showProfileReveal(profile) {
    if (!import.meta.client) return Promise.resolve()
    return new Promise(resolve => {
        useProfileRevealState().value = {...profile, resolve}
        useModalStore().open(MODAL_ID)
    })
}

export function closeProfileReveal() {
    const state = useProfileRevealState()
    const s = state.value
    state.value = null
    useModalStore().close(MODAL_ID)
    if (s?.resolve) s.resolve()
}

function readCandidate() {
    try {
        return JSON.parse(localStorage.getItem(CANDIDATE_KEY) || 'null')
    } catch {
        return null
    }
}

function writeCandidate(c) {
    try {
        if (c) localStorage.setItem(CANDIDATE_KEY, JSON.stringify(c))
        else localStorage.removeItem(CANDIDATE_KEY)
    } catch {
        //
    }
}

export function useProfileAnnounce() {
    const {t} = useI18n()
    const challenges = useChallengesStore()
    const preferences = usePreferencesStore()
    const toast = useToastStore()
    const localePath = useLocalePath()

    const current = () => profileFor(periodSummary(challenges.lifetime, challenges.completions ?? [], () => true), challenges.completions ?? [])

    const describe = (p) => ({
        ...p,
        title: t(`profile.${p.id}.title`, p.vars),
        subtitle: t(`profile.${p.id}.subtitle`, p.vars),
    })

    function seed() {
        try {
            if (localStorage.getItem(SEEDED_KEY)) return
            localStorage.setItem(SEEDED_KEY, '1')
        } catch {
            return
        }
        if (preferences.profileAnnounced) return
        const p = current()
        if (p && p.id !== 'newbie') preferences.set('profileAnnounced', p.key)
    }

    function announce(p, first) {
        const shown = describe(p)
        preferences.set('profileAnnounced', p.key)
        preferences.set('profileAnnouncedAt', new Date().toISOString())
        trackFunnel('sp_profile_announce', {profile: p.id, first})
        if (first) return showProfileReveal(shown).then(() => true)
        toast.add({
            type: 'achievement',
            iconSrc: `/img/profiles/${p.id}.svg`,
            iconSize: 'small',
            message: t('profileAnnounce.changed'),
            duration: 8000,
            onClick: () => navigateTo(localePath('/stats')),
        })
        return Promise.resolve(true)
    }

    async function offerAfterCompletion(canShow = true) {
        const p = current()
        if (!p || p.id === 'newbie' || p.key === preferences.profileAnnounced) {
            writeCandidate(null)
            return false
        }
        const now = Date.now()
        const c = readCandidate()
        if (!c || c.key !== p.key) {
            writeCandidate({key: p.key, since: now, count: 1})
            return false
        }
        const next = {...c, count: c.count + 1}
        const stable = next.count >= STABLE_COMPLETIONS || now - c.since >= STABLE_MS
        const last = preferences.profileAnnouncedAt ? new Date(preferences.profileAnnouncedAt).getTime() : 0
        if (!stable || !canShow || now - last < MIN_GAP_MS) {
            writeCandidate(next)
            return false
        }
        writeCandidate(null)
        return announce(p, !preferences.profileAnnounced)
    }

    return {seed, offerAfterCompletion, describe}
}

export {MODAL_ID as PROFILE_REVEAL_MODAL_ID}
