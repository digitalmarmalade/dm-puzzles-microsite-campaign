export const PREVIEWS = ['welcome', 'nudge-level', 'level-toast', 'banner-free', 'banner-used', 'gate-used', 'reset', 'recap-card', 'wrapped', 'wrapped-perfect', 'announcement', 'profile-modal', 'profile-toast', 'assist-offer', 'assist-modal', 'challenges', 'cover-last', 'letter-picker', 'friends-members', 'friends-leagues', 'friends-welcome', 'install-prompt', 'medal-none', 'medal-bronze', 'medal-silver', 'medal-gold']

const SESSION_KEY = 'sp-preview'

export function usePreview() {
    const active = useState('preview', () => [])

    const set = (names) => {
        active.value = names.filter(n => PREVIEWS.includes(n))
        try {
            if (active.value.length) sessionStorage.setItem(SESSION_KEY, active.value.join(','))
            else sessionStorage.removeItem(SESSION_KEY)
        } catch {
            //
        }
    }

    const parse = (raw) => {
        if (!raw || raw === 'off') return []
        if (raw === 'all') return [...PREVIEWS]
        return raw.split(',').map(s => s.trim())
    }

    const restore = () => {
        const fromUrl = new URLSearchParams(window.location.search).get('preview')
        if (fromUrl !== null) return set(parse(fromUrl))
        try {
            set(parse(sessionStorage.getItem(SESSION_KEY)))
        } catch {
            //
        }
    }

    return {
        active,
        is: (name) => active.value.includes(name),
        hide: (name) => set(active.value.filter(n => n !== name)),
        set: (raw) => set(parse(raw)),
        restore,
    }
}
