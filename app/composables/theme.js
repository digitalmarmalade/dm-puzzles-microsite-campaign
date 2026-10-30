//  Light/dark theme.
//  The stylesheets key off a `data-theme-status` attribute on <html>:
//    - no attribute      -> follow the OS (prefers-color-scheme), see variables.css
//    - "light" / "dark"  -> forced override
//  useTheme() exposes a reactive `theme` ref that stays in sync with both the
//  manual override (attribute on <html>) and the OS preference, plus a
//  `toggleTheme` action for the nav button.

const THEME_KEY = 'sp-theme'

function systemPrefersDark() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

function readTheme() {
    const attr = document.documentElement.getAttribute('data-theme-status')
    if (attr === 'dark' || attr === 'light') return attr
    return systemPrefersDark() ? 'dark' : 'light'
}

//  apply a saved preference on app start (called from a client plugin)
export function applyStoredTheme() {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') {
        document.documentElement.setAttribute('data-theme-status', saved)
    }
}

//  module-level singleton — one ref, one set of listeners, shared by all callers
let themeRef = null
function ensureThemeRef() {
    if (themeRef) return themeRef
    themeRef = ref('light')
    if (import.meta.client) {
        themeRef.value = readTheme()
        //  manual override: someone calls toggleTheme() (or any other code that
        //  rewrites the attribute)
        new MutationObserver(() => { themeRef.value = readTheme() })
            .observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme-status']})
        //  OS-level change while no manual override is set
        window.matchMedia?.('(prefers-color-scheme: dark)')
            ?.addEventListener?.('change', () => { themeRef.value = readTheme() })
    }
    return themeRef
}

export function useTheme() {
    const theme = ensureThemeRef()

    const setTheme = (next) => {
        if (next !== 'dark' && next !== 'light') return
        document.documentElement.setAttribute('data-theme-status', next)
        localStorage.setItem(THEME_KEY, next)
        //  the MutationObserver will sync this too, but set eagerly so consumers
        //  in the same tick see the new value without waiting for the microtask
        theme.value = next
    }

    const toggleTheme = () => setTheme(theme.value === 'dark' ? 'light' : 'dark')

    return {theme, toggleTheme, setTheme}
}
