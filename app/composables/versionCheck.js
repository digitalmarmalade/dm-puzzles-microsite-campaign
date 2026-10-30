const POLL_INTERVAL_MS = 10 * 60 * 1000

export function useVersionCheck() {
    const updateAvailable = useState('versionCheck:updateAvailable', () => false)
    if (!import.meta.client) return {updateAvailable, refresh: () => {}}

    const bustReload = () => {
        const url = new URL(window.location.href)
        url.searchParams.set('v', Date.now().toString())
        window.location.replace(url.href)
    }

    const previewMode = new URLSearchParams(window.location.search).get('showUpdate') === '1'
    window.__showUpdate = () => { updateAvailable.value = true }
    window.__hideUpdate = () => { updateAvailable.value = false }
    if (previewMode) updateAvailable.value = true

    if (import.meta.dev || previewMode) {
        return {updateAvailable, refresh: () => window.location.reload()}
    }

    const buildVersion = useRuntimeConfig().public.buildVersion || null
    let intervalId = null

    const fetchVersion = async () => {
        try {
            const res = await fetch(`/version.json?t=${Date.now()}`, {cache: 'no-store'})
            if (!res.ok) return null
            const data = await res.json()
            return data.version || null
        } catch {
            return null
        }
    }

    const check = async () => {
        if (updateAvailable.value || !buildVersion) return
        const serverVersion = await fetchVersion()
        if (!serverVersion) return
        if (serverVersion !== buildVersion) {
            updateAvailable.value = true
            if (intervalId) { clearInterval(intervalId); intervalId = null }
        }
    }

    const onVisibility = () => {
        if (document.visibilityState === 'visible') check()
    }

    check()
    intervalId = setInterval(check, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibility)

    onBeforeUnmount(() => {
        if (intervalId) clearInterval(intervalId)
        document.removeEventListener('visibilitychange', onVisibility)
    })

    return {updateAvailable, refresh: bustReload}
}
