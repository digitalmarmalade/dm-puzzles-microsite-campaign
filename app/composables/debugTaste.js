const SESSION_KEY = 'sp-debug'

export function useDebugTaste() {
    const active = useState('debugTaste', () => false)

    const set = (on) => {
        active.value = !!on
        try {
            if (active.value) sessionStorage.setItem(SESSION_KEY, 'taste')
            else sessionStorage.removeItem(SESSION_KEY)
        } catch {
            //
        }
    }

    const restore = () => {
        const fromUrl = new URLSearchParams(window.location.search).get('debug')
        if (fromUrl !== null) return set(fromUrl === 'taste')
        try {
            set(sessionStorage.getItem(SESSION_KEY) === 'taste')
        } catch {
            //
        }
    }

    return {active, set, restore}
}
